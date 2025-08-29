# ServiceNow Integration Requirements for AgentHub Support Portal

## Executive Summary
We're building a support portal for 10,000+ Dunkin/Baskin Robbins franchisees that needs to integrate with your ServiceNow instance for ticket management. Users will authenticate via Azure AD B2C and need to see/create tickets filtered by their store assignments.

---

## SECTION 1: Questions We Need Answered

### A. Instance & Access Information
1. **What is the ServiceNow instance URL?** (e.g., `https://cognizant.service-now.com`)
2. **Do you have a development/test instance we can use?**
3. **What are your API rate limits?** (requests per hour)
4. **Do you have an Integration Hub or MID Server we should connect through?**
5. **Is there a preferred authentication method?** (Basic Auth, OAuth 2.0, Mutual Auth/Certificate)

### B. Current Configuration
1. **How are Dunkin/Baskin franchisees currently identified in ServiceNow?**
   - Is there a company/client field?
   - How are store numbers tracked?
   - Are users already in the system?

2. **What custom fields exist on the incident table for franchise data?**
   - Store number field name?
   - Franchisee ID field name?
   - Client/Company field name?

3. **Do you use domain separation for different clients?**
   - If yes, what domain should we use?
   - If no, how do you separate client data?

4. **Are there existing ServiceNow groups for Dunkin/Baskin support?**
   - Assignment groups for routing tickets?
   - Support groups for escalation?

### C. Data Structure
1. **What incident fields should we populate when creating tickets?**
   - Required fields?
   - Category/Subcategory values allowed?
   - Priority mapping?

2. **How should we identify the caller?**
   - Link to existing user records?
   - Create new users?
   - Use a generic integration user?

3. **What are the incident state values?**
   - New, In Progress, Resolved, Closed, etc.
   - Numeric values for each state?

4. **Are there any business rules we should be aware of?**
   - Auto-assignment rules?
   - Mandatory fields based on category?
   - SLA considerations?

### D. Integration Patterns
1. **Do you have existing REST API endpoints we should use?**
   - Scripted REST APIs?
   - Custom processors?

2. **Should we use the Table API or do you have custom APIs?**
   - `/api/now/table/incident` or custom endpoint?

3. **How should we handle attachments?**
   - Direct upload to ServiceNow?
   - Separate storage with links?

4. **What fields are we allowed to update?**
   - Can users update tickets after creation?
   - Which fields are read-only?

---

## SECTION 2: What We Need Created

### A. Service Account for API Access

```yaml
Account Type: Service Account
Username: svc_agenthub_portal (or your naming convention)
Purpose: API integration for AgentHub Support Portal

Required Permissions/Roles:
- rest_service (REST API access)
- itil (Create/Read/Update incidents)
- Specific ACLs for:
  * Create incidents
  * Read incidents (filtered by store/franchisee)
  * Update incidents (comments and attachments only)
  * Read sys_user table (to lookup callers)
  * Read knowledge base (if applicable)

Rate Limits:
- Minimum 10,000 requests/hour (expecting 10,000+ users)
- Or dedicated integration limits

IP Restrictions: 
- [Provide our API server IPs if required]
```

### B. Custom Fields on Incident Table (if not existing)

```sql
Field Name          | Type      | Length | Required | Description
------------------- |-----------|--------|----------|---------------------------
u_store_number      | String    | 20     | Yes      | Store identifier (e.g., "0234")
u_pc_number         | String    | 20     | No       | PC/Profit Center number
u_franchisee_id     | String    | 50     | No       | Franchisee identifier
u_franchisee_name   | String    | 100    | No       | Franchisee business name
u_client_code       | String    | 50     | Yes      | Client identifier (e.g., "DUNKIN_EAST")
u_region            | String    | 50     | No       | Geographic region
u_brand             | Choice    | -      | Yes      | "Dunkin" or "Baskin Robbins"
```

### C. OAuth Application Registration (if using OAuth)

```yaml
Application Name: AgentHub Support Portal
Type: OAuth 2.0 Provider
Grant Type: Client Credentials (or Resource Owner Password)
Redirect URL: https://[our-portal-url]/auth/callback

Required Scopes:
- useraccount
- table_api_read (incident, sys_user)
- table_api_write (incident)

Token Lifespans:
- Access Token: 30 minutes
- Refresh Token: 100 days
```

### D. API User Lookup Method

We need a way to map our B2C users to ServiceNow:

**Option 1: Email-based lookup**
```javascript
// We send: caller_email = "franchise@example.com"
// You map to: sys_user record
```

**Option 2: External ID mapping**
```javascript
// We send: u_external_user_id = "B2C_ObjectId"
// You maintain mapping table
```

**Option 3: Generic caller approach**
```javascript
// All tickets created with single caller_id
// Store/Franchisee identified only by custom fields
```

*Which approach do you prefer?*

---

## SECTION 3: Sample API Calls We'll Make

### 1. Create Incident
```http
POST /api/now/table/incident
{
  "short_description": "POS System not working",
  "description": "Details of the issue...",
  "u_store_number": "0234",
  "u_pc_number": "PC001",
  "u_franchisee_id": "FR-12345",
  "u_franchisee_name": "Smith Enterprises LLC",
  "u_client_code": "DUNKIN_EAST",
  "u_brand": "Dunkin",
  "category": "Hardware",
  "subcategory": "POS",
  "priority": "3",
  "contact_type": "portal",
  "caller_id": "[sys_id or email lookup]"
}
```

### 2. Get Incidents for Stores
```http
GET /api/now/table/incident
?sysparm_query=u_store_numberIN0234,0567,0891^active=true
&sysparm_fields=number,short_description,state,priority,u_store_number,sys_created_on
&sysparm_limit=100
```

### 3. Update Incident (add comment)
```http
PATCH /api/now/table/incident/{sys_id}
{
  "comments": "Customer update: Issue is intermittent, happens during peak hours"
}
```

---

## SECTION 4: Technical Details We'll Provide

### Our Architecture:
- **Frontend**: React SPA with Azure AD B2C authentication
- **Backend**: .NET Core API (handles ServiceNow communication)
- **Users**: ~10,000 franchisees across multiple stores
- **Expected Volume**: 
  - ~500-1000 tickets/day
  - ~5000 API calls/hour (peak)
  - ~100 concurrent users

### Our Integration Flow:
1. User logs in via Azure B2C → Gets store assignments
2. Portal calls our .NET API → API calls ServiceNow
3. Store-based filtering applied → Results returned to user
4. All ServiceNow credentials stored server-side only

---

## SECTION 5: Timeline & Testing

### What We Need:
1. **Development Environment Access** (ASAP)
   - Service account credentials
   - API documentation/endpoints
   - Sample data for testing

2. **UAT Environment** (2-3 weeks)
   - Test with real store mappings
   - Validate business rules
   - Performance testing

3. **Production Deployment** (4-6 weeks)
   - Final credentials
   - Go-live coordination
   - Support contacts

### Key Contacts Needed:
- ServiceNow Administrator (for account creation)
- Technical Integration Lead (for API details)
- Business Analyst (for workflow/rules clarification)

---

## SECTION 6: Security & Compliance

### Please Confirm:
1. **Data Residency**: Where is data stored?
2. **Encryption**: TLS 1.2+ for API communications?
3. **Audit Requirements**: Do you need audit logs of all API calls?
4. **PII Handling**: Any special requirements for personal data?
5. **IP Whitelisting**: Do you require IP restrictions?
6. **Certificate Auth**: Do you require mutual TLS?

---

## SECTION 7: Fallback & Error Handling

### Questions:
1. What should we do if ServiceNow is unavailable?
2. Is there a status page we can monitor?
3. How should we handle rate limit errors?
4. Who do we contact for urgent API issues?
5. Is there a batch API for bulk operations?

---

## Summary - Minimum Requirements to Start:

### We absolutely need:
1. ✅ ServiceNow instance URL
2. ✅ Service account with appropriate permissions
3. ✅ List of required/available fields for incidents
4. ✅ How to identify stores/franchisees (existing fields or create new)
5. ✅ API rate limits and authentication method
6. ✅ Test environment access

### Nice to have:
- Existing user mapping strategy
- Knowledge base API access
- Virtual Agent integration details
- Existing assignment group names

---

## Contact Information

**Your Project Team:**
- Project Manager: [Name]
- Technical Lead: [Your Name]
- Email: [Contact Email]
- Timeline: [Expected Go-Live Date]

**We're available for a technical call to discuss these requirements.**

---

*Please provide responses to Section 1 and complete the items in Section 2. We can then begin integration development while working through the remaining details.*