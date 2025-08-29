using Microsoft.EntityFrameworkCore;
using AgentHubSupportApi.Data.Entities;

namespace AgentHubSupportApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserStoreMapping> UserStoreMappings { get; set; }
    public DbSet<CachedTicket> CachedTickets { get; set; }
    public DbSet<KnowledgeArticle> KnowledgeArticles { get; set; }
    public DbSet<ChatSession> ChatSessions { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // User Store Mapping
        modelBuilder.Entity<UserStoreMapping>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.StoreNumber }).IsUnique();
        });

        // Cached Ticket
        modelBuilder.Entity<CachedTicket>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ServiceNowSysId).IsUnique();
            entity.HasIndex(e => e.StoreNumber);
            entity.HasIndex(e => e.FranchiseeId);
        });

        // Knowledge Article
        modelBuilder.Entity<KnowledgeArticle>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
        });

        // Chat Session
        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Session)
                .HasForeignKey(m => m.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Chat Message
        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SessionId);
        });
    }
}