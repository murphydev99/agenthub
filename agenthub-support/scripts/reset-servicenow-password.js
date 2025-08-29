/**
 * Script to reset the service account password in ServiceNow
 * Uses admin credentials to reset the svc_agenthub_portal password
 */

const axios = require('axios');

const config = {
  instance: 'dev305755',
  adminUsername: 'admin',
  adminPassword: 'Qxa3%6ZECtf=', // Your admin password
  
  // Service account to reset
  serviceAccountUsername: 'svc_agenthub_portal',
  newPassword: 'AgentHub2025!Portal' // New password for service account
};

// Base URL for ServiceNow instance
const baseUrl = `https://${config.instance}.service-now.com`;

// Function to reset password
async function resetServiceAccountPassword() {
  try {
    console.log('🔐 ServiceNow Password Reset Script\n');
    console.log(`Instance: ${config.instance}`);
    console.log(`Resetting password for: ${config.serviceAccountUsername}`);
    console.log('----------------------------------------\n');
    
    // First, get the user sys_id
    console.log('1️⃣  Finding service account user...');
    
    // Create basic auth header
    const auth = Buffer.from(`${config.adminUsername}:${config.adminPassword}`).toString('base64');
    
    const searchResponse = await axios.get(
      `${baseUrl}/api/now/table/sys_user`,
      {
        params: {
          sysparm_query: `user_name=${config.serviceAccountUsername}`,
          sysparm_fields: 'sys_id,user_name,name,email'
        },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (searchResponse.data.result.length === 0) {
      throw new Error(`User ${config.serviceAccountUsername} not found`);
    }
    
    const user = searchResponse.data.result[0];
    console.log(`✅ Found user: ${user.name} (${user.user_name})`);
    console.log(`   Sys ID: ${user.sys_id}\n`);
    
    // Update the password
    console.log('2️⃣  Resetting password...');
    const updateResponse = await axios.patch(
      `${baseUrl}/api/now/table/sys_user/${user.sys_id}`,
      {
        user_password: config.newPassword,
        password_needs_reset: 'false' // Don't require password reset on next login
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (updateResponse.status === 200) {
      console.log('✅ Password reset successfully!\n');
      console.log('========================================');
      console.log('🔑 NEW SERVICE ACCOUNT CREDENTIALS:');
      console.log('========================================');
      console.log(`Username: ${config.serviceAccountUsername}`);
      console.log(`Password: ${config.newPassword}`);
      console.log(`Instance: ${config.instance}`);
      console.log('========================================\n');
      
      // Test the new credentials
      console.log('3️⃣  Testing new credentials...');
      const testResponse = await axios.get(
        `${baseUrl}/api/now/table/sys_user`,
        {
          params: {
            sysparm_limit: 1
          },
          auth: {
            username: config.serviceAccountUsername,
            password: config.newPassword
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (testResponse.status === 200) {
        console.log('✅ New credentials verified successfully!\n');
        
        // Save credentials to .env file
        const fs = require('fs');
        const envPath = '/Users/murphsea/agenthub/agenthub-support/.env';
        
        // Read existing .env
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Update ServiceNow password
        const lines = envContent.split('\n');
        let passwordUpdated = false;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('SERVICENOW_PASSWORD=')) {
            lines[i] = `SERVICENOW_PASSWORD=${config.newPassword}`;
            passwordUpdated = true;
            break;
          }
        }
        
        if (!passwordUpdated) {
          lines.push(`SERVICENOW_PASSWORD=${config.newPassword}`);
        }
        
        // Write back to .env
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log('✅ Password saved to .env file\n');
        
        // Also update the API .env if it exists
        const apiEnvPath = '/Users/murphsea/agenthub/agenthub-support-api/.env';
        if (fs.existsSync(apiEnvPath)) {
          let apiEnvContent = fs.readFileSync(apiEnvPath, 'utf8');
          const apiLines = apiEnvContent.split('\n');
          let apiPasswordUpdated = false;
          
          for (let i = 0; i < apiLines.length; i++) {
            if (apiLines[i].startsWith('ServiceNow__Password=')) {
              apiLines[i] = `ServiceNow__Password=${config.newPassword}`;
              apiPasswordUpdated = true;
              break;
            }
          }
          
          if (!apiPasswordUpdated) {
            apiLines.push(`ServiceNow__Password=${config.newPassword}`);
          }
          
          fs.writeFileSync(apiEnvPath, apiLines.join('\n'));
          console.log('✅ Password saved to API .env file\n');
        }
        
        console.log('🎉 Password reset complete!');
        console.log('The service account is ready to use.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to reset password');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the script
resetServiceAccountPassword();