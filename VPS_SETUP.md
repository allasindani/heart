# VPS Setup Guide for Heart Connect

## 1. Nginx Configuration
Create or edit your config:
`sudo nano /etc/nginx/conf.d/heart-connect.conf`

Paste this:
```nginx
server {
    listen 80;
    server_name chat.opramixes.com;

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
