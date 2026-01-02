using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class LeaveBalance
{
    [Key]
    public int LeaveBalanceId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    public int LeaveTypeId { get; set; }
    
    [Required]
    public int Year { get; set; } // e.g., 2024
    
    public decimal TotalDays { get; set; }
    
    public decimal UsedDays { get; set; } = 0;
    
    public decimal RemainingDays { get; set; }
    
    public decimal CarriedForwardDays { get; set; } = 0;
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastUpdated { get; set; }
    
    // Navigation properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual LeaveType LeaveType { get; set; } = null!;
}
