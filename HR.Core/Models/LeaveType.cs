using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class LeaveType
{
    [Key]
    public int LeaveTypeId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // Sick Leave, Casual Leave, etc
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Required]
    public int DefaultDaysPerYear { get; set; } // e.g., 12 days
    
    public bool IsPaid { get; set; } = true;
    
    public bool RequiresApproval { get; set; } = true;
    
    public int? MaxConsecutiveDays { get; set; }
    
    public bool AllowCarryForward { get; set; } = false;
    
    public int? MaxCarryForwardDays { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
