using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using HR.Core.Models;

namespace HR.Core.Models.PayrollManagement
{
    public enum PaymentStatus
    {
        Pending,
        Paid
    }

    public class EmployeePayroll
    {
        public int Id { get; set; }
        
        public int PayrollRunId { get; set; }
        [ForeignKey("PayrollRunId")]
        public virtual PayrollRun? PayrollRun { get; set; }

        public int EmployeeId { get; set; }
        [ForeignKey("EmployeeId")]
        public virtual Employee? Employee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BasicSalary { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalEarnings { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDeductions { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetSalary { get; set; }

        public int DaysWorked { get; set; }
        public int LossOfPayDays { get; set; }
        
        public PaymentStatus PaymentStatus { get; set; }

        public virtual ICollection<PayrollDetail> PayrollDetails { get; set; }
    }
}
