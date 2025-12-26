using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models;

public class Employee
{
    [Key]
    public int EmployeeId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;
    
    [Phone]
    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(255)]
    public string? ProfilePicture { get; set; }

    [MaxLength(100)]
    public string? JobTitle { get; set; }
    
    public DateTime? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(20)]
    public string? MaritalStatus { get; set; }

    [MaxLength(50)]
    public string? Nationality { get; set; }

    [MaxLength(20)]
    public string? BloodGroup { get; set; }

    [MaxLength(200)]
    public string? PersonalEmail { get; set; }
    
    [Required]
    public DateTime HireDate { get; set; }
    
    public int? DepartmentId { get; set; }
    
    public int? PositionId { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Salary { get; set; }
    
    [MaxLength(50)]
    public string EmploymentStatus { get; set; } = "Active";
    
    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? ZipCode { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }
    
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? ModifiedDate { get; set; }
    
    // Navigation properties
    public virtual Department? Department { get; set; }
    public virtual Position? Position { get; set; }
    public virtual ICollection<Leave> Leaves { get; set; } = new List<Leave>();
    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public virtual ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
    public virtual ICollection<EmployeeExperience> Experiences { get; set; } = new List<EmployeeExperience>();
    public virtual ICollection<EmployeeEducation> Educations { get; set; } = new List<EmployeeEducation>();
    public virtual ICollection<EmployeeCertification> Certifications { get; set; } = new List<EmployeeCertification>();
}
