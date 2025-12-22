using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class DepartmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DepartmentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Departments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Department>>> GetDepartments()
    {
        return await _context.Departments.ToListAsync();
    }

    // GET: api/Departments/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Department>> GetDepartment(int id)
    {
        var department = await _context.Departments
            .Include(d => d.Employees)
            .Include(d => d.Positions)
            .FirstOrDefaultAsync(d => d.DepartmentId == id);

        if (department == null)
            return NotFound();

        return department;
    }

    // POST: api/Departments
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<Department>> CreateDepartment(Department department)
    {
        department.CreatedDate = DateTime.UtcNow;
        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDepartment), new { id = department.DepartmentId }, department);
    }

    // PUT: api/Departments/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateDepartment(int id, Department department)
    {
        if (id != department.DepartmentId)
            return BadRequest();

        department.ModifiedDate = DateTime.UtcNow;
        _context.Entry(department).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!DepartmentExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Departments/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null)
            return NotFound();

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool DepartmentExists(int id)
    {
        return _context.Departments.Any(d => d.DepartmentId == id);
    }
}
