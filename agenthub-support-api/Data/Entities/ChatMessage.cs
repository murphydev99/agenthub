namespace AgentHubSupportApi.Data.Entities;

public class ChatMessage
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public ChatSession Session { get; set; } = null!;
    public string SenderType { get; set; } = string.Empty; // user, bot, agent
    public string SenderId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}