namespace CampusFindAI.Api.DTOs;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public string? Category { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationPageDto
{
    public IReadOnlyList<NotificationDto> Items { get; set; } = [];
    public DateTime? NextBefore { get; set; }
}

public class NotificationUnreadCountDto
{
    public int Count { get; set; }
}
