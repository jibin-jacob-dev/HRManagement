using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HR.Core.Models.PayrollManagement
{
    public enum SalaryComponentType
    {
        Earning,
        Deduction
    }

    public class SalaryComponent
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public SalaryComponentType Type { get; set; }
        public bool IsTaxable { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
