using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models.PayrollManagement;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class SalaryStructureController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SalaryStructureController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/SalaryStructure/employee/5
    [HttpGet("employee/{employeeId}")]
    public async Task<ActionResult<IEnumerable<EmployeeSalaryStructure>>> GetEmployeeStructure(int employeeId)
    {
        return await _context.EmployeeSalaryStructures
            .Include(s => s.SalaryComponent)
            .Where(s => s.EmployeeId == employeeId)
            .ToListAsync();
    }

    // GET: api/SalaryStructure/5
    [HttpGet("{id}")]
    public async Task<ActionResult<EmployeeSalaryStructure>> GetSalaryStructure(int id)
    {
        var structure = await _context.EmployeeSalaryStructures
            .Include(s => s.SalaryComponent)
            .Include(s => s.Employee)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (structure == null)
            return NotFound();

        return structure;
    }

    // POST: api/SalaryStructure
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<EmployeeSalaryStructure>> CreateSalaryStructure(EmployeeSalaryStructure structure)
    {
        // For security, ensure the employee exists
        var employeeExists = await _context.Employees.AnyAsync(e => e.EmployeeId == structure.EmployeeId);
        if (!employeeExists)
            return BadRequest("Employee not found.");

        _context.EmployeeSalaryStructures.Add(structure);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSalaryStructure), new { id = structure.Id }, structure);
    }

    // PUT: api/SalaryStructure/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateSalaryStructure(int id, EmployeeSalaryStructure structure)
    {
        if (id != structure.Id)
            return BadRequest();

        _context.Entry(structure).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!SalaryStructureExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/SalaryStructure/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSalaryStructure(int id)
    {
        var structure = await _context.EmployeeSalaryStructures.FindAsync(id);
        if (structure == null)
            return NotFound();

        _context.EmployeeSalaryStructures.Remove(structure);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/SalaryStructure/summary/5
    [HttpGet("summary/{employeeId}")]
    public async Task<IActionResult> GetSalarySummary(int employeeId)
    {
        var structure = await _context.EmployeeSalaryStructures
            .Include(s => s.SalaryComponent)
            .Where(s => s.EmployeeId == employeeId)
            .ToListAsync();

        var totalEarnings = structure
            .Where(s => s.SalaryComponent.Type == SalaryComponentType.Earning)
            .Sum(s => s.Amount);

        var totalDeductions = structure
            .Where(s => s.SalaryComponent.Type == SalaryComponentType.Deduction)
            .Sum(s => s.Amount);

        return Ok(new
        {
            EmployeeId = employeeId,
            TotalEarnings = totalEarnings,
            TotalDeductions = totalDeductions,
            NetSalary = totalEarnings - totalDeductions,
            ComponentsCount = structure.Count
        });
    }

    private bool SalaryStructureExists(int id)
    {
        return _context.EmployeeSalaryStructures.Any(e => e.Id == id);
    }
}
