# VPS Setup Guide for Heart Connect

## 1. Nginx Configuration
Create or edit your config:
`sudo nano /etc/nginx/conf.d/heart-connect.conf`

Paste this (Full SSL Block):
```nginx
server {
    listen 80;
    server_name chat.opramixes.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name chat.opramixes.com;

    ssl_certificate /etc/letsencrypt/live/chat.opramixes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.opramixes.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

## 2. FIX: Host Blocked / Port Busy
If the "Blocked Host" error persists, **execute these exact commands** in order:

```bash
cd /home/heart

# 1. Kill everything running
pm2 stop all || true
pkill -f tsx || true
pkill -f node || true

# 2. Delete the manual JS config (THIS IS THE MAIN CONFLICT)
rm -f vite.config.js

# 3. Pull the latest fixes
./update.sh

# 4. Start fresh
npm run start
```
*Note: The project uses `vite.config.ts`. If you manually created `vite.config.js` on the server, it blocks the correct configuration.*

## 3. Apply Nginx & SSL Settings (Manual Block)
```bash
sudo nginx -t
sudo systemctl reload nginx
# Since you hit the rate limit for new certs, use 'reinstall'
sudo certbot --nginx -d chat.opramixes.com
```

## 3. Update the App
Run your update script:
```bash
cd /home/heart
./update.sh
```
