using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class RoleMenu
{
    public string RoleId { get; set; } = string.Empty;
    
    [ForeignKey("RoleId")]
    public ApplicationRole Role { get; set; } = null!;

    public int MenuId { get; set; }
    
    [ForeignKey("MenuId")]
    public Menu Menu { get; set; } = null!;
}
