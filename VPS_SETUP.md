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

## 2. Fix Node Errors
If you see "Port 3005 in use", run:
```bash
pm2 stop heart-connect
```
Then delete the broken js config:
```bash
rm /home/heart/vite.config.js
```

## 2. Apply & SSL
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
