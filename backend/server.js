const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = 21999;
const DB_PATH = path.join(__dirname, 'users.json');
const VERSION_PATH = path.join(__dirname, '../version.json');

// --- Helper: Get Version ---
const getVersion = () => {
    try {
        return JSON.parse(fs.readFileSync(VERSION_PATH)).version;
    } catch (e) {
        return 'v1.0.0';
    }
};

// Middleware
app.use(cors({ origin: true, credentials: true })); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'sidvps-premium-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } 
}));

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
            latest_version: 'v1.0.0' // Mocking latest, in reality fetch from Github
        });
    });
});

// 6. Update Trigger
app.post('/api/system/update', checkAuth, (req, res) => {
    console.log('[Update] Triggering system update...');
    // We run the update sequence in background
    const updateCmd = 'cd .. && git pull origin main && npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend';
    
    exec(updateCmd, (err, stdout, stderr) => {
        if (err) {
            console.error('[Update Error]', stderr);
            return res.json({ success: false, error: stderr });
        }
        console.log('[Update Success] System updated. Restarting in 5s...');
        res.json({ success: true, message: 'Update success. System will restart.' });
        
        // Attempt restart after response
        setTimeout(() => {
            exec('sudo systemctl restart sidvps-ui');
        }, 5000);
    });
});

// 7. Logout
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

app.listen(PORT, '0.0.0.0', () => console.log(`[Backend] API server running on ${PORT}`));
