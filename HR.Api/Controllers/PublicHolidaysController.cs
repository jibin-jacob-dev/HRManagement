using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PublicHolidaysController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PublicHolidaysController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/PublicHolidays
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicHoliday>>> GetPublicHolidays([FromQuery] int? year)
    {
        var query = _context.PublicHolidays.AsQueryable();

        if (year.HasValue)
            query = query.Where(h => h.Date.Year == year.Value);

        return await query
            .OrderBy(h => h.Date)
            .ToListAsync();
    }

    // GET: api/PublicHolidays/5
    [HttpGet("{id}")]
    public async Task<ActionResult<PublicHoliday>> GetPublicHoliday(int id)
    {
        var holiday = await _context.PublicHolidays.FirstOrDefaultAsync(h => h.PublicHolidayId == id);

        if (holiday == null)
            return NotFound();

        return holiday;
    }

    // POST: api/PublicHolidays
    [HttpPost]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<ActionResult<PublicHoliday>> CreatePublicHoliday(PublicHolidayDto dto)
    {
        var holiday = new PublicHoliday
        {
            Name = dto.Name,
            Date = dto.Date.Date,
            Description = dto.Description
        };

        _context.PublicHolidays.Add(holiday);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPublicHoliday), new { id = holiday.PublicHolidayId }, holiday);
    }

    // PUT: api/PublicHolidays/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> UpdatePublicHoliday(int id, PublicHolidayDto dto)
    {
        var holiday = await _context.PublicHolidays.FirstOrDefaultAsync(h => h.PublicHolidayId == id);
        if (holiday == null)
            return NotFound();

        holiday.Name = dto.Name;
        holiday.Date = dto.Date.Date;
        holiday.Description = dto.Description;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/PublicHolidays/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,HR Manager")]
    public async Task<IActionResult> DeletePublicHoliday(int id)
    {
        var holiday = await _context.PublicHolidays.FirstOrDefaultAsync(h => h.PublicHolidayId == id);
        if (holiday == null)
            return NotFound();

        _context.PublicHolidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class PublicHolidayDto
{
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Description { get; set; }
}
