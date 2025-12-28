using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class EmployeeCertification
{
    [Key]
    public int Id { get; set; }

    public int EmployeeId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string IssuingOrganization { get; set; } = string.Empty;

    public DateTime IssueDate { get; set; }

    public DateTime? ExpiryDate { get; set; }

    [MaxLength(100)]
    public string? CredentialId { get; set; }

    [MaxLength(200)]
    public string? CredentialUrl { get; set; }

    [ForeignKey("EmployeeId")]
    public virtual Employee? Employee { get; set; }
}
