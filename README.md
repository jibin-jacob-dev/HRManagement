# HR Management System

A comprehensive HR Management System built with .NET Web API, SQL Server, and React.

## Technology Stack

- **Backend**: ASP.NET Core Web API (.NET 10.0)
- **Database**: SQL Server
- **Frontend**: React with Bootstrap 5
- **Authentication**: ASP.NET Core Identity with JWT

## Project Structure

- **HR.Api**: Web API project with controllers and API configuration
- **HR.Core**: Business logic, domain models, and data access
- **hr-web**: React frontend application

## Features

- Employee Management (CRUD operations)
- Department Management
- Leave Management
- Attendance Tracking
- Payroll Management
- Role-based Authentication (Admin, HR Manager, Employee)

## Getting Started

### Prerequisites

- .NET 10.0 SDK
- SQL Server
- Node.js and npm

### Backend Setup

1. Navigate to the HR.Api directory
2. Update the connection string in `appsettings.json`
3. Run migrations:
   ```bash
   dotnet ef database update --project ../HR.Core/HR.Core.csproj
   ```
4. Run the API:
   ```bash
   dotnet run
   ```

The API will be available at `https://localhost:5001` with Swagger documentation at `https://localhost:5001/swagger`

### Frontend Setup

1. Navigate to the hr-web directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

The React app will be available at `http://localhost:3000`

## Default Roles

- Admin
- HR Manager
- Employee

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout

### Employees
- GET `/api/employees` - Get all employees
- GET `/api/employees/{id}` - Get employee by ID
- POST `/api/employees` - Create employee (Admin/HR Manager)
- PUT `/api/employees/{id}` - Update employee (Admin/HR Manager)
- DELETE `/api/employees/{id}` - Delete employee (Admin)

### Departments
- GET `/api/departments` - Get all departments
- GET `/api/departments/{id}` - Get department by ID
- POST `/api/departments` - Create department (Admin/HR Manager)
- PUT `/api/departments/{id}` - Update department (Admin/HR Manager)
- DELETE `/api/departments/{id}` - Delete department (Admin)

## License

MIT
