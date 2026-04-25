#!/bin/bash

# One-click deployment script for Heart Connect on VPS
echo "🚀 Starting deployment for Heart Connect..."

# 1. Pull latest code
echo "📥 Syncing with GitHub..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Clean and Build
echo "🏗️ Building production assets..."
rm -rf dist
npm run build

# 4. Generate update bundle (for Capacitor apps)
echo "📂 Creating update bundle..."
npm run bundle-update

# 5. Restart with PM2
echo "♻️ Restarting app with PM2..."
# We use port 3005 as seen in your logs
NODE_ENV=production PORT=3005 pm2 restart heart-connect --update-env

echo "✅ Deployment complete! Visit your site."
