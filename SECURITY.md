# SidVPS Security & Production Guide 🛡️

## 1. Production Configuration (.env)

Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=production
SESSION_SECRET=your-secure-random-secret
ALLOWED_ORIGIN=https://your-domain.com

# MySQL (required for DB management features)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your-root-password
```

## 2. HTTPS/TLS Setup (Recommended)

Always run SidVPS behind a reverse proxy for HTTPS support.

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name vps-admin.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name vps-admin.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/vps-admin.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps-admin.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:21999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 3. Security Hardening

- **Firewall:** Ensure port 21999 is blocked from public access if using a reverse proxy.
- **SSH:** Use SSH keys instead of passwords for the root account.
- **Updates:** Run `npm run update` from the root directory or use the Web Dashboard update button.
