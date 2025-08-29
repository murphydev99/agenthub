# ServiceNow QA Environment Exploration Guide
**URL**: https://dbisupportqa.service-now.com/

## What to Check in the ServiceNow Portal

### 1. Initial Login & Navigation
After logging in, note:
- Your user role (shown in top right corner)
- Available modules in the left navigation
- Whether you see "Incident" or "Service Desk" modules

### 2. Check Incident Form Fields
**Navigate to**: Incidents > Create New (or All)

Look for these fields on the incident form:
- [ ] Store Number field (might be labeled as u_store_number)
- [ ] PC Number field
- [ ] Franchisee ID or Name
- [ ] Brand field (Dunkin/Baskin dropdown)
- [ ] Client Code field
- [ ] Company field (what options are available?)

**Take screenshots of**:
- The full incident creation form
- Any custom fields section
- Category/Subcategory dropdown values

### 3. Check Existing Incidents
**Navigate to**: Incidents > All

- Apply filters to see if you can find Dunkin/Baskin incidents
- Check column headers for custom fields
- Right-click column headers → "Show column" to see available fields
- Look for patterns in:
  - Short descriptions
  - Assignment groups
  - Categories used

### 4. User & Company Structure
**Navigate to**: User Administration > Users (if available)

Check:
- How franchisee users are identified
- What company values are used
- Any custom user fields visible

### 5. Check Your Profile
**Click**: Your name (top right) > Profile

Look for:
- Roles assigned to you
- Company assignment
- Any custom attributes

### 6. REST API Explorer (if available)
**Navigate to**: System Web Services > REST > REST API Explorer

If you have access:
1. Select "Incident" table
2. Try a GET request
3. Look at available fields
4. Note the API endpoint format

### 7. Check Knowledge Base
**Navigate to**: Knowledge > All (if available)

See if there's:
- Dunkin/Baskin specific knowledge base
- Categories for franchise support
- Article structure

---

## Information to Gather

### A. From Incident Form
```
Field Name          | Label on Form        | Type (text/dropdown/etc)
--------------------|---------------------|------------------------
[field_name]        | [What you see]      | [Field type]
Example:
u_store_number      | Store Number        | Text field (4 digits)
```

### B. Category Values
List all available values in:
- Category dropdown: _________________
- Subcategory dropdown: ______________
- Priority options: __________________
- Contact Type options: ______________

### C. Assignment Groups
List any groups that look relevant:
- [ ] Franchisee Support
- [ ] DBI Support
- [ ] Store Support
- [ ] [Other groups you find]

### D. Company Options
If you can see the Company field:
- [ ] What companies are listed?
- [ ] Is there a "Dunkin" or "Baskin" company?
- [ ] What's the format? (e.g., "DBI", "Dunkin Brands", etc.)

---

## Testing in Browser Console

Once on an incident page, open browser DevTools (F12) and try:

```javascript
// Check if you can access the GlideForm API
if (typeof g_form !== 'undefined') {
  // Get all field names
  var fields = g_form.getFieldNames();
  console.log('All fields:', fields);
  
  // Look for custom fields
  var customFields = fields.filter(f => f.startsWith('u_'));
  console.log('Custom fields:', customFields);
  
  // Get field values
  customFields.forEach(field => {
    console.log(field + ':', g_form.getValue(field));
  });
}

// Check available REST endpoints
fetch('/api/now/table/incident?sysparm_limit=1', {
  headers: {
    'Accept': 'application/json',
    'X-UserToken': window.g_ck // Current session token
  }
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.log('API Error:', err));
```

---

## Questions to Ask While Logged In

### For ServiceNow Admin (via chat/email while exploring):

1. **"I'm logged into the QA environment. Which incident fields should we populate for Dunkin/Baskin tickets?"**

2. **"I see [list fields you found]. Are there other custom fields we should use?"**

3. **"What assignment group should franchise support tickets go to?"**

4. **"Should we use the Company field? What value for Dunkin/Baskin?"**

5. **"Can you create an integration user for API access, or should we use OAuth?"**

---

## Next Steps After Exploration

1. **Request API Access**:
   - "We need a service account for API integration"
   - "Can you enable REST API access for our integration user?"
   - "What are the rate limits for API calls?"

2. **Field Mapping Confirmation**:
   - Share the fields you found
   - Confirm which are required
   - Ask about any business rules

3. **Test Ticket Creation**:
   - Try creating a test ticket manually
   - Note required fields
   - Check workflow/assignment rules

---

## Export Your Findings

Create a summary like:

```yaml
ServiceNow QA Environment Findings:
  
Incident Fields Available:
  - short_description: Text (required)
  - description: Text area
  - [list all fields you find]
  
Custom Fields Found:
  - u_[field]: [description]
  
Categories:
  - Hardware
  - Software
  - [list all]
  
Assignment Groups:
  - [Group Name]: [When to use]
  
API Endpoints Confirmed:
  - Incident: /api/now/table/incident
  - User: /api/now/table/sys_user
  
Notes:
  - [Any special observations]
  - [Limitations you noticed]
  - [Questions that arose]
```

---

## If You Get Stuck

1. Look for a "Help" or "?" icon for field descriptions
2. Check if there's a "System Definition > Tables" to see field definitions
3. Try the global search (magnifying glass icon) for "Dunkin" or "franchise"
4. Look for any documentation links or wikis in the portal

Share your findings and we can adjust the integration accordingly!