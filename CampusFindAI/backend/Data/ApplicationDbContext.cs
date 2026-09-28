using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CampusFindAI.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Role> DomainRoles => Set<Role>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<LostItem> LostItems => Set<LostItem>();
    public DbSet<FoundItem> FoundItems => Set<FoundItem>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Claim> Claims => Set<Claim>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Floor> Floors => Set<Floor>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Image> Images => Set<Image>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<Reputation> Reputations => Set<Reputation>();
    public DbSet<ReputationHistory> ReputationHistories => Set<ReputationHistory>();
    public DbSet<ChatHistory> ChatHistories => Set<ChatHistory>();
    public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
    public DbSet<ClaimChatConversation> ClaimChatConversations => Set<ClaimChatConversation>();
    public DbSet<ClaimChatMessage> ClaimChatMessages => Set<ClaimChatMessage>();
    public DbSet<AIRequest> AIRequests => Set<AIRequest>();
    public DbSet<Feedback> Feedback => Set<Feedback>();
    public DbSet<ClaimVerification> ClaimVerifications => Set<ClaimVerification>();
    public DbSet<SecurityOfficerRequest> SecurityOfficerRequests => Set<SecurityOfficerRequest>();
    public DbSet<VisualEmbedding> VisualEmbeddings => Set<VisualEmbedding>();
    public DbSet<SupportPayment> SupportPayments => Set<SupportPayment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Role>().ToTable("Roles");
        builder.Entity<ApplicationUser>().Property(x => x.Role).HasConversion<string>();
        builder.Entity<ApplicationUser>().Property(x => x.IsRestricted).HasDefaultValue(false);

        builder.Entity<UserProfile>()
            .HasOne(x => x.User)
            .WithOne(x => x.UserProfile)
            .HasForeignKey<UserProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserProfile>().Property(x => x.FullName).HasMaxLength(120);
        builder.Entity<UserProfile>().Property(x => x.University).HasMaxLength(150);
        builder.Entity<UserProfile>().Property(x => x.Department).HasMaxLength(120);
        builder.Entity<UserProfile>().Property(x => x.JobTitle).HasMaxLength(120);
        builder.Entity<UserProfile>().Property(x => x.Semester).HasMaxLength(40);
        builder.Entity<UserProfile>().Property(x => x.StudentId).HasMaxLength(50);
        builder.Entity<UserProfile>().Property(x => x.Phone).HasMaxLength(30);
        builder.Entity<UserProfile>().Property(x => x.Bio).HasMaxLength(500);
        builder.Entity<UserProfile>().Property(x => x.AvatarUrl).HasMaxLength(500);

        builder.Entity<Reputation>()
            .HasOne(x => x.User)
            .WithOne(x => x.Reputation)
            .HasForeignKey<Reputation>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Reputation>().Property(x => x.Level).HasMaxLength(30).HasDefaultValue("New");
        builder.Entity<Reputation>().Property(x => x.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Entity<ReputationHistory>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Idempotency: one reputation event per (user, entity, reason) combination.
        builder.Entity<ReputationHistory>()
            .HasIndex(x => new { x.UserId, x.RelatedEntityType, x.RelatedEntityId, x.Reason })
            .IsUnique()
            .HasFilter("\"relatedentitytype\" IS NOT NULL AND \"relatedentityid\" IS NOT NULL");

        builder.Entity<ReputationHistory>().Property(x => x.Reason).HasMaxLength(200);
        builder.Entity<ReputationHistory>().Property(x => x.RelatedEntityType).HasMaxLength(50);

        builder.Entity<LostItem>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<FoundItem>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<FoundItem>().Property(x => x.Status).HasMaxLength(30).HasDefaultValue("Available");
        builder.Entity<FoundItem>().Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        builder.Entity<LostItem>().Property(x => x.LocationDetails).HasMaxLength(200);
        builder.Entity<FoundItem>().Property(x => x.LocationDetails).HasMaxLength(200);
        builder.Entity<FoundItem>().Property(x => x.PrivateVerificationDetails).HasMaxLength(1000);
        builder.Entity<FoundItem>().Property(x => x.FounderVerificationAnswersJson).HasColumnType("text");
        builder.Entity<Floor>().HasIndex(x => new { x.BuildingId, x.FloorNumber }).IsUnique();
        builder.Entity<Floor>().HasOne(x => x.Building).WithMany(x => x.Floors).HasForeignKey(x => x.BuildingId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<Location>().HasOne(x => x.Floor).WithMany(x => x.Locations).HasForeignKey(x => x.FloorId).OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Claim>()
            .HasOne(x => x.ClaimantUser)
            .WithMany()
            .HasForeignKey(x => x.ClaimantUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Claim>()
            .HasOne(x => x.FoundItem)
            .WithMany()
            .HasForeignKey(x => x.FoundItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Claim>()
            .HasOne(x => x.ReviewedByUser)
            .WithMany()
            .HasForeignKey(x => x.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Notification>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<Notification>().Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        
        builder.Entity<Match>()
            .Property(m => m.ConfidenceScore)
            .HasPrecision(5, 2);
        builder.Entity<Match>().HasIndex(match => new { match.LostItemId, match.FoundItemId }).IsUnique();

        builder.Entity<AuditLog>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<ChatHistory>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ChatHistory>().Property(x => x.Role).HasMaxLength(16);
        builder.Entity<ChatHistory>().Property(x => x.Message).HasMaxLength(4000);
        builder.Entity<ChatHistory>().HasIndex(x => new { x.ConversationId, x.CreatedAt });
        builder.Entity<ChatHistory>()
            .HasOne(x => x.Conversation)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.ConversationId)
            // User -> conversation and user -> message already cascade. Restrict avoids
            // SQL Server's multiple-cascade-path restriction; the service deletes messages first.
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ChatConversation>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ChatConversation>().Property(x => x.Title).HasMaxLength(120);
        builder.Entity<ChatConversation>().HasIndex(x => new { x.UserId, x.UpdatedAt });

        builder.Entity<ClaimChatConversation>().HasIndex(x => x.ClaimId).IsUnique();
        builder.Entity<ClaimChatConversation>().Property(x => x.OwnerUserId).HasMaxLength(450);
        builder.Entity<ClaimChatConversation>().Property(x => x.FounderUserId).HasMaxLength(450);
        builder.Entity<ClaimChatConversation>()
            .HasOne(x => x.Claim)
            .WithMany()
            .HasForeignKey(x => x.ClaimId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ClaimChatMessage>().Property(x => x.Content).HasMaxLength(1000);
        builder.Entity<ClaimChatMessage>().HasIndex(x => new { x.ConversationId, x.SentAt });
        builder.Entity<ClaimChatMessage>()
            .HasOne(x => x.Conversation)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ClaimChatMessage>()
            .HasOne(x => x.SenderUser)
            .WithMany()
            .HasForeignKey(x => x.SenderUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<AIRequest>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Feedback>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Match>()
            .HasOne(x => x.LostItem)
            .WithMany()
            .HasForeignKey(x => x.LostItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Match>()
            .HasOne(x => x.FoundItem)
            .WithMany()
            .HasForeignKey(x => x.FoundItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ClaimVerification>()
            .HasOne(x => x.Claim)
            .WithOne(x => x.Verification)
            .HasForeignKey<ClaimVerification>(x => x.ClaimId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ClaimVerification>()
            .Property(x => x.ConfidenceScore)
            .HasPrecision(5, 2);
        builder.Entity<ClaimVerification>().Property(x => x.SecurityReviewNote).HasMaxLength(1000);
        builder.Entity<ClaimVerification>().HasIndex(x => x.MatchId).IsUnique().HasFilter("\"matchid\" IS NOT NULL");

        builder.Entity<SecurityOfficerRequest>().HasIndex(x => new { x.UserId, x.Status });
        builder.Entity<SecurityOfficerRequest>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<SecurityOfficerRequest>().HasOne(x => x.ReviewedByUser).WithMany().HasForeignKey(x => x.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<SecurityOfficerRequest>().Property(x => x.Reason).HasMaxLength(500);
        builder.Entity<SecurityOfficerRequest>().Property(x => x.AdditionalInformation).HasMaxLength(2000);
        builder.Entity<SecurityOfficerRequest>().Property(x => x.AdminNotes).HasMaxLength(1000);
        builder.Entity<SecurityOfficerRequest>().Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Entity<Claim>().Property(x => x.HandoverQrToken).HasMaxLength(128);
        builder.Entity<VisualEmbedding>().HasIndex(x => new { x.ImageId, x.Model }).IsUnique();
        builder.Entity<VisualEmbedding>().Property(x => x.Model).HasMaxLength(100);
        builder.Entity<VisualEmbedding>().HasOne(x => x.Image).WithMany().HasForeignKey(x => x.ImageId).OnDelete(DeleteBehavior.Cascade);

        builder.Entity<SupportPayment>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<SupportPayment>().Property(x => x.Provider).HasConversion<string>().HasMaxLength(20);
        builder.Entity<SupportPayment>().Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        builder.Entity<SupportPayment>().Property(x => x.Amount).HasPrecision(18, 2);
        builder.Entity<SupportPayment>().Property(x => x.Currency).HasMaxLength(3);
        builder.Entity<SupportPayment>().Property(x => x.MerchantInvoiceNumber).HasMaxLength(64);
        builder.Entity<SupportPayment>().Property(x => x.ProviderPaymentId).HasMaxLength(128);
        builder.Entity<SupportPayment>().Property(x => x.ProviderTransactionId).HasMaxLength(128);
        builder.Entity<SupportPayment>().Property(x => x.FailureReasonCode).HasMaxLength(80);
        builder.Entity<SupportPayment>().HasIndex(x => x.MerchantInvoiceNumber).IsUnique();
        builder.Entity<SupportPayment>().HasIndex(x => new { x.UserId, x.CreatedAt });
        builder.Entity<SupportPayment>().HasIndex(x => new { x.Status, x.CreatedAt });
        builder.Entity<SupportPayment>().HasIndex(x => x.ProviderPaymentId).IsUnique().HasFilter("\"providerpaymentid\" IS NOT NULL");
        builder.Entity<SupportPayment>().HasIndex(x => x.ProviderTransactionId).IsUnique().HasFilter("\"providertransactionid\" IS NOT NULL");

        ApplyPostgresIdentifierCasing(builder);
    }

    /// <summary>
    /// PostgreSQL folds unquoted identifiers to lower case. The repositories query this schema with unquoted SQL
    /// (for example <c>SELECT ... FROM FoundItems</c>) and read values back by column name, so the model maps every
    /// table and column to its lower-case form. EF-generated SQL, the generated migration and hand-written SQL then
    /// all address the same objects, and the schema follows normal PostgreSQL naming.
    /// </summary>
    private static void ApplyPostgresIdentifierCasing(ModelBuilder builder)
    {
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var tableName = entityType.GetTableName();
            if (tableName is null) continue;

            var loweredTableName = tableName.ToLowerInvariant();
            if (!string.Equals(tableName, loweredTableName, StringComparison.Ordinal))
            {
                entityType.SetTableName(loweredTableName);
            }

            var storeObject = StoreObjectIdentifier.Create(entityType, StoreObjectType.Table);
            if (storeObject is null) continue;

            foreach (var property in entityType.GetProperties())
            {
                var columnName = property.GetColumnName(storeObject.Value);
                if (columnName is null) continue;

                var loweredColumnName = columnName.ToLowerInvariant();
                if (!string.Equals(columnName, loweredColumnName, StringComparison.Ordinal))
                {
                    property.SetColumnName(loweredColumnName);
                }
            }
        }
    }

}
