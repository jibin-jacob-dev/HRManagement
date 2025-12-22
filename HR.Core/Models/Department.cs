using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class Department
{
    [Key]
    public int DepartmentId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string DepartmentName { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    public int? ManagerId { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? ModifiedDate { get; set; }
    
    // Navigation properties
    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public virtual ICollection<Position> Positions { get; set; } = new List<Position>();
}
