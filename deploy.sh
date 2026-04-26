#!/bin/bash

# Robust VPS deployment script for Heart Connect
echo "🚀 [1/5] Starting Heart Connect Deployment..."

# Get current script directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

# Fix Git ownership issue seen in logs
git config --global --add safe.directory "$(pwd)"

echo "📂 Working in: $(pwd)"

# 1. Pull latest code
echo "📥 [2/5] Fetching latest changes from GitHub..."
git fetch --all
git reset --hard origin/main

# 2. Install dependencies
echo "📦 [3/5] Installing dependencies..."
npm install

# 3. Build & Create Bundle
echo "🏗️ [4/5] Building production assets & APK updates..."
npm run build
npm run bundle-update

# 4. Restart with PM2
echo "♻️ [5/5] Refreshing server (Port 3005)..."
# Force kill anything on 3005 if needed (optional)
# sudo fuser -k 3005/tcp 2>/dev/null 

NODE_ENV=production PORT=3005 pm2 restart heart-connect --update-env || pm2 start server.ts --name heart-connect --interpreter npx --interpreter-args tsx

echo "⏳ Waiting for server to warm up..."
sleep 5

echo "🛠️ Checking if Port 3005 is active..."
if ! command -v netstat &> /dev/null; then
    echo "netstat not found, skipping port check."
else
    netstat -tuln | grep :3005 || echo "❌ PORT 3005 IS NOT LISTENING!"
fi

echo "🔍 Running Health Check..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/health || echo "FAILED")

if [ "$RESULT" == "200" ]; then
  echo "✅ Health Check passed (Status 200)!"
  echo "✨ [DONE] Heart Connect is now LIVE!"
  echo "🔗 Check it: https://chat.opramixes.com"
else
  echo "⚠️ Health Check FAILED with status: $RESULT"
  echo "🚨 PM2 Logs for debugging:"
  pm2 logs heart-connect --lines 20 --no-colors
  echo "❌ Deployment might have issues. Check PM2 logs above."
fi
