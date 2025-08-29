using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;

namespace api_dotnet.Controllers;

// [Authorize]  // Temporarily disabled for testing
[ApiController]
[Route("api/[controller]")]
// [RequiredScope(RequiredScopesConfigurationKey = "AzureAdB2C:Scopes")]  // Temporarily disabled for testing
public class TicketsController : ControllerBase
{
    private readonly IServiceNowClient _serviceNowClient;
    private readonly ILogger<TicketsController> _logger;

    public TicketsController(IServiceNowClient serviceNowClient, ILogger<TicketsController> logger)
    {
        _serviceNowClient = serviceNowClient;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<Ticket>>> GetTickets([FromQuery] string? store, [FromQuery] string? status, [FromQuery] string? priority)
    {
        try
        {
            var tickets = await _serviceNowClient.GetTicketsAsync(store, status, priority);
            return Ok(tickets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tickets");
            return StatusCode(500, new { error = "Failed to fetch tickets", details = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Ticket>> GetTicket(string id)
    {
        try
        {
            var ticket = await _serviceNowClient.GetTicketAsync(id);
            return Ok(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ticket {TicketId}", id);
            return StatusCode(500, new { error = "Failed to fetch ticket", details = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<CreateTicketResponse>> CreateTicket([FromBody] CreateTicketDto dto)
    {
        try
        {
            // Log all available claims for debugging
            _logger.LogInformation("===== START CLAIMS DEBUG =====");
            _logger.LogInformation("Total claims count: {Count}", User.Claims.Count());
            _logger.LogInformation("User.Identity.Name: {Name}", User.Identity?.Name ?? "null");
            _logger.LogInformation("User.Identity.IsAuthenticated: {Auth}", User.Identity?.IsAuthenticated ?? false);
            
            foreach (var claim in User.Claims)
            {
                _logger.LogInformation("Claim Type: [{Type}] = Value: [{Value}]", claim.Type, claim.Value);
            }
            
            // Log specific claim lookups
            _logger.LogInformation("Looking for 'name' claim: {Value}", User.FindFirst("name")?.Value ?? "NOT FOUND");
            _logger.LogInformation("Looking for ClaimTypes.Name: {Value}", User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "NOT FOUND");
            _logger.LogInformation("Looking for 'emails' claim: {Value}", User.FindFirst("emails")?.Value ?? "NOT FOUND");
            _logger.LogInformation("===== END CLAIMS DEBUG =====");
            
            // Try multiple claim types for name
            var userName = User.FindFirst("name")?.Value ?? 
                          User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value ??
                          User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
                          User.FindFirst("given_name")?.Value ?? 
                          User.Identity?.Name ??
                          "Customer";
            
            // Try multiple claim types for email  
            var userEmail = User.FindFirst("emails")?.Value ?? 
                           User.FindFirst("email")?.Value ?? 
                           User.FindFirst("preferred_username")?.Value ??
                           User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ??
                           User.FindFirst("upn")?.Value ??
                           "";
                           
            // Clean up emails claim if it's a JSON array
            if (userEmail?.StartsWith("[") == true && userEmail?.EndsWith("]") == true)
            {
                userEmail = userEmail.Trim('[', ']', '"');
            }
            
            // Set the caller email to the authenticated user's email
            dto.CallerEmail = userEmail;
            
            // Add user identification at the end of the description (not at the beginning)
            if (!string.IsNullOrEmpty(dto.Description))
            {
                dto.Description = $"{dto.Description}\n\n[Submitted by {userName} ({userEmail})]";
            }
            
            _logger.LogInformation("Creating ticket for user: {Name} ({Email})", userName, userEmail);
            
            var response = await _serviceNowClient.CreateTicketAsync(dto);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ticket");
            return StatusCode(500, new { error = "Failed to create ticket", details = ex.Message });
        }
    }

    [HttpPatch("{id}")]
    public async Task<ActionResult<UpdateTicketResponse>> UpdateTicket(string id, [FromBody] UpdateTicketDto dto)
    {
        try
        {
            // Get user information from B2C ID token claims
            var userName = User.FindFirst("name")?.Value ?? 
                          User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value ??
                          User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
                          User.FindFirst("given_name")?.Value ?? 
                          User.Identity?.Name ??
                          "Customer";
            
            var userEmail = User.FindFirst("emails")?.Value ?? 
                           User.FindFirst("email")?.Value ?? 
                           User.FindFirst("preferred_username")?.Value ??
                           User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ??
                           User.FindFirst("upn")?.Value ??
                           "";
                           
            // Clean up emails claim if it's a JSON array
            if (userEmail?.StartsWith("[") == true && userEmail?.EndsWith("]") == true)
            {
                userEmail = userEmail.Trim('[', ']', '"');
            }
            
            _logger.LogInformation("Updating ticket {TicketId} for user: {Name} ({Email})", id, userName, userEmail);
            
            // Add user identification at the end of comments (same format as description)
            if (!string.IsNullOrEmpty(dto.CustomerComment))
            {
                dto.CustomerComment = $"{dto.CustomerComment}\n\n[Comment from {userName} ({userEmail})]";
            }
            // Keep description as-is without modification
            
            var response = await _serviceNowClient.UpdateTicketAsync(id, dto);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating ticket {TicketId}", id);
            return StatusCode(500, new { error = "Failed to update ticket", details = ex.Message });
        }
    }

    [HttpGet("test-servicenow")]
    [AllowAnonymous]
    public async Task<ActionResult<ServiceNowTestResponse>> TestServiceNow()
    {
        try
        {
            var response = await _serviceNowClient.TestConnectionAsync();
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing ServiceNow connection");
            return StatusCode(500, new { status = "failed", instance = "", message = ex.Message });
        }
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow.ToString("o"),
            servicenow = new
            {
                instance = "dev305755",
                connected = true
            }
        });
    }
}