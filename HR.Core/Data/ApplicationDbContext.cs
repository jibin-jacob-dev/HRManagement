using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using HR.Core.Models;
using HR.Core.Models.PayrollManagement;

namespace HR.Core.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<Position> Positions { get; set; }
    public DbSet<Leave> Leaves { get; set; }
    public DbSet<Attendance> Attendances { get; set; }
    public DbSet<Payroll> Payrolls { get; set; } // Legacy or Simple Payroll
    
    // New Payroll System Entities
    public DbSet<SalaryComponent> SalaryComponents { get; set; }
    public DbSet<EmployeeSalaryStructure> EmployeeSalaryStructures { get; set; }
    public DbSet<PayrollRun> PayrollRuns { get; set; }
    public DbSet<EmployeePayroll> EmployeePayrolls { get; set; }
    public DbSet<PayrollDetail> PayrollDetails { get; set; }

    public DbSet<Menu> Menus { get; set; }
    public DbSet<RoleMenu> RoleMenus { get; set; }
    public DbSet<EmployeeExperience> EmployeeExperiences { get; set; }
    public DbSet<EmployeeEducation> EmployeeEducations { get; set; }
    public DbSet<EmployeeCertification> EmployeeCertifications { get; set; }
    public DbSet<Level> Levels { get; set; }
    public DbSet<LeaveType> LeaveTypes { get; set; }
    public DbSet<LeaveBalance> LeaveBalances { get; set; }
    public DbSet<PublicHoliday> PublicHolidays { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Timesheet> Timesheets { get; set; }
    public DbSet<TimesheetEntry> TimesheetEntries { get; set; }
    
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        
        // Configure relationships
        builder.Entity<Employee>()
            .HasOne(e => e.Department)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);
        
        builder.Entity<Employee>()
            .HasOne(e => e.Position)
            .WithMany(p => p.Employees)
            .HasForeignKey(e => e.PositionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<Employee>()
            .HasOne(e => e.Level)
            .WithMany(l => l.Employees)
            .HasForeignKey(e => e.LevelId)
            .OnDelete(DeleteBehavior.SetNull);
        
        // Employee self-referencing relationship (Manager/DirectReports)
        builder.Entity<Employee>()
            .HasOne(e => e.Manager)
            .WithMany(e => e.DirectReports)
            .HasForeignKey(e => e.ReportsToId)
            .OnDelete(DeleteBehavior.Restrict);
        
        builder.Entity<Position>()
            .HasOne(p => p.Department)
            .WithMany(d => d.Positions)
            .HasForeignKey(p => p.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);
        
        builder.Entity<Leave>()
            .HasOne(l => l.Employee)
            .WithMany(e => e.Leaves)
            .HasForeignKey(l => l.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.Entity<Attendance>()
            .HasOne(a => a.Employee)
            .WithMany(e => e.Attendances)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.Entity<Payroll>()
            .HasOne(p => p.Employee)
            .WithMany(e => e.Payrolls)
            .HasForeignKey(p => p.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.Entity<ApplicationUser>()
            .HasOne(u => u.Employee)
            .WithMany()
            .HasForeignKey(u => u.EmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        // Menu Configuration
        builder.Entity<RoleMenu>()
            .HasKey(rm => new { rm.RoleId, rm.MenuId });

        builder.Entity<RoleMenu>()
            .HasOne(rm => rm.Role)
            .WithMany(r => r.RoleMenus)
            .HasForeignKey(rm => rm.RoleId);

        builder.Entity<RoleMenu>()
            .HasOne(rm => rm.Menu)
            .WithMany(m => m.RoleMenus)
            .HasForeignKey(rm => rm.MenuId);

        // Employee Profile Extensions
        builder.Entity<EmployeeExperience>()
            .HasOne(ee => ee.Employee)
            .WithMany(e => e.Experiences)
            .HasForeignKey(ee => ee.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EmployeeEducation>()
            .HasOne(ee => ee.Employee)
            .WithMany(e => e.Educations)
            .HasForeignKey(ee => ee.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<EmployeeCertification>()
            .HasOne(ec => ec.Employee)
            .WithMany(e => e.Certifications)
            .HasForeignKey(ec => ec.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Leave Balance Configuration
        builder.Entity<LeaveBalance>()
            .HasOne(lb => lb.Employee)
            .WithMany()
            .HasForeignKey(lb => lb.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.Entity<LeaveBalance>()
            .HasOne(lb => lb.LeaveType)
            .WithMany()
            .HasForeignKey(lb => lb.LeaveTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Timesheet>()
            .HasOne(t => t.Employee)
            .WithMany()
            .HasForeignKey(t => t.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<TimesheetEntry>()
            .HasOne(te => te.Timesheet)
            .WithMany(t => t.Entries)
            .HasForeignKey(te => te.TimesheetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
