# SidVPS - Advanced VPS Manager Dashboard 🚀

![SidVPS Dashboard](https://raw.githubusercontent.com/huanth/sidvps/main/logo.png) <!-- Bạn có thể thay link ảnh thực tế sau -->

**SidVPS** là bộ công cụ quản lý máy chủ Linux (Debian/Ubuntu) gọn nhẹ, mạnh mẽ với giao diện Web hiện đại (Vue 3) và Backend hiệu suất cao (Node.js). Hỗ trợ quản lý hệ thống thông qua cả giao diện CLI và Web Dashboard.

## ✨ Tính Năng Nổi Bật

- **Giao diện Web SPA:** Xây dựng bằng Vue 3 + Vite, hiệu ứng Glassmorphism sang trọng.
- **Node.js REST API:** Backend xử lý dữ liệu thời gian thực, bảo mật bằng Session.
- **CLI Tool:** Bộ lệnh `sidvps` thao tác nhanh ngay trên Terminal.
- **Cài đặt 1-Click:** Tự động hóa toàn bộ quy trình thiết lập môi trường (Node.js 20, Systemd, Firewall).
- **Thống kê thời gian thực:** Theo dõi IP Server, Uptime và trạng thái hệ thống.

## 🛠️ Yêu cầu hệ thống

- **Hệ điều hành:** Ubuntu 20.04+ / Debian 11+
- **Quyền hạn:** Root hoặc Sudo

## 🚀 Cài đặt nhanh

Mở Terminal trên VPS của bạn và dán dòng lệnh sau:

```bash
curl -sL https://sidvps.nauhyuh.top/install.sh | bash
```

## 📖 Hướng sử dụng

### 1. Web Dashboard
Sau khi cài đặt thành công, truy cập vào đường dẫn:
`http://IP_CUA_BAN:21999`

- **Lần đầu truy cập:** Hệ thống sẽ yêu cầu bạn khởi tạo tài khoản Admin.
- **Trình duyệt khuyến nghị:** Chrome, Edge hoặc Brave để có trải nghiệm hiệu ứng Glassmorphism tốt nhất.

### 2. CLI Manager
Gõ lệnh sau trên Terminal để mở menu quản lý nhanh:
```bash
sidvps
```

## 🏗️ Kiến trúc dự án

- **Frontend:** Vue 3, Vite, Vue Router (Single Page Application).
- **Backend:** Node.js, Express, RESTful API.
- **Service:** Quản lý tự động bởi `systemd` (sidvps-ui.service).
- **Security:** Tích hợp `cors`, `express-session`, `ufw`.

---
Thiết kế và phát triển bởi [HuanTH](https://github.com/huanth).
