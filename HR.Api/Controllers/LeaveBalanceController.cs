using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LeaveBalanceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LeaveBalanceController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/LeaveBalance
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetLeaveBalances([FromQuery] int? employeeId)
    {
        var query = _context.LeaveBalances
            .Include(lb => lb.Employee)
            .Include(lb => lb.LeaveType)
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(lb => lb.EmployeeId == employeeId.Value);

        var balances = await query
            .Select(lb => new
            {
                lb.LeaveBalanceId,
                lb.EmployeeId,
                EmployeeName = lb.Employee.FirstName + " " + lb.Employee.LastName,
                lb.LeaveTypeId,
                LeaveTypeName = lb.LeaveType.Name,
                lb.Year,
                lb.TotalDays,
                lb.UsedDays,
                lb.RemainingDays,
                CarryForwardDays = lb.CarriedForwardDays
            })
            .OrderBy(lb => lb.EmployeeName)
            .ThenBy(lb => lb.LeaveTypeName)
            .ToListAsync();

        return Ok(balances);
    }

    // GET: api/LeaveBalance/5
    [HttpGet("{id}")]
    public async Task<ActionResult<LeaveBalance>> GetLeaveBalance(int id)
    {
        var leaveBalance = await _context.LeaveBalances
            .Include(lb => lb.Employee)
            .Include(lb => lb.LeaveType)
            .FirstOrDefaultAsync(lb => lb.LeaveBalanceId == id);

        if (leaveBalance == null)
            return NotFound();

        return leaveBalance;
    }

    // GET: api/LeaveBalance/employee/{employeeId}/year/{year}
    [HttpGet("employee/{employeeId}/year/{year}")]
    public async Task<ActionResult<IEnumerable<object>>> GetEmployeeLeaveBalance(int employeeId, int year)
    {
        var balances = await _context.LeaveBalances
            .Include(lb => lb.LeaveType)
            .Where(lb => lb.EmployeeId == employeeId && lb.Year == year)
            .Select(lb => new
            {
                lb.LeaveBalanceId,
                lb.LeaveTypeId,
                LeaveTypeName = lb.LeaveType.Name,
                lb.Year,
                lb.TotalDays,
                lb.UsedDays,
                lb.RemainingDays,
                CarryForwardDays = lb.CarriedForwardDays
            })
            .ToListAsync();

        return Ok(balances);
    }

    // POST: api/LeaveBalance
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<LeaveBalance>> CreateLeaveBalance(LeaveBalanceDto dto)
    {
        var existingBalance = await _context.LeaveBalances
            .FirstOrDefaultAsync(lb => 
                lb.EmployeeId == dto.EmployeeId && 
                lb.LeaveTypeId == dto.LeaveTypeId && 
                lb.Year == dto.Year);

        if (existingBalance != null)
        {
            return BadRequest(new { message = "A leave balance for this employee, leave type, and year already exists." });
        }

        var leaveBalance = new LeaveBalance
        {
            EmployeeId = dto.EmployeeId,
            LeaveTypeId = dto.LeaveTypeId,
            Year = dto.Year,
            TotalDays = dto.TotalDays,
            UsedDays = dto.UsedDays,
            RemainingDays = dto.TotalDays - dto.UsedDays,
            CarriedForwardDays = dto.CarryForwardDays
        };

        _context.LeaveBalances.Add(leaveBalance);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeaveBalance), new { id = leaveBalance.LeaveBalanceId }, leaveBalance);
    }

    // PUT: api/LeaveBalance/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateLeaveBalance(int id, LeaveBalanceDto dto)
    {
        var leaveBalance = await _context.LeaveBalances.FirstOrDefaultAsync(lb => lb.LeaveBalanceId == id);
        if (leaveBalance == null)
            return NotFound();

        leaveBalance.EmployeeId = dto.EmployeeId;
        leaveBalance.LeaveTypeId = dto.LeaveTypeId;
        leaveBalance.Year = dto.Year;
        leaveBalance.TotalDays = dto.TotalDays;
        leaveBalance.UsedDays = dto.UsedDays;
        leaveBalance.RemainingDays = dto.TotalDays - dto.UsedDays;
        leaveBalance.CarriedForwardDays = dto.CarryForwardDays;
        leaveBalance.LastUpdated = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/LeaveBalance/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> DeleteLeaveBalance(int id)
    {
        var leaveBalance = await _context.LeaveBalances.FirstOrDefaultAsync(lb => lb.LeaveBalanceId == id);
        if (leaveBalance == null)
            return NotFound();

        _context.LeaveBalances.Remove(leaveBalance);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/LeaveBalance/initialize-year
    [HttpPost("initialize-year")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> InitializeYearBalances([FromBody] InitializeYearDto dto)
    {
        var employees = await _context.Employees.Where(e => e.EmploymentStatus == "Active").ToListAsync();
        var leaveTypes = await _context.LeaveTypes.Where(lt => lt.IsActive).ToListAsync();

        foreach (var employee in employees)
        {
            foreach (var leaveType in leaveTypes)
            {
                var existingBalance = await _context.LeaveBalances
                    .FirstOrDefaultAsync(lb => 
                        lb.EmployeeId == employee.EmployeeId && 
                        lb.LeaveTypeId == leaveType.LeaveTypeId && 
                        lb.Year == dto.Year);

                if (existingBalance == null)
                {
                    var totalDays = (decimal)leaveType.DefaultDaysPerYear;
                    _context.LeaveBalances.Add(new LeaveBalance
                    {
                        EmployeeId = employee.EmployeeId,
                        LeaveTypeId = leaveType.LeaveTypeId,
                        Year = dto.Year,
                        TotalDays = totalDays,
                        UsedDays = 0,
                        RemainingDays = totalDays,
                        CarriedForwardDays = 0
                    });
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Leave balances initialized for year {dto.Year}" });
    }
}

public class LeaveBalanceDto
{
    public int EmployeeId { get; set; }
    public int LeaveTypeId { get; set; }
    public int Year { get; set; }
    public decimal TotalDays { get; set; }
    public decimal UsedDays { get; set; }
    public decimal CarryForwardDays { get; set; }
}

public class InitializeYearDto
{
    public int Year { get; set; }
}
