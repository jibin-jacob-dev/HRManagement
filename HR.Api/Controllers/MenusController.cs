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
        public int MenuId { get; set; }
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
    public async Task<ActionResult<IEnumerable<Menu>>> GetCurrentUserMenus()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        // Get user roles
        var userRoleIds = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync();

        // Get menus for these roles
        // We want distinct menus
        var menus = await _context.RoleMenus
            .Where(rm => userRoleIds.Contains(rm.RoleId))
            .Select(rm => rm.Menu)
            .Distinct()
            .OrderBy(m => m.OrderIndex)
            .ToListAsync();
            
        // If no menus assigned, return common fallback or empty?
        // Let's return what we found. The frontend can handle hierarchy construction if needed, 
        // or we can structure it here. For now, returning flat list of accessible menus is flexible.
        // Actually, sidebar often expects a tree. But the Entity has Children collection.
        // EF Core might not load Children unless Included or loaded.
        // The above query `Select(rm => rm.Menu)` returns the Menu entity. 
        // However, we want the tree structure.
        
        // Better approach: Get all IDs accessible, then fetch the full Menu entities with Children.
        // We also need to know the permission type for each menu.
        // If a user has multiple roles with conflicting permissions (e.g. one Read, one Full) for the same menu, "Full" should win.
        
        var userRoleMenus = await _context.RoleMenus
            .Where(rm => userRoleIds.Contains(rm.RoleId))
            .Select(rm => new { rm.MenuId, rm.PermissionType })
            .ToListAsync();

        var accessibleMenuIds = userRoleMenus.Select(rm => rm.MenuId).Distinct().ToList();

        var allMenus = await _context.Menus.ToListAsync(); 
        
        var visibleMenus = allMenus.Where(m => accessibleMenuIds.Contains(m.Id)).Select(m => {
            // Determine permission for this menu
            var permissionsForMenu = userRoleMenus.Where(rm => rm.MenuId == m.Id).Select(rm => rm.PermissionType);
            var effectivePermission = permissionsForMenu.Contains("Full") ? "Full" : "Read";
            
            // We can't easily add a property to the Entity `Menu` without ignoring it in DB.
            // But we can return an anonymous object or a DTO.
            // For simplicity in this existing controller structure, let's use a dynamic approach or mapped DTO if possible.
            // Or just append it to the response if the frontend expects it.
            // Let's modify the return type to be dynamic or a specific DTO.
            
            return new 
            {
                m.Id,
                m.Label,
                m.Route,
                m.Icon,
                m.ParentId,
                m.OrderIndex,
                m.Children, // Note: Children won't be recursively mapped with permissions here easily without separate recursion
                PermissionType = effectivePermission
            };
        }).ToList();
        
        return Ok(visibleMenus);
    }

    private bool MenuExists(int id)
    {
        return _context.Menus.Any(e => e.Id == id);
    }
}
