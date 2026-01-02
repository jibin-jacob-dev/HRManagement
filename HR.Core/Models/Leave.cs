using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Leave
{
    [Key]
    public int LeaveId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    public int LeaveTypeId { get; set; }
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalDays { get; set; }

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
    
    // Navigation properties
    public virtual Employee Employee { get; set; } = null!;
    public virtual LeaveType LeaveType { get; set; } = null!;
}
