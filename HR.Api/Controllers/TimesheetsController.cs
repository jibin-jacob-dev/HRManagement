using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using HR.Api.Hubs;
using System.Linq;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TimesheetsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public TimesheetsController(ApplicationDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    // GET: api/Timesheets/my
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<Timesheet>>> GetMyTimesheets()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        return await _context.Timesheets
            .Where(t => t.EmployeeId == user.EmployeeId)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();
    }

    // GET: api/Timesheets/week-info?startDate=2024-01-01
    [HttpGet("week-info")]
    public async Task<ActionResult<TimesheetWeekResponse>> GetWeekInfo(DateTime startDate)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        var weekStart = startDate.Date;
        var weekEnd = weekStart.AddDays(6);

        // 1. Get existing timesheet
        var timesheet = await _context.Timesheets
            .Include(t => t.Entries)
            .FirstOrDefaultAsync(t => t.EmployeeId == user.EmployeeId && t.StartDate.Date == weekStart);

        // 2. Get Public Holidays for this week
        var holidays = await _context.PublicHolidays
            .Where(h => h.Date >= weekStart && h.Date <= weekEnd && h.IsActive)
            .ToListAsync();

        // 3. Get Approved Leaves for this week
        var leaves = await _context.Leaves
            .Include(l => l.LeaveType)
            .Where(l => l.EmployeeId == user.EmployeeId 
                        && l.Status == "Approved" 
                        && l.StartDate <= weekEnd 
                        && l.EndDate >= weekStart)
            .ToListAsync();

        return new TimesheetWeekResponse
        {
            Timesheet = timesheet,
            Holidays = holidays,
            Leaves = leaves
        };
    }

    // GET: api/Timesheets/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Timesheet>> GetTimesheet(int id)
    {
        var timesheet = await _context.Timesheets
            .Include(t => t.Entries)
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.TimesheetId == id);

        if (timesheet?.Employee == null) return NotFound();

        // Security check: Only owner or manager can view
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var currentUser = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (currentUser == null) return Unauthorized();

        if (timesheet.EmployeeId != currentUser.EmployeeId && timesheet.Employee?.ReportsToId != currentUser.EmployeeId)
        {
            var roles = User.FindAll(ClaimTypes.Role).Select(r => r.Value);
            if (!roles.Contains("Admin")) return Forbid();
        }

        return timesheet;
    }

    // POST: api/Timesheets/save
    [HttpPost("save")]
    public async Task<ActionResult<Timesheet>> SaveTimesheet([FromBody] TimesheetDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        var timesheet = await _context.Timesheets
            .Include(t => t.Entries)
            .FirstOrDefaultAsync(t => t.EmployeeId == user.EmployeeId && t.StartDate.Date == dto.StartDate.Date);

        if (timesheet == null)
        {
            timesheet = new Timesheet
            {
                EmployeeId = user.EmployeeId ?? 0,
                StartDate = dto.StartDate.Date,
                EndDate = dto.StartDate.Date.AddDays(6),
                Status = "Draft"
            };
            _context.Timesheets.Add(timesheet);
        }
        else if (timesheet.Status != "Draft" && timesheet.Status != "Rejected")
        {
            return BadRequest("Timesheet is already submitted or approved.");
        }

        timesheet.TotalHours = dto.Entries.Sum(e => e.Hours);
        
        // Update details
        _context.TimesheetEntries.RemoveRange(timesheet.Entries);
        timesheet.Entries = dto.Entries.Select(e => new TimesheetEntry
        {
            Date = e.Date,
            Hours = e.Hours,
            Description = e.Description,
            IsAutomated = e.IsAutomated,
            AutomatedType = e.AutomatedType
        }).ToList();

        await _context.SaveChangesAsync();
        return timesheet;
    }

    // POST: api/Timesheets/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitTimesheet(int id)
    {
        var timesheet = await _context.Timesheets.Include(t => t.Employee).FirstOrDefaultAsync(t => t.TimesheetId == id);
        if (timesheet == null) return NotFound();

        if (timesheet.Status != "Draft" && timesheet.Status != "Rejected")
            return BadRequest("Timesheet status must be Draft or Rejected to submit.");

        timesheet.Status = "Submitted";
        timesheet.SubmittedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Notify manager
        if (timesheet.Employee?.ReportsToId.HasValue == true)
        {
            var manager = await _context.Employees.FindAsync(timesheet.Employee.ReportsToId.Value);
            if (manager != null)
            {
                var managerUser = await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == manager.EmployeeId);
                if (managerUser != null)
                {
                    await CreateAndSendNotification(
                        managerUser.Id,
                        "Timesheet Submitted",
                        $"{timesheet.Employee?.FirstName ?? "An employee"} has submitted a timesheet for week starting {timesheet.StartDate:MMM dd}.",
                        "Timesheet",
                        "/timesheet-approvals"
                    );
                }
            }
        }

        return NoContent();
    }

    // GET: api/Timesheets/pending
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<Timesheet>>> GetPendingTimesheets()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        return await _context.Timesheets
            .Include(t => t.Employee)
            .Include(t => t.Entries)
            .Where(t => t.Employee != null && t.Employee.ReportsToId == user.EmployeeId && t.Status == "Submitted")
            .OrderByDescending(t => t.SubmittedDate)
            .ToListAsync();
    }

    // GET: api/Timesheets/team-history?status=Approved&employeeName=John&startDate=2024-01-01
    [HttpGet("team-history")]
    public async Task<ActionResult<IEnumerable<Timesheet>>> GetTeamTimesheets(
        [FromQuery] string? status, 
        [FromQuery] string? employeeName, 
        [FromQuery] DateTime? startDate)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        var query = _context.Timesheets
            .Include(t => t.Employee)
            .Include(t => t.Entries)
            .Where(t => t.Employee != null && t.Employee.ReportsToId == user.EmployeeId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(t => t.Status == status);
        }

        if (!string.IsNullOrEmpty(employeeName))
        {
            query = query.Where(t => (t.Employee.FirstName + " " + t.Employee.LastName).Contains(employeeName));
        }

        if (startDate.HasValue)
        {
            query = query.Where(t => t.StartDate.Date == startDate.Value.Date);
        }

        return await query.OrderByDescending(t => t.SubmittedDate).ToListAsync();
    }

    // POST: api/Timesheets/{id}/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveTimesheet(int id, [FromBody] string? comment)
    {
        var timesheet = await _context.Timesheets.Include(t => t.Employee).FirstOrDefaultAsync(t => t.TimesheetId == id);
        if (timesheet == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var managerUser = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (managerUser == null) return Unauthorized();

        if (timesheet.Employee?.ReportsToId != managerUser.EmployeeId)
            return Forbid();

        timesheet.Status = "Approved";
        timesheet.ApprovedDate = DateTime.UtcNow;
        timesheet.ApprovedById = managerUser.EmployeeId;
        timesheet.ManagerComment = comment;

        await _context.SaveChangesAsync();

        // Notify employee
        var employeeUser = await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == timesheet.EmployeeId);
        if (employeeUser != null)
        {
            await CreateAndSendNotification(
                employeeUser.Id,
                "Timesheet Approved",
                $"Your timesheet for week starting {timesheet.StartDate:MMM dd} was approved.",
                "TimesheetApproval",
                "/timesheets"
            );
        }

        return NoContent();
    }

    // POST: api/Timesheets/{id}/reject
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectTimesheet(int id, [FromBody] string? comment)
    {
        var timesheet = await _context.Timesheets.Include(t => t.Employee).FirstOrDefaultAsync(t => t.TimesheetId == id);
        if (timesheet == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var managerUser = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (managerUser == null) return Unauthorized();

        if (timesheet.Employee?.ReportsToId != managerUser.EmployeeId)
            return Forbid();

        timesheet.Status = "Rejected";
        timesheet.ManagerComment = comment;

        await _context.SaveChangesAsync();

        // Notify employee
        var employeeUser = await _context.Users.FirstOrDefaultAsync(u => u.EmployeeId == timesheet.EmployeeId);
        if (employeeUser != null)
        {
            await CreateAndSendNotification(
                employeeUser.Id,
                "Timesheet Rejected",
                $"Your timesheet for week starting {timesheet.StartDate:MMM dd} was rejected: {comment}",
                "LeaveRejection",
                "/timesheets"
            );
        }

        return NoContent();
    }

    private async Task CreateAndSendNotification(string userId, string title, string message, string type, string? targetUrl = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            TargetUrl = targetUrl,
            CreatedDate = DateTime.UtcNow,
            IsRead = false
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", new
        {
            notification.NotificationId,
            notification.Title,
            notification.Message,
            notification.Type,
            notification.TargetUrl,
            notification.CreatedDate,
            notification.IsRead
        });
    }
}

public class TimesheetDto
{
    public DateTime StartDate { get; set; }
    public List<TimesheetEntryDto> Entries { get; set; } = new();
}

public class TimesheetEntryDto
{
    public DateTime Date { get; set; }
    public decimal Hours { get; set; }
    public string? Description { get; set; }
    public bool IsAutomated { get; set; }
    public string? AutomatedType { get; set; }
}

public class TimesheetWeekResponse
{
    public Timesheet? Timesheet { get; set; }
    public List<PublicHoliday> Holidays { get; set; } = new();
    public List<Leave> Leaves { get; set; } = new();
}
