# VPS RESCUE GUIDE (PORT 3007 + SSL)

## 1. KILL ALL STUCK PROCESSES
Since you are getting "Port already in use" or "502 Bad Gateway", we must stop everything.
```bash
cd /home/heart

# Stop any running PM2 sites
pm2 stop all || true
pm2 delete all || true

# Kill any hidden node/tsx processes
pkill -9 node || true
pkill -9 tsx || true

# Verify port 3007 is clear (should show nothing)
sudo lsof -i :3007
```

## 2. CONFIG CLEANUP
Vite is confused by your manual `.js` file.
```bash
rm -f /home/heart/vite.config.js
```

## 3. NGINX SSL CONFIG (PASTE THIS)
Run `sudo nano /etc/nginx/conf.d/heart-connect.conf`
**ERASE EVERYTHING** and paste this block (using **Port 3007**):

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

    client_max_body_size 50M;
}
```

Then reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. START THE APP (FRESH)
Execute these two lines:
```bash
pm2 delete heart-connect || true
PORT=3007 NODE_ENV=production pm2 start "npm run start" --name "heart-connect"
```

## 5. VERIFY IT IS ACTUALLY RUNNING
Run this command to see the real-time logs:
```bash
pm2 logs heart-connect
```
**If you see "Listening on 3007", it is working.**
If it says "Error: EADDRINUSE", it means you didn't kill the old process correctly. Run `pkill -9 node` and try again.

**If you see 502 again:**
Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
