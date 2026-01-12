using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class EmployeesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmployeesController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Employees
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        return await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Position)
            .ToListAsync();
    }

    // GET: api/Employees/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployee(int id)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Position)
            .FirstOrDefaultAsync(e => e.EmployeeId == id);

        if (employee == null)
            return NotFound();

        return employee;
    }

    // GET: api/Employees/list
    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<object>>> GetEmployeeList()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Position)
            .Select(e => new {
                e.EmployeeId,
                e.FirstName,
                e.LastName,
                e.ProfilePicture,
                DepartmentName = e.Department != null ? e.Department.DepartmentName : "No Department",
                PositionName = e.Position != null ? e.Position.PositionTitle : "No Position"
            })
            .ToListAsync();
        return Ok(employees);
    }

    // POST: api/Employees
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<Employee>> CreateEmployee(Employee employee)
    {
        employee.CreatedDate = DateTime.UtcNow;
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmployee), new { id = employee.EmployeeId }, employee);
    }

    // PUT: api/Employees/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateEmployee(int id, Employee employee)
    {
        if (id != employee.EmployeeId)
            return BadRequest();

        employee.ModifiedDate = DateTime.UtcNow;
        _context.Entry(employee).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!EmployeeExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Employees/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            return NotFound();

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool EmployeeExists(int id)
    {
        return _context.Employees.Any(e => e.EmployeeId == id);
    }
}
