#!/bin/bash

# Update everything script for Heart Connect
echo "🚀 Starting Full Update Process..."

# 1. Pull latest
echo "📥 Syncing with GitHub..."
git pull origin main

# 2. Clean up
echo "🧹 Cleaning dist folder..."
rm -rf dist/*

# 3. Build Web App
echo "📦 Building web application..."
npm install
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# 4. Create Update Bundle
echo "📂 Creating update bundle..."
npm run bundle-update

if [ $? -eq 0 ]; then
    echo "✅ Update bundle created successfully!"
else
    echo "❌ Update bundle creation failed!"
    exit 1
fi

# 5. Restart PM2 (using port 3005 as per your logs)
echo "♻️ Restarting app with PM2..."
NODE_ENV=production PORT=3005 pm2 restart heart-connect --update-env

echo "✨ Everything is up to date!"
