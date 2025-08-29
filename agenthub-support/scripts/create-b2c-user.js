/**
 * Script to create a user in Azure AD B2C using Microsoft Graph API
 * 
 * Prerequisites:
 * 1. Register an app in Azure AD (not B2C) with Application permissions:
 *    - User.ReadWrite.All
 *    - Directory.ReadWrite.All
 * 2. Grant admin consent for the permissions
 * 3. Create a client secret for the app
 * 
 * Run: node scripts/create-b2c-user.js
 */

const axios = require('axios');

// Configuration - You need to fill these in
const config = {
  // Azure AD app registration (not B2C app)
  tenantId: 'VistioSelfServiceDEV.onmicrosoft.com', // Your B2C tenant
  clientId: 'YOUR_GRAPH_APP_CLIENT_ID', // App registered in Azure AD (not B2C)
  clientSecret: 'YOUR_GRAPH_APP_CLIENT_SECRET', // Client secret from Azure AD app
  
  // B2C specific
  b2cDomain: 'VistioSelfServiceDEV.onmicrosoft.com',
  
  // User details
  userEmail: 'sean.murphy@vistio.io',
  displayName: 'Sean Murphy',
  givenName: 'Sean',
  surname: 'Murphy',
  tempPassword: 'TempPassword123!', // User will need to change this
  
  // Custom attributes (update these as needed)
  customAttributes: {
    storeNumbers: ['0234', '0567', '0891'],
    franchiseeId: 'FR-12345',
    franchiseeName: 'Vistio Franchise Group',
    role: 'Franchise Owner'
  }
};

// Get access token
async function getAccessToken() {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

// Create user in B2C
async function createB2CUser(accessToken) {
  try {
    const graphUrl = 'https://graph.microsoft.com/v1.0/users';
    
    // Construct the user object
    const userData = {
      accountEnabled: true,
      displayName: config.displayName,
      givenName: config.givenName,
      surname: config.surname,
      
      // For B2C, create a local account
      identities: [
        {
          signInType: 'emailAddress',
          issuer: config.b2cDomain,
          issuerAssignedId: config.userEmail
        }
      ],
      
      // Password profile
      passwordProfile: {
        password: config.tempPassword,
        forceChangePasswordNextSignIn: true
      },
      
      // Password policies for B2C
      passwordPolicies: 'DisablePasswordExpiration',
      
      // Mail nickname is required
      mailNickname: config.userEmail.split('@')[0],
      
      // User principal name for B2C
      userPrincipalName: `${config.userEmail.replace('@', '.')}@${config.b2cDomain}`,
      
      // Custom attributes (extension attributes)
      // Note: These need to be created in B2C first
      // The format is usually: extension_<app-id>_attributeName
      // You'll need to get the actual extension attribute names from your B2C tenant
    };
    
    const response = await axios.post(graphUrl, userData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error.response?.data || error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🔐 Azure AD B2C User Creation Script\n');
  console.log('Creating user:', config.userEmail);
  console.log('In tenant:', config.b2cDomain);
  console.log('\n-----------------------------------\n');
  
  // Check if credentials are configured
  if (config.clientId === 'YOUR_GRAPH_APP_CLIENT_ID' || 
      config.clientSecret === 'YOUR_GRAPH_APP_CLIENT_SECRET') {
    console.error('❌ Error: Please configure your Azure AD app credentials first!');
    console.log('\nTo use this script, you need to:');
    console.log('1. Register an app in Azure AD (not B2C) at https://portal.azure.com');
    console.log('2. Grant it User.ReadWrite.All and Directory.ReadWrite.All permissions');
    console.log('3. Create a client secret');
    console.log('4. Update the config section in this script with your credentials\n');
    return;
  }
  
  try {
    // Step 1: Get access token
    console.log('1️⃣  Getting access token from Azure AD...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained\n');
    
    // Step 2: Create user
    console.log('2️⃣  Creating user in B2C...');
    const user = await createB2CUser(accessToken);
    console.log('✅ User created successfully!\n');
    
    console.log('User Details:');
    console.log('-------------');
    console.log('ID:', user.id);
    console.log('Display Name:', user.displayName);
    console.log('Email:', config.userEmail);
    console.log('Temporary Password:', config.tempPassword);
    console.log('\n⚠️  Note: User will be prompted to change password on first login');
    
  } catch (error) {
    console.error('\n❌ Failed to create user');
    console.error('Error details:', error.message);
    
    if (error.response?.data?.error) {
      console.error('Azure AD Error:', error.response.data.error.message);
      console.error('Error Code:', error.response.data.error.code);
    }
  }
}

// Alternative: Manual steps if you prefer using Azure Portal
console.log('=====================================');
console.log('Alternative: Create User via Azure Portal');
console.log('=====================================\n');
console.log('If you prefer to create the user manually:\n');
console.log('1. Go to https://portal.azure.com');
console.log('2. Navigate to Azure AD B2C > Users');
console.log('3. Click "New user" > "Create Azure AD B2C user"');
console.log('4. Fill in:');
console.log('   - Sign-in method: Email address');
console.log('   - Email: sean.murphy@vistio.io');
console.log('   - Display name: Sean Murphy');
console.log('   - Given name: Sean');
console.log('   - Surname: Murphy');
console.log('   - Password: (set a temporary password)');
console.log('5. Under "User attributes", add:');
console.log('   - storeNumbers: 0234,0567,0891');
console.log('   - franchiseeId: FR-12345');
console.log('   - franchiseeName: Vistio Franchise Group');
console.log('   - role: Franchise Owner');
console.log('6. Click "Create"\n');
console.log('=====================================\n');

// Uncomment to run the script
// main();

console.log('⚠️  Script is ready but not executed.');
console.log('To run: Uncomment the main() call at the bottom of the script');
console.log('Or create the user manually using the instructions above.');