#!/usr/bin/env node
/**
 * ServiceNow Configuration Discovery Script
 * This script will automatically discover and document the ServiceNow configuration
 * for the Dunkin/Baskin Robbins integration
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  instance: process.env.SERVICENOW_INSTANCE || 'https://dbisupportqa.service-now.com',
  username: process.env.SERVICENOW_USERNAME,
  password: process.env.SERVICENOW_PASSWORD,
  outputDir: './servicenow-discovery-results'
};

// Validate credentials
if (!config.username || !config.password) {
  console.error('❌ Missing credentials!');
  console.error('   Please set SERVICENOW_USERNAME and SERVICENOW_PASSWORD');
  console.error('   Either in .env file or as environment variables');
  process.exit(1);
}

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

// Discovery results
const discovery = {
  timestamp: new Date().toISOString(),
  instance: config.instance,
  connection: {},
  incidentFields: {},
  customFields: [],
  companies: [],
  assignmentGroups: [],
  categories: [],
  users: {},
  apiEndpoints: {},
  recommendations: []
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Helper function to safely get data
async function safeApiCall(endpoint, params = {}) {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`   ⚠️  Failed to fetch ${endpoint}: ${error.message}`);
    return null;
  }
}

// 1. Test Connection
async function testConnection() {
  console.log('\n1️⃣  Testing Connection...');
  try {
    const response = await api.get('/table/sys_user?sysparm_limit=1&sysparm_fields=user_name');
    discovery.connection = {
      status: 'SUCCESS',
      authenticatedAs: response.data.result[0]?.user_name || 'Unknown',
      timestamp: new Date().toISOString()
    };
    console.log('   ✅ Connected successfully as:', discovery.connection.authenticatedAs);
    return true;
  } catch (error) {
    discovery.connection = {
      status: 'FAILED',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    console.error('   ❌ Connection failed:', error.message);
    return false;
  }
}

// 2. Discover Incident Fields
async function discoverIncidentFields() {
  console.log('\n2️⃣  Discovering Incident Fields...');
  
  // Get table schema
  const schema = await safeApiCall('/table/sys_dictionary', {
    sysparm_query: 'name=incident^active=true',
    sysparm_fields: 'element,column_label,internal_type,max_length,mandatory,comments',
    sysparm_limit: 500
  });
  
  if (schema?.result) {
    discovery.incidentFields.total = schema.result.length;
    discovery.incidentFields.fields = {};
    
    // Categorize fields
    const customFields = [];
    const requiredFields = [];
    const storeRelatedFields = [];
    
    schema.result.forEach(field => {
      const fieldInfo = {
        name: field.element,
        label: field.column_label,
        type: field.internal_type,
        maxLength: field.max_length,
        required: field.mandatory === 'true',
        description: field.comments
      };
      
      discovery.incidentFields.fields[field.element] = fieldInfo;
      
      if (field.element.startsWith('u_')) {
        customFields.push(fieldInfo);
      }
      if (field.mandatory === 'true') {
        requiredFields.push(field.element);
      }
      if (field.element.toLowerCase().includes('store') || 
          field.element.toLowerCase().includes('franchise') ||
          field.element.toLowerCase().includes('brand')) {
        storeRelatedFields.push(fieldInfo);
      }
    });
    
    discovery.customFields = customFields;
    discovery.incidentFields.required = requiredFields;
    discovery.incidentFields.storeRelated = storeRelatedFields;
    
    console.log(`   📋 Found ${schema.result.length} fields`);
    console.log(`   🏪 Custom fields: ${customFields.length}`);
    console.log(`   ⭐ Required fields: ${requiredFields.length}`);
    console.log(`   🏬 Store-related fields: ${storeRelatedFields.length}`);
    
    // Look for specific expected fields
    const expectedFields = [
      'u_store_number', 'u_pc_number', 'u_franchisee_id', 
      'u_franchisee_name', 'u_brand', 'u_client_code', 'company'
    ];
    
    console.log('\n   Checking for expected fields:');
    expectedFields.forEach(field => {
      if (discovery.incidentFields.fields[field]) {
        console.log(`   ✅ ${field}: ${discovery.incidentFields.fields[field].label}`);
      } else {
        console.log(`   ❌ ${field}: NOT FOUND`);
        discovery.recommendations.push(`Create field: ${field}`);
      }
    });
  }
  
  // Get sample incident to see actual data
  const sample = await safeApiCall('/table/incident', {
    sysparm_limit: 1
  });
  
  if (sample?.result?.[0]) {
    discovery.incidentFields.sampleData = {};
    Object.keys(sample.result[0]).forEach(key => {
      if (sample.result[0][key]) {
        discovery.incidentFields.sampleData[key] = sample.result[0][key];
      }
    });
  }
}

// 3. Discover Categories and Subcategories
async function discoverCategories() {
  console.log('\n3️⃣  Discovering Categories...');
  
  // Get unique categories from recent incidents
  const incidents = await safeApiCall('/table/incident', {
    sysparm_fields: 'category,subcategory',
    sysparm_limit: 1000,
    sysparm_query: 'sys_created_onONLast%2030%20days'
  });
  
  if (incidents?.result) {
    const categorySet = new Set();
    const subcategoryMap = {};
    
    incidents.result.forEach(inc => {
      if (inc.category) {
        categorySet.add(inc.category);
        if (!subcategoryMap[inc.category]) {
          subcategoryMap[inc.category] = new Set();
        }
        if (inc.subcategory) {
          subcategoryMap[inc.category].add(inc.subcategory);
        }
      }
    });
    
    discovery.categories = Array.from(categorySet).map(cat => ({
      category: cat,
      subcategories: Array.from(subcategoryMap[cat] || [])
    }));
    
    console.log(`   📂 Found ${categorySet.size} categories`);
    discovery.categories.slice(0, 5).forEach(cat => {
      console.log(`      - ${cat.category} (${cat.subcategories.length} subcategories)`);
    });
  }
}

// 4. Discover Companies
async function discoverCompanies() {
  console.log('\n4️⃣  Discovering Companies...');
  
  const searches = ['Dunkin', 'Baskin', 'DBI', 'Franchise'];
  
  for (const search of searches) {
    const companies = await safeApiCall('/table/core_company', {
      sysparm_query: `nameLIKE${search}`,
      sysparm_fields: 'name,sys_id',
      sysparm_limit: 10
    });
    
    if (companies?.result?.length > 0) {
      console.log(`   🏢 Found ${companies.result.length} companies matching "${search}"`);
      companies.result.forEach(company => {
        discovery.companies.push({
          name: company.name,
          sys_id: company.sys_id,
          searchTerm: search
        });
        console.log(`      - ${company.name}`);
      });
    }
  }
  
  if (discovery.companies.length === 0) {
    discovery.recommendations.push('Create Company records for Dunkin/Baskin franchisees');
  }
}

// 5. Discover Assignment Groups
async function discoverAssignmentGroups() {
  console.log('\n5️⃣  Discovering Assignment Groups...');
  
  const searches = ['Support', 'Help', 'Franchise', 'DBI', 'Dunkin', 'Baskin', 'Service Desk'];
  
  for (const search of searches) {
    const groups = await safeApiCall('/table/sys_user_group', {
      sysparm_query: `nameLIKE${search}^active=true`,
      sysparm_fields: 'name,description,sys_id',
      sysparm_limit: 10
    });
    
    if (groups?.result?.length > 0) {
      groups.result.forEach(group => {
        discovery.assignmentGroups.push({
          name: group.name,
          description: group.description,
          sys_id: group.sys_id,
          searchTerm: search
        });
      });
    }
  }
  
  if (discovery.assignmentGroups.length > 0) {
    console.log(`   👥 Found ${discovery.assignmentGroups.length} potential assignment groups`);
    discovery.assignmentGroups.slice(0, 5).forEach(group => {
      console.log(`      - ${group.name}`);
    });
  } else {
    discovery.recommendations.push('Identify or create assignment group for franchise support');
  }
}

// 6. Test API Capabilities
async function testApiCapabilities() {
  console.log('\n6️⃣  Testing API Capabilities...');
  
  // Test different endpoints
  const endpoints = [
    { name: 'Incidents', path: '/table/incident', method: 'GET' },
    { name: 'Users', path: '/table/sys_user', method: 'GET' },
    { name: 'Companies', path: '/table/core_company', method: 'GET' },
    { name: 'Groups', path: '/table/sys_user_group', method: 'GET' },
    { name: 'Knowledge', path: '/table/kb_knowledge', method: 'GET' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      await api({
        method: endpoint.method,
        url: endpoint.path,
        params: { sysparm_limit: 1 }
      });
      discovery.apiEndpoints[endpoint.name] = {
        path: endpoint.path,
        accessible: true
      };
      console.log(`   ✅ ${endpoint.name}: Accessible`);
    } catch (error) {
      discovery.apiEndpoints[endpoint.name] = {
        path: endpoint.path,
        accessible: false,
        error: error.response?.status || error.message
      };
      console.log(`   ❌ ${endpoint.name}: Not accessible`);
    }
  }
  
  // Test create capability
  console.log('\n   Testing write capabilities...');
  try {
    const testIncident = {
      short_description: 'API Test - Please Delete',
      description: 'Automated test from AgentHub integration discovery',
      urgency: '3',
      impact: '3'
    };
    
    const created = await api.post('/table/incident', testIncident);
    if (created.data?.result?.sys_id) {
      discovery.apiEndpoints.createIncident = true;
      console.log('   ✅ Can create incidents');
      
      // Try to delete
      await api.delete(`/table/incident/${created.data.result.sys_id}`);
      discovery.apiEndpoints.deleteIncident = true;
      console.log('   ✅ Can delete incidents');
    }
  } catch (error) {
    discovery.apiEndpoints.createIncident = false;
    console.log('   ❌ Cannot create incidents:', error.response?.data?.error?.message || error.message);
  }
}

// 7. Check Rate Limits
async function checkRateLimits() {
  console.log('\n7️⃣  Testing Rate Limits...');
  
  const requests = [];
  const count = 50;
  
  console.log(`   Making ${count} rapid requests...`);
  const startTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    requests.push(api.get('/table/incident?sysparm_limit=1'));
  }
  
  const results = await Promise.allSettled(requests);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  discovery.rateLimits = {
    testCount: count,
    successful: successful,
    failed: failed,
    duration: endTime - startTime,
    avgResponseTime: Math.round((endTime - startTime) / successful)
  };
  
  console.log(`   ✅ Successful: ${successful}/${count}`);
  if (failed > 0) {
    console.log(`   ⚠️  Failed: ${failed}/${count}`);
    const rateLimited = results.filter(r => 
      r.status === 'rejected' && r.reason?.response?.status === 429
    ).length;
    if (rateLimited > 0) {
      console.log(`   🚫 Rate limited: ${rateLimited} requests`);
      discovery.rateLimits.limited = true;
      discovery.recommendations.push('Implement request throttling and caching');
    }
  }
  console.log(`   ⏱️  Avg response time: ${discovery.rateLimits.avgResponseTime}ms`);
}

// 8. Generate Recommendations
function generateRecommendations() {
  console.log('\n8️⃣  Generating Recommendations...');
  
  // Check for missing critical fields
  if (!discovery.incidentFields.fields['u_store_number']) {
    discovery.recommendations.push('Request creation of u_store_number field on incident table');
  }
  if (!discovery.incidentFields.fields['u_franchisee_id']) {
    discovery.recommendations.push('Request creation of u_franchisee_id field on incident table');
  }
  
  // Check for company setup
  if (discovery.companies.length === 0) {
    discovery.recommendations.push('Set up Company records for Dunkin and Baskin Robbins');
  }
  
  // Check for assignment groups
  if (discovery.assignmentGroups.length === 0) {
    discovery.recommendations.push('Create or identify assignment group for franchise support');
  }
  
  // API access
  if (!discovery.apiEndpoints.createIncident) {
    discovery.recommendations.push('Request write permissions for incident creation');
  }
  
  console.log(`   📝 Generated ${discovery.recommendations.length} recommendations`);
}

// 9. Save Results
function saveResults() {
  console.log('\n9️⃣  Saving Results...');
  
  // Save JSON
  const jsonPath = path.join(config.outputDir, 'discovery-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(discovery, null, 2));
  console.log(`   ✅ JSON saved to: ${jsonPath}`);
  
  // Generate Markdown Report
  let markdown = `# ServiceNow Discovery Report
Generated: ${discovery.timestamp}
Instance: ${discovery.instance}

## Connection Status
- Status: ${discovery.connection.status}
- Authenticated as: ${discovery.connection.authenticatedAs || 'N/A'}

## Summary
- Total Incident Fields: ${discovery.incidentFields.total || 0}
- Custom Fields Found: ${discovery.customFields.length}
- Companies Found: ${discovery.companies.length}
- Assignment Groups Found: ${discovery.assignmentGroups.length}
- Categories Found: ${discovery.categories.length}

## Critical Fields for Integration

### ✅ Available Fields
`;

  const requiredIntegrationFields = [
    'u_store_number', 'u_pc_number', 'u_franchisee_id', 
    'u_franchisee_name', 'u_brand', 'u_client_code', 'company'
  ];
  
  requiredIntegrationFields.forEach(field => {
    if (discovery.incidentFields.fields?.[field]) {
      const f = discovery.incidentFields.fields[field];
      markdown += `- **${field}**: ${f.label} (${f.type})\n`;
    }
  });
  
  markdown += `\n### ❌ Missing Fields (Need to Create)\n`;
  requiredIntegrationFields.forEach(field => {
    if (!discovery.incidentFields.fields?.[field]) {
      markdown += `- ${field}\n`;
    }
  });
  
  markdown += `\n## Custom Fields Found\n`;
  discovery.customFields.slice(0, 20).forEach(field => {
    markdown += `- **${field.name}**: ${field.label}\n`;
  });
  
  markdown += `\n## Companies\n`;
  if (discovery.companies.length > 0) {
    discovery.companies.forEach(company => {
      markdown += `- ${company.name} (${company.sys_id})\n`;
    });
  } else {
    markdown += `No Dunkin/Baskin companies found. Need to create.\n`;
  }
  
  markdown += `\n## Assignment Groups\n`;
  if (discovery.assignmentGroups.length > 0) {
    discovery.assignmentGroups.slice(0, 10).forEach(group => {
      markdown += `- ${group.name}: ${group.description || 'No description'}\n`;
    });
  } else {
    markdown += `No relevant assignment groups found.\n`;
  }
  
  markdown += `\n## API Capabilities\n`;
  Object.entries(discovery.apiEndpoints).forEach(([name, info]) => {
    if (typeof info === 'object') {
      markdown += `- ${name}: ${info.accessible ? '✅ Accessible' : '❌ Not accessible'}\n`;
    } else {
      markdown += `- ${name}: ${info ? '✅' : '❌'}\n`;
    }
  });
  
  markdown += `\n## Rate Limits\n`;
  if (discovery.rateLimits) {
    markdown += `- Tested: ${discovery.rateLimits.testCount} requests\n`;
    markdown += `- Successful: ${discovery.rateLimits.successful}\n`;
    markdown += `- Failed: ${discovery.rateLimits.failed}\n`;
    markdown += `- Rate Limited: ${discovery.rateLimits.limited ? 'Yes' : 'No'}\n`;
    markdown += `- Avg Response Time: ${discovery.rateLimits.avgResponseTime}ms\n`;
  }
  
  markdown += `\n## 🎯 Recommendations\n`;
  discovery.recommendations.forEach((rec, i) => {
    markdown += `${i + 1}. ${rec}\n`;
  });
  
  markdown += `\n## Next Steps
1. Share this report with ServiceNow admin
2. Request missing fields to be created
3. Confirm assignment group for routing
4. Get production API credentials
`;
  
  const mdPath = path.join(config.outputDir, 'discovery-report.md');
  fs.writeFileSync(mdPath, markdown);
  console.log(`   ✅ Markdown report saved to: ${mdPath}`);
  
  // Save field mapping template
  const fieldMapping = `# Field Mapping Configuration
# Use this as a template for your integration

INCIDENT_FIELD_MAPPING:
  # Your App Field -> ServiceNow Field
  title: short_description
  description: description
  storeNumber: ${discovery.incidentFields.fields['u_store_number'] ? 'u_store_number' : '# CREATE THIS FIELD'}
  pcNumber: ${discovery.incidentFields.fields['u_pc_number'] ? 'u_pc_number' : '# CREATE THIS FIELD'}
  franchiseeId: ${discovery.incidentFields.fields['u_franchisee_id'] ? 'u_franchisee_id' : '# CREATE THIS FIELD'}
  franchiseeName: ${discovery.incidentFields.fields['u_franchisee_name'] ? 'u_franchisee_name' : '# CREATE THIS FIELD'}
  brand: ${discovery.incidentFields.fields['u_brand'] ? 'u_brand' : '# CREATE THIS FIELD'}
  clientCode: ${discovery.incidentFields.fields['u_client_code'] ? 'u_client_code' : '# CREATE THIS FIELD'}
  
ASSIGNMENT_GROUP: ${discovery.assignmentGroups[0]?.sys_id || '# NEED TO IDENTIFY'}
DEFAULT_COMPANY: ${discovery.companies[0]?.sys_id || '# NEED TO CREATE'}

INCIDENT_STATES:
  new: 1
  in_progress: 2
  on_hold: 3
  resolved: 6
  closed: 7
  cancelled: 8
`;
  
  const mappingPath = path.join(config.outputDir, 'field-mapping.yaml');
  fs.writeFileSync(mappingPath, fieldMapping);
  console.log(`   ✅ Field mapping template saved to: ${mappingPath}`);
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('🔍 ServiceNow Configuration Discovery');
  console.log(`📍 Instance: ${config.instance}`);
  console.log('========================================');
  
  // Run discovery
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Cannot proceed without valid connection');
    console.log('   Please check your credentials in .env file');
    process.exit(1);
  }
  
  await discoverIncidentFields();
  await discoverCategories();
  await discoverCompanies();
  await discoverAssignmentGroups();
  await testApiCapabilities();
  await checkRateLimits();
  generateRecommendations();
  saveResults();
  
  console.log('\n========================================');
  console.log('✅ Discovery Complete!');
  console.log(`📂 Results saved to: ${config.outputDir}/`);
  console.log('========================================');
  console.log('\n📋 Key Findings:');
  console.log(`   • Custom fields: ${discovery.customFields.length}`);
  console.log(`   • Companies: ${discovery.companies.length}`);
  console.log(`   • Assignment groups: ${discovery.assignmentGroups.length}`);
  console.log(`   • Recommendations: ${discovery.recommendations.length}`);
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review the discovery-report.md file');
  console.log('   2. Share findings with ServiceNow admin');
  console.log('   3. Request missing fields and configuration');
  console.log('   4. Update integration based on findings');
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});