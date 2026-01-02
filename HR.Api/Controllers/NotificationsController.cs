using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;
using System.Security.Claims;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotificationsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Notifications
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Notification>>> GetNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedDate)
            .Take(50)
            .ToListAsync();
    }

    // GET: api/Notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    // POST: api/Notifications/mark-all-as-read
    [HttpPost("mark-all-as-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/Notifications/5/mark-as-read
    [HttpPost("{id}/mark-as-read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == id && n.UserId == userId);

        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
