import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OTRequest {
  monthlySalary: number;
  baseHourlyRate?: number;
  regularOTHours: number;
  restDayOTHours: number;
  specialHolidayHours: number;
  regularHolidayHours: number;
  nightShiftHours: number;
}

export async function POST(req: NextRequest) {
  try {
    const data: OTRequest = await req.json();
    const monthlySalary = Number(data.monthlySalary || 30000);
    
    // PH standard daily rate divisor is usually 22, 26, or 313 depending on policy.
    // Let's assume standard 22-day working month, 8 working hours per day.
    const computedHourlyRate = (monthlySalary / 22) / 8;
    const hourlyRate = Number(data.baseHourlyRate || computedHourlyRate);

    // Multipliers for Philippines Labor Standards
    // 1. Regular Day OT: hourly rate + 25% (x1.25)
    // 2. Scheduled Rest Day or Special Non-Working Holiday: hourly rate + 30% (x1.30)
    //    Work in excess of 8 hrs on rest day: +30% of rest day rate (1.30 * 1.30 = 1.69)
    // 3. Regular Holiday work: double pay (x2.00)
    //    Work in excess of 8 hrs on regular holiday: +30% of holiday rate (2.00 * 1.30 = 2.60)
    // 4. Night Differential: +10% of hourly rate for hours worked from 10:00 PM to 06:00 AM.
    
    const regularOTHours = Number(data.regularOTHours || 0);
    const restDayOTHours = Number(data.restDayOTHours || 0);
    const specialHolidayHours = Number(data.specialHolidayHours || 0);
    const regularHolidayHours = Number(data.regularHolidayHours || 0);
    const nightShiftHours = Number(data.nightShiftHours || 0);

    const regularOTAmount = regularOTHours * hourlyRate * 1.25;
    const restDayOTAmount = restDayOTHours * hourlyRate * 1.30;
    const specialHolidayAmount = specialHolidayHours * hourlyRate * 1.30;
    const regularHolidayAmount = regularHolidayHours * hourlyRate * 2.00;
    const nightDiffAmount = nightShiftHours * hourlyRate * 0.10; // Extra 10% premium

    const totalOTPay = regularOTAmount + restDayOTAmount + specialHolidayAmount + regularHolidayAmount + nightDiffAmount;

    return NextResponse.json({
      success: true,
      rates: {
        baseHourlyRate: Math.round(hourlyRate * 100) / 100,
        regularOTPerHour: Math.round((hourlyRate * 1.25) * 100) / 100,
        restDayOTPerHour: Math.round((hourlyRate * 1.30) * 100) / 100,
        specialHolidayPerHour: Math.round((hourlyRate * 1.30) * 100) / 100,
        regularHolidayPerHour: Math.round((hourlyRate * 2.00) * 100) / 100,
        nightDiffPerHour: Math.round((hourlyRate * 0.10) * 100) / 100,
      },
      breakdown: {
        regularOTPay: Math.round(regularOTAmount * 100) / 100,
        restDayOTPay: Math.round(restDayOTAmount * 100) / 100,
        specialHolidayPay: Math.round(specialHolidayAmount * 100) / 100,
        regularHolidayPay: Math.round(regularHolidayAmount * 100) / 100,
        nightDiffPay: Math.round(nightDiffAmount * 100) / 100,
      },
      aggregates: {
        totalHours: regularOTHours + restDayOTHours + specialHolidayHours + regularHolidayHours,
        totalOTPay: Math.round(totalOTPay * 100) / 100,
      },
      statutesMatched: {
        regularOT: "Art. 87 PH Labor Code (+25%)",
        restDayWork: "Art. 93 PH Labor Code (+30%)",
        regularHoliday: "Art. 94 PH Labor Code (+100%)",
        nightDiff: "Art. 86 PH Labor Code (+10%)",
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
