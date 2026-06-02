import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OnboardingTask {
  id: string;
  item: string;
  category: "IT" | "HR" | "Compliance";
  mandatory: boolean;
  status: "Completed" | "Pending";
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { employeeId, employeeName, currentProgress, toggledTaskId } = data;

    if (!employeeId || !employeeName) {
      throw new Error("Missing employee identification metrics");
    }

    // Baseline onboarding tasks
    const tasks: OnboardingTask[] = [
      { id: "OBT-001", item: "Issue official CorpHR digital account credentials", category: "IT", mandatory: true, status: "Completed" },
      { id: "OBT-002", item: "SSS, PhilHealth, Pag-IBIG registration forms verification", category: "HR", mandatory: true, status: "Completed" },
      { id: "OBT-003", item: "Asset hand-over (Laptop, Security Key fob, Badge)", category: "IT", mandatory: true, status: "Completed" },
      { id: "OBT-004", item: "HR Policy, Code of Conduct & DATA PRIVACY briefing (compliance with Republic Act No. 10173)", category: "Compliance", mandatory: true, status: "Pending" },
      { id: "OBT-005", item: "First 30 days HR follow-up Survey", category: "HR", mandatory: false, status: "Pending" }
    ];

    // If a task is toggled in the request, we update its status
    let updatedTasks = [...tasks];
    if (toggledTaskId) {
      updatedTasks = tasks.map(t => {
        if (t.id === toggledTaskId) {
          return { ...t, status: t.status === "Completed" ? "Pending" : "Completed" };
        }
        return t;
      });
    }

    const completedMandatoryCount = updatedTasks.filter(t => t.status === "Completed").length;
    const progressPercent = Math.round((completedMandatoryCount / updatedTasks.length) * 100);

    return NextResponse.json({
      success: true,
      employeeId,
      employeeName,
      progressPercent,
      checklistComplete: progressPercent === 100,
      tasks: updatedTasks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
