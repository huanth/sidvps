# SidVPS - Advanced VPS Manager Dashboard 🚀

![SidVPS Dashboard](https://raw.githubusercontent.com/huanth/sidvps/main/logo.png) <!-- Replace with actual image link if available -->

**SidVPS** is a lightweight, powerful Linux server management toolkit (Debian/Ubuntu) featuring a modern Web interface (Vue 3) and high-performance Backend (Node.js). It supports system management via both CLI and a Web Dashboard.

## ✨ Highlights

- **Vue SPA Interface:** Built with Vue 3 + Vite, featuring a premium Glassmorphism design.
- **Node.js REST API:** Real-time data processing backend, secured with Session management.
- **CLI Tool:** The `sidvps` command set for quick terminal-based operations.
- **1-Click Installer:** Automated environment setup (Node.js 20, Systemd, Firewall).
- **Real-time Stats:** Monitor Server IP, System Uptime, and system status instantly.

## 🛠️ System Requirements

- **OS:** Ubuntu 20.04+ / Debian 11+
- **Access:** Root or Sudo privileges

## 🚀 Quick Install

Open your VPS terminal and paste the following command:

```bash
curl -sL https://sidvps.nauhyuh.top/install.sh | bash
```

## 📖 Usage Guide

### 1. Web Dashboard
After successful installation, access the dashboard at:
`http://YOUR_SERVER_IP:21999`

- **First-time Access:** The system will prompt you to create an Admin account.
- **Recommended Browsers:** Chrome, Edge, or Brave for the best experience with the Glassmorphism effects.

### 2. CLI Manager
Type the following command in your terminal to open the management menu:
```bash
sidvps
```

## 🏗️ Project Architecture

- **Frontend:** Vue 3, Vite, Vue Router (Single Page Application).
- **Backend:** Node.js, Express, RESTful API.
- **Service:** Managed automatically by `systemd` (sidvps-ui.service).
- **Security:** Integrated with `cors`, `express-session`, and `ufw`.

---
Designed and developed by [HuanTH](https://github.com/huanth).
