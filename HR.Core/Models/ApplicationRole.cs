using Microsoft.AspNetCore.Identity;

namespace HR.Core.Models;

public class ApplicationRole : IdentityRole
{
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public ICollection<RoleMenu> RoleMenus { get; set; } = new List<RoleMenu>();
}
