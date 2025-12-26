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

    [HttpGet("role/{roleId}")]
    public async Task<ActionResult<IEnumerable<int>>> GetRoleMenuIds(string roleId)
    {
        return await _context.RoleMenus
            .Where(rm => rm.RoleId == roleId)
            .Select(rm => rm.MenuId)
            .ToListAsync();
    }

    [HttpPost("role/{roleId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRoleMenus(string roleId, [FromBody] List<int> menuIds)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null) return NotFound("Role not found");

        // Remove existing mappings
        var existing = _context.RoleMenus.Where(rm => rm.RoleId == roleId);
        _context.RoleMenus.RemoveRange(existing);

        // Add new mappings
        foreach (var menuId in menuIds)
        {
            _context.RoleMenus.Add(new RoleMenu { RoleId = roleId, MenuId = menuId });
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
        var accessibleMenuIds = await _context.RoleMenus
            .Where(rm => userRoleIds.Contains(rm.RoleId))
            .Select(rm => rm.MenuId)
            .Distinct()
            .ToListAsync();

        var allMenus = await _context.Menus.ToListAsync(); // Load all into memory to build tree or filter
        
        // Filter: Keep menus that are in accessible list OR have children that are in accessible list?
        // Simple permission model: If you have the parent, do you see children? Or do you need explicit?
        // Usually: Explicit grant to each node.
        
        var visibleMenus = allMenus.Where(m => accessibleMenuIds.Contains(m.Id)).ToList();
        
        return Ok(visibleMenus);
    }

    private bool MenuExists(int id)
    {
        return _context.Menus.Any(e => e.Id == id);
    }
}
