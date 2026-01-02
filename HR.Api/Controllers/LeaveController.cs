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
public class LeaveController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LeaveController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Leave/calculate-days
    [HttpGet("calculate-days")]
    public async Task<ActionResult<LeaveCalculationResult>> CalculateLeaveDays([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        if (endDate < startDate)
            return BadRequest("End date must be after start date.");

        var holidays = await _context.PublicHolidays
            .Where(h => h.Date >= startDate && h.Date <= endDate)
            .Select(h => h.Date)
            .ToListAsync();

        int totalDays = 0;
        int weekendDays = 0;
        int holidayCount = 0;

        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
            {
                weekendDays++;
            }
            else if (holidays.Contains(date))
            {
                holidayCount++;
            }
            else
            {
                totalDays++;
            }
        }

        return new LeaveCalculationResult
        {
            TotalDays = totalDays,
            WeekendDays = weekendDays,
            HolidayDays = holidayCount,
            TotalCalendarDays = (int)(endDate - startDate).TotalDays + 1
        };
    }

    // POST: api/Leave/apply
    [HttpPost("apply")]
    public async Task<ActionResult<Leave>> ApplyLeave([FromBody] LeaveApplicationDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        // Ensure we get the employee record for the current user
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.Employee == null) return BadRequest("Employee profile not found.");

        var employeeId = user.Employee.EmployeeId;

        // 1. Validation
        if (dto.EndDate < dto.StartDate)
            return BadRequest("End date must be after start date.");
        
        if (dto.StartDate.Year != dto.EndDate.Year)
            return BadRequest("Leaves spanning across years are not supported. Please split your request.");

        // Check for overlaps
        var overlapping = await _context.Leaves
            .AnyAsync(l => l.EmployeeId == employeeId && l.Status != "Rejected" &&
                           l.StartDate <= dto.EndDate && l.EndDate >= dto.StartDate);
        
        if (overlapping)
            return BadRequest("You already have a leave request in this date range.");

        // 2. Calculate Days
        var calculation = (await CalculateLeaveDays(dto.StartDate, dto.EndDate)).Value;
        if (calculation == null) return BadRequest("Failed to calculate days.");
        
        if (calculation.TotalDays <= 0)
            return BadRequest("The selected range has 0 working days.");

        // 3. Balance Check
        var currentYear = dto.StartDate.Year; 
        var balance = await _context.LeaveBalances
            .FirstOrDefaultAsync(lb => lb.EmployeeId == employeeId && lb.LeaveTypeId == dto.LeaveTypeId && lb.Year == currentYear);

        if (balance == null)
            return BadRequest($"No leave balance found for this leave type in {currentYear}.");

        // Consider pending leaves as also reserved
        var pendingDays = await _context.Leaves
            .Where(l => l.EmployeeId == employeeId && l.Status == "Pending" && l.LeaveTypeId == dto.LeaveTypeId && l.StartDate.Year == currentYear)
            .SumAsync(l => l.TotalDays);

        if ((balance.RemainingDays - pendingDays) < (decimal)calculation.TotalDays)
            return BadRequest($"Insufficient balance. You have {balance.RemainingDays} days remaining (with {pendingDays} pending), but need {calculation.TotalDays} days.");

        // 4. Create Pending Request
        var leave = new Leave
        {
            EmployeeId = employeeId,
            LeaveTypeId = dto.LeaveTypeId,
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate.Date,
            TotalDays = calculation.TotalDays, 
            Reason = dto.Reason,
            Status = "Pending"
        };

        _context.Leaves.Add(leave);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeave), new { id = leave.LeaveId }, leave);
    }

    // PUT: api/Leave/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLeave(int id, [FromBody] LeaveApplicationDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null) return NotFound();
        
        if (leave.Status != "Pending")
            return BadRequest("Only pending leaves can be modified.");
        
        // Similar validations as Apply
        if (dto.EndDate < dto.StartDate) return BadRequest("Invalid dates.");
        if (dto.StartDate.Year != dto.EndDate.Year) return BadRequest("Cross-year not supported.");

        // Re-calculate days
        var calculation = (await CalculateLeaveDays(dto.StartDate, dto.EndDate)).Value;
        if (calculation == null || calculation.TotalDays <= 0) return BadRequest("Invalid working days calculation.");

        leave.LeaveTypeId = dto.LeaveTypeId;
        leave.StartDate = dto.StartDate;
        leave.EndDate = dto.EndDate;
        leave.TotalDays = calculation.TotalDays;
        leave.Reason = dto.Reason;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/Leave/my-leaves
    [HttpGet("my-leaves")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyLeaves()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.Employee == null) return BadRequest("Employee profile not found.");

        var leaves = await _context.Leaves
            .Include(l => l.LeaveType)
            .Where(l => l.EmployeeId == user.Employee.EmployeeId)
            .OrderByDescending(l => l.CreatedDate)
            .Select(l => new
            {
                l.LeaveId,
                l.EmployeeId,
                l.LeaveTypeId,
                LeaveTypeName = l.LeaveType.Name,
                l.StartDate,
                l.EndDate,
                Days = l.TotalDays,
                l.Status,
                l.Reason,
                l.CreatedDate
            })
            .ToListAsync();

        return Ok(leaves);
    }
    
    // GET: api/Leave/team-requests
    [HttpGet("team-requests")]
    public async Task<ActionResult<IEnumerable<object>>> GetTeamLeaves()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var currentUser = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);
        if (currentUser?.Employee == null) return BadRequest("Employee profile not found.");

        IQueryable<Leave> query = _context.Leaves
            .Include(l => l.Employee)
            .Include(l => l.LeaveType);

        if (User.IsInRole("Admin"))
        {
            // Admin sees all
        }
        else
        {
            // Manager sees reports
            query = query.Where(l => l.Employee.ReportsToId == currentUser.Employee.EmployeeId);
        }

        var leaves = await query
            .OrderByDescending(l => l.CreatedDate)
            .Select(l => new
            {
                l.LeaveId,
                l.EmployeeId,
                EmployeeName = l.Employee.FirstName + " " + l.Employee.LastName,
                l.LeaveTypeId,
                LeaveTypeName = l.LeaveType.Name,
                l.StartDate,
                l.EndDate,
                Days = l.TotalDays,
                l.Status,
                l.Reason,
                l.CreatedDate
            })
            .ToListAsync();

        return Ok(leaves);
    }

    // POST: api/Leave/5/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveLeave(int id, [FromBody] ApprovalDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null) return NotFound();

        if (leave.Status != "Pending")
            return BadRequest("Only pending leaves can be approved.");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // DEDUCT BALANCE
        var balance = await _context.LeaveBalances
            .FirstOrDefaultAsync(lb => lb.EmployeeId == leave.EmployeeId && lb.LeaveTypeId == leave.LeaveTypeId && lb.Year == leave.StartDate.Year);
        
        if (balance == null)
            return BadRequest("Leave balance record not found. Cannot approve.");

        if (balance.RemainingDays < leave.TotalDays)
             return BadRequest($"Insufficient balance to approve. Employee has {balance.RemainingDays} days, need {leave.TotalDays}.");

        // Transactional Update
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            balance.UsedDays += leave.TotalDays;
            balance.RemainingDays -= leave.TotalDays;
            balance.LastUpdated = DateTime.UtcNow;

            leave.Status = "Approved";
            leave.ApprovedBy = userId;
            leave.ApprovedDate = DateTime.UtcNow;
            leave.ApproverComments = dto.Comments;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }

        return Ok(new { message = "Leave approved and balance deducted." });
    }

    // POST: api/Leave/5/reject
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectLeave(int id, [FromBody] ApprovalDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null) return NotFound();

        if (leave.Status != "Pending")
            return BadRequest("Only pending leaves can be rejected.");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        leave.Status = "Rejected";
        leave.ApprovedBy = userId;
        leave.ApprovedDate = DateTime.UtcNow;
        leave.ApproverComments = dto.Comments;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Leave rejected." });
    }

    // GET: api/Leave/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Leave>> GetLeave(int id)
    {
        var leave = await _context.Leaves
            .Include(l => l.Employee)
            .Include(l => l.LeaveType)
            .FirstOrDefaultAsync(l => l.LeaveId == id);

        if (leave == null) return NotFound();

        return leave;
    }
    
    // DELETE: api/Leave/5 (Cancel)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLeave(int id)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null) return NotFound();
        
        if (leave.Status == "Approved")
            return BadRequest("Cannot delete approved leave. Ask manager to cancel.");

        _context.Leaves.Remove(leave);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class LeaveApplicationDto
{
    public int LeaveTypeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}

public class LeaveCalculationResult
{
    public int TotalDays { get; set; }
    public int WeekendDays { get; set; }
    public int HolidayDays { get; set; }
    public int TotalCalendarDays { get; set; }
}

public class ApprovalDto
{
    public string? Comments { get; set; }
}
