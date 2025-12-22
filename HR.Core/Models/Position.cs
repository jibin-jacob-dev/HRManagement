using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Position
{
    [Key]
    public int PositionId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string PositionTitle { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(100)]
    public string? SalaryRange { get; set; }
    
    public int? DepartmentId { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? ModifiedDate { get; set; }
    
    // Navigation properties
    public virtual Department? Department { get; set; }
    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
