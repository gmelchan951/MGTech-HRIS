import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ReviewRequest {
  employeeName: string;
  position: string;
  department: string;
  selfScore: number;
  managerScore: number;
  coreStrengths?: string;
  developmentAreas?: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: ReviewRequest = await req.json();
    const { employeeName, position, department, selfScore, managerScore, coreStrengths, developmentAreas } = data;

    if (!employeeName || !position) {
      throw new Error("Missing mandatory employee name or position for appraisal computation.");
    }

    const avgScore = (Number(selfScore || 3) + Number(managerScore || 3)) / 2;
    let appraisalRating = "Meets Expectations";
    let statusColor = "#3B82F6"; // Info Blue

    if (avgScore >= 4.5) {
      appraisalRating = "Outstanding Performer";
      statusColor = "#10B981"; // Success Green
    } else if (avgScore >= 4.0) {
      appraisalRating = "Exceeds Expectations";
      statusColor = "#10B981";
    } else if (avgScore >= 3.0) {
      appraisalRating = "Meets Expectations";
      statusColor = "#3B82F6";
    } else if (avgScore >= 2.0) {
      appraisalRating = "Needs Improvement";
      statusColor = "#F59E0B"; // Warning Orange
    } else {
      appraisalRating = "Unsatisfactory (Placement in PIP)";
      statusColor = "#EF4444"; // Danger Red
    }

    let aiGeneratedResponseText = "";
    let isAiProcessed = false;

    // Check if the server-only GEMINI_API_KEY is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const prompt = `
          You are a senior, highly objective, and constructive PH corporate HR specialist.
          Generate a formal Q4 Performance review reflection and developmental summary for:
          Employee Name: ${employeeName}
          Position: ${position} / ${department}
          Self Evaluation Score: ${selfScore}/5
          Manager Evaluation Score: ${managerScore}/5
          Computed Average Score: ${avgScore}/5
          Assigned Roster Rating Description: ${appraisalRating}
          Provided Core Strengths: ${coreStrengths || "Consistent output, strong work ethic, team collaboration"}
          Provided Development Areas: ${developmentAreas || "Improve communication loops on blockers, task organization"}

          Create a structured developmental coaching feedback card consisting of:
          1. Evaluation Narrative Synopsis (written in professional and encouraging tone).
          2. Three specific Actionable Goals (following the SMART framework, tailored for PH tech-enterprise context).
          
          Do not include markdown headers style that is too large, use bold text and sub-paragraphs. Keep response compact and concise.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        if (response.text) {
          aiGeneratedResponseText = response.text;
          isAiProcessed = true;
        }
      } catch (aiError: any) {
        // Fallback to rules-based summary if AI fails, logging error on server side
        console.error("AI Generation Error", aiError.message);
      }
    }

    // High quality rules-based fallback text
    if (!isAiProcessed) {
      aiGeneratedResponseText = `
**Evaluation Narrative Synopsis:**
Based on the combined scores of ${selfScore}/5 (Self) and ${managerScore}/5 (Manager), **${employeeName}** shows solid alignment in the position of **${position}**. They receive the rating of **${appraisalRating}**. Core strengths demonstrated include ${coreStrengths || "consistent technical execution, positive contributions to department workflows, and excellent collaboration with senior peers"}.

**Actionable SMART developmental goals:**
1. **Optimize Deliverable Estimation accuracy**: Focus on breaking down technical requirements to improve milestone predictability by 10% next quarter.
2. **Standardize Documentation updates**: Actively document system integrations or payroll policies to serve as onboarding training material for junior hires.
3. **Elevate cross-departmental alignment**: Participate or host bi-weekly alignment updates to reduce blocker response times across ${department}.
      `;
    }

    return NextResponse.json({
      success: true,
      appraisalRating,
      avgScore,
      statusColor,
      isAiProcessed,
      narrative: aiGeneratedResponseText.trim(),
      evaluationApproved: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
