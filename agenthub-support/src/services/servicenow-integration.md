# ServiceNow Multi-Client Integration Design

## User Identification Strategy

### 1. B2C to ServiceNow User Mapping

When a user logs in via B2C, we need to:
1. Get their B2C profile with custom attributes (stores, client, franchisee info)
2. Map to ServiceNow user or create if doesn't exist
3. Use their context for all ServiceNow operations

### 2. Custom B2C Attributes Configuration

In Azure AD B2C, add these custom attributes:
```json
{
  "extension_StoreNumbers": "0234,0567,0891",
  "extension_PCNumbers": "PC001,PC002",
  "extension_FranchiseeId": "FR-12345",
  "extension_ClientCode": "DUNKIN_EAST",
  "extension_ServiceNowId": "sys_id_from_servicenow"
}
```

### 3. ServiceNow Table Structure

**Recommended ServiceNow Tables:**
- `u_franchisee_users` - Custom user table with franchisee data
- `u_store_assignments` - User to store mapping
- `incident` - Standard incident table with custom fields:
  - `u_store_number`
  - `u_pc_number`
  - `u_franchisee_id`
  - `u_client_code`

### 4. API Integration Flow

```typescript
// .NET API Endpoint Example
[Authorize]
[HttpGet("api/tickets")]
public async Task<IActionResult> GetUserTickets()
{
    // 1. Get user's B2C claims
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var storeNumbers = User.FindFirst("extension_StoreNumbers")?.Value?.Split(',');
    var clientCode = User.FindFirst("extension_ClientCode")?.Value;
    
    // 2. Query ServiceNow with store context
    var query = new ServiceNowQuery
    {
        Table = "incident",
        Query = BuildStoreQuery(storeNumbers, clientCode),
        Fields = "number,short_description,state,u_store_number,sys_created_on"
    };
    
    // 3. Return filtered tickets
    return Ok(await _serviceNowService.GetTickets(query));
}

private string BuildStoreQuery(string[] stores, string clientCode)
{
    // Build ServiceNow encoded query
    var storeQuery = string.Join("OR", stores.Select(s => $"u_store_number={s}"));
    return $"(${storeQuery})^u_client_code=${clientCode}^state!=7";
}
```

### 5. Ticket Submission Flow

```typescript
// When creating a ticket:
{
    "caller_id": "servicenow_user_sys_id",  // From B2C mapping
    "short_description": "POS System Issue",
    "description": "Details...",
    "u_store_number": "0234",               // From user's current store
    "u_pc_number": "PC001",
    "u_franchisee_id": "FR-12345",         // From B2C attributes
    "u_client_code": "DUNKIN_EAST",        // From B2C attributes
    "category": "Hardware",
    "subcategory": "POS",
    "assignment_group": "franchisee_support" // Based on client
}
```

### 6. Multi-Client Access Control

```csharp
public class StoreAccessAuthorizationHandler : AuthorizationHandler<StoreAccessRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        StoreAccessRequirement requirement)
    {
        var user = context.User;
        var requestedStore = // Get from request
        var userStores = user.FindFirst("extension_StoreNumbers")?.Value?.Split(',');
        
        if (userStores?.Contains(requestedStore) == true)
        {
            context.Succeed(requirement);
        }
        
        return Task.CompletedTask;
    }
}
```

### 7. ServiceNow REST API Calls

**Get User's Tickets:**
```
GET /api/now/table/incident?sysparm_query=u_store_numberIN{stores}^u_client_code={client}
Headers: Authorization: Bearer {servicenow_token}
```

**Create Ticket:**
```
POST /api/now/table/incident
Body: {
    "caller_id": "{servicenow_user_id}",
    "u_store_number": "{store}",
    "u_client_code": "{client}",
    ...
}
```

**Get Store-Specific Tickets:**
```
GET /api/now/table/incident?sysparm_query=u_store_number={store}^active=true
```

### 8. Database Schema for Local Caching

```sql
-- Store ServiceNow tickets locally for performance
CREATE TABLE CachedTickets (
    Id INT PRIMARY KEY IDENTITY,
    ServiceNowNumber NVARCHAR(50),
    ServiceNowSysId NVARCHAR(32),
    StoreNumber NVARCHAR(20),
    PCNumber NVARCHAR(20),
    ClientCode NVARCHAR(50),
    FranchiseeId NVARCHAR(50),
    Title NVARCHAR(200),
    Description NVARCHAR(MAX),
    Status NVARCHAR(50),
    Priority INT,
    CreatedBy NVARCHAR(128),
    CreatedDate DATETIME,
    UpdatedDate DATETIME,
    LastSyncDate DATETIME
);

-- User to ServiceNow mapping
CREATE TABLE UserServiceNowMapping (
    UserId NVARCHAR(128) PRIMARY KEY,  -- B2C Object ID
    ServiceNowSysId NVARCHAR(32),
    ServiceNowUserId NVARCHAR(100),
    Email NVARCHAR(255),
    CreatedDate DATETIME,
    LastLoginDate DATETIME
);
```

### 9. Implementation Steps

1. **Configure B2C Custom Attributes**
   - Add store numbers, PC numbers, client code
   - Add franchisee ID for grouping

2. **Create ServiceNow Custom Fields**
   - Add u_store_number, u_pc_number to incident table
   - Add u_client_code for multi-tenant filtering
   - Create custom user table if needed

3. **Build Synchronization Service**
   - Sync B2C users to ServiceNow
   - Map stores and permissions
   - Cache frequently accessed data

4. **Implement Access Control**
   - Filter tickets by user's stores
   - Validate store access on ticket creation
   - Implement role-based permissions

5. **Create API Endpoints**
   - GET /api/tickets (user's tickets)
   - GET /api/tickets/store/{storeNumber} (store tickets)
   - POST /api/tickets (create with store context)
   - GET /api/tickets/client (all client tickets for franchisee)

### 10. Security Considerations

- **Row-Level Security**: Always filter by user's allowed stores
- **API Gateway**: Use Azure API Management for ServiceNow calls
- **Caching Strategy**: Cache user mappings for performance
- **Audit Trail**: Log all ServiceNow operations
- **Token Management**: Secure storage of ServiceNow credentials
- **Rate Limiting**: Implement to avoid ServiceNow API limits