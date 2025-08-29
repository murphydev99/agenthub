namespace AgentHubSupportApi.Data.Entities;

public class ChatSession
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string StoreNumber { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public bool EscalatedToAgent { get; set; }
    public string? AgentId { get; set; }
    public bool Resolved { get; set; }
    public int? SatisfactionRating { get; set; }
    public List<ChatMessage> Messages { get; set; } = new();
}