using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Identity.Web.Resource;
using System.Security.Claims;
using AgentHubSupportApi.Interfaces;
using AgentHubSupportApi.Models;

namespace AgentHubSupportApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[RequiredScope(RequiredScopesConfigurationKey = "AzureAdB2C:Scopes")]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly IUserMappingService _userMappingService;
    private readonly ILogger<TicketsController> _logger;

    public TicketsController(
        ITicketService ticketService,
        IUserMappingService userMappingService,
        ILogger<TicketsController> logger)
    {
        _ticketService = ticketService;
        _userMappingService = userMappingService;
        _logger = logger;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                                   User.FindFirst("sub")?.Value ?? 
                                   throw new UnauthorizedAccessException("User ID not found");

    private async Task<UserContext> GetUserContextAsync()
    {
        var userId = GetUserId();
        
        // Try to get from database first
        var context = await _userMappingService.GetUserContextAsync(userId);
        
        // If not found, create from claims
        if (context == null || context.StoreNumbers.Count == 0)
        {
            context = new UserContext
            {
                UserId = userId,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("emails")?.Value ?? "",
                StoreNumbers = GetClaimValues("extension_StoreNumbers"),
                PCNumbers = GetClaimValues("extension_PCNumbers"),
                FranchiseeId = User.FindFirst("extension_FranchiseeId")?.Value,
                FranchiseeName = User.FindFirst("extension_FranchiseeName")?.Value,
                ClientCode = User.FindFirst("extension_ClientCode")?.Value,
                Role = User.FindFirst(ClaimTypes.Role)?.Value ?? "user"
            };
            
            // Save for future use
            await _userMappingService.CreateOrUpdateUserMappingAsync(userId, context);
        }
        
        return context;
    }

    private List<string> GetClaimValues(string claimType)
    {
        var claim = User.FindFirst(claimType)?.Value;
        if (string.IsNullOrEmpty(claim))
            return new List<string>();
        
        return claim.Split(',', StringSplitOptions.RemoveEmptyEntries)
                   .Select(s => s.Trim())
                   .ToList();
    }

    [HttpGet]
    public async Task<ActionResult<List<TicketDto>>> GetMyTickets()
    {
        try
        {
            var context = await GetUserContextAsync();
            
            if (context.StoreNumbers.Count == 0)
            {
                return Ok(new List<TicketDto>());
            }
            
            var tickets = await _ticketService.GetUserTicketsAsync(
                context.UserId, 
                context.StoreNumbers, 
                context.ClientCode);
            
            return Ok(tickets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tickets for user");
            return StatusCode(500, new { error = "Failed to fetch tickets" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TicketDto>> GetTicket(string id)
    {
        try
        {
            var userId = GetUserId();
            var ticket = await _ticketService.GetTicketByIdAsync(id, userId);
            
            if (ticket == null)
            {
                return NotFound();
            }
            
            // Verify user has access to this ticket's store
            var context = await GetUserContextAsync();
            if (!context.StoreNumbers.Contains(ticket.StoreNumber))
            {
                return Forbid("You don't have access to this store's tickets");
            }
            
            return Ok(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ticket {TicketId}", id);
            return StatusCode(500, new { error = "Failed to fetch ticket" });
        }
    }

    [HttpGet("store/{storeNumber}")]
    public async Task<ActionResult<List<TicketDto>>> GetStoreTickets(string storeNumber)
    {
        try
        {
            var context = await GetUserContextAsync();
            
            // Check if user has access to this store
            if (!context.StoreNumbers.Contains(storeNumber))
            {
                return Forbid($"You don't have access to store {storeNumber}");
            }
            
            var tickets = await _ticketService.GetStoreTicketsAsync(
                storeNumber, 
                context.UserId, 
                context.StoreNumbers);
            
            return Ok(tickets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tickets for store {Store}", storeNumber);
            return StatusCode(500, new { error = "Failed to fetch store tickets" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<TicketDto>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Title))
            {
                return BadRequest("Title is required");
            }
            
            var context = await GetUserContextAsync();
            
            // Verify user has access to the store
            if (!context.StoreNumbers.Contains(request.StoreNumber))
            {
                return Forbid($"You don't have access to create tickets for store {request.StoreNumber}");
            }
            
            var ticket = await _ticketService.CreateTicketAsync(request, context.UserId, context);
            
            return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ticket for store {Store}", request.StoreNumber);
            return StatusCode(500, new { error = "Failed to create ticket" });
        }
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateTicket(string id, [FromBody] UpdateTicketRequest request)
    {
        try
        {
            var userId = GetUserId();
            
            // Get ticket to verify access
            var ticket = await _ticketService.GetTicketByIdAsync(id, userId);
            if (ticket == null)
            {
                return NotFound();
            }
            
            var context = await GetUserContextAsync();
            if (!context.StoreNumbers.Contains(ticket.StoreNumber))
            {
                return Forbid("You don't have access to update this ticket");
            }
            
            var success = await _ticketService.UpdateTicketAsync(id, request, userId);
            
            if (success)
            {
                return NoContent();
            }
            
            return StatusCode(500, new { error = "Failed to update ticket" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating ticket {TicketId}", id);
            return StatusCode(500, new { error = "Failed to update ticket" });
        }
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] AddCommentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Comment))
            {
                return BadRequest("Comment is required");
            }
            
            var userId = GetUserId();
            
            // Verify access
            var ticket = await _ticketService.GetTicketByIdAsync(id, userId);
            if (ticket == null)
            {
                return NotFound();
            }
            
            var context = await GetUserContextAsync();
            if (!context.StoreNumbers.Contains(ticket.StoreNumber))
            {
                return Forbid("You don't have access to comment on this ticket");
            }
            
            var updateRequest = new UpdateTicketRequest
            {
                Comments = $"[{context.Email}]: {request.Comment}"
            };
            
            var success = await _ticketService.UpdateTicketAsync(id, updateRequest, userId);
            
            if (success)
            {
                return NoContent();
            }
            
            return StatusCode(500, new { error = "Failed to add comment" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to ticket {TicketId}", id);
            return StatusCode(500, new { error = "Failed to add comment" });
        }
    }
}

public class AddCommentRequest
{
    public string Comment { get; set; } = string.Empty;
}