namespace AgentHubSupportApi.Data.Entities;

public class UserStoreMapping
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // B2C Object ID
    public string StoreNumber { get; set; } = string.Empty;
    public string? PCNumber { get; set; }
    public string? FranchiseeId { get; set; }
    public string? FranchiseeName { get; set; }
    public string? ClientCode { get; set; }
    public string Role { get; set; } = "user"; // owner, manager, employee
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
}