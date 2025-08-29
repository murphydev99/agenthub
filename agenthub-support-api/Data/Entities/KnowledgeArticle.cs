namespace AgentHubSupportApi.Data.Entities;

public class KnowledgeArticle
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public string? WorkflowId { get; set; } // AgentHub workflow reference
    public int Views { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
}