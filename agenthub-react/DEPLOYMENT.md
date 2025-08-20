# AgentHub React App - Azure Deployment Guide

## Azure Resources

- **Resource Group**: `DEV-InternalProject`
- **Web App Name**: `AgentHubDev`
- **URL**: https://agenthubdev.azurewebsites.net (after deployment)
- **API Endpoint**: https://workflowcanvasapi.azurewebsites.net/api

## Prerequisites

1. Azure CLI installed and configured
2. Node.js 18+ installed
3. Azure subscription with access to the `DEV-InternalProject` resource group

## Manual Deployment

### Option 1: Using the deployment script

```bash
# Make the script executable
chmod +x deploy-azure.sh

# Run the deployment
./deploy-azure.sh
```

### Option 2: Manual steps

1. Build the app:
```bash
npm run build
```

2. Create the Azure Web App (first time only):
```bash
# Create App Service Plan
az appservice plan create \
    --name AgentHubDevPlan \
    --resource-group DEV-InternalProject \
    --location eastus \
    --sku B1 \
    --is-linux

# Create Web App
az webapp create \
    --name AgentHubDev \
    --resource-group DEV-InternalProject \
    --plan AgentHubDevPlan \
    --runtime "NODE:18-lts"
```

3. Configure the startup command:
```bash
az webapp config set \
    --name AgentHubDev \
    --resource-group DEV-InternalProject \
    --startup-file "pm2 serve /home/site/wwwroot --no-daemon --spa"
```

4. Deploy the built files:
```bash
cd dist
zip -r ../deploy.zip .
cd ..

az webapp deployment source config-zip \
    --name AgentHubDev \
    --resource-group DEV-InternalProject \
    --src deploy.zip
```

## GitHub Actions Deployment (Recommended)

### Setup (One-time)

1. Create an Azure Service Principal:
```bash
az ad sp create-for-rbac \
    --name "AgentHubGitHubActions" \
    --role contributor \
    --scopes /subscriptions/{subscription-id}/resourceGroups/DEV-InternalProject \
    --sdk-auth
```

2. Copy the JSON output and add it as a GitHub secret:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the JSON output from step 1

### Deployment

The app will automatically deploy when you:
- Push to the `main` branch
- Or manually trigger the workflow from GitHub Actions tab

## Environment Variables

The app uses the following environment variables:

- `VITE_API_BASE_URL`: The API endpoint (set to WorkflowCanvas API in production)
- `VITE_APP_ENV`: Environment name (production/development)

These are configured in:
- `.env.development` - Local development
- `.env.production` - Production deployment

## Verification

After deployment:

1. Visit the app URL: https://agenthubdev.azurewebsites.net
2. Check the browser console for any errors
3. Verify API connectivity by checking network requests

## Troubleshooting

### View logs
```bash
az webapp log tail \
    --resource-group DEV-InternalProject \
    --name AgentHubDev
```

### Check deployment status
```bash
az webapp deployment list-publishing-profiles \
    --resource-group DEV-InternalProject \
    --name AgentHubDev
```

### Common Issues

1. **503 Service Unavailable**
   - Ensure PM2 startup command is configured with `--spa` flag
   - Check logs for startup errors

2. **API Connection Issues**
   - Verify CORS is configured on the API
   - Check that the API URL is correct in environment variables

3. **Routing Issues (404 on refresh)**
   - Ensure PM2 is running with `--spa` flag
   - This enables client-side routing for React Router

## Local Testing of Production Build

To test the production build locally:

```bash
# Build the app
npm run build

# Install PM2 globally if not already installed
npm install -g pm2

# Serve the built app
pm2 serve dist --spa --port 3000

# Visit http://localhost:3000
```

## API Configuration

The app connects to the WorkflowCanvas API at:
- **Production**: https://workflowcanvasapi.azurewebsites.net/api
- **Development**: http://localhost:5173/api (proxied via Vite)

Make sure the API has CORS configured to allow requests from:
- https://agenthubdev.azurewebsites.net
- http://localhost:5173 (for development)