import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ExpiringDocument {
  employeeId: string;
  employeeName: string;
  documentName: string;
  expiryDate: string;
}

export async function POST(req: NextRequest) {
  try {
    const documents: ExpiringDocument[] = [
      { employeeId: "EMP-2024-0006", employeeName: "Carlos Mendoza", documentName: "NBI Clearance", expiryDate: "2024-12-31" },
      { employeeId: "EMP-2024-0003", employeeName: "Ana Reyes", documentName: "BIR Form 2305 (Update Info)", expiryDate: "2024-12-15" },
      { employeeId: "EMP-2024-0001", employeeName: "Maria Santos", documentName: "First Aid Certificate", expiryDate: "2025-01-10" }
    ];

    const today = new Date("2024-12-14"); // Reference assessment point

    const results = documents.map(doc => {
      const expiry = new Date(doc.expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertStatus = "OK";
      if (daysRemaining <= 0) {
        alertStatus = "EXPIRED";
      } else if (daysRemaining <= 15) {
        alertStatus = "CRITICAL";
      } else if (daysRemaining <= 30) {
        alertStatus = "WARNING";
      }

      return {
        ...doc,
        daysRemaining,
        alertStatus,
        requiredAction: alertStatus !== "OK" ? `Ask employee to submission updated ${doc.documentName}` : "No immediate action"
      };
    });

    return NextResponse.json({
      success: true,
      jobName: "cron-document-expiry-scanning",
      scanningCycle: "01:00 AM PHT Weekly",
      executedAt: new Date().toISOString(),
      documentsScannedCount: 256,
      expiringDocumentsAlerts: results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
