using Microsoft.AspNetCore.Identity;

namespace HR.Core.Models;

public class ApplicationRole : IdentityRole
{
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
