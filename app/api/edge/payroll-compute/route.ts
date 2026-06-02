import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SSS Premium Contribution rate: 4.5% for Employee up to max salary credit of 30,000 PHP (which is 1,350 PHP max employee contribution)
function calculateSSS(grossSalary: number): { ee: number; er: number } {
  const msc = Math.min(Math.max(grossSalary, 4000), 30000);
  const ee = msc * 0.045;
  const er = msc * 0.095;
  return { ee: Math.round(ee * 100) / 100, er: Math.round(er * 100) / 100 };
}

// PhilHealth premium rate: 5.0% of basic monthly salary (split 50-50 between employer and employee: 2.5% each)
// Floor is 10,000 PHP, Ceiling is 100,000 PHP
function calculatePhilHealth(monthlySalary: number): { ee: number; er: number } {
  const base = Math.min(Math.max(monthlySalary, 10000), 100000);
  const ee = base * 0.025;
  const er = base * 0.025;
  return { ee: Math.round(ee * 100) / 100, er: Math.round(er * 100) / 100 };
}

// Pag-IBIG Contribution premium: 2% of monthly salary (with maximum monthly salary base of 10,000 PHP beginning in 2024 = 200 PHP max employee contribution)
function calculatePagIBIG(monthlySalary: number): { ee: number; er: number } {
  const base = Math.min(monthlySalary, 10000);
  const ee = base * 0.02;
  const er = base * 0.02;
  return { ee: Math.round(ee * 100) / 100, er: Math.round(er * 100) / 100 };
}

// BIR TRAIN Law withholding tax rates for Semi-Monthly payroll frequency
function calculateWithholdingTax(taxableIncome: number): number {
  if (taxableIncome <= 10417) {
    return 0;
  } else if (taxableIncome <= 16667) {
    return (taxableIncome - 10417) * 0.15; // 2023 onwards adjusted tax rates
  } else if (taxableIncome <= 33333) {
    return 937.5 + (taxableIncome - 16667) * 0.20;
  } else if (taxableIncome <= 83333) {
    return 4270.83 + (taxableIncome - 33333) * 0.25;
  } else if (taxableIncome <= 333333) {
    return 16770.83 + (taxableIncome - 83333) * 0.30;
  } else {
    return 91770.83 + (taxableIncome - 333333) * 0.35;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const monthlySalary = Number(data.monthlySalary || 30000);
    const billingPeriod = data.period || "semi-monthly"; // semi-monthly vs monthly

    const basePay = billingPeriod === "semi-monthly" ? monthlySalary / 2 : monthlySalary;
    
    // Additions & Deductions
    const overtimeHours = Number(data.overtimeHours || 0);
    const hourlyRate = (monthlySalary / 22) / 8;
    const overtimePay = overtimeHours * hourlyRate * 1.25; // 125% regular overtime rate
    
    const lateMinutes = Number(data.lateMinutes || 0);
    const tardinessDeduction = (lateMinutes * (hourlyRate / 60));

    const deMinimisAllowance = Number(data.deMinimisAllowance || 1000); // Rice subsidy, etc (tax-exempt)
    
    const grossPay = basePay + overtimePay - tardinessDeduction;

    // Gov't contributions are usually deducted on a monthly cycle, or split over semi-monthly periods
    // For this compute, if semi-monthly we slice monthly contributions by half
    const sssFull = calculateSSS(monthlySalary);
    const phFull = calculatePhilHealth(monthlySalary);
    const hdmfFull = calculatePagIBIG(monthlySalary);

    const sssEE = billingPeriod === "semi-monthly" ? sssFull.ee / 2 : sssFull.ee;
    const sssER = billingPeriod === "semi-monthly" ? sssFull.er / 2 : sssFull.er;

    const phEE = billingPeriod === "semi-monthly" ? phFull.ee / 2 : phFull.ee;
    const phER = billingPeriod === "semi-monthly" ? phFull.er / 2 : phFull.er;

    const hdmfEE = billingPeriod === "semi-monthly" ? hdmfFull.ee / 2 : hdmfFull.ee;
    const hdmfER = billingPeriod === "semi-monthly" ? hdmfFull.er / 2 : hdmfFull.er;

    const govtDeductions = sssEE + phEE + hdmfEE;
    const taxableIncome = grossPay - govtDeductions;
    const withholdingTax = calculateWithholdingTax(taxableIncome);

    const totalDeductions = govtDeductions + withholdingTax;
    const netPay = grossPay + deMinimisAllowance - totalDeductions;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      computation: {
        monthlySalary,
        billingPeriod,
        basePay,
        overtimeHours,
        overtimePay: Math.round(overtimePay * 100) / 100,
        lateMinutes,
        tardinessDeduction: Math.round(tardinessDeduction * 100) / 100,
        deMinimisAllowance,
        grossPay: Math.round(grossPay * 100) / 100,
        contributions: {
          sss: { ee: sssEE, er: sssER },
          philHealth: { ee: phEE, er: phER },
          pagIBIG: { ee: hdmfEE, er: hdmfER },
          totalEE: Math.round(govtDeductions * 100) / 100
        },
        taxableIncome: Math.round(taxableIncome * 100) / 100,
        withholdingTax: Math.round(withholdingTax * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to compute payroll" },
      { status: 400 }
    );
  }
}
