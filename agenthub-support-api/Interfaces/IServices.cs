using AgentHubSupportApi.Models;

namespace AgentHubSupportApi.Interfaces;

public interface IServiceNowService
{
    Task<List<ServiceNowIncident>> GetIncidentsByStoresAsync(List<string> storeNumbers, string? clientCode = null);
    Task<ServiceNowIncident?> GetIncidentByIdAsync(string sysId);
    Task<ServiceNowIncident> CreateIncidentAsync(ServiceNowIncident incident, string userEmail);
    Task<ServiceNowIncident?> UpdateIncidentAsync(string sysId, ServiceNowIncident updates);
    Task<bool> AddCommentAsync(string sysId, string comment);
    Task<List<ServiceNowIncident>> SearchIncidentsAsync(string searchTerm, List<string> storeNumbers);
}

public interface ITicketService
{
    Task<List<TicketDto>> GetUserTicketsAsync(string userId, List<string> storeNumbers, string? clientCode = null);
    Task<TicketDto?> GetTicketByIdAsync(string ticketId, string userId);
    Task<TicketDto> CreateTicketAsync(CreateTicketRequest request, string userId, UserContext userContext);
    Task<bool> UpdateTicketAsync(string ticketId, UpdateTicketRequest request, string userId);
    Task<List<TicketDto>> GetStoreTicketsAsync(string storeNumber, string userId, List<string> userStores);
}

public interface IUserMappingService
{
    Task<UserContext> GetUserContextAsync(string userId);
    Task CreateOrUpdateUserMappingAsync(string userId, UserContext context);
}

public interface IKnowledgeBaseService
{
    Task<List<KnowledgeArticle>> SearchArticlesAsync(string query);
    Task<KnowledgeArticle?> GetArticleByIdAsync(string id);
}

public class UserContext
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> StoreNumbers { get; set; } = new();
    public List<string> PCNumbers { get; set; } = new();
    public string? FranchiseeId { get; set; }
    public string? FranchiseeName { get; set; }
    public string? ClientCode { get; set; }
    public string? ServiceNowUserId { get; set; }
    public string Role { get; set; } = "user";
}

public class KnowledgeArticle
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedDate { get; set; }
    public int Views { get; set; }
}