const express = require('express');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();
const crypto = require('crypto');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, execFile, spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const multer = require('multer');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const PORT = 21999;

const db = new Database(path.join(__dirname, 'sidvps.db'));
db.pragma('journal_mode = WAL');

let mysqlPool = null;
if (process.env.MYSQL_HOST) {
    mysqlPool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: 'mysql',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    salt TEXT,
    hash TEXT,
    password TEXT,     -- Fallback for legacy plain-text
    email TEXT,
    server_ip TEXT,
    role TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,
    root TEXT NOT NULL,
    type TEXT DEFAULT 'php',
    port INTEGER DEFAULT 0,
    ssl BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS databases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dbname TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
const VERSION_PATH = path.join(__dirname, '../version.json');
const ALLOWED_FILE_ROOTS = ['/root', '/var/www', '/home'];
const VALID_SERVICES = ['nginx', 'mysql', 'php-fpm', 'sidvps-ui', 'apache2'];
const DOMAIN_RE = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const IDENTIFIER_RE = /^[a-zA-Z0-9_]+$/;

const resolveAllowedPath = (requestedPath = '/root') => {
    const resolved = path.resolve(requestedPath);
    const allowed = ALLOWED_FILE_ROOTS.some(root => resolved === root || resolved.startsWith(`${root}${path.sep}`));
    if (!allowed) throw new Error('Access denied');
    return resolved;
};

const isValidDomain = (domain) => typeof domain === 'string' && DOMAIN_RE.test(domain);
const isValidIdentifier = (value) => typeof value === 'string' && IDENTIFIER_RE.test(value);
const isValidPort = (value) => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 65535;

// --- Helper: Get Version ---
const getVersion = () => {
    try {
        const data = JSON.parse(fs.readFileSync(VERSION_PATH));
        return data.version;
    } catch (e) {
        return '1.4.0';
    }
};

// Multer Storage for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const targetDir = resolveAllowedPath(req.query.path || '/root');
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            cb(null, targetDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:21999', credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'sidvps-premium-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
});
app.use(sessionMiddleware);

// --- WebSocket Terminal Logic ---
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
    console.log('[Terminal] New client connected');

    // Spawn a real login shell starting at /root
    const shell = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: '/root',
        env: process.env
    });

    ws.on('message', (msg) => {
        shell.write(msg);
    });

    shell.on('data', (data) => {
        ws.send(data);
    });

    ws.on('close', () => {
        console.log('[Terminal] Client disconnected');
        shell.kill();
    });
});

// Upgrade HTTP to WS
server.on('upgrade', (request, socket, head) => {
    // Check session before upgrading
    sessionMiddleware(request, {}, () => {
        if (!request.session.user) {
            console.log('[Terminal] Unauthorized WS connection attempt');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// --- Helper: Read/Write User (SQLite) ---
const getAdmin = () => db.prepare("SELECT * FROM users WHERE role = 'root' LIMIT 1").get();
const getUserByName = (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username);
const saveUser = (user) => db.prepare('INSERT INTO users (username, email, server_ip, salt, hash, role) VALUES (@username, @email, @server_ip, @salt, @hash, @role)').run(user);
const updateLegacyUser = (username, salt, hash) => db.prepare('UPDATE users SET salt = @salt, hash = @hash WHERE username = @username').run({ username, salt, hash });

// --- Middleware: Check Auth ---
const checkAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

// --- REST APIs ---

// --- Helper: Passwords ---
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
};

const verifyPassword = (password, hash, salt) => {
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return checkHash === hash;
};

// 1. Check Setup
app.get('/api/auth/check-setup', (req, res) => {
    res.json({ needsSetup: !getAdmin() });
});

app.get('/api/system/ip', (req, res) => {
    execFile('curl', ['-s', 'ifconfig.me'], { timeout: 5000 }, (err, stdout) => {
        res.json({ ip: err ? '127.0.0.1' : stdout.trim() });
    });
});

// 2. Setup
app.post('/api/auth/setup', authLimiter, (req, res) => {
    if (getAdmin()) return res.status(400).json({ error: 'Admin account already exists.' });
    const { user, pass, email, ip } = req.body;
    if (!user || !pass || !email) return res.status(400).json({ error: 'Invalid data. Email is required.' });

    const { salt, hash } = hashPassword(pass);
    saveUser({ username: user, email, server_ip: ip, salt, hash, role: 'root' });
    res.json({ success: true, message: 'Account created successfully.' });
});

// 3. Login
app.post('/api/auth/login', authLimiter, (req, res) => {
    const { user, pass } = req.body;
    const admin = getUserByName(user);

    if (admin && admin.salt && admin.hash && verifyPassword(pass, admin.hash, admin.salt)) {
        req.session.user = { username: admin.username, role: admin.role };
        res.json({ success: true, user: req.session.user });
    } else if (admin && admin.password === pass && !admin.salt) {
        // Fallback & Auto-migration for legacy plain-text
        const { salt, hash } = hashPassword(pass);
        updateLegacyUser(admin.username, salt, hash);
        req.session.user = { username: admin.username, role: admin.role };
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ error: 'Invalid username or password.' });
    }
});

// 4. Me
app.get('/api/auth/me', (req, res) => {
    if (req.session.user) res.json({ user: req.session.user });
    else res.status(401).json({ error: 'Not logged in' });
});

// 5. System Info & Version
app.get('/api/system/info', checkAuth, (req, res) => {
    execFile('sidvps', ['--json'], { timeout: 10000 }, (err, stdout) => {
        let sysInfo = {};
        try { sysInfo = JSON.parse(stdout); } catch (e) { sysInfo = { uptime: 'N/A', ip: 'N/A' }; }
        res.json({
            ...sysInfo,
            version: getVersion(),
            latest_version: getVersion()
        });
    });
});

// 6. Real-time System Stats (CPU, RAM, Disk)
app.get('/api/system/stats', checkAuth, (req, res) => {
    const cmd = `
        echo "CPU:" $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}');
        echo "RAM:" $(free -m | grep Mem | awk '{print $2 "," $3}');
        echo "DISK:" $(df -m / | awk 'NR==2 {print $2 "," $3}');
    `;
    execFile('bash', ['-c', cmd], { timeout: 10000 }, (err, stdout) => {
        const lines = (stdout || '').trim().split('\n');
        const stats = { cpu: 0, ram: { total: 0, used: 0 }, disk: { total: 0, used: 0 } };
        lines.forEach(line => {
            if (line.startsWith('CPU:')) stats.cpu = parseFloat(line.split(':')[1].trim()) || 0;
            if (line.startsWith('RAM:')) {
                const parts = line.split(':')[1].trim().split(',');
                stats.ram.total = parseInt(parts[0]) || 0;
                stats.ram.used = parseInt(parts[1]) || 0;
            }
            if (line.startsWith('DISK:')) {
                const parts = line.split(':')[1].trim().split(',');
                stats.disk.total = parseInt(parts[0]) || 0;
                stats.disk.used = parseInt(parts[1]) || 0;
            }
        });
        res.json(stats);
    });
});

// 7. Service Management
app.get('/api/system/services', checkAuth, (req, res) => {
    const services = ['nginx', 'mysql', 'php-fpm', 'sidvps-ui'];
    const results = [];
    let count = 0;
    services.forEach(svc => {
        execFile('systemctl', ['is-active', svc], (err, stdout) => {
            results.push({ name: svc, status: stdout.trim() });
            if (++count === services.length) res.json(results);
        });
    });
});

app.post('/api/system/service-action', checkAuth, (req, res) => {
    const { service, action } = req.body;
    if (!['start', 'stop', 'restart'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    if (!VALID_SERVICES.includes(service)) return res.status(400).json({ error: 'Invalid service' });

    execFile('sudo', ['systemctl', action, service], (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr || err.message });
        res.json({ success: true, message: `${service} ${action}ed.` });
    });
});

// 7.1 Process Management
app.get('/api/system/processes', checkAuth, (req, res) => {
    // Get top 50 processes by CPU usage
    const cmd = `ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 51 | tail -n +2`;
    exec(cmd, (err, stdout) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = stdout.trim().split('\n');
        const processes = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
                pid: parts[0],
                user: parts[1],
                cpu: parts[2],
                mem: parts[3],
                command: parts.slice(4).join(' ')
            };
        });
        res.json(processes);
    });
});

app.post('/api/system/process-kill', checkAuth, (req, res) => {
    const { pid } = req.body;
    const pidNum = Number(pid);
    if (!Number.isInteger(pidNum) || pidNum <= 1) return res.status(400).json({ error: 'Invalid PID' });

    execFile('sudo', ['kill', '-9', String(pidNum)], (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr || err.message });
        res.json({ success: true, message: `Process ${pidNum} killed.` });
    });
});

// 8. Remote Version Check
app.get('/api/system/check-updates', checkAuth, (req, res) => {
    const remoteUrl = 'https://raw.githubusercontent.com/huanth/sidvps/main/version.json';
    execFile('curl', ['-s', remoteUrl], (err, stdout) => {
        if (err) return res.json({ available: false, error: 'Cannot reach update server' });
        try {
            const remote = JSON.parse(stdout);
            const local = getVersion();
            res.json({
                current: local,
                latest: remote.version,
                available: remote.version !== local
            });
        } catch (e) {
            res.json({ available: false, error: 'Invalid update data' });
        }
    });
});

// 9. App Stack Installer
app.post('/api/system/apps-install', checkAuth, requireRoot, (req, res) => {
    const { app: appName, version = 'default' } = req.body;
    const allowedApps = ['nginx', 'apache', 'mysql', 'php', 'phpmyadmin', 'nodejs', 'python'];

    if (!allowedApps.includes(appName)) return res.status(400).json({ error: 'Unsupported application' });

    let script = '';

    if (appName === 'nginx') {
        script = 'sudo apt-get update && sudo apt-get install -y nginx';
    } else if (appName === 'apache') {
        script = 'sudo apt-get update && sudo apt-get install -y apache2';
    } else if (appName === 'mysql') {
        if (!/^[\w.-]+$/.test(version) && version !== 'default') return res.status(400).json({ error: 'Invalid version' });
        const pkg = version === 'default' ? 'mysql-server' : (version.includes('mariadb') ? version : `mysql-server-${version}`);
        script = `sudo apt-get update && sudo apt-get install -y ${pkg}`;
    } else if (appName === 'php') {
        if (!/^\d+(\.\d+)?$/.test(version) && version !== 'default') return res.status(400).json({ error: 'Invalid PHP version' });
        const phpVer = version === 'default' ? '8.1' : version;
        script = `sudo apt-get update && sudo apt-get install -y software-properties-common && sudo add-apt-repository -y ppa:ondrej/php && sudo apt-get update && sudo apt-get install -y php${phpVer}-fpm php${phpVer}-mysql php${phpVer}-cli php${phpVer}-common php${phpVer}-mbstring php${phpVer}-xml`;
    } else if (appName === 'phpmyadmin') {
        script = 'sudo apt-get update && sudo apt-get install -y phpmyadmin';
    } else if (appName === 'nodejs') {
        if (!/^\d+$/.test(version) && version !== 'default') return res.status(400).json({ error: 'Invalid Node version' });
        const nodeVer = version === 'default' ? '20' : version;
        script = `curl -fsSL https://deb.nodesource.com/setup_${nodeVer}.x | sudo -E bash - && sudo apt-get install -y nodejs`;
    } else if (appName === 'python') {
        script = 'sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv';
    }

    if (!script) return res.status(400).json({ error: 'Unsupported application or version' });

    execFile('bash', ['-c', script], { timeout: 30 * 60 * 1000 }, (err, stdout, stderr) => {
        if (err) console.error(`[Installer] ${appName} failed:`, stderr);
        else console.log(`[Installer] ${appName} success.`);
    });

    res.json({ success: true, message: `Installation of ${appName} started in background.` });
});

// 10. File Manager APIs
app.get('/api/files/list', checkAuth, (req, res) => {
    let targetDir;
    try {
        targetDir = resolveAllowedPath(req.query.path || '/root');
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    if (!fs.existsSync(targetDir)) return res.status(404).json({ error: 'Path not found' });

    fs.readdir(targetDir, { withFileTypes: true }, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            path: path.join(targetDir, file.name)
        }));
        res.json(results);
    });
});

app.get('/api/files/read', checkAuth, (req, res) => {
    let filePath;
    try {
        filePath = resolveAllowedPath(req.query.path);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ content: data });
    });
});

app.post('/api/files/write', checkAuth, (req, res) => {
    const { path: rawPath, content } = req.body;
    let filePath;
    try {
        filePath = resolveAllowedPath(rawPath);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/files/upload', checkAuth, upload.single('file'), (req, res) => {
    // Multer handles the storage in its diskStorage config
    res.json({ success: true, file: req.file });
});

app.post('/api/files/delete', checkAuth, (req, res) => {
    const { path: rawPath } = req.body;
    let targetPath;
    try {
        targetPath = resolveAllowedPath(rawPath);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    fs.rm(targetPath, { recursive: true, force: true }, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/files/rename', checkAuth, (req, res) => {
    const { oldPath: rawOldPath, newPath: rawNewPath } = req.body;
    let oldPath;
    let newPath;
    try {
        oldPath = resolveAllowedPath(rawOldPath);
        newPath = resolveAllowedPath(rawNewPath);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/files/mkdir', checkAuth, (req, res) => {
    const { path: rawPath } = req.body;
    let targetDir;
    try {
        targetDir = resolveAllowedPath(rawPath);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    fs.mkdir(targetDir, { recursive: true }, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

const requireRoot = (req, res, next) => {
    if (req.session.user?.role === 'root') return next();
    res.status(403).json({ error: 'Forbidden' });
};

const safeExecFile = (file, args, cb) => execFile(file, args, { timeout: 5 * 60 * 1000 }, cb);

// --- Helper: Domains Storage (SQLite) ---
const getDomains = () => db.prepare('SELECT * FROM domains').all();
const addDomain = (domainObj) => db.prepare('INSERT INTO domains (domain, root, type, port, ssl, created_at) VALUES (@domain, @root, @type, @port, 0, datetime("now"))').run(domainObj);
const updateDomainSSL = (domainName) => db.prepare('UPDATE domains SET ssl = 1 WHERE domain = ?').run(domainName);

// 11. Domain & SSL APIs
app.get('/api/domains/list', checkAuth, (req, res) => {
    res.json(getDomains().map(d => ({ ...d, ssl: d.ssl === 1 })));
});

app.post('/api/domains/add', checkAuth, requireRoot, (req, res) => {
    const { domain, root, type = 'php', port = 0, phpVersion = '8.1', webServer = 'nginx' } = req.body;
    if (!domain || !root) return res.status(400).json({ error: 'Domain and Root are required' });
    if (!isValidDomain(domain)) return res.status(400).json({ error: 'Invalid domain' });

    let resolvedRoot;
    try {
        resolvedRoot = resolveAllowedPath(root);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    const portNum = Number(port);
    if ((type === 'node' || type === 'python') && !isValidPort(portNum)) return res.status(400).json({ error: 'Invalid port' });

    const allowedWebServers = ['nginx', 'apache'];
    if (!allowedWebServers.includes(webServer)) return res.status(400).json({ error: 'Invalid web server' });

    const allowedTypes = ['php', 'node', 'python'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ error: 'Invalid type' });

    if (type === 'php' && !/^\d+(\.\d+)?$/.test(String(phpVersion))) return res.status(400).json({ error: 'Invalid PHP version' });

    const safeDomain = domain.trim();
    const safeRoot = resolvedRoot;

    let configStr = '';
    let configPath = '';

    if (webServer === 'apache') {
        let proxyConfig = '';
        if (type === 'php') {
            proxyConfig = `
    <FilesMatch \\.php$>
        SetHandler "proxy:unix:/var/run/php/php${phpVersion}-fpm.sock|fcgi://localhost"
    </FilesMatch>`;
        } else if (type === 'node' || type === 'python') {
            proxyConfig = `
    ProxyPass / http://127.0.0.1:${port}/
    ProxyPassReverse / http://127.0.0.1:${port}/`;
        }

        configStr = `
<VirtualHost *:80>
    ServerName ${domain}
    DocumentRoot ${root}
    <Directory ${root}>
        AllowOverride All
        Require all granted
    </Directory>
${proxyConfig}
</VirtualHost>`;
        configPath = `/etc/apache2/sites-available/${domain}.conf`;

    } else {
        // Nginx configuration (default)
        let proxyConfig = '';
        let indexConfig = 'index index.html index.php;';

        if (type === 'php') {
            proxyConfig = `
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php${phpVersion}-fpm.sock;
    }`;
        } else if (type === 'node' || type === 'python') {
            indexConfig = '';
            proxyConfig = `
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }`;
        }

        configStr = `
server {
    listen 80;
    server_name ${domain};
    root ${root};
    ${indexConfig}

    location / {
        try_files $uri $uri/ =404;
    }
${proxyConfig}
}`;
        configPath = `/etc/nginx/sites-enabled/${domain}`;
    }

    try {
        addDomain({ domain: safeDomain, root: safeRoot, type, port });
        res.json({ success: true, message: `Website ${safeDomain} deployed as ${type.toUpperCase()} on ${webServer.toUpperCase()}` });
    } catch (e) {
        res.status(400).json({ error: 'Domain already exists or DB error.' });
    }
});

app.post('/api/domains/ssl', checkAuth, requireRoot, (req, res) => {
    const { domain } = req.body;
    if (!isValidDomain(domain)) return res.status(400).json({ error: 'Invalid domain' });

    safeExecFile('sudo', ['certbot', '--nginx', '-d', domain, '--non-interactive', '--agree-tos', '-m', `admin@${domain}`], (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr || err.message });

        updateDomainSSL(domain);
        res.json({ success: true, message: `SSL enabled for ${domain}.` });
    });
});

// 12. Database Management APIs
const getDatabases = () => db.prepare('SELECT * FROM databases').all();
const addDatabase = (dbObj) => db.prepare('INSERT INTO databases (dbname, username, password, created_at) VALUES (@dbname, @username, @password, datetime("now"))').run(dbObj);

app.get('/api/databases/list', checkAuth, (req, res) => {
    res.json(getDatabases());
});

app.post('/api/databases/create', checkAuth, requireRoot, async (req, res) => {
    const { dbname, username, password } = req.body;
    if (!dbname || !username || !password) return res.status(400).json({ error: 'Database name, username, and password required' });
    if (!isValidIdentifier(dbname) || !isValidIdentifier(username)) return res.status(400).json({ error: 'Invalid database or username format' });

    if (!mysqlPool) return res.status(503).json({ error: 'MySQL not configured. Set MYSQL_HOST in .env' });

    let connection;
    try {
        connection = await mysqlPool.getConnection();
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbname}\``);
        await connection.query(`CREATE USER IF NOT EXISTS ?@'localhost' IDENTIFIED BY ?`, [username, password]);
        await connection.query(`GRANT ALL PRIVILEGES ON \`${dbname}\`.* TO ?@'localhost'`, [username]);
        await connection.query('FLUSH PRIVILEGES');

        addDatabase({ dbname, username, password });
        res.json({ success: true, message: `Database ${dbname} created successfully.` });
    } catch (err) {
        console.error('[MySQL Error]', err);
        res.status(500).json({ error: 'Database creation failed: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// 12. Update Trigger
app.post('/api/system/update', checkAuth, requireRoot, (req, res) => {
    console.log('[Update] Triggering system update...');
    const updateScript = path.join(__dirname, '../scripts/update.sh');

    if (!fs.existsSync(updateScript)) {
        return res.status(500).json({ error: 'Update script not found' });
    }

    safeExecFile('bash', [updateScript], (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr || err.message });
        res.json({ success: true, message: 'Updated. Restarting...' });
        setTimeout(() => {
            execFile('sudo', ['systemctl', 'restart', 'sidvps-ui'], () => {});
        }, 5000);
    });
});

// 10. Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- Integration: Static Files ---

const frontendDist = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // Fallback for Vue Router
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    app.get('*', (req, res) => res.send('API Backend is running. Frontend Vue builds missing!'));
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] SidVPS v1.4.0 - Cosmic Explorer - Running on ${PORT} ✨`);
});
