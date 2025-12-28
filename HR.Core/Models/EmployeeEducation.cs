using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class EmployeeEducation
{
    [Key]
    public int Id { get; set; }

    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Institution { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Degree { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FieldOfStudy { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    [Column(TypeName = "decimal(5,2)")]
    public decimal? Grade { get; set; }

    [ForeignKey("EmployeeId")]
    public virtual Employee? Employee { get; set; }
}
