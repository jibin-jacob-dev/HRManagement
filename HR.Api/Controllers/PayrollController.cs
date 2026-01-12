using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models.PayrollManagement;
using HR.Core.Models;
using System;

using System.Security.Claims;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class PayrollController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PayrollController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Payroll/runs
    [HttpGet("runs")]
    public async Task<ActionResult<IEnumerable<PayrollRun>>> GetPayrollRuns()
    {
        return await _context.PayrollRuns
            .OrderByDescending(r => r.Year)
            .ThenByDescending(r => r.Month)
            .ToListAsync();
    }

    // GET: api/Payroll/run/{id}
    [HttpGet("run/{id}")]
    public async Task<ActionResult<object>> GetPayrollRunDetails(int id)
    {
        var run = await _context.PayrollRuns
            .Include(r => r.EmployeePayrolls)
                .ThenInclude(p => p.Employee)
            .Include(r => r.EmployeePayrolls)
                .ThenInclude(p => p.PayrollDetails)
                    .ThenInclude(d => d.SalaryComponent)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (run == null)
            return NotFound();

        return Ok(run);
    }

    // POST: api/Payroll/process
    [HttpPost("process")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> ProcessPayroll([FromBody] PayrollProcessRequest request)
    {
        if (request.Month < 1 || request.Month > 12 || request.Year < 2000)
            return BadRequest("Invalid month or year.");

        // Check if already finalized
        var existingRun = await _context.PayrollRuns
            .FirstOrDefaultAsync(r => r.Month == request.Month && r.Year == request.Year);

        if (existingRun != null && existingRun.Status == PayrollStatus.Finalized)
            return BadRequest("Payroll for this period is already finalized.");

        // Remove existing draft if it exists
        if (existingRun != null)
        {
            var details = await _context.EmployeePayrolls
                .Where(p => p.PayrollRunId == existingRun.Id)
                .ToListAsync();
            
            foreach(var d in details)
            {
                var payrollDetails = await _context.PayrollDetails.Where(pd => pd.EmployeePayrollId == d.Id).ToListAsync();
                _context.PayrollDetails.RemoveRange(payrollDetails);
            }

            _context.EmployeePayrolls.RemoveRange(details);
            _context.PayrollRuns.Remove(existingRun);
            await _context.SaveChangesAsync();
        }

        // Create new Run
        var payrollRun = new PayrollRun
        {
            Month = request.Month,
            Year = request.Year,
            ProcessedDate = DateTime.UtcNow,
            Status = PayrollStatus.Draft,
            TotalPayout = 0
        };

        _context.PayrollRuns.Add(payrollRun);
        await _context.SaveChangesAsync();

        // Make status check robust (case insensitive) and include Probation
        var employees = await _context.Employees
            .Where(e => e.EmploymentStatus.ToLower() == "active" || e.EmploymentStatus.ToLower() == "probation")
            .ToListAsync();

        var totalDaysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
        decimal runTotalPayout = 0;

        foreach (var employee in employees)
        {
            var structure = await _context.EmployeeSalaryStructures
                .Include(s => s.SalaryComponent)
                .Where(s => s.EmployeeId == employee.EmployeeId)
                .ToListAsync();

            if (!structure.Any()) continue;

            // Basic Attendance Calculation
            var startDate = new DateTime(request.Year, request.Month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var absentDays = await _context.Attendances
                .CountAsync(a => a.EmployeeId == employee.EmployeeId && a.Date >= startDate && a.Date <= endDate && a.Status == "Absent");

            var unpaidLeaveDays = await _context.Leaves
                .Include(l => l.LeaveType)
                .Where(l => l.EmployeeId == employee.EmployeeId && l.Status == "Approved" && !l.LeaveType.IsPaid)
                .Where(l => (l.StartDate <= endDate && l.EndDate >= startDate))
                .ToListAsync();
            
            decimal totalUnpaidDays = 0;
            foreach(var leave in unpaidLeaveDays)
            {
                var effectiveStart = leave.StartDate < startDate ? startDate : leave.StartDate;
                var effectiveEnd = leave.EndDate > endDate ? endDate : leave.EndDate;
                totalUnpaidDays += (decimal)(effectiveEnd - effectiveStart).TotalDays + 1;
            }

            decimal lossOfPayDays = absentDays + totalUnpaidDays;
            decimal workedDays = totalDaysInMonth - lossOfPayDays;
            if (workedDays < 0) workedDays = 0;

            var employeePayroll = new EmployeePayroll
            {
                PayrollRunId = payrollRun.Id,
                EmployeeId = employee.EmployeeId,
                DaysWorked = (int)workedDays,
                LossOfPayDays = (int)lossOfPayDays,
                PaymentStatus = PaymentStatus.Pending,
                BasicSalary = employee.Salary // Assuming base salary is from employee table or specific component
            };

            decimal totalEarnings = 0;
            decimal totalDeductions = 0;

            _context.EmployeePayrolls.Add(employeePayroll);
            await _context.SaveChangesAsync(); // Get ID for details

            foreach (var item in structure)
            {
                // Pro-rata calculation
                decimal calculatedAmount = item.Amount * (workedDays / (decimal)totalDaysInMonth);
                
                var detail = new PayrollDetail
                {
                    EmployeePayrollId = employeePayroll.Id,
                    SalaryComponentId = item.SalaryComponentId,
                    Amount = Math.Round(calculatedAmount, 2)
                };

                _context.PayrollDetails.Add(detail);

                if (item.SalaryComponent.Type == SalaryComponentType.Earning)
                    totalEarnings += detail.Amount;
                else
                    totalDeductions += detail.Amount;
            }

            employeePayroll.TotalEarnings = Math.Round(totalEarnings, 2);
            employeePayroll.TotalDeductions = Math.Round(totalDeductions, 2);
            employeePayroll.NetSalary = Math.Round(totalEarnings - totalDeductions, 2);
            
            runTotalPayout += employeePayroll.NetSalary;
        }

        payrollRun.TotalPayout = Math.Round(runTotalPayout, 2);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payroll processed successfully", runId = payrollRun.Id });
    }

    // POST: api/Payroll/finalize/{id}
    [HttpPost("finalize/{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> FinalizePayroll(int id)
    {
        var run = await _context.PayrollRuns.FindAsync(id);
        if (run == null) return NotFound();

        if (run.Status == PayrollStatus.Finalized)
            return BadRequest("Payroll is already finalized.");

        run.Status = PayrollStatus.Finalized;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payroll finalized successfully" });
    }

    // DELETE: api/Payroll/run/{id}
    [HttpDelete("run/{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> DeletePayrollRun(int id)
    {
        var run = await _context.PayrollRuns.FindAsync(id);
        if (run == null) return NotFound();

        if (run.Status == PayrollStatus.Finalized)
            return BadRequest("Cannot delete finalized payroll run.");

        var employeePayrolls = await _context.EmployeePayrolls.Where(p => p.PayrollRunId == id).ToListAsync();
        foreach (var ep in employeePayrolls)
        {
            var details = await _context.PayrollDetails.Where(pd => pd.EmployeePayrollId == ep.Id).ToListAsync();
            _context.PayrollDetails.RemoveRange(details);
        }

        _context.EmployeePayrolls.RemoveRange(employeePayrolls);
        _context.PayrollRuns.Remove(run);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Payroll run deleted successfully" });
    }

    // GET: api/Payroll/my-payrolls
    [HttpGet("my-payrolls")]
    public async Task<ActionResult<IEnumerable<EmployeePayroll>>> GetMyPayrolls()
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrEmpty(userEmail))
        {
            // Fallback: In some configs Identity.Name might hold the email if mapped that way, but ClaimTypes.Name holds Full Name here
            // If checking Name, ensure it looks like an email
            var nameClaim = User.Identity?.Name;
            if (!string.IsNullOrEmpty(nameClaim) && nameClaim.Contains("@"))
            {
                userEmail = nameClaim;
            }
        }

        if (string.IsNullOrEmpty(userEmail))
            return Unauthorized("Could not identify user email from token.");
            
        // Debugging log (visible in server output if needed, but returning in error for now)
        // Console.WriteLine($"Looking up payroll for email: {userEmail}"); 

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
        
        // Robustness: If User record not found, try to find the Employee record directly by email
        // This handles cases where Identity User table might be out of sync but Employee table is correct
        if (user == null)
        {
             var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Email == userEmail);
             if (emp == null)
             {
                 return BadRequest($"User/Employee record not found for email: {userEmail}. Please contact HR.");
             }
             
             // Found employee directly, proceed
             var payrolls = await _context.EmployeePayrolls
                .Include(p => p.PayrollRun)
                .Include(p => p.Employee)
                    .ThenInclude(e => e.Department)
                .Include(p => p.Employee)
                    .ThenInclude(e => e.Position)
                .Include(p => p.PayrollDetails)
                    .ThenInclude(d => d.SalaryComponent)
                .Where(p => p.EmployeeId == emp.EmployeeId)
                .OrderByDescending(p => p.PayrollRun.Year)
                .ThenByDescending(p => p.PayrollRun.Month)
                .ToListAsync();
                
             return Ok(payrolls);
        }

        var query = _context.EmployeePayrolls
            .Include(p => p.PayrollRun)
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Employee)
                .ThenInclude(e => e.Position)
            .Include(p => p.PayrollDetails)
                .ThenInclude(d => d.SalaryComponent)
            .AsQueryable();

        // 1. Try matching by User's linked EmployeeId
        if (user.EmployeeId != null)
        {
            var payrolls = await query
                .Where(p => p.EmployeeId == user.EmployeeId)
                .OrderByDescending(p => p.PayrollRun.Year)
                .ThenByDescending(p => p.PayrollRun.Month)
                .ToListAsync();

            if (payrolls.Any()) return payrolls;
        }

        // 2. Fallback: Try matching by Email if ID yielded no results
        // This handles cases where User.EmployeeId might be mismatched or the payroll was generated for a duplicate employee record with same email
        var employeeByEmail = await _context.Employees.FirstOrDefaultAsync(e => e.Email == userEmail);
        if (employeeByEmail != null)
        {
             return await query
                .Where(p => p.EmployeeId == employeeByEmail.EmployeeId)
                .OrderByDescending(p => p.PayrollRun.Year)
                .ThenByDescending(p => p.PayrollRun.Month)
                .ToListAsync();
        }

        return new List<EmployeePayroll>();
    }
}

public class PayrollProcessRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
}
