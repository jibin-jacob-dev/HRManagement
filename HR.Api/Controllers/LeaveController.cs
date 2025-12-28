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

    // GET: api/Leave
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetLeaves([FromQuery] string? status)
    {
        var query = _context.Leaves
            .Include(l => l.Employee)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(l => l.Status == status);

        var leaves = await query
            .OrderByDescending(l => l.CreatedDate)
            .Select(l => new
            {
                l.LeaveId,
                l.EmployeeId,
                EmployeeName = $"{l.Employee.FirstName} {l.Employee.LastName}",
                l.LeaveType,
                l.StartDate,
                l.EndDate,
                Days = (l.EndDate - l.StartDate).Days + 1,
                l.Status,
                l.Reason,
                l.ApproverComments,
                l.ApprovedBy,
                l.ApprovedDate,
                l.CreatedDate
            })
            .ToListAsync();

        return Ok(leaves);
    }

    // GET: api/Leave/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Leave>> GetLeave(int id)
    {
        var leave = await _context.Leaves
            .Include(l => l.Employee)
            .FirstOrDefaultAsync(l => l.LeaveId == id);

        if (leave == null)
            return NotFound();

        return leave;
    }

    // POST: api/Leave
    [HttpPost]
    public async Task<ActionResult<Leave>> CreateLeave(LeaveDto dto)
    {
        var leave = new Leave
        {
            EmployeeId = dto.EmployeeId,
            LeaveType = dto.LeaveType,
            StartDate = dto.StartDate.Date,
            EndDate = dto.EndDate.Date,
            Reason = dto.Reason,
            Status = "Pending"
        };

        _context.Leaves.Add(leave);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeave), new { id = leave.LeaveId }, leave);
    }

    // PUT: api/Leave/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLeave(int id, LeaveDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null)
            return NotFound();

        leave.EmployeeId = dto.EmployeeId;
        leave.LeaveType = dto.LeaveType;
        leave.StartDate = dto.StartDate.Date;
        leave.EndDate = dto.EndDate.Date;
        leave.Reason = dto.Reason;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/Leave/5/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveLeave(int id, [FromBody] ApprovalDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null)
            return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        leave.Status = "Approved";
        leave.ApprovedBy = userId;
        leave.ApprovedDate = DateTime.UtcNow;
        leave.ApproverComments = dto.Comments;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Leave approved successfully" });
    }

    // POST: api/Leave/5/reject
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectLeave(int id, [FromBody] ApprovalDto dto)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null)
            return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        leave.Status = "Rejected";
        leave.ApprovedBy = userId;
        leave.ApprovedDate = DateTime.UtcNow;
        leave.ApproverComments = dto.Comments;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Leave rejected successfully" });
    }

    // DELETE: api/Leave/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLeave(int id)
    {
        var leave = await _context.Leaves.FindAsync(id);
        if (leave == null)
            return NotFound();

        _context.Leaves.Remove(leave);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class LeaveDto
{
    public int EmployeeId { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}

public class ApprovalDto
{
    public string? Comments { get; set; }
}
