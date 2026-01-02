-- Migration: Add Attendance and Leave Management Menus
-- This script adds menu items for Attendance and Leave management and assigns them to Admin role

DECLARE @AdminRoleId NVARCHAR(450);
DECLARE @AttendanceMenuId INT;
DECLARE @LeaveMenuId INT;

-- Get Admin Role ID
SELECT @AdminRoleId = Id FROM AspNetRoles WHERE Name = 'Admin';

-- Insert Attendance Menu
INSERT INTO Menus (Label, Route, Icon, ParentId, OrderIndex)
VALUES ('Attendance', '/attendance', 'fas fa-calendar-check', NULL, 4);

SET @AttendanceMenuId = SCOPE_IDENTITY();

-- Insert Leave Management Menu
INSERT INTO Menus (Label, Route, Icon, ParentId, OrderIndex)
VALUES ('Leave Management', '/leave-management', 'fas fa-umbrella-beach', NULL, 5);

SET @LeaveMenuId = SCOPE_IDENTITY();

-- Assign both menus to Admin role with Full access
IF @AdminRoleId IS NOT NULL
BEGIN
    INSERT INTO RoleMenus (RoleId, MenuId, PermissionType)
    VALUES 
        (@AdminRoleId, @AttendanceMenuId, 'Full'),
        (@AdminRoleId, @LeaveMenuId, 'Full');
    
    PRINT 'Successfully added Attendance and Leave menus and assigned to Admin role';
END
ELSE
BEGIN
    PRINT 'Warning: Admin role not found. Menus created but not assigned.';
END

-- Verify
SELECT 
    m.Id,
    m.Label,
    m.Route,
    m.Icon,
    r.Name as RoleName,
    rm.PermissionType
FROM Menus m
LEFT JOIN RoleMenus rm ON m.Id = rm.MenuId
LEFT JOIN AspNetRoles r ON rm.RoleId = r.Id
WHERE m.Label IN ('Attendance', 'Leave Management')
ORDER BY m.OrderIndex;
