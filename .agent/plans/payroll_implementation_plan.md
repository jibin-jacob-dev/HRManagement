# Payroll System Implementation Plan

## 1. Overview
The Payroll System will allow HR Admins to define salary structures for employees, process monthly payrolls based on attendance/leave data, and generate payslips. Employees will be able to view and download their monthly payslips.

## 2. Database Schema Design (HR.Core)

### New Entities
1.  **SalaryComponent**
    *   `Id` (int)
    *   `Name` (string) - e.g., "Basic", "HRA", "Provident Fund"
    *   `Type` (enum) - Earning, Deduction
    *   `IsTaxable` (bool)
    *   `IsActive` (bool)

2.  **EmployeeSalaryStructure**
    *   `Id` (int)
    *   `EmployeeId` (int, FK)
    *   `SalaryComponentId` (int, FK)
    *   `Amount` (decimal)
    *   `EffectiveDate` (DateTime)

3.  **PayrollRun** (Batch Header)
    *   `Id` (int)
    *   `Month` (int)
    *   `Year` (int)
    *   `ProcessedDate` (DateTime)
    *   `Status` (enum) - Draft, Finalized
    *   `TotalPayout` (decimal)

4.  **EmployeePayroll** (Individual Record)
    *   `Id` (int)
    *   `PayrollRunId` (int, FK)
    *   `EmployeeId` (int, FK)
    *   `BasicSalary` (decimal)
    *   `TotalEarnings` (decimal)
    *   `TotalDeductions` (decimal)
    *   `NetSalary` (decimal)
    *   `DaysWorked` (int)
    *   `LossOfPayDays` (int)
    *   `PaymentStatus` (enum) - Pending, Paid

5.  **PayrollDetail** (Line Items)
    *   `Id` (int)
    *   `EmployeePayrollId` (int, FK)
    *   `SalaryComponentId` (int, FK)
    *   `Amount` (decimal)

## 3. Backend Development (HR.Api)

### Controllers & Services
1.  **SalaryComponentController**:
    *   CRUD operations for Master components.
2.  **SalaryStructureController**:
    *   Assign/Update salary components for specific employees.
    *   Get current structure for an employee.
3.  **PayrollController**:
    *   `GeneratePayroll(month, year)`:
        *   Fetch active employees.
        *   Calculate **Loss of Pay (LOP)** based on `Attendance` and `Leave` modules.
        *   Apply salary structure calculations.
        *   Save as "Draft".
    *   `GetPayrollRuns()`: List past payrolls.
    *   `GetEmployeePayslip(payrollId, employeeId)`: Returns detailed payload for PDF/View.
    *   `FinalizePayroll(runId)`: Locks the data.

## 4. Frontend Implementation (hr-web)

### New Pages
1.  **Salary Components (Admin)**
    *   AG Grid to manage master Earnings/Deductions.
2.  **Salary Structure (Admin)**
    *   Select Employee -> Configure their allowances/deductions.
    *   Auto-calculate "Cost to Company" (CTC) summary.
3.  **Payroll Processing (Admin)**
    *   Dashboard to start a new payroll run.
    *   Review Generated Draft (AG Grid).
    *   "Finalize & Publish" button.
4.  **My Payslips (Employee)**
    *   List of available payslips.
    *   "Download PDF" / "View" modal.

## 5. Implementation Roadmap

### Phase 1: Foundation
*   [x] Create Database Entities and Migrations.
*   [x] Seed initial Salary Components (Basic, HRA, DA, PF, Tax).

### Phase 2: Salary Structure Management
*   [ ] Implement Backend APIs for Components and Structure.
*   [ ] Create Frontend Page to assign salary to employees.

### Phase 3: Calculation Engine
*   [ ] Implement logic to pull Leave/Attendance data.
*   [ ] Develop the `PayrollCalculationService`.
    *   Formula: `(BaseSalary / DaysInMonth) * PayDays`.

### Phase 4: UI & Processing
*   [ ] Build the Payroll Processing Dashboard.
*   [ ] Implement the "Generate" workflow.

### Phase 5: Payslips
*   [ ] Design the Payslip UI (printer-friendly).
*   [ ] Integration for employees to view their history.

## 6. Dependencies
*   Existing *Attendance Module* (for days worked).
*   Existing *Leave Module* (for approved paid leaves vs LOP).
