import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { emailType, recipientEmail, recipientName, details } = data;

    if (!recipientEmail || !recipientName || !emailType) {
      throw new Error("Missing recipient address, recipient name, or notification template type.");
    }

    let subject = "";
    let htmlContent = "";

    switch (emailType) {
      case "onboarding_welcome":
        subject = `Welcome to CorpHR Philippines, ${recipientName}! 🚀`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <p>Dear ${recipientName},</p>
            <p>Welcome to <strong>Acme Corporation Philippines</strong>! We are absolutely thrilled to have you onboard.</p>
            <p>As part of our employee lifecycle process, your digital 201 profile is now active on our <strong>CorpHR HRIS web app</strong>.</p>
            <p><strong>Next Steps for Onboarding check list:</strong></p>
            <ul>
              <li>Upload your SSS, PhilHealth, Pag-IBIG registration forms.</li>
              <li>Upload your latest valid BIR Form 2316 or NBI clearance.</li>
              <li>Coordinate with your onboarding buddy, ${details?.buddy || "Maria Santos"}.</li>
            </ul>
            <p>Your official date of hire is scheduled for: <strong>${details?.dateHired || "Immediate"}</strong></p>
            <p>Best Regards,<br/>CorpHR HR Onboarding Team</p>
          </div>
        `;
        break;

      case "payslip_release":
        subject = `Payslip release advisory for period ended ${details?.period || "Nov 30, 2024"}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <p>Dear ${recipientName},</p>
            <p>This is to advise you that your digital payslip for the pay period ended <strong>${details?.period}</strong> has been safely processed and is now available on the CorpHR portal.</p>
            <p><strong>Payroll Summary details:</strong></p>
            <ul>
              <li>Gross Pay: ₱${Number(details?.grossPay || 0).toLocaleString()}</li>
              <li>Total Deductions: ₱${Number(details?.totalDeductions || 0).toLocaleString()}</li>
              <li>Net Take Home Pay: <strong>₱${Number(details?.netPay || 0).toLocaleString()}</strong></li>
            </ul>
            <p>Your net pay will be credited directly to your BDO account ${details?.bankAccount || "ending in ****1234"}.</p>
            <p>Thank you for your dedicated service!<br/>CorpHR Payroll Team</p>
          </div>
        `;
        break;

      case "leave_approved":
        subject = `Approved: Leave Request [${details?.leaveId || "LR-123"}]`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
            <p>Dear ${recipientName},</p>
            <p>Your leave application for <strong>${details?.leaveType || "Vacation Leave"}</strong> from <strong>${details?.startDate}</strong> to <strong>${details?.endDate}</strong> (${details?.days} days) has been <strong>APPROVED</strong> by your manager.</p>
            <p>Enjoy your well-deserved break! We have updated your SSS/DOLE compliance and attendance roster accordingly.</p>
            <p>Best regards,<br/>CorpHR Leave Management System</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unsupported email notification type: ${emailType}`);
    }

    // Since we are simulating an edge function with Supabase or NodeMailer triggers,
    // we return successful mail dispatch metadata.
    return NextResponse.json({
      success: true,
      sender: "no-reply@corphr.ph",
      recipient: recipientEmail,
      subject,
      dispatchedAt: new Date().toISOString(),
      htmlContent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger email notification" },
      { status: 400 }
    );
  }
}
