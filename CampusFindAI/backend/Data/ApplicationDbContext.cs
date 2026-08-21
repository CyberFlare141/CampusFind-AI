using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

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
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Image> Images => Set<Image>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<Reputation> Reputations => Set<Reputation>();
    public DbSet<ChatHistory> ChatHistories => Set<ChatHistory>();
    public DbSet<AIRequest> AIRequests => Set<AIRequest>();
    public DbSet<Feedback> Feedback => Set<Feedback>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Role>().ToTable("Roles");
        builder.Entity<ApplicationUser>().Property(x => x.Role).HasConversion<string>();

        builder.Entity<UserProfile>()
            .HasOne(x => x.User)
            .WithOne(x => x.UserProfile)
            .HasForeignKey<UserProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Reputation>()
            .HasOne(x => x.User)
            .WithOne(x => x.Reputation)
            .HasForeignKey<Reputation>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

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

        builder.Entity<Claim>()
            .HasOne(x => x.ClaimantUser)
            .WithMany()
            .HasForeignKey(x => x.ClaimantUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Notification>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.Entity<Match>()
            .Property(m => m.ConfidenceScore)
            .HasPrecision(5, 2);

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
    }
}
