using AgentHubSupportApi.Data;
using AgentHubSupportApi.Interfaces;
using AgentHubSupportApi.Models;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace AgentHubSupportApi.Services;

public class TicketService : ITicketService
{
    private readonly IServiceNowService _serviceNowService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TicketService> _logger;
    private readonly IMapper _mapper;
    private readonly IConfiguration _configuration;

    public TicketService(
        IServiceNowService serviceNowService,
        ApplicationDbContext context,
        ILogger<TicketService> logger,
        IMapper mapper,
        IConfiguration configuration)
    {
        _serviceNowService = serviceNowService;
        _context = context;
        _logger = logger;
        _mapper = mapper;
        _configuration = configuration;
    }

    public async Task<List<TicketDto>> GetUserTicketsAsync(string userId, List<string> storeNumbers, string? clientCode = null)
    {
        try
        {
            // Get tickets from ServiceNow
            var incidents = await _serviceNowService.GetIncidentsByStoresAsync(storeNumbers, clientCode);
            
            // Map to DTOs
            var tickets = incidents.Select(inc => MapToTicketDto(inc)).ToList();
            
            // Cache in database for performance
            await CacheTicketsAsync(tickets);
            
            return tickets;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tickets for user {UserId}", userId);
            
            // Fallback to cached data if ServiceNow is unavailable
            var cachedTickets = await _context.CachedTickets
                .Where(t => storeNumbers.Contains(t.StoreNumber))
                .OrderByDescending(t => t.UpdatedDate)
                .Take(100)
                .ToListAsync();
            
            return cachedTickets.Select(t => new TicketDto
            {
                Id = t.ServiceNowSysId,
                Number = t.ServiceNowNumber,
                Title = t.Title,
                Description = t.Description ?? "",
                Status = t.Status,
                Priority = t.Priority,
                StoreNumber = t.StoreNumber,
                PCNumber = t.PCNumber,
                Brand = t.Brand,
                CreatedDate = t.CreatedDate,
                UpdatedDate = t.UpdatedDate
            }).ToList();
        }
    }

    public async Task<TicketDto?> GetTicketByIdAsync(string ticketId, string userId)
    {
        var incident = await _serviceNowService.GetIncidentByIdAsync(ticketId);
        
        if (incident == null)
        {
            // Try cache
            var cached = await _context.CachedTickets
                .FirstOrDefaultAsync(t => t.ServiceNowSysId == ticketId);
            
            if (cached != null)
            {
                return new TicketDto
                {
                    Id = cached.ServiceNowSysId,
                    Number = cached.ServiceNowNumber,
                    Title = cached.Title,
                    Description = cached.Description ?? "",
                    Status = cached.Status,
                    Priority = cached.Priority,
                    StoreNumber = cached.StoreNumber,
                    PCNumber = cached.PCNumber,
                    Brand = cached.Brand,
                    CreatedDate = cached.CreatedDate,
                    UpdatedDate = cached.UpdatedDate
                };
            }
            
            return null;
        }
        
        return MapToTicketDto(incident);
    }

    public async Task<TicketDto> CreateTicketAsync(CreateTicketRequest request, string userId, UserContext userContext)
    {
        // Log incoming request values
        _logger.LogInformation("CreateTicket Request - Impact: {Impact}, Urgency: {Urgency}, Priority: {Priority}", 
            request.Impact, request.Urgency, request.Priority);
        
        // Use Impact and Urgency from request, or calculate from Priority if not provided
        string impact, urgency;
        
        if (!string.IsNullOrEmpty(request.Impact) && !string.IsNullOrEmpty(request.Urgency))
        {
            // Use provided Impact and Urgency
            impact = request.Impact;
            urgency = request.Urgency;
            _logger.LogInformation("Using provided Impact: {Impact}, Urgency: {Urgency}", impact, urgency);
        }
        else if (!string.IsNullOrEmpty(request.Priority))
        {
            // Fall back to calculating from Priority for backward compatibility
            (impact, urgency) = GetImpactAndUrgencyFromPriority(request.Priority);
        }
        else
        {
            // Default to Medium/Medium
            impact = "2";
            urgency = "2";
        }
        
        var incident = new ServiceNowIncident
        {
            ShortDescription = request.Title,
            Description = request.Description,
            StoreNumber = request.StoreNumber,
            PCNumber = request.PCNumber ?? userContext.PCNumbers?.FirstOrDefault(),
            FranchiseeId = userContext.FranchiseeId,
            FranchiseeName = userContext.FranchiseeName,
            Brand = request.Brand ?? GetBrandFromStore(request.StoreNumber),
            ClientCode = userContext.ClientCode,
            Category = request.Category ?? "inquiry",
            // Set Impact and Urgency - ServiceNow will calculate Priority
            Impact = impact,
            Urgency = urgency,
            AssignmentGroup = _configuration["ServiceNow:DefaultAssignmentGroup"]
        };
        
        _logger.LogInformation("Sending to ServiceNow - Impact: {Impact}, Urgency: {Urgency}", 
            incident.Impact, incident.Urgency);
        
        var created = await _serviceNowService.CreateIncidentAsync(incident, userContext.Email);
        
        // Cache the ticket
        await CacheTicketAsync(MapToTicketDto(created));
        
        return MapToTicketDto(created);
    }

    public async Task<bool> UpdateTicketAsync(string ticketId, UpdateTicketRequest request, string userId)
    {
        var update = new ServiceNowIncident();
        
        if (!string.IsNullOrEmpty(request.Comments))
        {
            update.Comments = request.Comments;
        }
        
        if (!string.IsNullOrEmpty(request.State))
        {
            update.State = request.State;
        }
        
        if (!string.IsNullOrEmpty(request.Priority))
        {
            update.Priority = MapPriority(request.Priority);
        }
        
        var result = await _serviceNowService.UpdateIncidentAsync(ticketId, update);
        
        if (result != null)
        {
            // Update cache
            var cached = await _context.CachedTickets
                .FirstOrDefaultAsync(t => t.ServiceNowSysId == ticketId);
            
            if (cached != null)
            {
                cached.Status = result.State;
                cached.Priority = result.Priority ?? "3"; // Default to medium if null
                cached.UpdatedDate = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        
        return result != null;
    }

    public async Task<List<TicketDto>> GetStoreTicketsAsync(string storeNumber, string userId, List<string> userStores)
    {
        if (!userStores.Contains(storeNumber))
        {
            return new List<TicketDto>();
        }
        
        var incidents = await _serviceNowService.GetIncidentsByStoresAsync(new List<string> { storeNumber });
        return incidents.Select(inc => MapToTicketDto(inc)).ToList();
    }

    private TicketDto MapToTicketDto(ServiceNowIncident incident)
    {
        return new TicketDto
        {
            Id = incident.SysId ?? "",
            Number = incident.Number ?? "",
            Title = incident.ShortDescription,
            Description = incident.Description ?? "",
            Status = IncidentState.GetStateName(incident.State),
            Priority = GetPriorityName(incident.Priority),
            StoreNumber = incident.StoreNumber ?? "",
            PCNumber = incident.PCNumber,
            Brand = incident.Brand,
            CreatedDate = incident.CreatedOn ?? DateTime.UtcNow,
            UpdatedDate = incident.UpdatedOn ?? DateTime.UtcNow
        };
    }

    private async Task CacheTicketsAsync(List<TicketDto> tickets)
    {
        foreach (var ticket in tickets)
        {
            await CacheTicketAsync(ticket);
        }
    }

    private async Task CacheTicketAsync(TicketDto ticket)
    {
        try
        {
            var existing = await _context.CachedTickets
                .FirstOrDefaultAsync(t => t.ServiceNowSysId == ticket.Id);
            
            if (existing != null)
            {
                existing.Title = ticket.Title;
                existing.Description = ticket.Description;
                existing.Status = ticket.Status;
                existing.Priority = ticket.Priority;
                existing.UpdatedDate = ticket.UpdatedDate;
                existing.LastSyncDate = DateTime.UtcNow;
            }
            else
            {
                _context.CachedTickets.Add(new Data.Entities.CachedTicket
                {
                    ServiceNowSysId = ticket.Id,
                    ServiceNowNumber = ticket.Number,
                    Title = ticket.Title,
                    Description = ticket.Description,
                    Status = ticket.Status,
                    Priority = ticket.Priority,
                    StoreNumber = ticket.StoreNumber,
                    PCNumber = ticket.PCNumber,
                    Brand = ticket.Brand,
                    CreatedDate = ticket.CreatedDate,
                    UpdatedDate = ticket.UpdatedDate,
                    LastSyncDate = DateTime.UtcNow
                });
            }
            
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache ticket {TicketId}", ticket.Id);
        }
    }

    private string MapPriority(string? priority)
    {
        return priority?.ToLower() switch
        {
            "critical" or "1" => "1",
            "high" or "2" => "2",
            "medium" or "3" => "3",
            "low" or "4" => "4",
            "planning" or "5" => "5",
            _ => "3" // Default to medium
        };
    }

    private string GetPriorityName(string? priority)
    {
        if (string.IsNullOrEmpty(priority))
            return "Unknown";
            
        return priority switch
        {
            "1" => "Critical",
            "2" => "High",
            "3" => "Moderate",
            "4" => "Low",
            "5" => "Planning",
            _ => priority // Return the original value if not mapped
        };
    }

    private string GetBrandFromStore(string storeNumber)
    {
        // Logic to determine brand from store number
        // This is a placeholder - implement actual logic
        return "dunkin";
    }
    
    private (string impact, string urgency) GetImpactAndUrgencyFromPriority(string? priority)
    {
        // Based on ServiceNow priority matrix
        // Returns (Impact, Urgency) values
        return priority switch
        {
            "1" or "critical" => ("1", "1"), // Critical = High Impact + High Urgency
            "2" or "high" => ("1", "2"),     // High = High Impact + Medium Urgency
            "3" or "medium" or "moderate" => ("2", "2"), // Medium = Medium Impact + Medium Urgency
            "4" or "low" => ("2", "3"),      // Low = Medium Impact + Low Urgency
            "5" or "planning" => ("3", "3"), // Planning = Low Impact + Low Urgency
            _ => ("2", "2")                  // Default to Medium/Medium
        };
    }
}

public class UserMappingService : IUserMappingService
{
    private readonly ApplicationDbContext _context;

    public UserMappingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserContext> GetUserContextAsync(string userId)
    {
        var mappings = await _context.UserStoreMappings
            .Where(m => m.UserId == userId && m.IsActive)
            .ToListAsync();
        
        if (!mappings.Any())
        {
            return new UserContext { UserId = userId };
        }
        
        var first = mappings.First();
        
        return new UserContext
        {
            UserId = userId,
            StoreNumbers = mappings.Select(m => m.StoreNumber).Distinct().ToList(),
            PCNumbers = mappings.Where(m => m.PCNumber != null).Select(m => m.PCNumber!).Distinct().ToList(),
            FranchiseeId = first.FranchiseeId,
            FranchiseeName = first.FranchiseeName,
            ClientCode = first.ClientCode,
            Role = first.Role
        };
    }

    public async Task CreateOrUpdateUserMappingAsync(string userId, UserContext context)
    {
        // Remove existing mappings
        var existing = await _context.UserStoreMappings
            .Where(m => m.UserId == userId)
            .ToListAsync();
        
        _context.UserStoreMappings.RemoveRange(existing);
        
        // Add new mappings
        foreach (var store in context.StoreNumbers)
        {
            _context.UserStoreMappings.Add(new Data.Entities.UserStoreMapping
            {
                UserId = userId,
                StoreNumber = store,
                PCNumber = context.PCNumbers?.FirstOrDefault(),
                FranchiseeId = context.FranchiseeId,
                FranchiseeName = context.FranchiseeName,
                ClientCode = context.ClientCode,
                Role = context.Role,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                UpdatedDate = DateTime.UtcNow
            });
        }
        
        await _context.SaveChangesAsync();
    }
}

public class KnowledgeBaseService : IKnowledgeBaseService
{
    private readonly ApplicationDbContext _context;

    public KnowledgeBaseService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Interfaces.KnowledgeArticle>> SearchArticlesAsync(string query)
    {
        var articles = await _context.KnowledgeArticles
            .Where(a => a.IsPublished && 
                       (a.Title.Contains(query) || a.Content.Contains(query)))
            .OrderByDescending(a => a.Views)
            .Take(20)
            .ToListAsync();
        
        return articles.Select(a => new Interfaces.KnowledgeArticle
        {
            Id = a.Id.ToString(),
            Title = a.Title,
            Content = a.Content,
            Category = a.Category,
            Tags = a.Tags,
            CreatedDate = a.CreatedDate,
            Views = a.Views
        }).ToList();
    }

    public async Task<Interfaces.KnowledgeArticle?> GetArticleByIdAsync(string id)
    {
        if (!int.TryParse(id, out var articleId))
            return null;
        
        var article = await _context.KnowledgeArticles
            .FirstOrDefaultAsync(a => a.Id == articleId && a.IsPublished);
        
        if (article == null)
            return null;
        
        // Increment views
        article.Views++;
        await _context.SaveChangesAsync();
        
        return new Interfaces.KnowledgeArticle
        {
            Id = article.Id.ToString(),
            Title = article.Title,
            Content = article.Content,
            Category = article.Category,
            Tags = article.Tags,
            CreatedDate = article.CreatedDate,
            Views = article.Views
        };
    }
}