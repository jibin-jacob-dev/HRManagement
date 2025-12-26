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

        if (user == null)
            return Unauthorized();

        // Auto-create or Auto-sync Employee Profile from Identity Account
        if (user.Employee == null)
        {
            var employee = new Employee
            {
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? "",
                Phone = user.PhoneNumber,
                EmploymentStatus = "Active",
                HireDate = DateTime.UtcNow,
                CreatedDate = DateTime.UtcNow
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            user.EmployeeId = employee.EmployeeId;
            await _context.SaveChangesAsync();
            
            // Re-fetch to get navigation properties if needed, though they'll be empty
            user.Employee = employee;
        }
        else
        {
            // Sync basic info if it hasn't been set in employee profile yet
            bool changed = false;
            if (string.IsNullOrEmpty(user.Employee.FirstName)) { user.Employee.FirstName = user.FirstName; changed = true; }
            if (string.IsNullOrEmpty(user.Employee.LastName)) { user.Employee.LastName = user.LastName; changed = true; }
            if (string.IsNullOrEmpty(user.Employee.Email)) { user.Employee.Email = user.Email ?? ""; changed = true; }
            if (string.IsNullOrEmpty(user.Employee.Phone)) { user.Employee.Phone = user.PhoneNumber; changed = true; }
            
            if (changed)
            {
                await _context.SaveChangesAsync();
            }
        }

        return Ok(user.Employee);
    }

    [HttpPut("personal")]
    public async Task<IActionResult> UpdatePersonalInfo([FromBody] Employee updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users
            .Include(u => u.Employee)
                .ThenInclude(e => e.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Position)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var employee = user.Employee;

        // Update personal fields
        if (User.IsInRole("Admin"))
        {
            employee.FirstName = updateData.FirstName;
            employee.LastName = updateData.LastName;
        }

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

        // Re-fetch with inclusions to ensure frontend gets full object
        var updatedEmployee = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Position)
            .FirstOrDefaultAsync(e => e.EmployeeId == employee.EmployeeId);

        return Ok(new { message = "Personal information updated successfully", employee = updatedEmployee });
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

    [HttpPut("professional")]
    public async Task<IActionResult> UpdateProfessionalInfo([FromBody] Employee updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users
            .Include(u => u.Employee)
                .ThenInclude(e => e.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e.Position)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var employee = user.Employee;

        // Non-sensitive fields (if any) could go here
        employee.JobTitle = updateData.JobTitle;

        // Admin-only fields
        if (User.IsInRole("Admin"))
        {
            employee.HireDate = updateData.HireDate;
            employee.DepartmentId = updateData.DepartmentId;
            employee.PositionId = updateData.PositionId;
            employee.LevelId = updateData.LevelId;
            employee.ReportsToId = updateData.ReportsToId;
            employee.Salary = updateData.Salary;
            employee.EmploymentStatus = updateData.EmploymentStatus;
        }

        employee.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Re-fetch with inclusions for frontend update
        var updatedEmployee = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Position)
            .FirstOrDefaultAsync(e => e.EmployeeId == employee.EmployeeId);

        return Ok(new { message = "Professional information updated successfully", employee = updatedEmployee });
    }
}
