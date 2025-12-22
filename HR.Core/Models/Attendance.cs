using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class Attendance
{
    [Key]
    public int AttendanceId { get; set; }
    
    [Required]
    public int EmployeeId { get; set; }
    
    [Required]
    public DateTime Date { get; set; }
    
    public TimeSpan? CheckInTime { get; set; }
    
    public TimeSpan? CheckOutTime { get; set; }
    
    [MaxLength(50)]
    public string Status { get; set; } = "Present"; // Present, Absent, Late, Half-Day
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual Employee Employee { get; set; } = null!;
}
