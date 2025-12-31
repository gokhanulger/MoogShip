#!/bin/bash
# MoogShip Production Build Script for App Store

echo "🚀 Building MoogShip for App Store submission..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf ios/App/App/public

# Build the web app
echo "📦 Building web application..."
npm run build

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync ios

# Open Xcode for final build and submission
echo "🔨 Opening Xcode for App Store build..."
npx cap open ios

echo "✅ Ready for App Store submission!"
echo ""
echo "📋 Next steps in Xcode:"
echo "1. Select 'Any iOS Device (arm64)' as build target"
echo "2. Go to Product → Archive"
echo "3. Use Organizer to upload to App Store Connect"
echo ""
echo "🎯 Your app bundle ID: com.moogship.app"