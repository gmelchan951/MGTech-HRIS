"use client";

import { useState } from "react";
import { Play, Terminal, Cpu, Clock, CheckCircle, HelpCircle, FileText, Send, AlertCircle, ShieldAlert } from "lucide-react";

interface EdgeFunctionDef {
  id: string;
  name: string;
  endpoint: string;
  description: string;
  icon: string;
  method: "POST" | "GET";
  defaultBody: Record<string, any>;
}

const EDGE_FUNCTIONS: EdgeFunctionDef[] = [
  {
    id: "payroll-compute",
    name: "1. Payroll Compute Core",
    endpoint: "/api/edge/payroll-compute",
    description: "Computes base pay, statutory deductions (SSS, PhilHealth, Pag-IBIG), and BIR TRAIN Law withholding taxes.",
    icon: "💰",
    method: "POST",
    defaultBody: {
      monthlySalary: 45000,
      period: "semi-monthly",
      overtimeHours: 6,
      lateMinutes: 15,
      deMinimisAllowance: 1500
    }
  },
  {
    id: "payslip-pdf",
    name: "2. Payslip Ledger Generator",
    endpoint: "/api/edge/payslip-pdf",
    description: "Compiles employee earnings and computes a unique cryptographic security signature ledger.",
    icon: "📄",
    method: "POST",
    defaultBody: {
      employeeId: "EMP-2024-0002",
      employeeName: "Juan dela Cruz",
      department: "Information Technology",
      position: "Senior Developer",
      period: "Dec 1–15, 2024",
      payrollCompute: {
        basePay: 22500,
        grossPay: 23150,
        deMinimisAllowance: 1000,
        totalDeductions: 3850,
        netPay: 20300,
        withholdingTax: 2150,
        contributions: {
          sss: { ee: 675 },
          philHealth: { ee: 375 },
          pagIBIG: { ee: 100 }
        }
      }
    }
  },
  {
    id: "email-notifications",
    name: "3. Smart Dispatch Email Notify",
    endpoint: "/api/edge/email-notifications",
    description: "Dispatches automated email notifications for Onboarding, Payslip Release, and Leave Approvals.",
    icon: "✉️",
    method: "POST",
    defaultBody: {
      emailType: "onboarding_welcome",
      recipientEmail: "j.delacruz@corp.ph",
      recipientName: "Juan dela Cruz",
      details: {
        buddy: "Maria Santos",
        dateHired: "2024-12-16"
      }
    }
  },
  {
    id: "cron-attendance",
    name: "4. Cron: Daily Attendance Checks",
    endpoint: "/api/edge/cron-attendance-reminders",
    description: "Daily 8:05 AM cron job alert notifying unclocked active engineers to log their shift timecards.",
    icon: "⏱️",
    method: "POST",
    defaultBody: {
      triggerSource: "Netlify Cron Scheduler"
    }
  },
  {
    id: "cron-probation",
    name: "5. Cron: Article 282 Check",
    endpoint: "/api/edge/cron-probation-checks",
    description: "Weekly audit cron monitoring employee probation durations and regularization deadlines.",
    icon: "⚖️",
    method: "POST",
    defaultBody: {
      triggerSource: "Upstash Scheduler"
    }
  },
  {
    id: "cron-expiry",
    name: "6. Cron: Compliance Expire Check",
    endpoint: "/api/edge/cron-document-expiry",
    description: "Weekly scanning cron identifying expiring compliance clearances (e.g., NBI clearance, BIR info).",
    icon: "📅",
    method: "POST",
    defaultBody: {
      triggerSource: "Weekly Worker Roster"
    }
  },
  {
    id: "onboarding-checklist",
    name: "7. Lifecycles: Onboarding Check",
    endpoint: "/api/edge/onboarding-checklist",
    description: "Onboarding progress checker enforcing data privacy compliance checklist and asset logs.",
    icon: "🚀",
    method: "POST",
    defaultBody: {
      employeeId: "EMP-2024-0005",
      employeeName: "Rosa Fernandez",
      toggledTaskId: "OBT-004",
      currentProgress: 60
    }
  },
  {
    id: "performance-reviewer",
    name: "8. AI Q4 Review Evaluator",
    endpoint: "/api/edge/performance-reviewer",
    description: "Uses generative intelligence (Gemini 3.5 Flash) to securely analyze peer scores and provide SMART goals.",
    icon: "⭐",
    method: "POST",
    defaultBody: {
      employeeName: "Juan dela Cruz",
      position: "Senior Developer",
      department: "Information Technology",
      selfScore: 4,
      managerScore: 5,
      coreStrengths: "Exceptional architecture design, fast deliverables deployment",
      developmentAreas: "Delegate more routine maintenance tasks to junior support engineers"
    }
  },
  {
    id: "overtime-calculator",
    name: "9. PH Statutory Overtime Engine",
    endpoint: "/api/edge/overtime-calculator",
    description: "Applies exact PH Labor Code overtime and Night Differential (+10%) premiums to salary matrices.",
    icon: "🌙",
    method: "POST",
    defaultBody: {
      monthlySalary: 65000,
      regularOTHours: 8,
      restDayOTHours: 4,
      specialHolidayHours: 0,
      regularHolidayHours: 3,
      nightShiftHours: 5
    }
  }
];

export function EdgeControls() {
  const [selectedFunction, setSelectedFunction] = useState<EdgeFunctionDef>(EDGE_FUNCTIONS[0]);
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(EDGE_FUNCTIONS[0].defaultBody, null, 2)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responsePayload, setResponsePayload] = useState<any>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  const handleFunctionChange = (funcId: string) => {
    const fn = EDGE_FUNCTIONS.find(f => f.id === funcId);
    if (fn) {
      setSelectedFunction(fn);
      setRequestBody(JSON.stringify(fn.defaultBody, null, 2));
      setResponsePayload(null);
      setExecutionTime(null);
      setIsSuccess(null);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponsePayload(null);
    setExecutionTime(null);
    setIsSuccess(null);
    
    const startTime = performance.now();
    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (err) {
        throw new Error("Invalid request JSON configuration formatting");
      }

      const res = await fetch(selectedFunction.endpoint, {
        method: selectedFunction.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedBody),
      });

      const data = await res.json();
      const endTime = performance.now();
      
      setExecutionTime(Math.round(endTime - startTime));
      setResponsePayload(data);
      setIsSuccess(res.ok && data.success !== false);
    } catch (error: any) {
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setResponsePayload({ error: error.message || "Failed execution query" });
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Selector Side */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="text-amber-500 w-5 h-5 animate-pulse" />
          <h3 className="text-base font-bold text-gray-800">Netlify Production Edge Playground</h3>
        </div>
        <p className="text-gray-500 text-xs mb-6 leading-relaxed">
          Test any of the 9 statutory Edge Functions designed for Netlify hosting. These APIs execute instantly at edge database endpoints.
        </p>

        {/* Function selection tabs */}
        <div className="flex flex-col gap-2 mb-6 max-h-[300px] overflow-y-auto pr-1">
          {EDGE_FUNCTIONS.map(fn => {
            const isSelected = selectedFunction.id === fn.id;
            return (
              <button
                key={fn.id}
                onClick={() => handleFunctionChange(fn.id)}
                className={`flex items-start text-left p-3 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                <span className="text-lg mr-2 leading-none">{fn.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{fn.name}</div>
                  <div className={`text-[10px] mt-0.5 leading-snug truncate ${isSelected ? "text-gray-350" : "text-gray-400"}`}>
                    {fn.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Argument Inputs panel */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
              Execution Request (JSON)
            </label>
            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 font-bold px-2 py-0.5 rounded uppercase">
              {selectedFunction.method} Edge Endpoint
            </span>
          </div>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className="w-full h-44 p-3 bg-gray-900 text-green-400 font-mono text-xs rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#E8C96A] text-white font-bold py-2 px-4 rounded-lg text-xs mt-2 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4.5 h-4.5" />
            {isLoading ? "Executing Edge Handler..." : "Execute Edge Function / Sandbox Run"}
          </button>
        </div>
      </div>

      {/* Terminal Response Side */}
      <div className="flex flex-col bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-md text-white">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="text-green-500 w-5 h-5" />
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
              Live Output Terminal / Logs
            </h4>
          </div>
          <div className="flex items-center gap-3">
            {executionTime !== null && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {executionTime}ms
              </span>
            )}
            {isSuccess !== null && (
              <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-full flex items-center gap-1 ${
                isSuccess ? "bg-green-950 text-green-400 border border-green-800" : "bg-red-950 text-red-400 border border-red-800"
              }`}>
                {isSuccess ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isSuccess ? "200 SUCCESS" : "500 ERROR"}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[350px]">
          {responsePayload ? (
            <div className="flex-1 flex flex-col text-xs font-mono leading-relaxed bg-black/40 p-3 rounded border border-gray-800 max-h-[400px] overflow-auto select-text">
              <pre className="text-green-400 whitespace-pre-wrap">
                {JSON.stringify(responsePayload, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-500 py-12">
              <HelpCircle className="w-10 h-10 text-gray-700 mb-2" />
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Awaiting Execution
              </div>
              <p className="text-[11px] text-gray-600 mt-1 max-w-sm">
                Click &quot;Execute Edge Function&quot; to send a secure JSON payload block to the live Next.js endpoint.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>Worker: edge-handler@netlify</span>
          <span>Region: Manila (UTC+8)</span>
        </div>
      </div>
    </div>
  );
}
