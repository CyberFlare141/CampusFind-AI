using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CampusFindAI.Api.Hubs;

/// <summary>Authenticated, user-addressed delivery channel for persisted in-app notifications.</summary>
[Authorize]
public sealed class NotificationHub : Hub { }
