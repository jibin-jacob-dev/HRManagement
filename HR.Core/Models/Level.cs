using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class Level
{
    [Key]
    public int LevelId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string LevelName { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? ModifiedDate { get; set; }
    
    // Navigation properties
    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
