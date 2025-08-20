#!/bin/bash

# Azure deployment script for AgentHub React App

# Configuration
RESOURCE_GROUP="DEV-InternalProject"
APP_NAME="AgentHubDev"
LOCATION="eastus"

echo "🚀 Starting deployment to Azure..."

# Build the React app for production
echo "📦 Building React app..."
npm run build

# Create a deployment package
echo "📦 Creating deployment package..."
cd dist
zip -r ../deploy.zip .
cd ..

# Log in to Azure (if not already logged in)
echo "🔐 Checking Azure login..."
az account show &>/dev/null
if [ $? -ne 0 ]; then
    echo "Please log in to Azure..."
    az login
fi

# Check if web app exists
echo "🔍 Checking if web app exists..."
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &>/dev/null
if [ $? -ne 0 ]; then
    echo "📱 Creating new web app..."
    # Create App Service Plan if it doesn't exist
    az appservice plan create \
        --name "${APP_NAME}Plan" \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku B1 \
        --is-linux
    
    # Create Web App
    az webapp create \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --plan "${APP_NAME}Plan" \
        --runtime "NODE:18-lts"
else
    echo "✅ Web app exists"
fi

# Configure startup command for SPA
echo "⚙️ Configuring startup command..."
az webapp config set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa"

# Configure app settings (environment variables)
echo "⚙️ Setting environment variables..."
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
    WEBSITE_NODE_DEFAULT_VERSION="~18" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="false"

# Deploy the app
echo "🚀 Deploying to Azure..."
az webapp deployment source config-zip \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --src deploy.zip

# Clean up
echo "🧹 Cleaning up..."
rm deploy.zip

# Get the URL
APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)

echo "✅ Deployment complete!"
echo "🌐 App URL: https://$APP_URL"
echo ""
echo "📝 Next steps:"
echo "1. Verify the app is running at https://$APP_URL"
echo "2. Check logs if needed: az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"