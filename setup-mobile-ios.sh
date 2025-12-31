#!/bin/bash

echo "Starting MoogShip iOS setup..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Install Capacitor CLI if needed
if ! command -v npx cap &> /dev/null; then
    echo "Installing @capacitor/cli..."
    npm install -g @capacitor/cli
fi

# Ensure Capacitor packages are installed
if [ ! -d "node_modules/@capacitor/core" ] || [ ! -d "node_modules/@capacitor/ios" ]; then
    echo "Installing Capacitor dependencies..."
    npm install --save @capacitor/core @capacitor/ios
fi

# Check if capacitor.config.ts exists, if not create one
if [ ! -f "capacitor.config.ts" ]; then
    echo "Initializing Capacitor for MoogShip..."
    npx cap init MoogShip com.moogship.app --web-dir=dist
else
    echo "Capacitor already initialized."
fi

# Add the iOS platform if not already added
if [ ! -d "ios" ]; then
    echo "Adding iOS platform..."
    npx cap add ios
else
    echo "iOS platform already added."
fi

echo "✅ iOS platform initialized successfully!"
echo "ℹ️ To build and open in Xcode, run ./build-ios.sh"
echo "📱 After opening in Xcode, you will need to set up signing with your Apple Developer account"