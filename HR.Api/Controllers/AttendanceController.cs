using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AttendanceController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Attendance
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAttendances([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var query = _context.Attendances
            .Include(a => a.Employee)
            .AsQueryable();

        if (startDate.HasValue)
            query = query.Where(a => a.Date >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(a => a.Date <= endDate.Value);

        var attendances = await query
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                a.AttendanceId,
                a.EmployeeId,
                EmployeeName = $"{a.Employee.FirstName} {a.Employee.LastName}",
                a.Date,
                a.CheckInTime,
                a.CheckOutTime,
                a.Status,
                a.Notes,
                WorkingHours = a.CheckInTime != null && a.CheckOutTime != null 
                    ? (a.CheckOutTime.Value - a.CheckInTime.Value).TotalHours 
                    : (double?)null
            })
            .ToListAsync();

        return Ok(attendances);
    }

    // GET: api/Attendance/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Attendance>> GetAttendance(int id)
    {
        var attendance = await _context.Attendances
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a => a.AttendanceId == id);

        if (attendance == null)
            return NotFound();

        return attendance;
    }

    // POST: api/Attendance
    [HttpPost]
    public async Task<ActionResult<Attendance>> CreateAttendance(AttendanceDto dto)
    {
        var attendance = new Attendance
        {
            EmployeeId = dto.EmployeeId,
            Date = dto.Date.Date, // Ensure date only
            CheckInTime = dto.CheckInTime,
            CheckOutTime = dto.CheckOutTime,
            Status = dto.Status ?? "Present",
            Notes = dto.Notes
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAttendance), new { id = attendance.AttendanceId }, attendance);
    }

    // PUT: api/Attendance/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAttendance(int id, AttendanceDto dto)
    {
        var attendance = await _context.Attendances.FindAsync(id);
        if (attendance == null)
            return NotFound();

        attendance.EmployeeId = dto.EmployeeId;
        attendance.Date = dto.Date.Date;
        attendance.CheckInTime = dto.CheckInTime;
        attendance.CheckOutTime = dto.CheckOutTime;
        attendance.Status = dto.Status ?? "Present";
        attendance.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/Attendance/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var attendance = await _context.Attendances.FindAsync(id);
        if (attendance == null)
            return NotFound();

        _context.Attendances.Remove(attendance);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class AttendanceDto
{
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan? CheckInTime { get; set; }
    public TimeSpan? CheckOutTime { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}
