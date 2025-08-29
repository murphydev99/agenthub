using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using RestSharp;
using RestSharp.Authenticators;

var builder = WebApplication.CreateBuilder(args);

// Add B2C authentication with relaxed validation for development
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var b2cConfig = builder.Configuration.GetSection("AzureAdB2C");
        var instance = b2cConfig["Instance"];
        var domain = b2cConfig["Domain"];
        var clientId = b2cConfig["ClientId"];
        var signUpSignInPolicyId = b2cConfig["SignUpSignInPolicyId"];
        
        options.Authority = $"{instance}/{domain}/{signUpSignInPolicyId}/v2.0";
        options.Audience = clientId;
        
        // Relaxed validation for development - accept ID tokens
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            NameClaimType = "name",
            RoleClaimType = "roles"
        };
        
        options.SaveToken = true;
        options.RequireHttpsMetadata = false;
        
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("Token validated successfully");
                if (context.Principal != null)
                {
                    foreach (var claim in context.Principal.Claims)
                    {
                        logger.LogInformation("Token Claim: {Type} = {Value}", claim.Type, claim.Value);
                    }
                }
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError("Authentication failed: {Error}", context.Exception?.Message);
                return Task.CompletedTask;
            }
        };
    });

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5174", "http://localhost:5173", "http://localhost:5175")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Add controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add ServiceNow client as a singleton
builder.Services.AddSingleton<IServiceNowClient, ServiceNowClient>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// ServiceNow client interface
public interface IServiceNowClient
{
    Task<List<Ticket>> GetTicketsAsync(string? store = null, string? status = null, string? priority = null);
    Task<Ticket> GetTicketAsync(string id);
    Task<CreateTicketResponse> CreateTicketAsync(CreateTicketDto dto);
    Task<UpdateTicketResponse> UpdateTicketAsync(string id, UpdateTicketDto dto);
    Task<ServiceNowTestResponse> TestConnectionAsync();
}

// ServiceNow client implementation
public class ServiceNowClient : IServiceNowClient
{
    private readonly RestClient _client;
    private readonly IConfiguration _configuration;

    public ServiceNowClient(IConfiguration configuration)
    {
        _configuration = configuration;
        var instance = _configuration["ServiceNow:Instance"];
        var username = _configuration["ServiceNow:Username"];
        var password = _configuration["ServiceNow:Password"];

        var options = new RestClientOptions($"https://{instance}.service-now.com")
        {
            Authenticator = new HttpBasicAuthenticator(username, password)
        };
        _client = new RestClient(options);
    }

    public async Task<List<Ticket>> GetTicketsAsync(string? store = null, string? status = null, string? priority = null)
    {
        var request = new RestRequest("/api/now/table/incident");
        
        var query = new List<string>();
        if (!string.IsNullOrEmpty(store))
            query.Add($"u_store_number={store}");
        if (!string.IsNullOrEmpty(status))
            query.Add($"state={status}");
        if (!string.IsNullOrEmpty(priority))
            query.Add($"priority={priority}");

        if (query.Any())
            request.AddParameter("sysparm_query", string.Join("^", query));
        
        request.AddParameter("sysparm_limit", 100);
        request.AddParameter("sysparm_fields", "sys_id,number,short_description,description,state,priority,u_store_number,u_franchisee_id,opened_at,sys_created_on,sys_updated_on,assigned_to");

        var response = await _client.GetAsync<ServiceNowResponse>(request);
        
        return response?.Result?.Select(t => new Ticket
        {
            Id = t.sys_id?.ToString() ?? "",
            Number = t.number?.ToString() ?? "",
            Title = t.short_description?.ToString() ?? "",
            Description = t.description?.ToString() ?? "",
            Status = MapState(t.state?.ToString()),
            Priority = MapPriority(t.priority?.ToString()),
            StoreNumber = t.u_store_number?.ToString() ?? "",
            FranchiseeId = t.u_franchisee_id?.ToString() ?? "",
            CreatedAt = t.sys_created_on?.ToString() ?? "",
            UpdatedAt = t.sys_updated_on?.ToString() ?? "",
            AssignedTo = GetAssignedToValue(t.assigned_to)
        }).ToList() ?? new List<Ticket>();
    }

    public async Task<Ticket> GetTicketAsync(string id)
    {
        var request = new RestRequest($"/api/now/table/incident/{id}");
        // Don't use sysparm_display_value as it returns display strings instead of codes
        // Don't fetch work_notes for customer-facing API - those are internal only
        // Use sysparm_display_value=all to get both the value and display_value for journal fields
        request.AddParameter("sysparm_fields", "sys_id,number,short_description,description,state,priority,u_store_number,u_franchisee_id,sys_created_on,sys_updated_on,assigned_to,comments");
        request.AddParameter("sysparm_display_value", "all");
        
        // Get raw response
        var rawResponse = await _client.ExecuteAsync(request);
        
        // Parse the JSON response manually since it has nested objects
        var jsonDoc = System.Text.Json.JsonDocument.Parse(rawResponse.Content ?? "{}");
        var resultElement = jsonDoc.RootElement.GetProperty("result");
        
        // Create a dynamic object from the JSON
        var t = new ServiceNowIncident
        {
            sys_id = resultElement.GetProperty("sys_id"),
            number = resultElement.GetProperty("number"),
            short_description = resultElement.GetProperty("short_description"),
            description = resultElement.GetProperty("description"),
            state = resultElement.GetProperty("state"),
            priority = resultElement.GetProperty("priority"),
            u_store_number = resultElement.GetProperty("u_store_number"),
            u_franchisee_id = resultElement.GetProperty("u_franchisee_id"),
            sys_created_on = resultElement.GetProperty("sys_created_on"),
            sys_updated_on = resultElement.GetProperty("sys_updated_on"),
            assigned_to = resultElement.TryGetProperty("assigned_to", out var assignedTo) ? (object)assignedTo : null,
            comments = resultElement.TryGetProperty("comments", out var comments) ? (object)comments : null
        };
        
        // Fetch audit history separately
        var auditHistory = await GetTicketAuditHistory(id);
        
        return new Ticket
        {
            Id = GetFieldValue(t.sys_id),
            Number = GetFieldValue(t.number),
            Title = GetFieldValue(t.short_description),
            Description = GetFieldValue(t.description),
            Status = MapState(GetFieldValue(t.state)),
            Priority = MapPriority(GetFieldValue(t.priority)),
            StoreNumber = GetFieldValue(t.u_store_number),
            FranchiseeId = GetFieldValue(t.u_franchisee_id),
            CreatedAt = GetFieldValue(t.sys_created_on),
            UpdatedAt = GetFieldValue(t.sys_updated_on),
            AssignedTo = t.assigned_to is System.Text.Json.JsonElement assignedElem && assignedElem.ValueKind != System.Text.Json.JsonValueKind.Null ? GetAssignedToValue(assignedElem) : null,
            Comments = t.comments is System.Text.Json.JsonElement commentsElem && commentsElem.ValueKind != System.Text.Json.JsonValueKind.Null ? GetFieldDisplayValue(commentsElem) : null,
            // Don't expose work_notes to customers
            WorkNotes = null,
            AuditHistory = auditHistory
        };
    }
    
    private async Task<List<AuditEntry>> GetTicketAuditHistory(string ticketId)
    {
        try
        {
            var request = new RestRequest($"/api/now/table/sys_audit");
            request.AddParameter("sysparm_query", $"documentkey={ticketId}^tablename=incident");
            request.AddParameter("sysparm_limit", 50);
            request.AddParameter("sysparm_orderby", "sys_created_on^desc");
            
            var response = await _client.GetAsync<ServiceNowAuditResponse>(request);
            
            if (response?.Result == null)
                return new List<AuditEntry>();
            
            return response.Result
                .Where(a => a.fieldname == "state" || a.fieldname == "priority" || a.fieldname == "assigned_to" || a.fieldname == "comments" || a.fieldname == "work_notes")
                .Select(a => new AuditEntry
                {
                    Timestamp = a.sys_created_on,
                    Field = MapFieldName(a.fieldname),
                    OldValue = MapFieldValue(a.fieldname, a.oldvalue),
                    NewValue = MapFieldValue(a.fieldname, a.newvalue),
                    UpdatedBy = a.user
                })
                .ToList();
        }
        catch
        {
            // If audit history fails, return empty list
            return new List<AuditEntry>();
        }
    }
    
    private string MapFieldName(string fieldname)
    {
        return fieldname switch
        {
            "state" => "Status",
            "priority" => "Priority",
            "assigned_to" => "Assigned To",
            "comments" => "Comment Added",
            "work_notes" => "Work Note Added",
            _ => fieldname
        };
    }
    
    private string MapFieldValue(string fieldname, string value)
    {
        if (string.IsNullOrEmpty(value)) return "None";
        
        return fieldname switch
        {
            "state" => MapState(value),
            "priority" => MapPriority(value),
            _ => value
        };
    }

    public async Task<CreateTicketResponse> CreateTicketAsync(CreateTicketDto dto)
    {
        var request = new RestRequest("/api/now/table/incident", Method.Post);
        
        // Build the request body dynamically
        var requestBody = new Dictionary<string, object>
        {
            { "short_description", dto.Title },
            { "description", dto.Description },
            { "u_store_number", dto.StoreNumber ?? "" },
            { "u_franchisee_id", dto.FranchiseeId ?? "FR-12345" },
            { "category", "inquiry" },
            { "subcategory", "internal" },
            // Set caller_id with email - ServiceNow may be able to resolve it
            { "caller_id", dto.CallerEmail ?? "support@dunkinbrands.com" },
            // Also store in custom field as backup
            { "contact_type", "self-service" },
            { "u_contact_email", dto.CallerEmail ?? "support@dunkinbrands.com" }
        };
        
        // If Impact and Urgency are provided, use them and let ServiceNow calculate Priority
        if (!string.IsNullOrEmpty(dto.Impact) && !string.IsNullOrEmpty(dto.Urgency))
        {
            requestBody["impact"] = dto.Impact;
            requestBody["urgency"] = dto.Urgency;
            // Don't set priority - let ServiceNow calculate it from impact/urgency
        }
        else if (!string.IsNullOrEmpty(dto.Priority))
        {
            // Fall back to explicit priority if impact/urgency not provided
            requestBody["priority"] = dto.Priority;
        }
        else
        {
            // Default to medium priority
            requestBody["priority"] = "3";
        }
        
        request.AddJsonBody(requestBody);

        var response = await _client.PostAsync<ServiceNowSingleResponse>(request);
        
        return new CreateTicketResponse
        {
            Id = response?.Result?.sys_id?.ToString() ?? "",
            Number = response?.Result?.number?.ToString() ?? "",
            Status = "created",
            Message = "Ticket created successfully"
        };
    }

    public async Task<UpdateTicketResponse> UpdateTicketAsync(string id, UpdateTicketDto dto)
    {
        var request = new RestRequest($"/api/now/table/incident/{id}", Method.Patch);
        
        var updateData = new Dictionary<string, object>();
        
        // Customer-facing API should only update comments, not work notes
        // Work notes are for internal agent use only
        if (!string.IsNullOrEmpty(dto.CustomerComment))
            updateData["comments"] = dto.CustomerComment;
            
        // Description field can also go to comments for customer updates
        if (!string.IsNullOrEmpty(dto.Description))
            updateData["comments"] = dto.Description;
            
        // Handle priority updates (either direct or via impact/urgency)
        if (!string.IsNullOrEmpty(dto.Impact) && !string.IsNullOrEmpty(dto.Urgency))
        {
            updateData["impact"] = dto.Impact;
            updateData["urgency"] = dto.Urgency;
            // Don't set priority - let ServiceNow calculate it
        }
        else if (!string.IsNullOrEmpty(dto.Priority))
        {
            updateData["priority"] = dto.Priority;
        }
        
        if (!string.IsNullOrEmpty(dto.State))
            updateData["state"] = dto.State;

        request.AddJsonBody(updateData);
        
        var response = await _client.PatchAsync<ServiceNowSingleResponse>(request);
        
        return new UpdateTicketResponse
        {
            Id = response?.Result?.sys_id?.ToString() ?? id,
            Status = "updated",
            Message = "Ticket updated successfully"
        };
    }

    public async Task<ServiceNowTestResponse> TestConnectionAsync()
    {
        var username = _configuration["ServiceNow:Username"];
        var request = new RestRequest("/api/now/table/sys_user");
        request.AddParameter("sysparm_query", $"user_name={username}");
        request.AddParameter("sysparm_limit", 1);

        try
        {
            var response = await _client.GetAsync<ServiceNowUserResponse>(request);
            return new ServiceNowTestResponse
            {
                Status = "connected",
                Instance = _configuration["ServiceNow:Instance"],
                User = response?.Result?.FirstOrDefault()?.user_name ?? "Unknown",
                Message = "ServiceNow connection successful"
            };
        }
        catch (Exception ex)
        {
            return new ServiceNowTestResponse
            {
                Status = "failed",
                Instance = _configuration["ServiceNow:Instance"],
                Message = ex.Message
            };
        }
    }

    private string? GetAssignedToValue(object? assignedTo)
    {
        if (assignedTo == null) return null;
        
        // If it's a string, return it directly
        if (assignedTo is string str) return str;
        
        // If it's a ServiceNowReference object
        if (assignedTo is ServiceNowReference reference) return reference.value;
        
        // Try to access value property dynamically
        try
        {
            var type = assignedTo.GetType();
            var prop = type.GetProperty("value");
            if (prop != null)
            {
                return prop.GetValue(assignedTo)?.ToString();
            }
        }
        catch { }
        
        return null;
    }
    
    private string GetFieldValue(object? field)
    {
        if (field == null) return "";
        
        // Handle JsonElement from System.Text.Json
        if (field is System.Text.Json.JsonElement element)
        {
            if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                if (element.TryGetProperty("value", out var valueElement))
                {
                    return valueElement.GetString() ?? "";
                }
            }
            else if (element.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                return element.GetString() ?? "";
            }
        }
        
        return field?.ToString() ?? "";
    }
    
    private string? GetFieldDisplayValue(object? field)
    {
        if (field == null) return null;
        
        // Handle JsonElement from System.Text.Json
        if (field is System.Text.Json.JsonElement element)
        {
            if (element.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                if (element.TryGetProperty("display_value", out var displayElement))
                {
                    return displayElement.GetString();
                }
            }
            else if (element.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                return element.GetString();
            }
        }
        
        return field?.ToString();
    }

    private string MapState(string? state)
    {
        if (string.IsNullOrEmpty(state))
            return "unknown";
        
        // Handle both numeric codes and display values
        var normalizedState = state.ToLower().Replace(" ", "_").Replace("-", "_");
        
        return normalizedState switch
        {
            "1" or "new" => "new",
            "2" or "in_progress" or "in progress" or "work_in_progress" => "in_progress",
            "3" or "on_hold" or "on hold" or "pending" => "on_hold",
            "4" or "awaiting_info" or "awaiting info" => "awaiting_info",
            "5" or "awaiting_change" or "awaiting change" => "awaiting_change",
            "6" or "resolved" => "resolved",
            "7" or "closed" => "closed",
            "8" or "canceled" or "cancelled" => "canceled",
            _ => normalizedState // Return the normalized value directly
        };
    }

    private string MapPriority(string? priority)
    {
        if (string.IsNullOrEmpty(priority))
            return "unknown";
        
        // Handle both numeric codes and display values
        var normalizedPriority = priority.ToLower().Trim();
        
        // Check if it contains a number prefix like "3 - Moderate"
        if (normalizedPriority.Contains(" - "))
        {
            var parts = normalizedPriority.Split(" - ");
            if (parts.Length > 1)
            {
                normalizedPriority = parts[1].Trim(); // Get the text part
            }
        }
        
        return normalizedPriority switch
        {
            "1" or "critical" or "1 - critical" => "critical",
            "2" or "high" or "2 - high" => "high",
            "3" or "medium" or "moderate" or "3 - moderate" => "medium",
            "4" or "low" or "4 - low" => "low",
            "5" or "planning" or "5 - planning" => "planning",
            _ => normalizedPriority // Return the normalized value directly
        };
    }
}

// DTOs and Models
public class Ticket
{
    public string Id { get; set; } = "";
    public string Number { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Status { get; set; } = "";
    public string Priority { get; set; } = "";
    public string? StoreNumber { get; set; }
    public string? FranchiseeId { get; set; }
    public string CreatedAt { get; set; } = "";
    public string UpdatedAt { get; set; } = "";
    public string? AssignedTo { get; set; }
    public string? Comments { get; set; }
    public string? WorkNotes { get; set; }
    public List<AuditEntry> AuditHistory { get; set; } = new();
}

public class AuditEntry
{
    public string Timestamp { get; set; } = "";
    public string Field { get; set; } = "";
    public string OldValue { get; set; } = "";
    public string NewValue { get; set; } = "";
    public string UpdatedBy { get; set; } = "";
}

public class CreateTicketDto
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string? Priority { get; set; }
    public string? Impact { get; set; }
    public string? Urgency { get; set; }
    public string? StoreNumber { get; set; }
    public string? FranchiseeId { get; set; }
    public string? CallerEmail { get; set; }
}

public class UpdateTicketDto
{
    public string? Description { get; set; }
    public string? Priority { get; set; }
    public string? State { get; set; }
    public string? Impact { get; set; }
    public string? Urgency { get; set; }
    public string? CustomerComment { get; set; }
}

public class CreateTicketResponse
{
    public string Id { get; set; } = "";
    public string Number { get; set; } = "";
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
}

public class UpdateTicketResponse
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "";
    public string Message { get; set; } = "";
}

public class ServiceNowTestResponse
{
    public string Status { get; set; } = "";
    public string Instance { get; set; } = "";
    public string? User { get; set; }
    public string Message { get; set; } = "";
}

// ServiceNow API response models
public class ServiceNowResponse
{
    public List<ServiceNowIncident> Result { get; set; } = new();
}

public class ServiceNowSingleResponse
{
    public ServiceNowIncident Result { get; set; } = new();
}

public class ServiceNowUserResponse
{
    public List<ServiceNowUser> Result { get; set; } = new();
}

public class ServiceNowIncident
{
    // Use dynamic to handle both string and object responses from ServiceNow
    public dynamic sys_id { get; set; } = "";
    public dynamic number { get; set; } = "";
    public dynamic short_description { get; set; } = "";
    public dynamic description { get; set; } = "";
    public dynamic state { get; set; } = "";
    public dynamic priority { get; set; } = "";
    public dynamic u_store_number { get; set; } = "";
    public dynamic u_franchisee_id { get; set; } = "";
    public dynamic sys_created_on { get; set; } = "";
    public dynamic sys_updated_on { get; set; } = "";
    public dynamic? assigned_to { get; set; }
    public dynamic? comments { get; set; }
    public dynamic? work_notes { get; set; }
    public dynamic? comments_and_work_notes { get; set; }
}

public class ServiceNowAuditResponse
{
    public List<ServiceNowAuditRecord> Result { get; set; } = new();
}

public class ServiceNowAuditRecord
{
    public string sys_created_on { get; set; } = "";
    public string fieldname { get; set; } = "";
    public string oldvalue { get; set; } = "";
    public string newvalue { get; set; } = "";
    public string user { get; set; } = "";
    public string documentkey { get; set; } = "";
    public string tablename { get; set; } = "";
}

public class ServiceNowReference
{
    public string value { get; set; } = "";
}

public class ServiceNowUser
{
    public string user_name { get; set; } = "";
}