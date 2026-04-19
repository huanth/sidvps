const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 21999;
const DB_PATH = path.join(__dirname, 'users.json');

// Middleware
app.use(cors({ origin: true, credentials: true })); // Hỗ trợ frontend gọi API local
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'sidvps-premium-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 tiếng
}));

// --- Helper: Đọc/Ghi User ---
const getUsers = () => fs.existsSync(DB_PATH) ? JSON.parse(fs.readFileSync(DB_PATH)) : [];
const saveUser = (user) => fs.writeFileSync(DB_PATH, JSON.stringify([user]));

// --- Middleware kiểm tra Login ---
const checkAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.status(401).json({ error: 'Unauthorized' });
};

// --- REST APIs ---

// 1. Kiểm tra phải Setup không
app.get('/api/auth/check-setup', (req, res) => {
    const users = getUsers();
    res.json({ needsSetup: users.length === 0 });
});

// 2. Tái tạo Setup
app.post('/api/auth/setup', (req, res) => {
    if (getUsers().length > 0) return res.status(400).json({ error: 'Đã tồn tại tài khoản Admin.' });
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    
    saveUser({ username: user, password: pass, role: 'root' });
    res.json({ success: true, message: 'Tạo tài khoản thành công.' });
});

// 3. Xử lý Login Trả về JSON
app.post('/api/auth/login', (req, res) => {
    const { user, pass } = req.body;
    const admin = getUsers()[0];
    if (admin && admin.username === user && admin.password === pass) {
        req.session.user = { username: admin.username, role: admin.role };
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu.' });
    }
});

// 4. GET me (check session state FE)
app.get('/api/auth/me', (req, res) => {
    if (req.session.user) res.json({ user: req.session.user });
    else res.status(401).json({ error: 'Not logged in' });
});

// 5. Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 6. Lấy dữ liệu hệ thống (Yêu cầu Login)
app.get('/api/system/status', checkAuth, (req, res) => {
    exec('sidvps --json', (err, stdout) => {
        let sysInfo = {};
        try { 
            sysInfo = JSON.parse(stdout); 
        } catch (e) { 
            sysInfo = { uptime: 'Fake-Mock-Uptime', ip: '127.0.0.1' }; 
        }
        res.json(sysInfo);
    });
});

// --- Tích hợp Frontend ---
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    
    // Fallback cho Vue-Router HTML5 mode
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    // Để quá trình dev BE không bị lỗi báo 404
    app.get('*', (req, res) => res.send('API Backend is running. Frontend Vue builds missing!'));
}

app.listen(PORT, '0.0.0.0', () => console.log(\`[Backend] API server running on \${PORT}\`));
