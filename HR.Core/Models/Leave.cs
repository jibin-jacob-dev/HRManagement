using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class Leave
{
    [Key]
    public int LeaveId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string LeaveType { get; set; } = string.Empty; // Sick, Vacation, Personal, etc.
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    
    [MaxLength(1000)]
    public string? Reason { get; set; }
    
    [MaxLength(1000)]
    public string? ApproverComments { get; set; }
    
    public string? ApprovedBy { get; set; }
    
    public DateTime? ApprovedDate { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual Employee Employee { get; set; } = null!;
}
