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
            _logger.LogInformation("Total claims count: {Count}", User.Claims.Count());
            foreach (var claim in User.Claims)
            {
                _logger.LogInformation("Claim: {Type} = {Value}", claim.Type, claim.Value);
            }
            
            // Get user information from B2C ID token claims
            // Common B2C ID token claims:
            // - name: Display name
            // - given_name: First name  
            // - family_name: Last name
            // - emails: Email (may be JSON array)
            // - email: Email
            // - sub: Subject identifier
            var userName = User.FindFirst("name")?.Value ?? 
                          User.FindFirst("given_name")?.Value ?? 
                          User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
                          User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value ??
                          "Customer";
            
            var userEmail = User.FindFirst("emails")?.Value ?? 
                           User.FindFirst("email")?.Value ?? 
                           User.FindFirst("preferred_username")?.Value ??
                           User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ??
                           User.FindFirst("upn")?.Value;
            
            // Set the caller email to the authenticated user's email
            dto.CallerEmail = userEmail;
            
            // Add user identification to the description
            if (!string.IsNullOrEmpty(dto.Description))
            {
                dto.Description = $"[Submitted by {userName} ({userEmail})]\n\n{dto.Description}";
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
                          User.FindFirst("given_name")?.Value ?? 
                          User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ??
                          User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value ??
                          "Customer";
            
            var userEmail = User.FindFirst("emails")?.Value ?? 
                           User.FindFirst("email")?.Value ?? 
                           User.FindFirst("preferred_username")?.Value ??
                           User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value ??
                           User.FindFirst("upn")?.Value;
            
            _logger.LogInformation("Updating ticket {TicketId} for user: {Name} ({Email})", id, userName, userEmail);
            
            // Prepend user identification to the comment
            if (!string.IsNullOrEmpty(dto.CustomerComment))
            {
                dto.CustomerComment = $"[Comment from {userName} ({userEmail})]\n{dto.CustomerComment}";
            }
            if (!string.IsNullOrEmpty(dto.Description))
            {
                dto.Description = $"[Update from {userName} ({userEmail})]\n{dto.Description}";
            }
            
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