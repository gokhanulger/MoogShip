#!/bin/bash
# Fresh iOS Setup for MoogShip App Store Release

echo "🚀 Creating fresh iOS project for MoogShip..."

# Remove existing iOS project
echo "🧹 Cleaning existing iOS setup..."
rm -rf ios/

# Create fresh Capacitor iOS project
echo "📱 Creating new iOS project..."
npx cap add ios

# Build the web app first
echo "📦 Building web application..."
npm run build

# Sync with new iOS project
echo "🔄 Syncing with fresh iOS project..."
npx cap sync ios

# Copy app icons and setup
echo "🎨 Setting up app branding..."
mkdir -p ios/App/App/Assets.xcassets/AppIcon.appiconset/

echo "✅ Fresh iOS project created!"
echo ""
echo "📋 Next steps:"
echo "1. Open: npx cap open ios"
echo "2. Configure signing in Xcode"
echo "3. Add your app icons"
echo "4. Build for App Store"
echo ""
echo "🎯 Bundle ID: com.moogship.app"
echo "📱 Ready for App Store submission!"