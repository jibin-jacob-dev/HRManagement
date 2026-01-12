using System;
using System.ComponentModel.DataAnnotations.Schema;
using HR.Core.Models;

namespace HR.Core.Models.PayrollManagement
{
    public class EmployeeSalaryStructure
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        [ForeignKey("EmployeeId")]
        public virtual Employee? Employee { get; set; }

        public int SalaryComponentId { get; set; }
        [ForeignKey("SalaryComponentId")]
        public virtual SalaryComponent? SalaryComponent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public DateTime EffectiveDate { get; set; }
    }
}
