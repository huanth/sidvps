const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 21999;
const DB_PATH = path.join(__dirname, 'users.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'sidvps-secret-key',
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
    res.redirect('/login');
};

// --- ROUTES ---

// 1. Trang chủ (Dashboard)
app.get('/', checkAuth, (req, res) => {
    exec('sidvps --json', (err, stdout) => {
        let sysInfo = {};
        try { sysInfo = JSON.parse(stdout); } catch (e) { sysInfo = { uptime: 'N/A', ip: 'N/A' }; }

        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SidVPS - Control Panel</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
                    body {
                        background: #0b0f19;
                        color: #fff;
                        min-height: 100vh;
                        padding: 40px 20px;
                        background-image: 
                            radial-gradient(circle at 15% 50%, rgba(0, 242, 254, 0.08), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(79, 172, 254, 0.08), transparent 25%);
                    }
                    .container { max-width: 900px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                    .logo { font-size: 28px; font-weight: 600; background: -webkit-linear-gradient(#00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1px; }
                    .user-info { display: flex; align-items: center; gap: 20px; }
                    @media (max-width: 600px) {
                        .header { flex-direction: column; gap: 20px; text-align: center; }
                        .user-info { flex-direction: column; }
                    }
                    .user-name { font-weight: 300; color: #ccc; }
                    .user-name b { color: #fff; font-weight: 600; }
                    .btn-logout { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.3s ease; border: 1px solid rgba(255, 77, 77, 0.3); }
                    .btn-logout:hover { background: #ff4d4d; color: #fff; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255, 77, 77, 0.3); }
                    
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
                    .card {
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 20px;
                        padding: 30px;
                        backdrop-filter: blur(10px);
                        transition: transform 0.3s ease, border-color 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .card:hover { transform: translateY(-5px); border-color: rgba(0, 242, 254, 0.3); }
                    .card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #4facfe, #00f2fe); }
                    
                    .card-title { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                    .card-value { font-size: 28px; font-weight: 600; color: #fff; }
                    
                    .footer { text-align: center; margin-top: 60px; color: #555; font-size: 13px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">SidVPS Dashboard</div>
                        <div class="user-info">
                            <span class="user-name">Xin chào, <b>${req.session.user.username}</b> (Admin)</span>
                            <a href="/logout" class="btn-logout">Đăng Xuất</a>
                        </div>
                    </div>
                    
                    <div class="grid">
                        <div class="card">
                            <div class="card-title">Địa Chỉ IP Máy Chủ</div>
                            <div class="card-value">${sysInfo.ip}</div>
                        </div>
                        <div class="card">
                            <div class="card-title">Thời Gian Hoạt Động</div>
                            <div class="card-value">${sysInfo.uptime}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        &copy; 2026 SidVPS Manager. Giao diện quản trị viên nền tảng Web.
                    </div>
                </div>
            </body>
            </html>
        `);
    });
});

// 2. Login & Setup
app.get('/login', (req, res) => {
    const users = getUsers();
    const errorMsg = req.query.error ? '<p style="color:#ff4d4d; background: rgba(255, 77, 77, 0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(255, 77, 77, 0.3); font-size: 14px; margin-bottom: 20px;">Sai tên đăng nhập hoặc mật khẩu!</p>' : '';
    const successMsg = req.query.setup ? '<p style="color:#00f2fe; background: rgba(0, 242, 254, 0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(0, 242, 254, 0.3); font-size: 14px; margin-bottom: 20px;">Khởi tạo thành công! Hãy đăng nhập.</p>' : '';

    const commonHead = `
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SidVPS - Access</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
                body {
                    background: linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #0f2027);
                    background-size: 400% 400%;
                    animation: gradientBG 15s ease infinite;
                    color: white; display: flex; justify-content: center; align-items: center; height: 100vh;
                }
                @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 20px;
                    padding: 50px 40px;
                    width: 380px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
                    text-align: center;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .glass-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); }
                h2 { margin-bottom: 5px; font-weight: 600; font-size: 26px; background: -webkit-linear-gradient(#00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                p.sub-text { color: #aaa; font-weight: 300; font-size: 14px; margin-bottom: 25px; }
                .input-group { margin-bottom: 20px; text-align: left; }
                input {
                    width: 100%; padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(0, 0, 0, 0.2); color: white; outline: none; font-size: 15px; transition: all 0.3s ease;
                }
                input:focus { border-color: #00f2fe; box-shadow: 0 0 10px rgba(0, 242, 254, 0.2); background: rgba(0, 0, 0, 0.4); }
                input::placeholder { color: rgba(255, 255, 255, 0.4); }
                button {
                    width: 100%; padding: 12px; border-radius: 10px; border: none; font-weight: 600; font-size: 16px; cursor: pointer;
                    background: linear-gradient(90deg, #4facfe, #00f2fe); color: white;
                    transition: all 0.3s ease; box-shadow: 0 5px 15px rgba(0, 242, 254, 0.3);
                }
                button:hover { background: linear-gradient(90deg, #00f2fe, #4facfe); transform: scale(1.02); box-shadow: 0 8px 20px rgba(0, 242, 254, 0.4); }
                button:active { transform: scale(0.98); }
            </style>
        </head>
    `;

    if (users.length === 0) {
        // Giao diện Setup lần đầu
        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            ${commonHead}
            <body>
                <div class="glass-card">
                    <h2>Khởi Tạo Admin</h2>
                    <p class="sub-text">Hệ thống lần đầu hoạt động. Vui lòng thiết lập tài khoản quản trị.</p>
                    <form method="POST" action="/setup">
                        <div class="input-group">
                            <input type="text" name="user" placeholder="Nhập Username" required autocomplete="off">
                        </div>
                        <div class="input-group">
                            <input type="password" name="pass" placeholder="Nhập Password" required>
                        </div>
                        <button type="submit">Bắt Đầu Sử Dụng</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } else {
        // Giao diện Login
        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            ${commonHead}
            <body>
                <div class="glass-card">
                    <h2>Đăng Nhập</h2>
                    <p class="sub-text">Chào mừng trở lại bảng điều khiển SidVPS.</p>
                    ${successMsg}
                    ${errorMsg}
                    <form method="POST" action="/login">
                        <div class="input-group">
                            <input type="text" name="user" placeholder="Username" required autocomplete="off">
                        </div>
                        <div class="input-group">
                            <input type="password" name="pass" placeholder="Password" required>
                        </div>
                        <button type="submit">Đăng Nhập</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }
});

// 3. Xử lý Setup
app.post('/setup', (req, res) => {
    if (getUsers().length > 0) return res.send('Đã có admin rồi!');
    const { user, pass } = req.body;
    saveUser({ username: user, password: pass, role: 'root' });
    res.redirect('/login?setup=success');
});

// 4. Xử lý Login
app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const admin = getUsers()[0];
    if (admin && admin.username === user && admin.password === pass) {
        req.session.user = admin;
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});

// 5. Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(PORT, '0.0.0.0', () => console.log(`Dashboard running on port ${PORT}`));
