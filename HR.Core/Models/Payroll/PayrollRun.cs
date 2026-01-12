using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models.PayrollManagement
{
    public enum PayrollStatus
    {
        Draft,
        Finalized
    }

    public class PayrollRun
    {
        public int Id { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public DateTime ProcessedDate { get; set; }
        public PayrollStatus Status { get; set; } 
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPayout { get; set; }

        public virtual ICollection<EmployeePayroll> EmployeePayrolls { get; set; }
    }
}
