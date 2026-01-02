using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Timesheet
{
    [Key]
    public int TimesheetId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Draft"; // Draft, Submitted, Approved, Rejected
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalHours { get; set; }
    
    [MaxLength(500)]
    public string? ManagerComment { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? SubmittedDate { get; set; }
    
    public DateTime? ApprovedDate { get; set; }
    
    public int? ApprovedById { get; set; }

    // Navigation properties
    public virtual Employee Employee { get; set; } = null!;
    
    [ForeignKey("ApprovedById")]
    public virtual Employee? ApprovedBy { get; set; }
    
    public virtual ICollection<TimesheetEntry> Entries { get; set; } = new List<TimesheetEntry>();
}

public class TimesheetEntry
{
    [Key]
    public int EntryId { get; set; }
    
    [Required]
    public int TimesheetId { get; set; }
    
    [Required]
    public DateTime Date { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Hours { get; set; }
    
    [MaxLength(200)]
    public string? Description { get; set; }
    
    public bool IsAutomated { get; set; } = false;
    
    [MaxLength(50)]
    public string? AutomatedType { get; set; } // Holiday, Leave
    
    // Navigation property
    public virtual Timesheet Timesheet { get; set; } = null!;
}
