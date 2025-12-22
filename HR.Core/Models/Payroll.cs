using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Payroll
{
    [Key]
    public int PayrollId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string PayPeriod { get; set; } = string.Empty; // e.g., "January 2024"
    
    [Required]
    public DateTime PayPeriodStart { get; set; }
    
    [Required]
    public DateTime PayPeriodEnd { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal BasicSalary { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Deductions { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Bonuses { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal NetSalary { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Processed, Paid
    
    public DateTime? ProcessedDate { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual Employee Employee { get; set; } = null!;
}
