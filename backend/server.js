const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const PORT = 21999;
const DB_PATH = path.join(__dirname, 'users.json');
const VERSION_PATH = path.join(__dirname, '../version.json');

// --- Helper: Get Version ---
const getVersion = () => {
    try {
        const data = JSON.parse(fs.readFileSync(VERSION_PATH));
        return data.version;
    } catch (e) {
        return '1.1.0';
    }
};

// Middleware
app.use(cors({ origin: true, credentials: true })); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const sessionMiddleware = session({
    secret: 'sidvps-premium-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } 
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
    // Note: Simple upgrade, real production should check session here
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// --- Helper: Read/Write User ---
const getUsers = () => fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH)) : [];
const saveUser = (user) => fs.writeFileSync(DB_PATH, JSON.stringify([user]));

// --- Middleware: Check Auth ---
const checkAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

// --- REST APIs ---

// 1. Check Setup
app.get('/api/auth/check-setup', (req, res) => {
    const users = getUsers();
    res.json({ needsSetup: users.length === 0 });
});

// 2. Setup
app.post('/api/auth/setup', (req, res) => {
    if (getUsers().length > 0) return res.status(400).json({ error: 'Admin account already exists.' });
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ error: 'Invalid data.' });
    
    saveUser({ username: user, password: pass, role: 'root' });
    res.json({ success: true, message: 'Account created successfully.' });
});

// 3. Login
app.post('/api/auth/login', (req, res) => {
    const { user, pass } = req.body;
    const admin = getUsers()[0];
    if (admin && admin.username === user && admin.password === pass) {
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
    exec('sidvps --json', (err, stdout) => {
        let sysInfo = {};
        try { sysInfo = JSON.parse(stdout); } catch (e) { sysInfo = { uptime: 'N/A', ip: 'N/A' }; }
        res.json({
            ...sysInfo,
            version: getVersion(),
            latest_version: getVersion() // Same for now
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
    exec(cmd, (err, stdout) => {
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
        exec(`systemctl is-active ${svc}`, (err, stdout) => {
            results.push({ name: svc, status: stdout.trim() });
            if (++count === services.length) res.json(results);
        });
    });
});

app.post('/api/system/service-action', checkAuth, (req, res) => {
    const { service, action } = req.body;
    if (!['start', 'stop', 'restart'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    exec(`sudo systemctl ${action} ${service}`, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr });
        res.json({ success: true, message: `${service} ${action}ed.` });
    });
});

// 8. Remote Version Check
app.get('/api/system/check-updates', checkAuth, (req, res) => {
    // We attempt to fetch from the specific Github raw URL
    const remoteUrl = 'https://raw.githubusercontent.com/huanth/sidvps/main/version.json';
    exec(`curl -s ${remoteUrl}`, (err, stdout) => {
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
app.post('/api/system/apps-install', checkAuth, (req, res) => {
    const { app: appName } = req.body;
    const scripts = {
        'nginx': 'sudo apt-get update && sudo apt-get install -y nginx',
        'apache': 'sudo apt-get update && sudo apt-get install -y apache2',
        'mysql': 'sudo apt-get update && sudo apt-get install -y mysql-server'
    };
    
    const script = scripts[appName];
    if (!script) return res.status(400).json({ error: 'Unsupported application' });

    // Use spawn to allow future output streaming if needed
    const child = exec(script, (err, stdout, stderr) => {
        if (err) console.error(`[Installer] ${appName} failed:`, stderr);
        else console.log(`[Installer] ${appName} success.`);
    });
    
    res.json({ success: true, message: `Installation of ${appName} started in background.` });
});

// 9. Update Trigger
app.post('/api/system/update', checkAuth, (req, res) => {
    console.log('[Update] Triggering system update...');
    const updateCmd = 'cd .. && git pull origin main && npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend';
    exec(updateCmd, (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr });
        res.json({ success: true, message: 'Updated. Restarting...' });
        setTimeout(() => { exec('sudo systemctl restart sidvps-ui'); }, 5000);
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

server.listen(PORT, '0.0.0.0', () => console.log(`[Backend] API + WS server running on ${PORT}`));
