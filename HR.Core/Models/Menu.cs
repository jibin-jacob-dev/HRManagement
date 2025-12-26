using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Menu
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Route { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    public int? ParentId { get; set; }
    
    [ForeignKey("ParentId")]
    public Menu? Parent { get; set; }
    
    public ICollection<Menu> Children { get; set; } = new List<Menu>();

    public int OrderIndex { get; set; }

    public ICollection<RoleMenu> RoleMenus { get; set; } = new List<RoleMenu>();
}
