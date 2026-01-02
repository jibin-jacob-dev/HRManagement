using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;
using System.Security.Claims;

namespace HR.Api.Controllers;

[Route("api/employeeprofile")]
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

    [HttpGet("{userId}")]
    public async Task<ActionResult<Employee>> GetProfileByUserId(string userId)
    {
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
            return NotFound("User or Employee profile not found");

        return Ok(user.Employee);
    }

    [HttpPut("personal")]
    public async Task<IActionResult> UpdatePersonalInfo([FromBody] Employee updateData)
    {
        Employee employee;

        if (User.IsInRole("Admin") && updateData.EmployeeId > 0)
        {
            employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .FirstOrDefaultAsync(e => e.EmployeeId == updateData.EmployeeId);

            if (employee == null)
                return NotFound("Target employee profile not found");
        }
        else
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

            employee = user.Employee;
        }

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
            .Include(e => e.Experiences)
            .Include(e => e.Educations)
            .Include(e => e.Certifications)
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
        Employee employee;

        if (User.IsInRole("Admin") && updateData.EmployeeId > 0)
        {
            employee = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Position)
                .FirstOrDefaultAsync(e => e.EmployeeId == updateData.EmployeeId);

            if (employee == null)
                return NotFound("Target employee profile not found");
        }
        else
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

            employee = user.Employee;
        }

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
            .Include(e => e.Experiences)
            .Include(e => e.Educations)
            .Include(e => e.Certifications)
            .FirstOrDefaultAsync(e => e.EmployeeId == employee.EmployeeId);

        return Ok(new { message = "Professional information updated successfully", employee = updatedEmployee });
    }

    [HttpPost("experience")]
    public async Task<IActionResult> AddExperience([FromBody] EmployeeExperience experience)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        experience.EmployeeId = user.Employee.EmployeeId;
        _context.EmployeeExperiences.Add(experience);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Experience added successfully", experience });
    }

    [HttpDelete("remove-experience/{id}")]
    public async Task<IActionResult> DeleteExperience(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var experience = await _context.EmployeeExperiences
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (experience == null)
            return NotFound("Experience not found");

        _context.EmployeeExperiences.Remove(experience);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Experience removed successfully" });
    }

    [HttpPut("experience/{id}")]
    public async Task<IActionResult> UpdateExperience(int id, [FromBody] EmployeeExperience updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var experience = await _context.EmployeeExperiences
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (experience == null)
            return NotFound("Experience not found");

        experience.CompanyName = updateData.CompanyName;
        experience.Designation = updateData.Designation;
        experience.StartDate = updateData.StartDate;
        experience.EndDate = updateData.EndDate;
        experience.IsCurrent = updateData.IsCurrent;
        experience.Description = updateData.Description;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Experience updated successfully", experience });
    }

    [HttpPost("education")]
    public async Task<IActionResult> AddEducation([FromBody] EmployeeEducation education)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        education.EmployeeId = user.Employee.EmployeeId;
        _context.EmployeeEducations.Add(education);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Education added successfully", education });
    }

    [HttpDelete("remove-education/{id}")]
    public async Task<IActionResult> DeleteEducation(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var education = await _context.EmployeeEducations
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (education == null)
            return NotFound("Education record not found");

        _context.EmployeeEducations.Remove(education);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Education record removed successfully" });
    }

    [HttpPut("education/{id}")]
    public async Task<IActionResult> UpdateEducation(int id, [FromBody] EmployeeEducation updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var education = await _context.EmployeeEducations
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (education == null)
            return NotFound("Education record not found");

        education.Institution = updateData.Institution;
        education.Degree = updateData.Degree;
        education.FieldOfStudy = updateData.FieldOfStudy;
        education.StartDate = updateData.StartDate;
        education.EndDate = updateData.EndDate;
        education.Grade = updateData.Grade;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Education record updated successfully", education });
    }

    [HttpPost("certification")]
    public async Task<IActionResult> AddCertification([FromBody] EmployeeCertification certification)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        certification.EmployeeId = user.Employee.EmployeeId;
        _context.EmployeeCertifications.Add(certification);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Certification added successfully", certification });
    }

    [HttpDelete("remove-certification/{id}")]
    public async Task<IActionResult> DeleteCertification(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var certification = await _context.EmployeeCertifications
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (certification == null)
            return NotFound("Certification record not found");

        _context.EmployeeCertifications.Remove(certification);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Certification record removed successfully" });
    }

    [HttpPut("certification/{id}")]
    public async Task<IActionResult> UpdateCertification(int id, [FromBody] EmployeeCertification updateData)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var certification = await _context.EmployeeCertifications
            .FirstOrDefaultAsync(e => e.Id == id && e.EmployeeId == user.Employee.EmployeeId);

        if (certification == null)
            return NotFound("Certification record not found");

        certification.Name = updateData.Name;
        certification.IssuingOrganization = updateData.IssuingOrganization;
        certification.IssueDate = updateData.IssueDate;
        certification.ExpiryDate = updateData.ExpiryDate;
        certification.CredentialId = updateData.CredentialId;
        certification.CredentialUrl = updateData.CredentialUrl;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Certification record updated successfully", certification });
    }

    [HttpPost("upload-certification")]
    public async Task<IActionResult> UploadCertificationFile([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Employee == null)
            return NotFound("Employee profile not found");

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "certifications");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{userId}_{DateTime.UtcNow.Ticks}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/certifications/{fileName}";
        return Ok(new { fileUrl });
    }
}
