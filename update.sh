#!/bin/bash

# Full update script for Heart Connect (Web + APK Bundle + Server)
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "💎 Starting Full Update for Heart Connect..."

# 1. Sync
git fetch --all && git reset --hard origin/main

# 2. Clean & Build
echo "Building assets..."
rm -rf dist
npm install
npm run build
npm run bundle-update

# 3. Reload
echo "Reloading server..."
NODE_ENV=production PORT=3005 pm2 restart heart-connect --update-env

echo "⏳ Waiting for server to warm up..."
sleep 5

echo "🔍 Running Health Check..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/health || echo "FAILED")

if [ "$RESULT" == "200" ]; then
  echo "✅ All components updated successfully."
else
  echo "⚠️ Update complete but Health Check FAILED with status: $RESULT"
  pm2 logs heart-connect --lines 10 --no-colors
fi
