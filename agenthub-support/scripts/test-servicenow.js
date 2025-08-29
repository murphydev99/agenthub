// ServiceNow QA Environment Testing Script
// Run with: node scripts/test-servicenow.js

const axios = require('axios');

const SERVICENOW_INSTANCE = 'https://dbisupportqa.service-now.com';
const USERNAME = process.env.SERVICENOW_USERNAME || 'your_username';
const PASSWORD = process.env.SERVICENOW_PASSWORD || 'your_password';

// Create axios instance with auth
const snAPI = axios.create({
  baseURL: `${SERVICENOW_INSTANCE}/api/now`,
  auth: {
    username: USERNAME,
    password: PASSWORD
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Test functions
async function testConnection() {
  console.log('\n🔍 Testing ServiceNow Connection...');
  try {
    const response = await snAPI.get('/table/sys_user?sysparm_limit=1');
    console.log('✅ Connection successful!');
    console.log(`   API User: ${response.data.result[0]?.user_name || 'Unknown'}`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.response?.status === 401) {
      console.error('   Check your username/password');
    }
    return false;
  }
}

async function checkIncidentFields() {
  console.log('\n🔍 Checking Incident Table Fields...');
  try {
    // Get one incident to see available fields
    const response = await snAPI.get('/table/incident?sysparm_limit=1');
    
    if (response.data.result.length > 0) {
      const incident = response.data.result[0];
      const fields = Object.keys(incident);
      
      console.log('📋 Total fields found:', fields.length);
      
      // Look for franchisee/store related fields
      const customFields = fields.filter(f => f.startsWith('u_'));
      console.log('\n🏪 Custom fields (u_*):', customFields.length > 0 ? customFields : 'None found');
      
      // Look for specific fields we need
      const importantFields = [
        'u_store_number',
        'u_pc_number', 
        'u_franchisee_id',
        'u_franchisee_name',
        'u_client_code',
        'u_brand',
        'company',
        'caller_id',
        'contact_type'
      ];
      
      console.log('\n🔎 Checking for expected fields:');
      importantFields.forEach(field => {
        const exists = fields.includes(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}${exists && incident[field] ? `: ${incident[field]}` : ''}`);
      });
      
      // Show state values
      if (incident.state) {
        console.log('\n📊 Incident States:');
        const states = {
          '1': 'New',
          '2': 'In Progress', 
          '3': 'On Hold',
          '6': 'Resolved',
          '7': 'Closed',
          '8': 'Canceled'
        };
        console.log(`   Current state: ${incident.state} (${states[incident.state] || 'Unknown'})`);
      }
    } else {
      console.log('⚠️  No incidents found to analyze');
    }
  } catch (error) {
    console.error('❌ Failed to check incident fields:', error.message);
  }
}

async function findCompanies() {
  console.log('\n🏢 Looking for Dunkin/Baskin Companies...');
  try {
    // Search for companies that might be Dunkin/Baskin related
    const searches = ['Dunkin', 'Baskin', 'DBI', 'Franchisee'];
    
    for (const search of searches) {
      const response = await snAPI.get(`/table/core_company?sysparm_query=nameLIKE${search}&sysparm_limit=5&sysparm_fields=name,sys_id`);
      
      if (response.data.result.length > 0) {
        console.log(`\n   Found for "${search}":`);
        response.data.result.forEach(company => {
          console.log(`   - ${company.name} (${company.sys_id})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to search companies:', error.message);
  }
}

async function checkUserStructure() {
  console.log('\n👥 Checking User Structure...');
  try {
    // Look for a franchisee user
    const response = await snAPI.get('/table/sys_user?sysparm_limit=5&sysparm_fields=user_name,email,name,company');
    
    console.log('   Sample users:');
    response.data.result.forEach(user => {
      console.log(`   - ${user.user_name} | ${user.email} | Company: ${user.company || 'None'}`);
    });
    
    // Check for custom user fields
    if (response.data.result.length > 0) {
      const fullUserResponse = await snAPI.get(`/table/sys_user/${response.data.result[0].sys_id}`);
      const userFields = Object.keys(fullUserResponse.data.result);
      const customUserFields = userFields.filter(f => f.startsWith('u_'));
      
      if (customUserFields.length > 0) {
        console.log('\n   Custom user fields:', customUserFields);
      }
    }
  } catch (error) {
    console.error('❌ Failed to check users:', error.message);
  }
}

async function testCreateIncident() {
  console.log('\n📝 Testing Incident Creation...');
  
  const testIncident = {
    short_description: 'TEST TICKET - AgentHub Integration Test',
    description: 'This is a test ticket from the AgentHub portal integration. Please ignore or delete.',
    urgency: '3',
    impact: '3',
    category: 'Inquiry / Help',
    // Try common field names
    u_store_number: '0001',
    u_brand: 'Dunkin',
    contact_type: 'portal'
  };
  
  try {
    console.log('   Attempting to create test incident...');
    const response = await snAPI.post('/table/incident', testIncident);
    
    if (response.data.result) {
      const created = response.data.result;
      console.log(`   ✅ Success! Created: ${created.number}`);
      console.log(`      Sys ID: ${created.sys_id}`);
      console.log(`      State: ${created.state}`);
      
      // Try to delete it
      console.log('   🗑️  Cleaning up test ticket...');
      await snAPI.delete(`/table/incident/${created.sys_id}`);
      console.log('   ✅ Test ticket deleted');
    }
  } catch (error) {
    console.error('   ❌ Failed to create incident:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.detail) {
      console.error('      Details:', error.response.data.error.detail);
    }
  }
}

async function checkAssignmentGroups() {
  console.log('\n👥 Checking Assignment Groups...');
  try {
    // Look for support groups
    const searches = ['Support', 'Help', 'Franchisee', 'DBI', 'Dunkin', 'Baskin'];
    
    for (const search of searches) {
      const response = await snAPI.get(`/table/sys_user_group?sysparm_query=nameLIKE${search}&sysparm_limit=3&sysparm_fields=name,description`);
      
      if (response.data.result.length > 0) {
        console.log(`\n   Groups matching "${search}":`);
        response.data.result.forEach(group => {
          console.log(`   - ${group.name}${group.description ? ` (${group.description})` : ''}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to check assignment groups:', error.message);
  }
}

async function checkAPILimits() {
  console.log('\n⚡ Testing API Rate Limits...');
  try {
    const requests = [];
    const count = 20;
    
    console.log(`   Making ${count} rapid requests...`);
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      requests.push(snAPI.get('/table/incident?sysparm_limit=1'));
    }
    
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`   ✅ Successful: ${successful}/${count}`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}/${count}`);
      const error = results.find(r => r.status === 'rejected');
      if (error?.reason?.response?.status === 429) {
        console.log('   ⚠️  Rate limit detected!');
      }
    }
    console.log(`   ⏱️  Time taken: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Rate limit test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('  ServiceNow QA Environment Testing');
  console.log('  Instance: ' + SERVICENOW_INSTANCE);
  console.log('========================================');
  
  // Check connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('\n⚠️  Cannot proceed without valid connection');
    return;
  }
  
  // Run all tests
  await checkIncidentFields();
  await findCompanies();
  await checkUserStructure();
  await checkAssignmentGroups();
  await testCreateIncident();
  await checkAPILimits();
  
  console.log('\n========================================');
  console.log('  Testing Complete!');
  console.log('========================================\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { snAPI, testConnection };