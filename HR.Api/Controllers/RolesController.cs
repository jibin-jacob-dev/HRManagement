using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Models;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly RoleManager<ApplicationRole> _roleManager;

    public RolesController(RoleManager<ApplicationRole> roleManager)
    {
        _roleManager = roleManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _roleManager.Roles
            .Select(r => new { r.Id, r.Name })
            .ToListAsync();
        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] RoleCreateDto model)
    {
        if (string.IsNullOrWhiteSpace(model.Name))
            return BadRequest(new { message = "Role name is required" });

        if (await _roleManager.RoleExistsAsync(model.Name))
            return BadRequest(new { message = "Role already exists" });

        var result = await _roleManager.CreateAsync(new ApplicationRole { Name = model.Name });

        if (result.Succeeded)
            return Ok(new { message = "Role created successfully" });

        return BadRequest(result.Errors);
    }

    [HttpDelete("{name}")]
    public async Task<IActionResult> DeleteRole(string name)
    {
        var role = await _roleManager.FindByNameAsync(name);
        if (role == null)
            return NotFound();

        // Prevent deleting core roles
        var coreRoles = new[] { "Admin", "HR Manager", "Employee" };
        if (coreRoles.Contains(role.Name))
            return BadRequest(new { message = "Cannot delete core system roles" });

        var result = await _roleManager.DeleteAsync(role);
        if (result.Succeeded)
            return Ok(new { message = "Role deleted successfully" });

        return BadRequest(result.Errors);
    }
}

public class RoleCreateDto
{
    public string Name { get; set; } = string.Empty;
}
