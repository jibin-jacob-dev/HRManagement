using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LeaveTypesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LeaveTypesController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/LeaveTypes
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveType>>> GetLeaveTypes()
    {
        return await _context.LeaveTypes
            .OrderBy(lt => lt.Name)
            .ToListAsync();
    }

    // GET: api/LeaveTypes/5
    [HttpGet("{id}")]
    public async Task<ActionResult<LeaveType>> GetLeaveType(int id)
    {
        var leaveType = await _context.LeaveTypes.FirstOrDefaultAsync(lt => lt.LeaveTypeId == id);

        if (leaveType == null)
            return NotFound();

        return leaveType;
    }

    // POST: api/LeaveTypes
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<LeaveType>> CreateLeaveType(LeaveTypeDto dto)
    {
        var leaveType = new LeaveType
        {
            Name = dto.Name,
            DefaultDaysPerYear = dto.DefaultDays,
            Description = dto.Description,
            IsActive = dto.IsActive
        };

        _context.LeaveTypes.Add(leaveType);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeaveType), new { id = leaveType.LeaveTypeId }, leaveType);
    }

    // PUT: api/LeaveTypes/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateLeaveType(int id, LeaveTypeDto dto)
    {
        var leaveType = await _context.LeaveTypes.FirstOrDefaultAsync(lt => lt.LeaveTypeId == id);
        if (leaveType == null)
            return NotFound();

        leaveType.Name = dto.Name;
        leaveType.DefaultDaysPerYear = dto.DefaultDays;
        leaveType.Description = dto.Description;
        leaveType.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/LeaveTypes/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> DeleteLeaveType(int id)
    {
        var leaveType = await _context.LeaveTypes.FirstOrDefaultAsync(lt => lt.LeaveTypeId == id);
        if (leaveType == null)
            return NotFound();

        _context.LeaveTypes.Remove(leaveType);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class LeaveTypeDto
{
    public string Name { get; set; } = string.Empty;
    public int DefaultDays { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
