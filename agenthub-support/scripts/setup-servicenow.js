#!/usr/bin/env node
/**
 * ServiceNow Setup Script - Creates all required fields and configuration
 * for the AgentHub Support Portal integration
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const config = {
  instance: process.env.SERVICENOW_INSTANCE || 'https://dev305755.service-now.com',
  username: process.env.SERVICENOW_USERNAME,
  password: process.env.SERVICENOW_PASSWORD
};

// Create axios instance
const api = axios.create({
  baseURL: `${config.instance}/api/now`,
  auth: {
    username: config.username,
    password: config.password
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

console.log('========================================');
console.log('🔧 ServiceNow Setup Script');
console.log(`📍 Instance: ${config.instance}`);
console.log('========================================\n');

// Step 1: Create Custom Fields on Incident Table
async function createCustomFields() {
  console.log('📝 Creating Custom Fields on Incident Table...\n');

  const fields = [
    {
      element: 'u_store_number',
      column_label: 'Store Number',
      internal_type: 'string',
      max_length: '20',
      mandatory: 'false',
      active: 'true',
      comments: 'Franchisee store number identifier'
    },
    {
      element: 'u_pc_number',
      column_label: 'PC Number',
      internal_type: 'string',
      max_length: '20',
      mandatory: 'false',
      active: 'true',
      comments: 'Profit center number'
    },
    {
      element: 'u_franchisee_id',
      column_label: 'Franchisee ID',
      internal_type: 'string',
      max_length: '50',
      mandatory: 'false',
      active: 'true',
      comments: 'Unique franchisee identifier'
    },
    {
      element: 'u_franchisee_name',
      column_label: 'Franchisee Name',
      internal_type: 'string',
      max_length: '200',
      mandatory: 'false',
      active: 'true',
      comments: 'Franchisee business name'
    },
    {
      element: 'u_brand',
      column_label: 'Brand',
      internal_type: 'choice',
      mandatory: 'false',
      active: 'true',
      comments: 'Dunkin or Baskin Robbins brand'
    },
    {
      element: 'u_client_code',
      column_label: 'Client Code',
      internal_type: 'string',
      max_length: '50',
      mandatory: 'false',
      active: 'true',
      comments: 'Client identifier for multi-tenant support'
    }
  ];

  for (const field of fields) {
    try {
      // Check if field already exists
      const checkResponse = await api.get('/table/sys_dictionary', {
        params: {
          sysparm_query: `name=incident^element=${field.element}`,
          sysparm_limit: 1
        }
      });

      if (checkResponse.data.result.length > 0) {
        console.log(`   ⚠️  Field ${field.element} already exists, skipping...`);
        continue;
      }

      // Create the field
      const response = await api.post('/table/sys_dictionary', {
        name: 'incident',
        ...field
      });

      if (response.data.result) {
        console.log(`   ✅ Created field: ${field.element} (${field.column_label})`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to create ${field.element}: ${error.message}`);
    }
  }

  // Create choices for u_brand field
  console.log('\n   Creating choices for Brand field...');
  const brandChoices = [
    { label: 'Dunkin', value: 'dunkin', sequence: 1 },
    { label: 'Baskin Robbins', value: 'baskin', sequence: 2 }
  ];

  for (const choice of brandChoices) {
    try {
      await api.post('/table/sys_choice', {
        name: 'incident',
        element: 'u_brand',
        label: choice.label,
        value: choice.value,
        sequence: choice.sequence
      });
      console.log(`   ✅ Added choice: ${choice.label}`);
    } catch (error) {
      console.log(`   ⚠️  Choice might already exist: ${choice.label}`);
    }
  }
}

// Step 2: Create Company Records
async function createCompanies() {
  console.log('\n🏢 Creating Company Records...\n');

  const companies = [
    { name: 'Dunkin Franchisees', short_name: 'DUNKIN' },
    { name: 'Baskin Robbins Franchisees', short_name: 'BASKIN' },
    { name: 'DBI Corporate', short_name: 'DBI' }
  ];

  for (const company of companies) {
    try {
      // Check if company exists
      const checkResponse = await api.get('/table/core_company', {
        params: {
          sysparm_query: `name=${company.name}`,
          sysparm_limit: 1
        }
      });

      if (checkResponse.data.result.length > 0) {
        console.log(`   ⚠️  Company "${company.name}" already exists`);
        continue;
      }

      // Create company
      const response = await api.post('/table/core_company', company);
      
      if (response.data.result) {
        console.log(`   ✅ Created company: ${company.name}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to create company: ${error.message}`);
    }
  }
}

// Step 3: Create Service Account
async function createServiceAccount() {
  console.log('\n👤 Creating Service Account...\n');

  const serviceAccount = {
    user_name: 'svc_agenthub_portal',
    first_name: 'AgentHub',
    last_name: 'Integration',
    email: 'agenthub-integration@example.com',
    title: 'Integration Service Account',
    department: 'IT Integration',
    password: 'AgentHub2025!', // Change this!
    active: true,
    web_service_access_only: true,
    internal_integration_user: true
  };

  try {
    // Check if user exists
    const checkResponse = await api.get('/table/sys_user', {
      params: {
        sysparm_query: `user_name=${serviceAccount.user_name}`,
        sysparm_limit: 1
      }
    });

    if (checkResponse.data.result.length > 0) {
      console.log(`   ⚠️  Service account already exists`);
      console.log(`   Username: ${serviceAccount.user_name}`);
      
      // Get the user sys_id for role assignment
      return checkResponse.data.result[0].sys_id;
    }

    // Create user
    const response = await api.post('/table/sys_user', serviceAccount);
    
    if (response.data.result) {
      console.log(`   ✅ Created service account: ${serviceAccount.user_name}`);
      console.log(`   📝 Password: ${serviceAccount.password} (Please change this!)`);
      return response.data.result.sys_id;
    }
  } catch (error) {
    console.log(`   ❌ Failed to create service account: ${error.message}`);
    return null;
  }
}

// Step 4: Assign Roles to Service Account
async function assignRoles(userSysId) {
  if (!userSysId) {
    console.log('\n⚠️  No user sys_id provided, skipping role assignment');
    return;
  }

  console.log('\n🔐 Assigning Roles to Service Account...\n');

  const roles = ['rest_service', 'itil'];

  for (const roleName of roles) {
    try {
      // Get role sys_id
      const roleResponse = await api.get('/table/sys_user_role', {
        params: {
          sysparm_query: `name=${roleName}`,
          sysparm_limit: 1
        }
      });

      if (roleResponse.data.result.length === 0) {
        console.log(`   ⚠️  Role "${roleName}" not found`);
        continue;
      }

      const roleSysId = roleResponse.data.result[0].sys_id;

      // Check if role is already assigned
      const checkResponse = await api.get('/table/sys_user_has_role', {
        params: {
          sysparm_query: `user=${userSysId}^role=${roleSysId}`,
          sysparm_limit: 1
        }
      });

      if (checkResponse.data.result.length > 0) {
        console.log(`   ⚠️  Role "${roleName}" already assigned`);
        continue;
      }

      // Assign role
      await api.post('/table/sys_user_has_role', {
        user: userSysId,
        role: roleSysId
      });

      console.log(`   ✅ Assigned role: ${roleName}`);
    } catch (error) {
      console.log(`   ❌ Failed to assign role "${roleName}": ${error.message}`);
    }
  }
}

// Step 5: Create Test Incidents
async function createTestIncidents() {
  console.log('\n🧪 Creating Test Incidents...\n');

  const testIncidents = [
    {
      short_description: 'TEST: POS System Down - Store 0234',
      description: 'Point of sale system is not responding at store 0234. Unable to process transactions.',
      u_store_number: '0234',
      u_pc_number: 'PC001',
      u_franchisee_id: 'FR-12345',
      u_franchisee_name: 'Test Franchisee LLC',
      u_brand: 'dunkin',
      u_client_code: 'DUNKIN_EAST',
      urgency: '2',
      impact: '2',
      category: 'Hardware',
      subcategory: 'POS'
    },
    {
      short_description: 'TEST: Network Connectivity Issue - Store 0567',
      description: 'Intermittent network issues affecting all systems.',
      u_store_number: '0567',
      u_pc_number: 'PC002',
      u_franchisee_id: 'FR-67890',
      u_franchisee_name: 'Sample Franchise Inc',
      u_brand: 'baskin',
      u_client_code: 'BASKIN_WEST',
      urgency: '3',
      impact: '3',
      category: 'Network',
      subcategory: 'Connectivity'
    }
  ];

  for (const incident of testIncidents) {
    try {
      const response = await api.post('/table/incident', incident);
      
      if (response.data.result) {
        console.log(`   ✅ Created test incident: ${response.data.result.number}`);
        console.log(`      ${incident.short_description}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to create test incident: ${error.message}`);
    }
  }
}

// Step 6: Test the Service Account
async function testServiceAccount() {
  console.log('\n🔍 Testing Service Account Access...\n');

  // Create a new axios instance with service account credentials
  const serviceApi = axios.create({
    baseURL: `${config.instance}/api/now`,
    auth: {
      username: 'svc_agenthub_portal',
      password: 'AgentHub2025!' // Use the password from createServiceAccount
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  try {
    // Test read access
    const readResponse = await serviceApi.get('/table/incident?sysparm_limit=1');
    console.log('   ✅ Service account can READ incidents');

    // Test create access
    const testIncident = {
      short_description: 'SERVICE ACCOUNT TEST - Please Delete',
      description: 'Testing service account permissions',
      urgency: '3',
      impact: '3'
    };

    const createResponse = await serviceApi.post('/table/incident', testIncident);
    if (createResponse.data.result) {
      console.log('   ✅ Service account can CREATE incidents');
      
      // Delete test incident
      await serviceApi.delete(`/table/incident/${createResponse.data.result.sys_id}`);
      console.log('   ✅ Service account can DELETE incidents');
    }
  } catch (error) {
    console.log(`   ❌ Service account test failed: ${error.message}`);
    if (error.response?.status === 401) {
      console.log('      Check username/password or wait for account activation');
    }
  }
}

// Main execution
async function main() {
  try {
    // Test connection
    console.log('Testing connection...');
    await api.get('/table/incident?sysparm_limit=1');
    console.log('✅ Connected successfully!\n');

    // Run setup steps
    await createCustomFields();
    await createCompanies();
    const userSysId = await createServiceAccount();
    await assignRoles(userSysId);
    await createTestIncidents();
    
    // Wait a moment for account to activate
    console.log('\n⏳ Waiting 5 seconds for account activation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await testServiceAccount();

    console.log('\n========================================');
    console.log('✅ Setup Complete!');
    console.log('========================================\n');
    console.log('📋 Summary:');
    console.log('   • Custom fields created on incident table');
    console.log('   • Company records created');
    console.log('   • Service account created: svc_agenthub_portal');
    console.log('   • Test incidents created');
    console.log('\n🔑 Service Account Credentials:');
    console.log('   Username: svc_agenthub_portal');
    console.log('   Password: AgentHub2025! (Please change this!)');
    console.log(`   Instance: ${config.instance}`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Log into ServiceNow UI and verify fields');
    console.log('   2. Change the service account password');
    console.log('   3. Update .env with service account credentials');
    console.log('   4. Run the discovery script again to verify');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run the setup
main();