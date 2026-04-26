# VPS RESCUE GUIDE (PORT 3007 + SSL)

## 1. AGGRESSIVE CLEANUP (Kill any process blocking Port 3007)
You must stop the old version of the app to free up the port.
```bash
# 1. CD to project
cd /home/heart

# 2. Stop PM2 completely
pm2 stop all || true
pm2 delete all || true

# 3. Force kill any hidden node/tsx processes
sudo pkill -9 node || true
sudo pkill -9 tsx || true

# 4. Final check (should return NOTHING)
sudo lsof -i :3007
```

## 2. CONFIG CLEANUP
```bash
rm -f /home/heart/vite.config.js
```

## 3. NGINX SSL CONFIG (Port 3007)
Run `sudo nano /etc/nginx/conf.d/heart-connect.conf`
**ERASE EVERYTHING** and paste this block:

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

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`

## 4. START THE APP (Port 3007)
Run this EXACT command:
```bash
PORT=3007 NODE_ENV=production pm2 start "npm run start" --name "heart-connect"
```

## 5. CHECK LOGS
```bash
pm2 logs heart-connect
```
**You should see:** `Listening on port: 3007`.
If you still see 502, check Nginx errors: `sudo tail -f /var/log/nginx/error.log`
