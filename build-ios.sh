#!/bin/bash

echo "Starting MoogShip iOS build process..."

# Check if the project is set up correctly
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Capacitor configuration not found. Please run ./setup-mobile-ios.sh first."
    exit 1
fi

# Set up build directory
BUILD_DIR="./dist"
mkdir -p $BUILD_DIR

# Build the web app
echo "📦 Building web application..."
npm run build || {
    echo "❌ Web app build failed. Please fix any errors before continuing."
    exit 1
}

# Check if the build was successful
if [ ! -f "$BUILD_DIR/index.html" ]; then
    echo "❌ Build output not found. The build process may have failed."
    exit 1
fi

echo "✅ Web application built successfully!"

# Make sure iOS platform is added
if [ ! -d "ios" ]; then
    echo "📱 Adding iOS platform..."
    npx cap add ios || {
        echo "❌ Failed to add iOS platform. Try running ./setup-mobile-ios.sh first."
        exit 1
    }
fi

# Sync the built app with Capacitor
echo "🔄 Syncing with iOS project..."
npx cap sync ios || {
    echo "❌ Sync failed. Please check the error messages above."
    exit 1
}

echo "✅ Successfully synced web application with iOS project!"

# Try to open the project in Xcode
echo "🚀 Opening project in Xcode..."
npx cap open ios || {
    echo "⚠️ Could not automatically open Xcode."
    echo "Please open the iOS project manually by navigating to the 'ios/App' folder"
    echo "and opening the App.xcworkspace file in Xcode."
}

echo ""
echo "======================================================"
echo "✅ iOS app has been built and synced!"
echo ""
echo "If Xcode didn't open automatically, please:"
echo "1. Navigate to the 'ios/App' folder in your project"
echo "2. Open the 'App.xcworkspace' file in Xcode"
echo ""
echo "Next steps in Xcode:"
echo "1. Select your Apple Developer account in the Signing & Capabilities section"
echo "2. Select a device or simulator from the target dropdown"
echo "3. Click the Play button to build and run"
echo "======================================================"