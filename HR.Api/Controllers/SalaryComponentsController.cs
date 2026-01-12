using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models.PayrollManagement;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class SalaryComponentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SalaryComponentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/SalaryComponents
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SalaryComponent>>> GetSalaryComponents()
    {
        return await _context.SalaryComponents.ToListAsync();
    }

    // GET: api/SalaryComponents/5
    [HttpGet("{id}")]
    public async Task<ActionResult<SalaryComponent>> GetSalaryComponent(int id)
    {
        var component = await _context.SalaryComponents.FindAsync(id);

        if (component == null)
            return NotFound();

        return component;
    }

    // POST: api/SalaryComponents
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<SalaryComponent>> CreateSalaryComponent(SalaryComponent component)
    {
        _context.SalaryComponents.Add(component);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSalaryComponent), new { id = component.Id }, component);
    }

    // PUT: api/SalaryComponents/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdateSalaryComponent(int id, SalaryComponent component)
    {
        if (id != component.Id)
            return BadRequest();

        _context.Entry(component).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!SalaryComponentExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/SalaryComponents/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSalaryComponent(int id)
    {
        var component = await _context.SalaryComponents.FindAsync(id);
        if (component == null)
            return NotFound();

        _context.SalaryComponents.Remove(component);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool SalaryComponentExists(int id)
    {
        return _context.SalaryComponents.Any(e => e.Id == id);
    }
}
