using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Notification
{
    [Key]
    public int NotificationId { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty; // Receiver's UserId
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Type { get; set; } // LeaveRequest, LeaveApproval, LeaveRejection, etc.
    
    [MaxLength(500)]
    public string? TargetUrl { get; set; } // URL to redirect when clicked
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; } = null!;
}
