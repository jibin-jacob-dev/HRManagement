using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using HR.Core.Data;
using HR.Core.Models;

namespace HR.Api.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

        // 0. Ensure database is created
        await dbContext.Database.MigrateAsync();

        // 1. Seed Roles
        var roleNames = new[] { "Admin", "HR Manager", "Employee" };
        foreach (var roleName in roleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new ApplicationRole { Name = roleName });
            }
        }

        // 2. Seed Departments
        if (!await dbContext.Departments.AnyAsync())
        {
            var departments = new List<Department>
            {
                new Department { DepartmentName = "Information Technology", Description = "IT Department" },
                new Department { DepartmentName = "Human Resources", Description = "HR Department" },
                new Department { DepartmentName = "Finance", Description = "Finance Department" },
                new Department { DepartmentName = "Operations", Description = "Operations Department" }
            };
            await dbContext.Departments.AddRangeAsync(departments);
            await dbContext.SaveChangesAsync();
        }

        // 3. Seed Positions
        if (!await dbContext.Positions.AnyAsync())
        {
            var itDept = await dbContext.Departments.FirstAsync(d => d.DepartmentName == "Information Technology");
            var hrDept = await dbContext.Departments.FirstAsync(d => d.DepartmentName == "Human Resources");
            
            var positions = new List<Position>
            {
                new Position { PositionTitle = "Senior Software Engineer", DepartmentId = itDept.DepartmentId },
                new Position { PositionTitle = "Junior Software Engineer", DepartmentId = itDept.DepartmentId },
                new Position { PositionTitle = "HR Manager", DepartmentId = hrDept.DepartmentId },
                new Position { PositionTitle = "Recruiter", DepartmentId = hrDept.DepartmentId }
            };
            await dbContext.Positions.AddRangeAsync(positions);
            await dbContext.SaveChangesAsync();
        }

        // 4. Seed Admin User and associated Employee
        var adminEmail = configuration["SeedData:AdminEmail"] ?? "jibin@gmail.com";
        var adminPassword = configuration["SeedData:AdminPassword"] ?? "Admin@1234";
        
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            var itDept = await dbContext.Departments.FirstAsync(d => d.DepartmentName == "Information Technology");
            var position = await dbContext.Positions.FirstAsync(p => p.PositionTitle == "Senior Software Engineer");

            var adminEmp = new Employee
            {
                FirstName = "Jibin",
                LastName = "Jacob",
                Email = adminEmail,
                HireDate = DateTime.Now.AddYears(-2),
                EmploymentStatus = "Active",
                DepartmentId = itDept.DepartmentId,
                PositionId = position.PositionId,
                Salary = 90000
            };
            dbContext.Employees.Add(adminEmp);
            await dbContext.SaveChangesAsync();

            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Jibin",
                LastName = "Jacob",
                EmployeeId = adminEmp.EmployeeId,
                IsActive = true,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(adminUser, adminPassword);
            await userManager.AddToRoleAsync(adminUser, "Admin");
        }

        // 5. Seed Menus and Permissions
        if (!await dbContext.Menus.AnyAsync())
        {
            var menus = new List<Menu>
            {
                new Menu { Label = "Dashboard", Route = "/dashboard", Icon = "fa-tachometer-alt", OrderIndex = 1 },
                new Menu { Label = "User Management", Route = "/user-management", Icon = "fa-users", OrderIndex = 2 },
                new Menu { Label = "Employee Management", Route = "/employee-management", Icon = "fa-user-tie", OrderIndex = 3 },
                new Menu { Label = "Role Management", Route = "/role-management", Icon = "fa-user-shield", OrderIndex = 4 },
                new Menu { Label = "Department Management", Route = "/department-management", Icon = "fa-building", OrderIndex = 5 },
                new Menu { Label = "Position Management", Route = "/position-management", Icon = "fa-briefcase", OrderIndex = 6 },
                new Menu { Label = "Level Management", Route = "/level-management", Icon = "fa-layer-group", OrderIndex = 7 },
                new Menu { Label = "Attendance", Route = "/attendance", Icon = "fa-calendar-check", OrderIndex = 8 },
                new Menu { Label = "Leave Management", Route = "/leave-management", Icon = "fa-calendar-times", OrderIndex = 9 },
                new Menu { Label = "Holiday Calendar", Route = "/holiday-calendar", Icon = "fa-calendar-alt", OrderIndex = 10 },
                new Menu { Label = "Leave Types", Route = "/leave-types", Icon = "fa-list-ul", OrderIndex = 11 },
                new Menu { Label = "Leave Balance", Route = "/leave-balance", Icon = "fa-chart-pie", OrderIndex = 12 },
                new Menu { Label = "Menu Management", Route = "/menu-management", Icon = "fa-bars", OrderIndex = 13 }
            };

            await dbContext.Menus.AddRangeAsync(menus);
            await dbContext.SaveChangesAsync();

            var adminRole = await roleManager.FindByNameAsync("Admin");
            if (adminRole != null)
            {
                foreach (var menu in menus)
                {
                    if (!await dbContext.RoleMenus.AnyAsync(rm => rm.RoleId == adminRole.Id && rm.MenuId == menu.Id))
                    {
                        dbContext.RoleMenus.Add(new RoleMenu { RoleId = adminRole.Id, MenuId = menu.Id, PermissionType = "Full" });
                    }
                }
                await dbContext.SaveChangesAsync();
            }
        }

        // 6. Seed Leave Types
        if (!await dbContext.LeaveTypes.AnyAsync())
        {
            var leaveTypes = new List<LeaveType>
            {
                new LeaveType { Name = "Sick Leave", DefaultDaysPerYear = 10, Description = "Medical leave", IsPaid = true, IsActive = true },
                new LeaveType { Name = "Annual Leave", DefaultDaysPerYear = 15, Description = "Vacation", IsPaid = true, IsActive = true },
                new LeaveType { Name = "Casual Leave", DefaultDaysPerYear = 5, Description = "Miscellaneous", IsPaid = true, IsActive = true }
            };
            await dbContext.LeaveTypes.AddRangeAsync(leaveTypes);
            await dbContext.SaveChangesAsync();
        }

        // 7. Seed Public Holidays
        if (!await dbContext.PublicHolidays.AnyAsync())
        {
            var year = DateTime.Now.Year;
            var holidays = new List<PublicHoliday>
            {
                new PublicHoliday { Name = "New Year's Day", Date = new DateTime(year, 1, 1), Description = "General Holiday" },
                new PublicHoliday { Name = "Independence Day", Date = new DateTime(year, 8, 15), Description = "National Holiday" },
                new PublicHoliday { Name = "Christmas", Date = new DateTime(year, 12, 25), Description = "General Holiday" }
            };
            await dbContext.PublicHolidays.AddRangeAsync(holidays);
            await dbContext.SaveChangesAsync();
        }

        // 8. Seed Leave Balances for all Employees
        var employeesList = await dbContext.Employees.ToListAsync();
        var lTypesList = await dbContext.LeaveTypes.ToListAsync();
        foreach (var emp in employeesList)
        {
            foreach (var lt in lTypesList)
            {
                if (!await dbContext.LeaveBalances.AnyAsync(lb => lb.EmployeeId == emp.EmployeeId && lb.LeaveTypeId == lt.LeaveTypeId && lb.Year == DateTime.Now.Year))
                {
                    dbContext.LeaveBalances.Add(new LeaveBalance
                    {
                        EmployeeId = emp.EmployeeId,
                        LeaveTypeId = lt.LeaveTypeId,
                        Year = DateTime.Now.Year,
                        TotalDays = lt.DefaultDaysPerYear,
                        UsedDays = 0,
                        RemainingDays = lt.DefaultDaysPerYear,
                        CarriedForwardDays = 0
                    });
                }
            }
        }
        await dbContext.SaveChangesAsync();
    }
}
