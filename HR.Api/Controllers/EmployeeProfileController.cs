using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;
using System.Security.Claims;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeeProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public EmployeeProfileController(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<Employee>> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users
            .Include(u => u.Employee)
                .ThenInclude(e => e.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Position)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Experiences)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Educations)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Certifications)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        return Ok(user.Employee);
    }

    [HttpPut("personal")]
    public async Task<IActionResult> UpdatePersonalInfo([FromBody] Employee updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var employee = user.Employee;

        // Update personal fields
        employee.FirstName = updateData.FirstName;
        employee.LastName = updateData.LastName;
        employee.Phone = updateData.Phone;
        employee.DateOfBirth = updateData.DateOfBirth;
        employee.Gender = updateData.Gender;
        employee.MaritalStatus = updateData.MaritalStatus;
        employee.Nationality = updateData.Nationality;
        employee.BloodGroup = updateData.BloodGroup;
        employee.PersonalEmail = updateData.PersonalEmail;
        employee.Address = updateData.Address;
        employee.City = updateData.City;
        employee.State = updateData.State;
        employee.ZipCode = updateData.ZipCode;
        employee.Country = updateData.Country;
        employee.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Personal information updated successfully", employee });
    }

    [HttpPost("picture")]
    public async Task<IActionResult> UploadProfilePicture([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{userId}_{DateTime.UtcNow.Ticks}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Save URL to database
        user.Employee.ProfilePicture = $"/uploads/{fileName}";
        await _context.SaveChangesAsync();

        return Ok(new { profilePictureUrl = user.Employee.ProfilePicture });
    }
}
