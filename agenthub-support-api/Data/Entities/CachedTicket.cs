namespace AgentHubSupportApi.Data.Entities;

public class CachedTicket
{
    public int Id { get; set; }
    public string ServiceNowSysId { get; set; } = string.Empty;
    public string ServiceNowNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string StoreNumber { get; set; } = string.Empty;
    public string? PCNumber { get; set; }
    public string? FranchiseeId { get; set; }
    public string? ClientCode { get; set; }
    public string? Brand { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime UpdatedDate { get; set; }
    public DateTime LastSyncDate { get; set; } = DateTime.UtcNow;
}