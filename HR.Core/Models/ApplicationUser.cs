using Microsoft.AspNetCore.Identity;

namespace HR.Core.Models;

public class ApplicationUser : IdentityUser
{
    public int? EmployeeId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual Employee? Employee { get; set; }
}
