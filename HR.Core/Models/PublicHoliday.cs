using System.ComponentModel.DataAnnotations;

namespace HR.Core.Models;

public class PublicHoliday
{
    [Key]
    public int PublicHolidayId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // e.g., "Christmas", "Independence Day"
    
    [Required]
    public DateTime Date { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public bool IsOptional { get; set; } = false; // Some holidays might be optional
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
