#!/bin/bash
# VoyaTrek Teams App Deployment Script

echo "Starting VoyaTrek deployment..."

# Step 1: Ensure all dependencies are installed
echo "Installing dependencies..."
npm install

# Step 2: Run database setup
echo "Setting up database..."
node dbSetup.js

# Step 3: Zip the app package for deployment
echo "Creating app package..."
cd appPackage
zip -r ../voyatrek-package.zip .
cd ..

echo "Deployment preparation complete!"
echo "To deploy to Azure, use the Teams Toolkit in VS Code:"
echo "1. Press F1 and select 'Teams: Provision in the cloud'"
echo "2. After provisioning completes, select 'Teams: Deploy to the cloud'"
echo "3. After deployment, select 'Teams: Publish to Teams' to generate the final app package"

echo "To test locally, press F5 in VS Code"
