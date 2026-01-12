# HR Management System

A comprehensive, enterprise-grade HR Management System designed to streamline organizational processes, from employee onboarding to role-based access control. Built with cutting-edge technologies including .NET 10.0 and React 19.

## 🚀 Technology Stack

### Backend
*   **Framework:** ASP.NET Core Web API (.NET 10.0)
*   **Language:** C# 14.0
*   **Database:** SQL Server (Entity Framework Core 10.0)
*   **Authentication:** ASP.NET Core Identity with JWT Bearer Authentication
*   **Documentation:** Swagger / OpenAPI

### Frontend
*   **Library:** React 19.2.3
*   **Styling:** Bootstrap 5.3.8, Custom CSS Variables
*   **Data Grid:** AG Grid Community v35.0.0
*   **State Management:** React Context API (Theme, Menu)
*   **HTTP Client:** Axios
*   **Forms:** Formik + Yup Validation
*   **Routing:** React Router v7.11.0
*   **Utilities:** SweetAlert2, React Datepicker

## 📂 Project Structure

### `HR.Api` (Backend)
The RESTful API layer handling requests, authentication, and responses.
*   **Controllers:**
    *   `AuthController`: Login, Register, Logout.
    *   `UsersController`: System user management.
    *   `RolesController`: Role definitions and CRUD.
    *   `MenusController`: Dynamic menu management and Role-Menu permission mapping.
    *   `EmployeesController`: Core employee data operations.
    *   `EmployeeProfileController`: Detailed profile sections (Education, Experience, etc.).
    *   `DepartmentsController`, `PositionsController`, `LevelsController`: Organizational master data.

### `HR.Core` (Shared)
Contains the domain logic, database context, and models.
*   **Models:** `ApplicationUser`, `ApplicationRole`, `Employee`, `Department`, `Position`, `Level`, `Menu`, `RoleMenu`, `Attendance`, `Leave`, `Payroll`.

### `hr-web` (Frontend)
The React-based Single Page Application (SPA).
*   **Pages:**
    *   **Dashboard**: Main overview.
    *   **Authentication**: Login, Register.
    *   **Employee Management**: `EmployeeList` (AG Grid view), `Profile` (Detailed view with tabs).
    *   **Org Management**: `DepartmentManagement`, `PositionManagement`, `LevelManagement`.
    *   **System Admin**: `UserManagement` (Account status, Password reset), `RoleManagement` (Permission assignment), `MenuManagement` (Sidebar configuration).
*   **Components**: Reusable UI blocks (`Sidebar`, `Navbar`, `GridContainer`, `StatCard`).
*   **Hooks**: `usePermission` (Access control), `useGridSettings` (Standardized grid configs).

## ✨ Key Features

### 1. Authentication & Security
*   **Secure Login:** JWT-based stateless authentication.
*   **Role-Based Access Control (RBAC):** dynamic permission checking.
*   **Granular Permissions:** Roles are assigned specific access rights (Read/Full) to individual menus/routes.

### 2. Employee Profile Management
*   **Comprehensive Data:** Personal Info, Professional Info, Education, Experience, Certifications.
*   **Document Management:** Profile picture upload with cropping functionality.
*   **Enhanced Directory:** Filterable employee list with hidden system IDs and clear organizational data (Department, Position, Hire Date).

### 3. Leave Balance Management
*   **Tracking:** View and manage leave allocations per employee and year.
*   **Validation:** Built-in safeguards against duplicate balance creation.
*   **Initialization:** Bulk initialize leave balances for all employees for a new year.
*   **Smart Input:** Auto-filling of total days based on leave type defaults.

### 4. Organizational Master Data
*   **Departments:** Manage company departments.
*   **Positions:** Define job titles and hierarchies.
*   **Levels:** clear definition of seniority levels (L1, L2, etc.).

### 5. Dynamic System Administration
*   **Dynamic Menus:** Sidebar menus are database-driven and customizable via `MenuManagement`.
*   **Role Management:** Create custom roles and drag-and-drop/checkbox assign permissions.
*   **User Management:** detailed control over user accounts, statuses, and role assignments.

### 6. Payroll Management
*   **Salary Components:** Admin-configurable master list of earnings and deductions (e.g., Basic, HRA, PF).
*   **Salary Structure:** Flexible assignment of components to employees with effective dates and real-time CTC calculation.
*   **End-to-End Processing:** Complete workflow to Generate Drafts, Review, and Finalize monthly payrolls.
*   **Smart Calculation:** Automated calculation of earnings, deductions, and net pay based on attendance and working days.
*   **My Payslips Portal:** Dedicated employee view for searching, viewing, and printing monthly payslip statements.

### 7. Advanced UI/UX
*   **Dark/Light Mode:** System-wide theme toggling.
*   **AG Grid Integration:** High-performance data tables with filtering, sorting, and pagination.
*   **Responsive Design:** Mobile-friendly layout using Bootstrap.

## 🛠️ Development Guidelines

### Permission-Based Page Development
**CRITICAL:** All new management pages and features **MUST** implement permission-based access control.

1.  **Use the Hook:** Always import and use the `usePermission` hook at the top of your page component.
    ```javascript
    import { usePermission } from '../hooks/usePermission';
    
    const MyComponent = () => {
        const { canEdit } = usePermission('/my-route-path');
        // ...
    }
    ```
2.  **Route as Key:** Use the page's route path (e.g., `/departments`, `/user-management`) as the permission key. This ensures consistency between the sidebar and the permission logic.
3.  **Conditional Rendering:**
    *   **Read Only Mode:** If `canEdit` is false, hide "Add", "Edit", "Delete" buttons.
    *   **Grid Actions:** Use the `canEdit` flag inside AG Grid `cellRenderer` to conditionally show/hide action icons.
4.  **Strict Enforcement:** Ensure "Read Only" users cannot see UI elements that trigger write operations.

## ⚙️ Setup & Installation

### Prerequisites
*   .NET 10.0 SDK
*   Node.js (v18+) & npm
*   SQL Server

### Backend Setup
1.  Navigate to `HR.Api`.
2.  Update `appsettings.json` with your SQL Server connection string.
3.  Run migrations:
    ```bash
    dotnet ef database update --project ../HR.Core/HR.Core.csproj
    ```
4.  Start the API:
    ```bash
    dotnet run
    ```

### Frontend Setup
1.  Navigate to `hr-web`.
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```

## 📄 License
MIT License
