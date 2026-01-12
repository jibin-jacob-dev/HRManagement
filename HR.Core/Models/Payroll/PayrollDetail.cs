using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models.PayrollManagement
{
    public class PayrollDetail
    {
        public int Id { get; set; }
        
        public int EmployeePayrollId { get; set; }
        [ForeignKey("EmployeePayrollId")]
        public virtual EmployeePayroll? EmployeePayroll { get; set; }

        public int SalaryComponentId { get; set; }
        [ForeignKey("SalaryComponentId")]
        public virtual SalaryComponent? SalaryComponent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
    }
}
