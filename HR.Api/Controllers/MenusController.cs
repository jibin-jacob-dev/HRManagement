using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;
using System.Security.Claims;
using System.Text.Json.Serialization;

namespace HR.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class MenusController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MenusController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Menu>>> GetMenus()
    {
        return await _context.Menus
            .Include(m => m.Children)
            .OrderBy(m => m.OrderIndex)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Menu>> GetMenu(int id)
    {
        var menu = await _context.Menus.FindAsync(id);

        if (menu == null)
            return NotFound();

        return menu;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Menu>> CreateMenu(Menu menu)
    {
        _context.Menus.Add(menu);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMenu), new { id = menu.Id }, menu);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateMenu(int id, Menu menu)
    {
        if (id != menu.Id)
            return BadRequest();

        _context.Entry(menu).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!MenuExists(id))
                return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteMenu(int id)
    {
        var menu = await _context.Menus.FindAsync(id);
        if (menu == null)
            return NotFound();

        _context.Menus.Remove(menu);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // Role Management Endpoints

    public class RoleMenuDto
    {
        [JsonPropertyName("menuId")]
        public int MenuId { get; set; }
        [JsonPropertyName("permissionType")]
        public string PermissionType { get; set; } = "Full";
    }

    [HttpGet("role/{roleId}")]
    public async Task<ActionResult<IEnumerable<RoleMenuDto>>> GetRoleMenus(string roleId)
    {
        return await _context.RoleMenus
            .Where(rm => rm.RoleId == roleId)
            .Select(rm => new RoleMenuDto 
            { 
                MenuId = rm.MenuId, 
                PermissionType = rm.PermissionType 
            })
            .ToListAsync();
    }

    [HttpPost("role/{roleId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRoleMenus(string roleId, [FromBody] List<RoleMenuDto> menuPermissions)
    {
        Console.WriteLine("=== UPDATE ROLE MENUS RECEIVED ===");
        Console.WriteLine($"Role ID: {roleId}");
        Console.WriteLine($"Permissions Count: {menuPermissions?.Count ?? 0}");
        if (menuPermissions != null)
        {
            foreach (var perm in menuPermissions)
            {
                Console.WriteLine($"  MenuId: {perm.MenuId}, PermissionType: {perm.PermissionType}");
            }
        }
        Console.WriteLine("===================================");

        var role = await _context.Roles.FindAsync(roleId);
        if (role == null) return NotFound("Role not found");

        // Remove existing mappings
        var existing = _context.RoleMenus.Where(rm => rm.RoleId == roleId);
        _context.RoleMenus.RemoveRange(existing);

        // Add new mappings
        foreach (var item in menuPermissions)
        {
            _context.RoleMenus.Add(new RoleMenu 
            { 
                RoleId = roleId, 
                MenuId = item.MenuId,
                PermissionType = item.PermissionType
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Role menus updated successfully" });
    }

    [HttpGet("current-user")]
    public async Task<IActionResult> GetCurrentUserMenus()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        // Get user roles
        var userRoleIds = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync();

        // Get all role-menu mappings for this user
        var userRoleMenus = await _context.RoleMenus
            .Where(rm => userRoleIds.Contains(rm.RoleId))
            .Select(rm => new { rm.MenuId, rm.PermissionType })
            .ToListAsync();

        // Create a permission lookup: MenuId -> Best Permission ("Full" wins over "Read")
        var permissionLookup = userRoleMenus
            .GroupBy(rm => rm.MenuId)
            .ToDictionary(
                g => g.Key,
                g => g.Any(x => x.PermissionType == "Full") ? "Full" : "Read"
            );

        var accessibleMenuIds = permissionLookup.Keys.ToList();
        var allMenus = await _context.Menus.ToListAsync();

        // Recursive function to map menu with permissions
        object MapMenuWithPermission(Menu menu)
        {
            var permission = permissionLookup.ContainsKey(menu.Id) ? permissionLookup[menu.Id] : "Read";
            
            var mappedChildren = menu.Children?
                .Where(c => accessibleMenuIds.Contains(c.Id))
                .Select(c => MapMenuWithPermission(c))
                .ToList();

            return new
            {
                menu.Id,
                menu.Label,
                menu.Route,
                menu.Icon,
                menu.ParentId,
                menu.OrderIndex,
                Children = mappedChildren ?? new List<object>(),
                PermissionType = permission
            };
        }

        var visibleMenus = allMenus
            .Where(m => accessibleMenuIds.Contains(m.Id))
            .Select(m => MapMenuWithPermission(m))
            .ToList();

        return Ok(visibleMenus);
    }

    private bool MenuExists(int id)
    {
        return _context.Menus.Any(e => e.Id == id);
    }
}
