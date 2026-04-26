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

## 2. Fix Host Blocked Error & Config Conflict
If you see "Blocked request. This host (chat.opramixes.com) is not allowed":

1. **Delete the manual config you created**:
   ```bash
   rm /home/heart/vite.config.js
   ```
   *The project uses `vite.config.ts`, but Vite was picking up your manually created `.js` file which had errors.*

2. **Stop any existing stalled processes**:
   ```bash
   pm2 stop heart-connect
   # or
   killall node
   ```

3. **Pull the latest update (which has the fix)**:
   ```bash
   ./update.sh
   ```

## 3. Apply Nginx & SSL Settings
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
