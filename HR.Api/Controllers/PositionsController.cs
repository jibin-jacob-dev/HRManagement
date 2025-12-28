using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class PositionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PositionsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Positions
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Position>>> GetPositions()
    {
        return await _context.Positions.ToListAsync();
    }

    // GET: api/Positions/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Position>> GetPosition(int id)
    {
        var position = await _context.Positions.FindAsync(id);

        if (position == null)
            return NotFound();

        return position;
    }

    // POST: api/Positions
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<Position>> CreatePosition(Position position)
    {
        position.CreatedDate = DateTime.UtcNow;
        _context.Positions.Add(position);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPosition), new { id = position.PositionId }, position);
    }

    // PUT: api/Positions/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdatePosition(int id, Position position)
    {
        if (id != position.PositionId)
            return BadRequest();

        position.ModifiedDate = DateTime.UtcNow;
        _context.Entry(position).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!PositionExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    // DELETE: api/Positions/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePosition(int id)
    {
        var position = await _context.Positions.FindAsync(id);
        if (position == null)
            return NotFound();

        _context.Positions.Remove(position);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool PositionExists(int id)
    {
        return _context.Positions.Any(e => e.PositionId == id);
    }
}
