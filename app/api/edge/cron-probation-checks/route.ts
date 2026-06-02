import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProbationEmployee {
  id: string;
  name: string;
  dateHired: string;
  position: string;
  department: string;
}

export async function POST(req: NextRequest) {
  try {
    const probationEmployees: ProbationEmployee[] = [
      { id: "EMP-2024-0005", name: "Rosa Fernandez", dateHired: "2024-11-01", position: "Sales Executive", department: "Sales & Marketing" },
      { id: "EMP-2024-0009", name: "Gabriel Aquino", dateHired: "2024-12-15", position: "UI/UX Designer", department: "Information Technology" }
    ];

    const today = new Date("2024-12-18"); // Simulated date for evaluation accuracy

    const analysis = probationEmployees.map(emp => {
      const hiredDate = new Date(emp.dateHired);
      const diffTime = Math.abs(today.getTime() - hiredDate.getTime());
      const daysLapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysRemaining = 180 - daysLapsed; // 6-month statutory limit (180 days)

      let actionRequired = "Monitor Performance";
      let priority = "Low";

      if (daysRemaining <= 30) {
        actionRequired = "Urgent: Complete Performance Appraishal and Regularization Evaluation";
        priority = "Critical";
      } else if (daysRemaining <= 60) {
        actionRequired = "Moderate: Setup Q3/Q4 Performance review process";
        priority = "Medium";
      }

      return {
        ...emp,
        daysLapsed,
        daysRemaining,
        statutoryLimit: "180 days (Article 282 Labor Code)",
        actionRequired,
        priority
      };
    });

    return NextResponse.json({
      success: true,
      jobName: "cron-probation-checks",
      scheduledTime: "00:00 AM PHT Weekly",
      executedAt: new Date().toISOString(),
      statuteEvaluated: "PH Labor Code Art. 282 (Probationary Employment)",
      totalAudited: probationEmployees.length,
      probationAlerts: analysis,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
