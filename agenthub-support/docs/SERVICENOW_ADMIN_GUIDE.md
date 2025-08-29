# ServiceNow Admin Guide: Creating Service Account for AgentHub Integration

## Step-by-Step Instructions for ServiceNow Administrator

### PART 1: Create the Integration User Account

#### Step 1: Navigate to User Administration
1. Log into ServiceNow as an admin
2. In the navigation filter (left sidebar), type: **Users**
3. Click on **User Administration > Users**

#### Step 2: Create New User
1. Click the **New** button at the top of the users list
2. Fill in the following fields:

```
User ID:           svc_agenthub_portal
First name:        AgentHub
Last name:         Integration
Email:             agenthub-integration@yourcompany.com
Title:             Integration Service Account
Department:        IT Integration
Password:          [Generate strong password]
Active:            ☑️ (checked)
Web service access only: ☑️ (checked) - IMPORTANT!
Internal Integration User: ☑️ (checked) - if available
```

3. **IMPORTANT**: Check "Web service access only" to prevent UI login
4. Click **Submit** to create the user

#### Step 3: Set Password to Never Expire
1. After creating the user, open the user record again
2. Click the **Security** tab (if available) or find password settings
3. Set:
   - Password needs reset: ☐ (unchecked)
   - Locked out: ☐ (unchecked)
   - Password never expires: ☑️ (checked) - if available

---

### PART 2: Assign Required Roles

#### Step 4: Add Roles to the User
1. While in the user record, scroll down to the **Roles** tab
2. Click **Edit** or **Add** roles
3. Add the following roles (search and add one by one):

##### Required Roles:
```
☑️ rest_service           - Allows REST API access
☑️ itil                   - Allows incident create/read/update
☑️ soap_query             - Allows SOAP queries (if needed)
```

##### Optional but Recommended:
```
☑️ api_analytics          - For API usage tracking
☑️ knowledge              - If accessing knowledge base
```

4. Click **Save** to save the roles

---

### PART 3: Create OAuth Application (Recommended over Basic Auth)

#### Step 5: Navigate to OAuth Setup
1. In the navigation filter, type: **OAuth**
2. Navigate to **System OAuth > Application Registry**

#### Step 6: Create OAuth Application
1. Click **New** button
2. Select **Create an OAuth API endpoint for external clients**
3. Fill in:

```
Name:              AgentHub Portal Integration
Client ID:         [Auto-generated, copy this]
Client Secret:     [Click generate, copy this securely]
Accessible from:   All application scopes
Active:           ☑️ (checked)
Refresh Token Lifespan: 8,640,000 (100 days)
Access Token Lifespan:  1,800 (30 minutes)
```

4. Click **Submit**
5. **IMPORTANT**: Save the Client ID and Client Secret securely

#### Step 7: Link OAuth to Service Account (Optional)
1. In the OAuth application record, you can set:
   - Default user: `svc_agenthub_portal`
   - This allows client credentials flow

---

### PART 4: Configure Access Controls (ACLs)

#### Step 8: Set Table-Level Permissions
1. Navigate to **System Security > Access Control (ACL)**
2. Create new ACLs for the service account:

##### For Incident Table - CREATE
```
Type:         record
Operation:    create
Name:         incident
Role:         rest_service (or create custom role)
Condition:    [leave blank or add store filtering]
```

##### For Incident Table - READ
```
Type:         record
Operation:    read
Name:         incident
Role:         rest_service
Condition:    caller_id=${gs.getUserID()} OR 
              u_integration_user=svc_agenthub_portal
```

##### For Incident Table - WRITE
```
Type:         record  
Operation:    write
Name:         incident
Role:         rest_service
Condition:    [Define which fields can be updated]
Script:       // Optional: Add field restrictions
              current.short_description;
              current.comments;
              current.work_notes;
```

---

### PART 5: Create/Verify Custom Fields

#### Step 9: Check for Required Custom Fields
1. Navigate to **System Definition > Tables**
2. Search for and open: **incident**
3. Click on **Columns** tab
4. Look for these fields (create if missing):

##### Fields to Create (if not existing):
Click **New** to add each field:

**Store Number Field:**
```
Type:          String
Column label:  Store Number
Column name:   u_store_number
Max length:    20
Mandatory:     false
Display:       true
```

**PC Number Field:**
```
Type:          String
Column label:  PC Number
Column name:   u_pc_number
Max length:    20
```

**Franchisee ID Field:**
```
Type:          String
Column label:  Franchisee ID
Column name:   u_franchisee_id
Max length:    50
```

**Franchisee Name Field:**
```
Type:          String
Column label:  Franchisee Name
Column name:   u_franchisee_name
Max length:    200
```

**Brand Field:**
```
Type:          Choice
Column label:  Brand
Column name:   u_brand
Choices:       
  - Label: Dunkin | Value: dunkin
  - Label: Baskin Robbins | Value: baskin
```

**Client Code Field:**
```
Type:          String
Column label:  Client Code
Column name:   u_client_code
Max length:    50
```

---

### PART 6: Test the Service Account

#### Step 10: Test API Access
1. Open a terminal or API tool (Postman)
2. Test with this curl command:

```bash
# Basic Auth Test
curl -X GET \
  'https://[instance].service-now.com/api/now/table/incident?sysparm_limit=1' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -u 'svc_agenthub_portal:[password]'

# OAuth Test (if configured)
curl -X POST \
  'https://[instance].service-now.com/oauth_token.do' \
  -d 'grant_type=password' \
  -d 'client_id=[client_id]' \
  -d 'client_secret=[client_secret]' \
  -d 'username=svc_agenthub_portal' \
  -d 'password=[password]'
```

3. You should receive a JSON response with incident data

---

### PART 7: Configure Rate Limits (Optional)

#### Step 11: Set API Rate Limits
1. Navigate to **System Web Services > REST > REST Rate Limit Rules**
2. Click **New**
3. Configure:

```
Name:              AgentHub Portal Rate Limit
User:              svc_agenthub_portal
Rate Limit:        10000 per hour
HTTP Method:       ALL
Active:            ☑️
```

---

### PART 8: Create Assignment Group (If Needed)

#### Step 12: Create Support Group
1. Navigate to **User Administration > Groups**
2. Click **New**
3. Fill in:

```
Name:              Franchisee Support
Type:              [select appropriate type]
Description:       Support group for Dunkin/Baskin franchisees
Active:            ☑️
```

4. Add members to the group
5. Note the sys_id for integration configuration

---

## Information to Provide Back to Integration Team

After completing setup, provide this information:

### 1. Credentials
```yaml
Instance URL: https://[your-instance].service-now.com
Username: svc_agenthub_portal
Password: [securely share]

# If OAuth:
Client ID: [from OAuth app]
Client Secret: [securely share]
Token URL: https://[instance].service-now.com/oauth_token.do
```

### 2. Field Mapping
```yaml
Custom Fields Created:
  Store Number: u_store_number
  PC Number: u_pc_number
  Franchisee ID: u_franchisee_id
  Franchisee Name: u_franchisee_name
  Brand: u_brand
  Client Code: u_client_code
```

### 3. Configuration Details
```yaml
Assignment Group: [sys_id of support group]
Company Record: [sys_id if using company field]
Rate Limit: 10000 requests/hour
```

### 4. Test Endpoints
```yaml
Get Incidents: GET /api/now/table/incident
Create Incident: POST /api/now/table/incident
Update Incident: PATCH /api/now/table/incident/{sys_id}
Get Users: GET /api/now/table/sys_user
```

---

## Security Checklist

Before providing access:

- [ ] Password is strong and stored securely
- [ ] Account is set to "Web service access only"
- [ ] Account has minimum required permissions
- [ ] ACLs are configured to restrict data access
- [ ] Rate limits are configured
- [ ] OAuth is preferred over Basic Auth
- [ ] Test account works with limited test
- [ ] Audit logging is enabled for this account

---

## Troubleshooting

### Common Issues:

**401 Unauthorized**
- Check username/password
- Verify account is active
- Check "Web service access only" setting

**403 Forbidden**
- Missing required roles
- ACL restrictions
- Check rest_service role

**404 Not Found**
- Wrong instance URL
- Wrong API endpoint path
- Table access restricted

**429 Too Many Requests**
- Rate limit exceeded
- Adjust rate limit rules

---

## Support Contact

For issues with this service account:
- ServiceNow Admin: [admin name]
- Email: [admin email]
- Integration Team Contact: [your contact]

---

*Document prepared for: AgentHub Support Portal Integration*
*Date: [Current Date]*
*Version: 1.0*