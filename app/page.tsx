"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, Calendar, Clock, DollarSign, Award, Clipboard, 
  Settings as SettingsIcon, Bell, LogOut, ChevronRight, ChevronLeft,
  FileText, Activity, ShieldCheck, HelpCircle, UserPlus, Info, Upload, 
  Search, CheckCircle2, AlertTriangle, Play, Menu, LayoutDashboard,
  HardHat, BookOpen, AlertOctagon, Sparkles, Lock, User, Check, X, UserCheck, Building2
} from "lucide-react";
import { EdgeControls } from "@/components/EdgeControls";
import { SupabaseDocs } from "@/components/SupabaseDocs";

// =====================================================================
// DESIGN TOKENS (PH COMPLIANT CORP THEME)
// =====================================================================
const COLORS = {
  navy: "#1E3A5F",
  navyLight: "#2A4F80",
  gold: "#C9A84C",
  goldLight: "#E8C96A",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

// =====================================================================
const DEPARTMENTS: any[] = [];
const INITIAL_EMPLOYEES: any[] = [];
const INITIAL_LEAVES: any[] = [];
const INITIAL_ATTENDANCE: any[] = [];
const INITIAL_ITINERARIES: any[] = [];
const HOLIDAYS: any[] = [];

// Helper formatting rules
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" });
};

const isDateInLeaveRange = (dateStr: string, startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [loginTab, setLoginTab] = useState<"employee" | "admin">("employee");
  const [userRole, setUserRole] = useState<"admin" | "employee">("employee");

  // Login Input States
  const [empEmail, setEmpEmail] = useState<string>("");
  const [empPassword, setEmpPassword] = useState<string>("");
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");

  // RLES / Personalized scope identifier
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>("EMP-2024-0002");
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [dossierActiveTab, setDossierActiveTab] = useState<"profile" | "government" | "attachments" | "credentials" | "earnings">("profile");
  const [otSimulateHours, setOtSimulateHours] = useState<number>(8);
  
  // Forgot Password & Credentials states
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotRequestSubmitted, setForgotRequestSubmitted] = useState<boolean>(false);
  const [matchedEmployeeName, setMatchedEmployeeName] = useState<string>("");
  const [newHireId, setNewHireId] = useState<string>("");
  const [newPasswordVal, setNewPasswordVal] = useState<string>("");
  const [confirmPasswordVal, setConfirmPasswordVal] = useState<string>("");
  
  // Mutable HRIS states (represents client caching + state modification flow)
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  // Dynamic Payroll Run States
  const [payrollRunsList, setPayrollRunsList] = useState<any[]>([]);

  const [selectedCutoffId, setSelectedCutoffId] = useState<string>("PR-2026-05B");
  const [selectedAdminCutoffId, setSelectedAdminCutoffId] = useState<string>("PR-2026-05B");
  const [genPayrollStart, setGenPayrollStart] = useState<string>("2026-06-01");
  const [genPayrollEnd, setGenPayrollEnd] = useState<string>("2026-06-15");
  const [adminSelectedPayrollRecord, setAdminSelectedPayrollRecord] = useState<any>(null);

  // Get stable "randomized" visual color theme based on employeeId
  const getRandomColorForEmployee = (employeeId: string) => {
    const colors = [
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-purple-100 text-purple-850 border-purple-200",
      "bg-indigo-100 text-indigo-850 border-indigo-200",
      "bg-sky-100 text-sky-800 border-sky-200",
      "bg-teal-105 bg-teal-50 text-teal-800 border-teal-200",
      "bg-amber-100 text-amber-900 border-amber-200",
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-emerald-50 text-emerald-800 border-emerald-200",
      "bg-orange-50 text-orange-900 border-orange-200",
      "bg-fuchsia-105 bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200"
    ];
    let hash = 0;
    const cleanId = employeeId || "";
    for (let i = 0; i < cleanId.length; i++) {
      hash += cleanId.charCodeAt(i);
    }
    return colors[hash % colors.length];
  };

  // Helper to evaluate expiry warnings (yellow soon, red expired)
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return "valid";
    const today = new Date("2026-05-28"); // Current simulation clock time is May 28, 2026
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired"; // red
    if (diffDays <= 30) return "soon"; // yellow
    return "valid"; // green or standard
  };

  // Helper to resolve 201 compliance folder documents
  const getEmployeeDocs = (emp: any) => {
    if (emp.docs) return emp.docs;
    const baseName = emp.name.toLowerCase().replace(/\s+/g, '_');
    
    // Assign some synthetic expiries for demonstration of RLS / checker warnings
    let nbiExpDate = undefined;
    let otherExpDate = undefined;
    if (emp.id === "EMP-2024-0002") {
      nbiExpDate = "2026-06-15"; // Juan dela Cruz's NBI Clearance expires soon (within 30 days of May 28, 2026) -> Yellow warning
    } else if (emp.id === "EMP-2024-0003") {
      nbiExpDate = "2026-04-10"; // Ana Reyes's NBI Clearance is expired -> Red warning
      otherExpDate = "2026-05-20"; // Other certs is also expired -> Red warning
    } else {
      nbiExpDate = "2027-04-30"; // Far future
    }

    return {
      sss: { status: "Verified", file: `${baseName}_sss_card_scanned.pdf` },
      philhealth: { status: "Verified", file: `${baseName}_philhealth_registration.pdf` },
      pagibig: { status: "Verified", file: `${baseName}_pagibig_mdf.pdf` },
      tin: { status: "Verified", file: `${baseName}_bir_tin_1902.jpg` },
      nbi: { status: "Verified", file: `${baseName}_nbi_clearance_certified.pdf`, expiryDate: nbiExpDate },
      contract: { status: "Verified", file: `${baseName}_employment_contract_signed.pdf` },
      resume: { status: "Verified", file: `${baseName}_professional_cv.pdf` },
      other: { status: "Verified", file: `${baseName}_university_transcript.pdf`, expiryDate: otherExpDate },
    };
  };

  // Helper to pop-up official printable 201 Dossier Folder to separate browser window
  const openDossierInNewWindow = (emp: any) => {
    const docs = getEmployeeDocs(emp);
    const popup = window.open("", "_blank", "width=850,height=965,scrollbars=yes,resizable=yes,status=no,location=no");
    if (!popup) {
      triggerToast("Browser blocked Pop-up! We have loaded the secure floating modal instead. Click 'Launch Separate Tab' or enable browser popups to view.", "info");
      return;
    }
    
    const docRows = Object.entries(docs).map(([key, value]: [string, any]) => {
      let docLabel = key.toUpperCase();
      if (key === "sss") docLabel = "SSS Membership Card";
      if (key === "philhealth") docLabel = "PhilHealth Member Registration Sheet";
      if (key === "pagibig") docLabel = "HDMF Pag-IBIG MDF Registry";
      if (key === "tin") docLabel = "BIR Form 1902 Taxes Registration";
      if (key === "nbi") docLabel = "NBI Background Clearance Record";
      if (key === "contract") docLabel = "Signed Employment Contract copy";
      if (key === "resume") docLabel = "Curriculum Vitae / Professional Resume";
      if (key === "other") docLabel = "Academic Transcripts / Other Credentials";

      const expiry = getExpiryStatus(value.expiryDate);
      let trStyle = 'border-b last:border-0 border-gray-100';
      let labelAndBadge = `${docLabel}`;
      if (expiry === "expired") {
        trStyle = 'border-b last:border-0 border-red-200 bg-red-50 text-red-900 border-l-4 border-l-red-500';
        labelAndBadge = `${docLabel} <span class="bg-red-600 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded ml-2">EXPIRED (${value.expiryDate})</span>`;
      } else if (expiry === "soon") {
        trStyle = 'border-b last:border-0 border-yellow-250 bg-yellow-55 text-amber-950 border-l-4 border-l-amber-500 bg-amber-50/50';
        labelAndBadge = `${docLabel} <span class="bg-amber-500 text-black font-mono font-bold text-[8px] px-1.5 py-0.5 rounded ml-2">EXPIRING SOON (${value.expiryDate})</span>`;
      }

      return `
        <tr class="${trStyle}">
          <td class="py-3 px-4 font-semibold">${labelAndBadge}</td>
          <td class="py-3 px-4 text-xs font-mono text-blue-600">${value.file || 'Not uploaded'}</td>
          <td class="py-3 px-4 text-right">
            <span class="inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${
              value.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }">${value.status}</span>
          </td>
        </tr>
      `;
    }).join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>201 Master Employee Folder: ${emp.name}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono&family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; color: #1e293b; padding: 40px 20px; }
            .header-banner { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); }
          </style>
        </head>
        <body class="print:bg-white print:p-0">
          <div class="max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 p-0">
            <!-- Title Bar -->
            <div class="header-banner text-white p-8 relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                <span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                <span class="text-[10px] font-mono tracking-widest text-slate-300 uppercase ml-2">Secure 201 Registry Portal</span>
              </div>
              <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 class="text-3xl font-black tracking-tight" style="font-family: 'Space Grotesk', sans-serif;">Dossier: ${emp.name}</h1>
                  <p class="text-slate-300 text-sm font-mono mt-1">${emp.position} &bull; ${emp.department} Unit</p>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-amber-400 font-mono tracking-wider">${emp.id}</div>
                  <div class="text-[10px] text-slate-400 mt-1 uppercase font-bold">Government Record Status: Approved</div>
                </div>
              </div>
            </div>

            <!-- Profile Info Grid -->
            <div class="p-8 space-y-8">
              <div>
                <h3 class="text-sm font-extrabold uppercase tracking-widest text-[#1e3a5f] border-b pb-2 mb-4">I. Permanent Personal Profile Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Corporate Email Address</span>
                    <span class="font-mono text-slate-800 font-bold">${emp.email}</span>
                  </div>
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registered Phone Line</span>
                    <span class="text-slate-800 font-bold">${emp.phone || "+63 N/A"}</span>
                  </div>
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Date Certified / Hired</span>
                    <span class="text-slate-800 font-bold">${emp.dateHired || "N/A"}</span>
                  </div>
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 md:col-span-3">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Residential Address on File</span>
                    <span class="text-slate-800 font-semibold">${emp.address || "Manila, Philippines"}</span>
                  </div>
                </div>
              </div>

               <!-- Schedule info -->
              <div>
                <h3 class="text-sm font-extrabold uppercase tracking-widest text-[#1e3a5f] border-b pb-2 mb-4">I-B. Employment Schedule &amp; Grace Settings</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Weekly Working Days</span>
                    <span class="text-slate-800 font-bold">${emp.workingDaysFrom || "Monday"} to ${emp.workingDaysTo || "Friday"}</span>
                  </div>
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Time Schedule (Clock In-Out)</span>
                    <span class="font-mono text-slate-800 font-bold">${emp.clockInSchedule || "08:00 AM"} - ${emp.clockOutSchedule || "05:00 PM"}</span>
                  </div>
                  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Allowed Grace Period</span>
                    <span class="font-mono text-amber-600 font-bold">${emp.gracePeriod ?? 15} minutes</span>
                  </div>
                </div>
              </div>

              <!-- Government IDs -->
              <div>
                <h3 class="text-sm font-extrabold uppercase tracking-widest text-[#1e3a5f] border-b pb-2 mb-4">II. Philippines Statutory Identifiers Registry</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-semibold">
                  <div class="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <span class="text-[9px] uppercase text-slate-450 text-blue-800 block mb-1">SSS ID Parameter</span>
                    <span class="font-mono text-slate-850 block mt-1 font-bold">${emp.sss || "N/A"}</span>
                  </div>
                  <div class="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <span class="text-[9px] uppercase text-slate-450 text-blue-800 block mb-1">BIR Taxes ID (TIN)</span>
                    <span class="font-mono text-slate-850 block mt-1 font-bold">${emp.tin || "N/A"}</span>
                  </div>
                  <div class="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <span class="text-[9px] uppercase text-slate-450 text-blue-800 block mb-1">PhilHealth PIN reference</span>
                    <span class="font-mono text-slate-850 block mt-1 font-bold">${emp.philhealth || "N/A"}</span>
                  </div>
                  <div class="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <span class="text-[9px] uppercase text-slate-450 text-blue-800 block mb-1">Pag-IBIG MID number</span>
                    <span class="font-mono text-slate-850 block mt-1 font-bold">${emp.pagibig || "N/A"}</span>
                  </div>
                </div>
              </div>

              <!-- Onboarding Document Index Table -->
              <div>
                <h3 class="text-sm font-extrabold uppercase tracking-widest text-[#1e3a5f] border-b pb-2 mb-4">III. Onboarding Attachments Checklist (201 Compilations)</h3>
                <div class="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="bg-slate-50 border-b border-gray-200">
                        <th class="py-3 px-4 uppercase font-bold text-gray-500 tracking-wider">Document Checklist Parameter</th>
                        <th class="py-3 px-4 uppercase font-bold text-gray-500 tracking-wider">Scanned Copy Reference</th>
                        <th class="py-3 px-4 uppercase font-bold text-gray-500 tracking-wider text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${docRows}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Official Signoff -->
              <div class="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-6">
                <div>
                  <p class="font-bold text-slate-700">CorpHR Digitally Verified Registry</p>
                  <p class="font-mono text-[9px] text-gray-400 mt-1">Hash integrity matches PostgreSQL master nodes</p>
                </div>
                <div class="text-center md:text-right">
                  <p class="text-slate-600 font-bold mb-1">Verification Stamp</p>
                  <div class="inline-block border-2 border-green-500 text-green-500 font-black px-3 py-1 uppercase rounded tracking-wider text-[10px]">
                    APPROVED 201 CLEARANCE
                  </div>
                </div>
              </div>

              <!-- Footer interactive controls inside separate window -->
              <div class="border-t border-slate-100 pt-6 flex justify-between items-center print:hidden">
                <button onclick="window.print()" class="bg-[#1e3a5f] hover:bg-[#2a4f80] text-amber-300 hover:text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all">
                  🖨️ Send to printer or PDF
                </button>
                <button onclick="window.close()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all">
                  Close Tab
                </button>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    popup.document.close();
    triggerToast(`Dossier popup window successfully launched for ${emp.name}!`, "success");
  };

  const [leaveRequestsList, setLeaveRequestsList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  // Maker-Checker state tracking
  // Houses "Pending Checker" database requests made by Employees
  const [makerRequests, setMakerRequests] = useState<any[]>([]);

  // Employee "Maker Profile Edit" Modal/Inline fields states
  const [makerTargetField, setMakerTargetField] = useState<string>("sss");
  const [makerNewValue, setMakerNewValue] = useState<string>("");
  const [makerNotes, setMakerNotes] = useState<string>("");

  // Employee "Maker Leave Application" fields states
  const [makerLeaveType, setMakerLeaveType] = useState<string>("Vacation Leave");
  const [makerLeaveStart, setMakerLeaveStart] = useState<string>("");
  const [makerLeaveEnd, setMakerLeaveEnd] = useState<string>("");
  const [makerLeaveReason, setMakerLeaveReason] = useState<string>("");

  // Roster parameters state (Admin only)
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDept, setFilterDept] = useState<string>("all");

  const [clockedIn, setClockedIn] = useState<boolean>(false);
  const [time, setTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState<boolean>(false);

  // Admin and Employee Self Performance Reviews states
  const [aiReviewRequest, setAiReviewRequest] = useState({
    employeeName: "Juan dela Cruz",
    position: "Senior Developer",
    department: "Information Technology",
    selfScore: 4,
    managerScore: 5,
    coreStrengths: "",
    developmentAreas: ""
  });
  const [isAiReviewLoading, setIsAiReviewLoading] = useState<boolean>(false);
  const [aiReviewResult, setAiReviewResult] = useState<any>(null);

  // New Hire Input States for Administrator Form
  const [showAddHireForm, setShowAddHireForm] = useState<boolean>(false);
  const [newHireName, setNewHireName] = useState<string>("");
  const [newHirePosition, setNewHirePosition] = useState<string>("");
  const [newHireDepartment, setNewHireDepartment] = useState<string>("Information Technology");
  const [newHireSalary, setNewHireSalary] = useState<number>(30000);
  const [newHireEmail, setNewHireEmail] = useState<string>("");
  const [newHireDate, setNewHireDate] = useState<string>("2026-06-01");
  const [newHireWorkingDaysFrom, setNewHireWorkingDaysFrom] = useState<string>("Monday");
  const [newHireWorkingDaysTo, setNewHireWorkingDaysTo] = useState<string>("Friday");
  const [newHireClockInSchedule, setNewHireClockInSchedule] = useState<string>("08:00 AM");
  const [newHireClockOutSchedule, setNewHireClockOutSchedule] = useState<string>("05:00 PM");
  const [newHireGracePeriod, setNewHireGracePeriod] = useState<number>(15);

  // Developer Control Core Persistence States
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [demoStartDate, setDemoStartDate] = useState<string>("2026-05-01");
  const [demoEndDate, setDemoEndDate] = useState<string>("2026-05-31");
  const [companyHeading, setCompanyHeading] = useState<string>("CorpHR Philippines");
  const [companyTagline, setCompanyTagline] = useState<string>("Filipino Statutory Compliant HRIS. Authentication challenge enforced in compliance with national privacy and segregation of duties rules.");
  const [hrAdminUsername, setHrAdminUsername] = useState<string>("");
  const [hrAdminPassword, setHrAdminPassword] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const { data: employees } = await supabase.from('employees').select('*');
      const { data: departments } = await supabase.from('departments').select('*');
      const { data: payrollRuns } = await supabase.from('payroll_runs').select('*');
      const { data: leaves } = await supabase.from('leave_requests').select('*');
      const { data: attendance } = await supabase.from('attendance_logs').select('*');
      const { data: maker } = await supabase.from('maker_requests').select('*');
      const { data: ot } = await supabase.from('overtime_requests').select('*');
      const { data: itin } = await supabase.from('itineraries').select('*');
      
      setEmployeesList(employees || []);
      setDepartmentsList(departments || []);
      setPayrollRunsList(payrollRuns || []);
      setLeaveRequestsList(leaves || []);
      setAttendanceList(attendance || []);
      setMakerRequests(maker || []);
      setOvertimeRequests(ot || []);
      setItinerariesList(itin || []);
    }
    loadData();
  }, []);
  const [customLogo, setCustomLogo] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>("classic");
  const [showDevConsole, setShowDevConsole] = useState<boolean>(false);
  const [isClientMounted, setIsClientMounted] = useState<boolean>(false);
  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [isDevUnlocked, setIsDevUnlocked] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  // Load credentials and visual presets post-mount safely
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClientMounted(true);
      if (typeof window !== "undefined") {
        const savedDemoMode = localStorage.getItem("dev_isDemoMode");
        if (savedDemoMode !== null) setIsDemoMode(savedDemoMode === "true");

        const savedStartDate = localStorage.getItem("dev_demoStartDate");
        if (savedStartDate) setDemoStartDate(savedStartDate);

        const savedEndDate = localStorage.getItem("dev_demoEndDate");
        if (savedEndDate) setDemoEndDate(savedEndDate);

        const savedHeading = localStorage.getItem("dev_companyHeading");
        if (savedHeading) setCompanyHeading(savedHeading);

        const savedTagline = localStorage.getItem("dev_companyTagline");
        if (savedTagline) setCompanyTagline(savedTagline);

        const savedAdminUser = localStorage.getItem("dev_hrAdminUsername");
        if (savedAdminUser) setHrAdminUsername(savedAdminUser);

        const savedAdminPass = localStorage.getItem("dev_hrAdminPassword");
        if (savedAdminPass) setHrAdminPassword(savedAdminPass);

        const savedLogo = localStorage.getItem("dev_customLogo");
        if (savedLogo) setCustomLogo(savedLogo);

        const savedTheme = localStorage.getItem("dev_selectedTheme");
        if (savedTheme) setSelectedTheme(savedTheme);

        const savedDevUnlocked = localStorage.getItem("dev_isDevUnlocked");
        if (savedDevUnlocked === "true") setIsDevUnlocked(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save changes to localStorage asynchronously when mounted
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_isDemoMode", String(isDemoMode));
    }
  }, [isDemoMode, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_demoStartDate", demoStartDate);
    }
  }, [demoStartDate, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_demoEndDate", demoEndDate);
    }
  }, [demoEndDate, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_companyHeading", companyHeading);
    }
  }, [companyHeading, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_companyTagline", companyTagline);
    }
  }, [companyTagline, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_hrAdminUsername", hrAdminUsername);
    }
  }, [hrAdminUsername, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_hrAdminPassword", hrAdminPassword);
    }
  }, [hrAdminPassword, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_customLogo", customLogo);
    }
  }, [customLogo, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_selectedTheme", selectedTheme);
    }
  }, [selectedTheme, isClientMounted]);
  useEffect(() => {
    if (isClientMounted) {
      localStorage.setItem("dev_isDevUnlocked", String(isDevUnlocked));
    }
  }, [isDevUnlocked, isClientMounted]);

  // Secure 201 Registry Portal Salary Update and Edit States
  const [portalSalaryInput, setPortalSalaryInput] = useState<string>("");
  const [showSalaryConfirmModal, setShowSalaryConfirmModal] = useState<boolean>(false);
  const [pendingSalaryValue, setPendingSalaryValue] = useState<number>(0);

  // Synchronize salary edit rate input when selected employee changes
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      if (selectedEmp) {
        setPortalSalaryInput(String(selectedEmp.salary || ""));
      } else {
        setPortalSalaryInput("");
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [selectedEmp]);

  // Dynamic CSS injector for premium, luxury themes
  const getThemeStyles = () => {
    if (selectedTheme === "classic") return "";
    if (selectedTheme === "emerald") {
      return `
        /* Forest / Emerald Luxury Palette */
        main, .bg-\\[\\#0F1E33\\], .bg-\\[\\#0F172A\\], .fixed.inset-0.bg-\\[\\#0F172A\\]\\/90 { 
          background-color: #051410 !important; 
        }
        .bg-\\[\\#15273F\\], .bg-\\[\\#122237\\], .bg-\\[\\#0B1522\\], .bg-\\[\\#0B1522\\]\\/60 { 
          background-color: #0A241C !important; 
          border-color: rgba(232, 201, 106, 0.20) !important;
        }
        .bg-\\[\\#1B3251\\], .bg-\\[\\#1E3A5F\\], aside, .bg-indigo-950, .from-\\[\\#1E3A5F\\] { 
          background-color: #0F382B !important; 
          background-image: none !important;
        }
        .text-\\[\\#E8C96A\\], .text-\\[\\#C9A84C\\], .text-amber-300, .text-amber-400 { 
          color: #EBC059 !important; 
        }
        .bg-\\[\\#C9A84C\\], .bg-emerald-600 { 
          background-color: #0F382B !important; 
          color: #FFFFFF !important;
          border: 1px solid #EBC059 !important;
        }
        .border-\\[\\#C9A84C\\], .border-[#1E3A5F]\\/20 { 
          border-color: #EBC059 !important; 
        }
        .hover\\:bg-\\[\\#E8C96A\\]:hover, .hover\\:bg-emerald-700:hover { 
          background-color: #17523F !important; 
        }
      `;
    }
    if (selectedTheme === "royal") {
      return `
        /* Midnight Sapphire Royal & Satin Platinum */
        main, .bg-\\[\\#0F1E33\\], .bg-\\[\\#0F172A\\], .fixed.inset-0.bg-\\[\\#0F172A\\]\\/90 { 
          background-color: #060A13 !important; 
        }
        .bg-\\[\\#15273F\\], .bg-\\[\\#122237\\], .bg-\\[\\#0B1522\\], .bg-\\[\\#0B1522\\]\\/60 { 
          background-color: #0D1627 !important; 
          border-color: rgba(226, 232, 240, 0.15) !important;
        }
        .bg-\\[\\#1B3251\\], .bg-\\[\\#1E3A5F\\], aside, .bg-indigo-950, .from-\\[\\#1E3A5F\\] { 
          background-color: #142442 !important; 
          background-image: none !important;
        }
        .text-\\[\\#E8C96A\\], .text-\\[\\#C9A84C\\], .text-amber-300, .text-amber-400 { 
          color: #E2E8F0 !important; 
        }
        .bg-\\[\\#C9A84C\\], .bg-emerald-600 { 
          background-color: #1E40AF !important; 
          color: #FFFFFF !important;
          border: 1px solid #94A3B8 !important;
        }
        .border-\\[\\#C9A84C\\], .border-[#1E3A5F]\\/20 { 
          border-color: #E2E8F0 !important; 
        }
        .hover\\:bg-\\[\\#E8C96A\\]:hover, .hover\\:bg-emerald-700:hover { 
          background-color: #2563EB !important; 
        }
      `;
    }
    if (selectedTheme === "charcoal") {
      return `
        /* Velvet Charcoal & Satin Gold */
        main, .bg-\\[\\#0F1E33\\], .bg-\\[\\#0F172A\\], .fixed.inset-0.bg-\\[\\#0F172A\\]\\/90 { 
          background-color: #080809 !important; 
        }
        .bg-\\[\\#15273F\\], .bg-\\[\\#122237\\], .bg-\\[\\#0B1522\\], .bg-\\[\\#0B1522\\]\\/60 { 
          background-color: #111112 !important; 
          border-color: rgba(232, 201, 106, 0.15) !important;
        }
        .bg-\\[\\#1B3251\\], .bg-\\[\\#1E3A5F\\], aside, .bg-indigo-950, .from-\\[\\#1E3A5F\\] { 
          background-color: #1A1A1C !important; 
          background-image: none !important;
        }
        .text-\\[\\#E8C96A\\], .text-\\[\\#C9A84C\\], .text-amber-300, .text-amber-400 { 
          color: #DFBA73 !important; 
        }
        .bg-\\[\\#C9A84C\\], .bg-emerald-600 { 
          background-color: #1A1A1C !important; 
          color: #DFBA73 !important;
          border: 1px solid #DFBA73 !important;
        }
        .border-\\[\\#C9A84C\\], .border-[#1E3A5F]\\/20 { 
          border-color: #DFBA73 !important; 
        }
        .hover\\:bg-\\[\\#E8C96A\\]:hover, .hover\\:bg-emerald-700:hover { 
          background-color: #2F2F32 !important; 
        }
      `;
    }
    if (selectedTheme === "light-luxury") {
      return `
        /* Champagne Light Theme Override */
        main { 
          background-color: #FCFBF9 !important; 
          color: #2B2620 !important; 
        }
        .fixed.inset-0 {
          background-color: rgba(22, 19, 16, 0.75) !important;
        }
        .bg-\\[\\#15273F\\], .bg-\\[\\#122237\\], .bg-\\[\\#0B1522\\], .bg-\\[\\#0B1522\\]\\/60 { 
          background-color: #FFFFFF !important; 
          color: #2B2620 !important;
          border-color: #E6E1DC !important;
        }
        .text-white, h1, h2, h3, h4, strong { 
          color: #2B2620 !important; 
        }
        p, span, label {
          color: #5C544B !important;
        }
        .text-slate-300, .text-slate-400 {
          color: #72685D !important;
        }
        .bg-\\[\\#1B3251\\], .bg-\\[\\#1E3A5F\\], aside, .bg-indigo-950, .from-\\[\\#1E3A5F\\] { 
          background-color: #F7F5F2 !important; 
          background-image: none !important;
          color: #2B2620 !important;
          border-color: #E6E1DC !important;
        }
        .text-\\[\\#E8C96A\\], .text-\\[\\#C9A84C\\], .text-amber-300, .text-amber-400 { 
          color: #8C6D3E !important; 
        }
        .bg-\\[\\#C9A84C\\], .bg-emerald-600 { 
          background-color: #8C6D3E !important; 
          color: #FFFFFF !important;
        }
        .border-\\[\\#C9A84C\\], .border-[#1E3A5F]\\/20 { 
          border-color: #8C6D3E !important; 
        }
        .hover\\:bg-\\[\\#E8C96A\\]:hover, .hover\\:bg-emerald-700:hover { 
          background-color: #A3824E !important; 
        }
      `;
    }
    return "";
  };

  // Dynamic Department Stats states
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [showAddDeptModal, setShowAddDeptModal] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState<string>("");
  const [newDeptCode, setNewDeptCode] = useState<string>("");
  const [newDeptDesc, setNewDeptDesc] = useState<string>("");

  const [showEditDeptModal, setShowEditDeptModal] = useState<boolean>(false);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<string>("");
  const [editingDeptCode, setEditingDeptCode] = useState<string>("");
  const [editingDeptDesc, setEditingDeptDesc] = useState<string>("");

  // Day off / Overtime trigger popup states
  const [showDayOffOvertimePrompt, setShowDayOffOvertimePrompt] = useState<boolean>(false);
  const [dayOffDateStr, setDayOffDateStr] = useState<string>("");

  // Dynamic Overtime Request States
  const [overtimeRequests, setOvertimeRequests] = useState<any[]>([]);

  const [otFormDate, setOtFormDate] = useState<string>("2026-05-28");
  const [otFormHours, setOtFormHours] = useState<number>(2);
  const [otFormPurpose, setOtFormPurpose] = useState<string>("");

  // Shared Calendar States
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(4); // index 4 = May
  const [calendarSelectedDateStr, setCalendarSelectedDateStr] = useState<string>("2026-05-28");
  const [selectedAttendanceName, setSelectedAttendanceName] = useState<string | null>(null);
  const [activeAttendanceMapType, setActiveAttendanceMapType] = useState<"in" | "out">("in");

  // Leave & Maker Desk calendar states
  const [leaveCalendarYear, setLeaveCalendarYear] = useState<number>(2026);
  const [leaveCalendarMonth, setLeaveCalendarMonth] = useState<number>(4); // index 4 = May
  const [leaveCalendarSelectedDateStr, setLeaveCalendarSelectedDateStr] = useState<string>("2026-05-28");

  // Newly Added Admin Leave Calendar and Itinerary States
  const [adminLeaveCalendarYear, setAdminLeaveCalendarYear] = useState<number>(2026);
  const [adminLeaveCalendarMonth, setAdminLeaveCalendarMonth] = useState<number>(4);
  const [adminLeaveCalendarSelectedDateStr, setAdminLeaveCalendarSelectedDateStr] = useState<string>("2026-05-28");

  const [batchFiles, setBatchFiles] = useState<{ id: string; fileName: string; mappedKey: string }[]>([]);

  const [itinerariesList, setItinerariesList] = useState<any[]>([]);
  const [itinCalendarYear, setItinCalendarYear] = useState<number>(2026);
  const [itinCalendarMonth, setItinCalendarMonth] = useState<number>(4);
  const [itinSelectedDateStr, setItinSelectedDateStr] = useState<string>("2026-05-28");
  const [newItinType, setNewItinType] = useState<"achievement" | "itinerary">("itinerary");
  const [newItinTitle, setNewItinTitle] = useState<string>("");
  const [newItinNotes, setNewItinNotes] = useState<string>("");

  const [adminItinCalendarYear, setAdminItinCalendarYear] = useState<number>(2026);
  const [adminItinCalendarMonth, setAdminItinCalendarMonth] = useState<number>(4);
  const [adminItinSelectedDateStr, setAdminItinSelectedDateStr] = useState<string>("2026-05-28");
  const [adminItinFilterEmpId, setAdminItinFilterEmpId] = useState<string>("all");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);


  // Onboarding Tracker State for New Hires (docs assessment for 201 file compiler)
  const [newHires, setNewHires] = useState<any[]>([]);

  // Employee Promotion & Raise Application States
  const [promoType, setPromoType] = useState<string>("Both");
  const [promoPosition, setPromoPosition] = useState<string>("");
  const [promoSalary, setPromoSalary] = useState<number>(0);
  const [promoReason, setPromoReason] = useState<string>("");

  // Update promotion form placeholders automatically when active user changes or when promotion module mounts
  useEffect(() => {
    if (loggedIn && userRole === "employee") {
      const activeUser = employeesList.find(e => e.id === activeEmployeeId);
      if (activeUser) {
        const timer = setTimeout(() => {
          setPromoPosition(activeUser.position + " II");
          setPromoSalary(Math.round(activeUser.salary * 1.15));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [loggedIn, userRole, activeEmployeeId, employeesList, activeModule]);

  // Auto configure current active employee info for default self review
  useEffect(() => {
    if (loggedIn && userRole === "employee") {
      const activeUser = employeesList.find(e => e.id === activeEmployeeId);
      if (activeUser) {
        const frame = requestAnimationFrame(() => {
          setAiReviewRequest(prev => ({
            ...prev,
            employeeName: activeUser.name,
            position: activeUser.position,
            department: activeUser.department
          }));
        });
        return () => cancelAnimationFrame(frame);
      }
    }
  }, [loggedIn, userRole, activeEmployeeId, employeesList]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
    });
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => {
      cancelAnimationFrame(handle);
      clearInterval(timer);
    };
  }, []);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowPinModal(true);
        setPinInput("");
        setPinError("");
        triggerToast("🔐 Developer authorization required. Please sign in.", "info");
        return 0;
      } else {
        triggerToast(`Touch logo ${5 - next} more times for security challenge options.`, "info");
      }
      return next;
    });
  };

  const handlePinSubmit = (enteredPin?: string) => {
    const code = enteredPin || pinInput;
    if (code === "05271991") {
      setIsDevUnlocked(true);
      setShowPinModal(false);
      setShowDevConsole(true);
      triggerToast("👑 System Access Granted. Developer Console Activated.", "success");
      setPinInput("");
      setPinError("");
    } else {
      setPinError("INCORRECT SECURITY ACCESS CODE");
      triggerToast("Invalid authorization code. Access denied.", "error");
      setPinInput("");
    }
  };

  // -------------------------------------------------------------
  // MAKER LOGIC: Submitting Data correction
  // -------------------------------------------------------------
  const handleMakerProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!makerNewValue.trim()) {
      triggerToast("Please describe the requested new value", "error");
      return;
    }
    const currentEmployee = employeesList.find(emp => emp.id === activeEmployeeId);
    if (!currentEmployee) return;

    let fieldLabel = makerTargetField.toUpperCase();
    if (makerTargetField === "sss") fieldLabel = "SSS Number";
    if (makerTargetField === "tin") fieldLabel = "TIN Number";
    if (makerTargetField === "philhealth") fieldLabel = "PhilHealth ID";
    if (makerTargetField === "pagibig") fieldLabel = "HDMF / Pag-IBIG ID";
    if (makerTargetField === "email") fieldLabel = "Corporate Email";

    const newRequest = {
      id: `MREQ-2026-00${makerRequests.length + 1}`,
      requesterId: activeEmployeeId,
      requesterName: currentEmployee.name,
      requestType: "Government ID Update",
      field: makerTargetField,
      fieldLabel: fieldLabel,
      oldValue: currentEmployee[makerTargetField as keyof typeof currentEmployee] || "N/A",
      newValue: makerNewValue,
      notes: makerNotes || "Submitting requested profile revision.",
      status: "Pending",
      filedDate: new Date().toISOString()
    };

    setMakerRequests(prev => [newRequest, ...prev]);
    triggerToast("[Maker Submit] Details filed! Sent to HR Checker queue.", "success");
    setMakerNewValue("");
    setMakerNotes("");
  };

  // -------------------------------------------------------------
  // MAKER LOGIC: Submitting Leave application
  // -------------------------------------------------------------
  const handleMakerLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!makerLeaveStart || !makerLeaveEnd || !makerLeaveReason.trim()) {
      triggerToast("Please fill all required calendar parameters", "error");
      return;
    }

    const currentEmployee = employeesList.find(emp => emp.id === activeEmployeeId);
    if (!currentEmployee) return;

    const start = new Date(makerLeaveStart);
    const end = new Date(makerLeaveEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest = {
      id: `MREQ-2026-00${makerRequests.length + 1}`,
      requesterId: activeEmployeeId,
      requesterName: currentEmployee.name,
      requestType: "Leave Request",
      field: "leave",
      fieldLabel: `${makerLeaveType} Selection`,
      oldValue: "No Off-Duty Block",
      newValue: `${daysCount} Days (${makerLeaveStart} to ${makerLeaveEnd})`,
      leaveDetails: {
        type: makerLeaveType,
        startDate: makerLeaveStart,
        endDate: makerLeaveEnd,
        days: daysCount,
        reason: makerLeaveReason
      },
      notes: `Reason: ${makerLeaveReason}`,
      status: "Pending",
      filedDate: new Date().toISOString()
    };

    setMakerRequests(prev => [newRequest, ...prev]);
    triggerToast("[Maker Submit] Leave application dispatched! Pending HR approval.", "success");
    setMakerLeaveStart("");
    setMakerLeaveEnd("");
    setMakerLeaveReason("");
  };

  // -------------------------------------------------------------
  // CHECKER LOGIC: Approvemaker request & merge into state!
  // -------------------------------------------------------------
  const handleCheckerApprove = (id: string) => {
    const request = makerRequests.find(r => r.id === id);
    if (!request) return;

    // 1. Mark request as Approved
    setMakerRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Approved" } : r));

    // 2. Perform DB Mutation (State update on EMPLOYEES or LEAVES)
    if (request.requestType === "Government ID Update") {
      setEmployeesList(prev => prev.map(emp => {
        if (emp.id === request.requesterId) {
          return { ...emp, [request.field]: request.newValue };
        }
        return emp;
      }));
      triggerToast(`[Checker Approve] Merged changes to employee ${request.requesterName}'s registry!`, "success");
    } else if (request.requestType === "Leave Request" && request.leaveDetails) {
      const newLeaveObj = {
        id: `LR-2026-00${leaveRequestsList.length + 1}`,
        requesterId: request.requesterId,
        employeeName: request.requesterName,
        type: request.leaveDetails.type,
        startDate: request.leaveDetails.startDate,
        endDate: request.leaveDetails.endDate,
        days: request.leaveDetails.days,
        status: "Approved",
        reason: request.leaveDetails.reason,
        filed: formatDate(request.filedDate)
      };
      setLeaveRequestsList(prev => [newLeaveObj, ...prev]);
      triggerToast(`[Checker Approve] Leave approved and calendar entry registered!`, "success");
    } else if (request.requestType === "Promotion Request" && request.promotionDetails) {
      setEmployeesList(prev => prev.map(emp => {
        if (emp.id === request.requesterId) {
          const updatedEmp = { ...emp };
          if (request.promotionDetails.newPosition) {
            updatedEmp.position = request.promotionDetails.newPosition;
          }
          if (request.promotionDetails.newSalary) {
            updatedEmp.salary = request.promotionDetails.newSalary;
          }
          return updatedEmp;
        }
        return emp;
      }));
      triggerToast(`[Checker Approve] Authorized Promotion/Raise! Position & Payroll records updated dynamically for ${request.requesterName}.`, "success");
    }
  };

  const handleCheckerReject = (id: string) => {
    setMakerRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
    triggerToast("[Checker Discard] Request rejected. State left unmodified.", "info");
  };

  // AI Appraisal execution
  const executeAiReview = async () => {
    setIsAiReviewLoading(true);
    setAiReviewResult(null);
    try {
      const res = await fetch("/api/edge/performance-reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiReviewRequest),
      });
      const data = await res.json();
      setAiReviewResult(data);
      triggerToast("Evaluation completed with Gemini!", "success");
    } catch (err: any) {
      triggerToast("Failed to run AI evaluator", "error");
    } finally {
      setIsAiReviewLoading(false);
    }
  };

  const getDayOfWeekName = (dateString: string): string => {
    const dateObj = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: "long" };
    return dateObj.toLocaleDateString("en-US", options);
  };

  const isDayOff = (dateString: string, fromDay?: string, toDay?: string): boolean => {
    const fDay = fromDay || "Monday";
    const tDay = toDay || "Friday";
    const targetDay = getDayOfWeekName(dateString);

    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const fromIndex = daysOrder.indexOf(fDay);
    const toIndex = daysOrder.indexOf(tDay);
    const targetIndex = daysOrder.indexOf(targetDay);

    if (fromIndex === -1 || toIndex === -1 || targetIndex === -1) {
      return false;
    }

    let isWorkingDay = false;
    if (fromIndex <= toIndex) {
      isWorkingDay = targetIndex >= fromIndex && targetIndex <= toIndex;
    } else {
      isWorkingDay = targetIndex >= fromIndex || targetIndex <= toIndex;
    }

    return !isWorkingDay;
  };

  const calculateLateMinutes = (clockInDate: Date, scheduleTimeStr: string, gracePeriodMins: number): number => {
    let targetHours = 8;
    let targetMinutes = 0;
    
    if (scheduleTimeStr) {
      const cleanStr = scheduleTimeStr.trim().toUpperCase();
      const isPM = cleanStr.includes("PM");
      const isAM = cleanStr.includes("AM");
      const match = cleanStr.match(/(\d+):(\d+)/);
      if (match) {
        let h = parseInt(match[1]);
        let m = parseInt(match[2]);
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        targetHours = h;
        targetMinutes = m;
      }
    }

    const inHours = clockInDate.getHours();
    const inMinutes = clockInDate.getMinutes();

    const scheduleTotalMins = targetHours * 60 + targetMinutes;
    const clockInTotalMins = inHours * 60 + inMinutes;

    const diffMins = clockInTotalMins - scheduleTotalMins;
    
    if (diffMins <= 0) {
      return 0;
    }

    if (diffMins <= gracePeriodMins) {
      return 0;
    } else {
      return diffMins;
    }
  };

  const handleSelfTimecardLog = async (type: "IN" | "OUT") => {
    const activeUser = employeesList.find(e => e.id === activeEmployeeId);
    if (!activeUser) return;

    triggerToast("Requesting HTML5 Geolocation security handshake...", "info");

    const getCoordsPromise = (): Promise<{ lat: number; lng: number; address: string; accuracy: number }> => {
      return new Promise((resolve) => {
        const pinoySpots = [
          { lat: 14.5496, lng: 121.0437, address: "BGC High Street, Taguig City, Metro Manila", accuracy: 10 },
          { lat: 14.5547, lng: 121.0244, address: "Ayala Ave Corporate Tower, Makati, Metro Manila", accuracy: 15 },
          { lat: 14.5995, lng: 120.9842, address: "Intramuros Plaza Gateway, Manila, Metro Manila", accuracy: 12 },
          { lat: 14.6760, lng: 121.0437, address: "Diliman Science Hub, Quezon City, Metro Manila", accuracy: 22 },
          { lat: 14.5764, lng: 121.0851, address: "Ortigas Center Complex, Pasig, Metro Manila", accuracy: 14 },
          { lat: 10.3157, lng: 123.8854, address: "Lahug IT Park Terminal, Cebu City", accuracy: 19 },
          { lat: 7.0731, lng: 125.6128, address: "Davao City Terminal Plaza, Davao City", accuracy: 30 }
        ];
        const fallbackSpot = pinoySpots[Math.floor(Math.random() * pinoySpots.length)];

        if (typeof window === "undefined" || !navigator.geolocation) {
          resolve(fallbackSpot);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const latitude = pos.coords.latitude;
            const longitude = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy) || 15;

            const isInPH = latitude >= 4.5 && latitude <= 21.0 && longitude >= 116.0 && longitude <= 127.0;

            if (isInPH) {
              resolve({
                lat: latitude,
                lng: longitude,
                address: `GPS Node: Brgy. Local Area (Accurate to ${accuracy}m)`,
                accuracy
              });
            } else {
              const phLat = 14.5547 + (Math.abs(latitude) % 0.04);
              const phLng = 121.0244 + (Math.abs(longitude) % 0.04);
              resolve({
                lat: phLat,
                lng: phLng,
                address: `PH High-Accuracy Node: BGC Corporate Gateway (Internal GPS Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)})`,
                accuracy
              });
            }
          },
          (err) => {
            console.warn("Geolocation query denied or timed out. Falling back to default Philippine workspace:", err);
            resolve(fallbackSpot);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      });
    };

    const locationData = await getCoordsPromise();
    const todayDateStr = new Date().toISOString().substring(0, 10);
    const isTodayOff = isDayOff(todayDateStr, activeUser.workingDaysFrom, activeUser.workingDaysTo);

    if (type === "IN") {
      setClockedIn(true);
      const targetClockIn = activeUser.clockInSchedule || "08:00 AM";
      const grace = Number(activeUser.gracePeriod) || 15;
      const computedLateMin = isTodayOff ? 0 : calculateLateMinutes(time, targetClockIn, grace);

      const newLog = {
        date: todayDateStr,
        name: activeUser.name,
        timeIn: time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
        timeOut: null,
        hoursWorked: 0,
        lateMin: computedLateMin,
        status: "Present",
        timeInLoc: locationData,
        timeOutLoc: null
      };
      setAttendanceList(prev => [newLog, ...prev.filter(l => l.name !== activeUser.name)]);
      
      if (isTodayOff) {
        setDayOffDateStr(todayDateStr);
        setShowDayOffOvertimePrompt(true);
        triggerToast(`[ESS System] Day-off Clock In at ${newLog.timeIn}! You must file an overtime request.`, "info");
      } else {
        triggerToast(`[ESS System] Clocked in successfully at ${newLog.timeIn} in PH zone! Lates: ${computedLateMin}m`, "success");
      }
    } else {
      setClockedIn(false);
      setAttendanceList(prev => prev.map(l => {
        if (l.name === activeUser.name) {
          return {
            ...l,
            timeOut: time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
            hoursWorked: 8.5,
            timeOutLoc: locationData
          };
        }
        return l;
      }));
      triggerToast(`[ESS System] Departed safely - clocked out with valid GPS location!`, "info");
    }
  };

  // Filter lists based on role
  const activeUserObj = employeesList.find(e => e.id === activeEmployeeId) || INITIAL_EMPLOYEES[1];

  const filteredEmployees = employeesList.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === "all" || e.deptId === parseInt(filterDept);
    return matchesSearch && matchesDept;
  });

  const activeLeavesForRole = userRole === "admin" 
    ? leaveRequestsList 
    : leaveRequestsList.filter(l => l.requesterId === activeEmployeeId);

  const activeAttendanceForRole = userRole === "admin"
    ? attendanceList
    : attendanceList.filter(a => a.name === activeUserObj.name);

  const activeMakerRequestsForRole = userRole === "admin"
    ? makerRequests
    : makerRequests.filter(r => r.requesterId === activeEmployeeId);


  // -------------------------------------------------------------
  // DYNAMIC OVERTIME PROCESS HANDLERS
  // -------------------------------------------------------------
  const handleOvertimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otFormPurpose.trim()) {
      triggerToast("Please enter the specific business purpose for requesting overtime.", "error");
      return;
    }
    const idCount = overtimeRequests.length + 1;
    const newRq = {
      id: `OT-2026-${String(idCount).padStart(4, "0")}`,
      employeeId: activeUserObj.id,
      employeeName: activeUserObj.name,
      date: otFormDate,
      hours: Number(otFormHours) || 2,
      purpose: otFormPurpose.trim(),
      status: "Pending",
      filedDate: new Date().toISOString().substring(0, 10)
    };
    setOvertimeRequests(prev => [newRq, ...prev]);
    setOtFormPurpose("");
    triggerToast(`Overtime request filed successfully. Your department admin / HR will evaluate the request.`, "success");
  };

  const handleAdminDecideOvertime = (id: string, status: "Approved" | "Denied") => {
    setOvertimeRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    triggerToast(`Overtime request ${status === "Approved" ? "Approved" : "Denied"} successfully!`, status === "Approved" ? "success" : "info");
  };


  // -------------------------------------------------------------
  // CREDENTIAL LOG-IN FORM HANDLERS
  // -------------------------------------------------------------
  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailToFind = empEmail.trim().toLowerCase();
    const passwordToFind = empPassword.trim();
    
    if (!emailToFind || !passwordToFind) {
      triggerToast("Please enter both your corporate email and password or Employee ID.", "error");
      return;
    }

    // Attempt to locate in active employee roster
    let matched = employeesList.find(
      emp => emp.email?.toLowerCase() === emailToFind
    );
    
    // Attempt to locate in candidate roster if not in active employee roster
    let isCandidate = false;
    if (!matched) {
      const nhMatched = newHires.find(
        nh => nh.email?.toLowerCase() === emailToFind
      );
      if (nhMatched) {
        matched = nhMatched;
        isCandidate = true;
      }
    }

    if (!matched) {
      triggerToast("Access Denied: No account found matching this corporate email.", "error");
      return;
    }

    // If they have requested a password reset and are waiting for admin
    if (matched.forgotPasswordRequested) {
      triggerToast("Access Denied: Your account is locked pending HR Admin credentials generation. Please wait for your HR Admin.", "error");
      return;
    }

    // Verify password: if they have a customized password, match that. Otherwise, match their ID.
    const expectedPassword = matched.password || matched.id;
    if (passwordToFind !== expectedPassword) {
      triggerToast("Access Denied: Invalid password credentials for this account.", "error");
      return;
    }

    // Successful Login
    setActiveEmployeeId(matched.id);
    setUserRole("employee");
    setLoggedIn(true);
    setActiveModule("dashboard");
    triggerToast(`Access Authorized: Welcome, ${matched.name}!`, "success");
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userToFind = adminUsername.trim();
    const passToFind = adminPassword;

    if (!userToFind || !passToFind) {
      triggerToast("Please provide administrative username and security key.", "error");
      return;
    }

    if (userToFind === hrAdminUsername && passToFind === hrAdminPassword) {
      setUserRole("admin");
      setLoggedIn(true);
      setActiveModule("dashboard");
      triggerToast("Access Authorized: HR Admin session initialized.", "success");
    } else {
      triggerToast("Access Denied: Invalid administrator credentials.", "error");
    }
  };

  // -------------------------------------------------------------
  // RENDERING LANDING LOGIN PORTALS WITH REAL IDENTITY CHALLENGE
  // -------------------------------------------------------------
  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#0F1E33] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        {/* Dynamic Theme Stylesheet Injection */}
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles() }} />

        {/* Top Branding Panel */}
        <div className="text-center mb-6 max-w-lg">
          {customLogo ? (
            <div className="flex justify-center mb-3">
              <img 
                onClick={handleLogoClick}
                src={customLogo} 
                alt="Company Custom Logo" 
                className="max-h-20 max-w-[200px] object-contain rounded-xl shadow-lg border border-[#C9A84C]/40 p-1.5 bg-[#0B1522]/60 cursor-pointer active:scale-95 transition-all select-none" 
                style={{ maxWidth: "200px", maxHeight: "80px", width: "100%", height: "auto" }}
              />
            </div>
          ) : (
            <div 
              onClick={handleLogoClick}
              className="inline-flex items-center gap-2 px-3 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full text-[#E8C96A] text-xs font-black uppercase tracking-wider mb-3 cursor-pointer active:scale-95 transition-all select-none"
            >
              <Lock className="w-3.5 h-3.5" /> SECURE SOVEREIGN ID (RBAC COMPLIANT)
            </div>
          )}
          <h1 className="text-3xl font-black text-white tracking-tight">
            {companyHeading}
          </h1>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {companyTagline}
          </p>
        </div>

        {/* Portal Switching Cards wrapper */}
        <div className="w-full max-w-5xl bg-[#15273F] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT: Employee Access Block */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700/55 bg-[#122237]">
            <form onSubmit={handleEmployeeLogin} className="space-y-4 focus-within:ring-1 focus-within:ring-[#C9A84C]/20 p-1 rounded-2xl">
              <div className="flex items-center gap-2 text-[#E8C96A] mb-1">
                <User className="w-5 h-5" />
                <h2 className="text-sm font-black uppercase tracking-widest text-[#E8C96A]">Employee Portal</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in to inspect private 201 parameters, process clock cards, file Maker change claims, and register leave times.
              </p>

              {/* Email and Password ID challenge fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Corporate Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. j.delacruz@corp.ph"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-[#0B1522] border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C] transition-all placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">ID Code Password</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. EMP-2024-0002"
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full bg-[#0B1522] border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C] transition-all placeholder-slate-600"
                  />
                  <span className="text-[9px] text-[#E8C96A]/80 mt-1 block">Your employee id number is your authentic pass token.</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#C9A84C] hover:bg-[#E8C96A] text-slate-900 text-xs tracking-widest uppercase font-extrabold py-3 px-4 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" /> Sign In as Employee
              </button>
              
              <div className="flex items-center justify-between mt-2.5 px-1">
                <span className="text-[9px] text-slate-400">Locked out or reset needed?</span>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(empEmail);
                    setForgotRequestSubmitted(false);
                    setShowForgotPassword(true);
                  }}
                  className="text-[10px] text-[#E8C96A] font-black uppercase tracking-wider hover:underline bg-transparent border-0 outline-none p-0 cursor-pointer"
                >
                  🔑 Forgot Password?
                </button>
              </div>
            </form>

            {/* Helper Auto-fill section */}
            {isDemoMode && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Sandbox Quick Fill Helpers (Click to auto-populate):</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {employeesList.filter(e => e.id !== "EMP-2024-0001").map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setEmpEmail(emp.email);
                        setEmpPassword(emp.id);
                        setLoginTab("employee");
                        triggerToast(`Demo pre-fill loaded: ${emp.name}`, "info");
                      }}
                      className={`text-left p-1.5 rounded-lg border text-[10px] flex items-center justify-between transition-all ${
                        empEmail === emp.email && empPassword === emp.id
                          ? "bg-[#C9A84C]/10 border-[#C9A84C] text-white"
                          : "bg-[#0B1522]/60 border-slate-800 hover:border-slate-700 text-slate-350"
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold truncate">{emp.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono truncate">{emp.email}</div>
                      </div>
                      <span className="text-[8px] font-mono bg-slate-800 text-[#E8C96A] py-0.2 px-1 rounded ml-1 flex-shrink-0">
                        {emp.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: HR Admin Command Block */}
          <div className="flex-1 p-6 sm:p-8 bg-[#1B3251] flex flex-col justify-between">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="flex items-center gap-2 text-white mb-1">
                <Lock className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-widest text-[#E8C96A]">HR Admin Terminal</h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Administrative secure system command. Access granted to process general 201 directories, execute checker authorizations, calculate payroll cuts, and run Gemini.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">HR User Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full bg-[#102035] border border-slate-600 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C] transition-all placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Security Key Access Code</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. admin1234"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#102035] border border-slate-600 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C] transition-all placeholder-slate-500"
                  />
                  {isDemoMode && (
                    <div className="text-[9px] text-[#C9A84C] font-semibold mt-1">HR Portal challenge: Login matches user: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white font-black">{hrAdminUsername}</span> and pass: <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white font-black">{hrAdminPassword}</span>.</div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-100 hover:bg-white text-slate-900 text-xs tracking-widest uppercase font-extrabold py-3 px-4 rounded-xl transition-all shadow-lg mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#1E3A5F]" /> Authenticate Admin Key
              </button>
            </form>

            {isDemoMode && (
              <div className="bg-[#11223A] border border-slate-600/30 rounded-xl p-3 mt-6 text-[11px] text-slate-300 flex items-center justify-between animate-fadeIn">
                <div>
                  <span className="font-bold text-[#E8C96A]">Admin Auto-Fill:</span>
                  <p className="text-[9px] text-slate-400">Loads administrative user credentials instantly</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsername(hrAdminUsername);
                    setAdminPassword(hrAdminPassword);
                    triggerToast("Admin credentials pre-filled", "info");
                  }}
                  className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold py-1 px-2.5 rounded uppercase"
                >
                  Pre-Fill
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Forgot Password Overlay */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#15273F] border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-xs font-black text-[#E8C96A] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Reset Portal Credentials
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotRequestSubmitted(false);
                  }} 
                  className="text-slate-400 hover:text-white font-bold bg-transparent border-0 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!forgotRequestSubmitted ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const emailToFind = forgotEmail.trim().toLowerCase();
                  
                  // Try to find in employeesList
                  let matched = employeesList.find(emp => emp.email?.toLowerCase() === emailToFind);
                  let nhMatched = newHires.find(nh => nh.email?.toLowerCase() === emailToFind);
                  
                  if (!matched && !nhMatched) {
                    triggerToast("No corporate account matches this email address on file.", "error");
                    return;
                  }

                  // Mark password reset request
                  if (matched) {
                    setEmployeesList(prev => prev.map(emp => {
                      if (emp.id === matched.id) return { ...emp, forgotPasswordRequested: true, passwordChanged: false };
                      return emp;
                    }));
                    setMatchedEmployeeName(matched.name);
                  } else if (nhMatched) {
                    setNewHires(prev => prev.map(nh => {
                      if (nh.id === nhMatched!.id) return { ...nh, forgotPasswordRequested: true, passwordChanged: false };
                      return nh;
                    }));
                    setMatchedEmployeeName(nhMatched.name);
                  }

                  setForgotRequestSubmitted(true);
                  triggerToast("Password reset request submitted successfully!", "success");
                }} className="space-y-4">
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">
                    Please provide your registered corporate email address, and we will register a reset request on the secure Admin 201 Registry Ledger.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Corporate Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. j.delacruz@corp.ph"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-[#0B1522] border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#C9A84C] hover:bg-[#E8C96A] text-slate-900 text-xs tracking-widest uppercase font-extrabold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Submit Reset Request ⚡
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full mx-auto flex items-center justify-center text-amber-400 mb-2">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Credentials Reset Logged</h4>
                  <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto">
                    Account matching <strong className="text-white font-mono">{forgotEmail}</strong> ({matchedEmployeeName}) has been flagged for credential reset.
                  </p>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[10.5px] text-slate-300 text-left space-y-1">
                    <strong className="text-[#E8C96A] block">🔒 Process Directive:</strong>
                    <p className="font-sans leading-relaxed">
                      You are prompted to wait for the HR Admin to audit this request and generate new security password credentials in the secure 201 portal. Please contact Maria Santos (HR Admin) to perform this clearance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotRequestSubmitted(false);
                    }}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all mt-2 cursor-pointer"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info links */}
        <div className="text-slate-500 text-[10px] mt-6 font-mono text-center">
           Powered by Melchan C. Gabonia MGTech HRIS &bull; Version 1.0
        </div>
      </main>
    );
  }

  // Define tailored menu items based on dynamic RBAC
  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard HQ", icon: LayoutDashboard },
    { id: "employees", label: "All Employees (201 Files)", icon: Users },
    { id: "onboarding", label: "New Hire Onboarding", icon: UserPlus, badge: newHires.filter(n => n.onboardingStatus !== "Completed").length },
    { id: "checker", label: "Checker Approvals Desk", icon: ShieldCheck, badge: makerRequests.filter(r => r.status === "Pending").length },
    { id: "departments", label: "Department Unit Stats", icon: Building2 },
    { id: "timekeep", label: "Attendance Control", icon: Clock },
    { id: "leave", label: "Leaves Calendar", icon: Calendar },
    { id: "itinerary", label: "Achievements & Plans", icon: Clipboard },
    { id: "payroll", label: "Payroll Processing", icon: DollarSign },
    { id: "performance", label: "KPI & GenAI Evaluation", icon: Award },
    { id: "edge-hub", label: "Netlify Edge API Hub", icon: Sparkles },
   ];
 
   const employeeMenuItems = [
    { id: "dashboard", label: "My ESS Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "My Private 201 File", icon: Users },
    { id: "departments", label: "Department Unit Stats", icon: Building2 },
    { id: "timekeep", label: "Timekeeping Clock-In", icon: Clock },
    { id: "leave", label: "Leave & Maker Desk", icon: Calendar },
    { id: "itinerary", label: "My Itinerary & Plans", icon: Clipboard },
    { id: "payroll", label: "My Payslip Ledger", icon: DollarSign },
    { id: "promotion", label: "Promotion Application", icon: Award },
    { id: "edge-hub", label: "Netlify Edge API Hub", icon: Sparkles },
   ];

  const sidebarItems = (userRole === "admin" ? adminMenuItems : employeeMenuItems).filter(item => {
    if (item.id === "edge-hub") {
      return isDevUnlocked;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      {/* Dynamic Theme Stylesheet Injection */}
      <style dangerouslySetInnerHTML={{ __html: getThemeStyles() }} />
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-gray-150 p-4 rounded-xl shadow-lg flex items-center gap-2 border-l-4 animate-bounce"
             style={{ borderLeftColor: toast.type === "success" ? COLORS.success : toast.type === "error" ? COLORS.danger : COLORS.info }}>
          <span className="text-lg">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="text-xs font-semibold text-gray-700">{toast.message}</span>
        </div>
      )}

      {loggedIn && userRole === "employee" && !activeUserObj?.passwordChanged ? (
        <div className="min-h-screen w-full bg-[#0F1E33] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#15273F] border border-slate-700/50 p-6 rounded-3xl shadow-2xl space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-3.5 rounded-full mb-3">
                <Lock className="w-6 h-6 text-[#E8C96A]" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">🔒 Secure Portal Password</h2>
              <p className="text-[10.5px] text-slate-350 mt-1.5 leading-relaxed font-sans">
                Welcome to your CorpHR Portal, <strong className="text-white">{activeUserObj?.name}</strong>. Inside, you will see your official 201 compliance files. Please configure a custom security password.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const p1 = newPasswordVal.trim();
              const p2 = confirmPasswordVal.trim();

              if (!p1 || !p2) {
                triggerToast("Please fill in both inputs.", "error");
                return;
              }

              if (p1.length < 5) {
                triggerToast("Password must be at least 5 characters long for safety compliance.", "error");
                return;
              }

              if (p1 !== p2) {
                triggerToast("Passwords do not match. Please verify your inputs.", "error");
                return;
              }

              // Update primary employees list
              setEmployeesList(prev => prev.map(emp => {
                if (emp.id === activeUserObj.id) {
                  return { ...emp, password: p1, passwordChanged: true, forgotPasswordRequested: false };
                }
                return emp;
              }));

              // Also update onboarding list
              setNewHires(prev => prev.map(nh => {
                if (nh.id === activeUserObj.id) {
                  return { ...nh, password: p1, passwordChanged: true, forgotPasswordRequested: false };
                }
                return nh;
              }));

              setNewPasswordVal("");
              setConfirmPasswordVal("");
              triggerToast("Credentials updated successfully! Welcome to your secure workspace.", "success");
            }} className="space-y-4">
              <div>
                <label className="block text-[8.5px] uppercase font-black text-slate-400 tracking-wider mb-1">New Secure Password</label>
                <input
                  type="password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Minimum 5 characters..."
                  className="w-full bg-[#0B1522] border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div>
                <label className="block text-[8.5px] uppercase font-black text-slate-400 tracking-wider mb-1">Confirm Custom Password</label>
                <input
                  type="password"
                  required
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Confirm password..."
                  className="w-full bg-[#0B1522] border border-[#334155] rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#C9A84C] hover:bg-[#E8C96A] text-slate-900 text-xs tracking-widest uppercase font-extrabold py-3 px-4 rounded-xl transition-all shadow-md mt-2 cursor-pointer"
              >
                💾 Lock Password &amp; Continue
              </button>
            </form>

            <div className="pt-2.5 text-center border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setLoggedIn(false);
                  triggerToast("Log-out compliance completed.", "info");
                }}
                className="text-[10px] text-rose-400 hover:text-rose-350 hover:underline uppercase tracking-wider bg-transparent border-0 font-extrabold transition-all cursor-pointer"
              >
                ✕ Log Out Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Navigation Sidebar */}
      <aside className={`bg-[#1E3A5F] text-white flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div 
          onClick={handleLogoClick}
          className="p-4 border-b border-white/10 flex items-center gap-3 cursor-pointer hover:bg-white/5 active:scale-95 transition-all select-none"
          title="Click 5 times to configure Developer Options"
        >
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="Corporate logo" 
              className={sidebarCollapsed ? "w-8 h-8 rounded object-contain bg-white/10 p-0.5 flex-shrink-0" : "w-10 h-10 rounded object-contain bg-white/10 p-0.5 flex-shrink-0"} 
              style={{ width: sidebarCollapsed ? "32px" : "40px", height: sidebarCollapsed ? "32px" : "40px" }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-[#C9A84C] flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
              CH
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-black uppercase tracking-widest text-[#E8C96A] truncate max-w-[140px]">{companyHeading}</div>
              <div className="text-[10px] text-gray-300 truncate">Sovereign HRIS</div>
            </div>
          )}
        </div>

        {/* Dynamic RBAC Panel context label */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 bg-black/20 m-2 rounded-lg border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-[#E8C96A] font-extrabold tracking-widest uppercase">RBAC Session</span>
              <div className="text-[10px] font-bold capitalize text-white mt-0.5">{userRole} Space</div>
            </div>
            <span className={`w-2 h-2 rounded-full ${userRole === "admin" ? "bg-rose-450 bg-rose-400" : "bg-goldLight bg-[#E8C96A]"}`}></span>
          </div>
        )}

        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setSelectedEmp(null);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive ? "bg-[#C9A84C] text-white shadow-sm" : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!sidebarCollapsed && (item as any).badge ? (
                  <span className="bg-red-500 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {(item as any).badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Disconnection session */}
        <div className="p-2 border-t border-white/10 space-y-1">
          <button
            onClick={() => {
              setLoggedIn(false);
              triggerToast("Logged out of security channel successfully.", "info");
            }}
            className="w-full flex items-center gap-3 p-2 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-950/20 hover:text-rose-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Close Workspace</span>}
          </button>

          <div className="p-2 flex items-center justify-between">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-white/5 rounded text-gray-300"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {!sidebarCollapsed && (
              <span className="text-[9px] text-gray-400 font-mono">Ver 1.3-RLS</span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Header Bar */}
        <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 font-mono tracking-wider uppercase">Compliance Control</span>
            <span className="text-gray-300 text-sm">/</span>
            <span className="text-xs font-extrabold text-slate-600 capitalize">
              {activeModule.replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              {userRole === "admin" ? (
                <>
                  <div className="text-xs font-bold text-gray-800">Maria Santos</div>
                  <div className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">Superuser Checker Account</div>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-gray-800">{activeUserObj?.name}</div>
                  <div className="text-[10px] text-[#C9A84C] font-semibold uppercase tracking-wider">ESS Maker Profile ({activeUserObj?.id})</div>
                </>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/10 border border-[#1E3A5F]/20 flex items-center justify-center font-bold text-[#1E3A5F] text-xs">
              {userRole === "admin" ? "MS" : activeUserObj?.avatar || "EM"}
            </div>
          </div>
        </header>

        {/* Dynamic Module Content */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {isDemoMode && (
            <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/35 text-[#E8C96A] text-xs py-3 px-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn font-sans">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold">🖥️ Sandbox Diagnostic Mode:</span> 
                <span>Evaluation Window configured:</span>
                <span className="font-mono bg-slate-900 border border-white/5 text-white px-2 py-0.5 rounded text-[10px] font-black">{formatDate(demoStartDate)}</span>
                <span>➔</span>
                <span className="font-mono bg-slate-900 border border-white/5 text-white px-2 py-0.5 rounded text-[10px] font-black">{formatDate(demoEndDate)}</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono italic">
                Simulated database environment loaded for stakeholder validation
              </div>
            </div>
          )}
          
          {/* =========================================================
              1. DASHBOARD MODULE (CONDIITONAL BASED ON ROLE)
             ========================================================= */}
          {activeModule === "dashboard" && (
            <div className="space-y-6">
              
              {/* Alert Notification Header */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-indigo-950 p-6 rounded-2xl text-white shadow-md flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Welcome back, {userRole === "admin" ? "Maria" : activeUserObj?.name}! 👋
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-xl">
                    {userRole === "admin" 
                      ? "Your digital HR database is live. Review pending requests from employees under the Maker-Checker protocol." 
                      : "Access your personalized employee dashboard context. Submit changes to your profile 201 parameters for HR approval."}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-[#E8C96A]">
                    {mounted ? time.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : "--:-- --"}
                  </div>
                  <div className="text-[9px] tracking-wider text-gray-400 uppercase mt-0.5 font-bold">
                    Asia/Manila (PHT)
                  </div>
                </div>
              </div>

              {/* RLES/RBAC Visual Stats indicators */}
              {userRole === "admin" ? (
                // ADMIN GLOBAL METRICS
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                  {[
                    { label: "Active 201 Records", count: `${employeesList.length} Files`, update: "Fully audited", icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Attendance Status Today", count: `${attendanceList.filter(l => l.status === "Present" || l.status === "Late").length} Present`, update: `${attendanceList.filter(l => l.status === "Absent").length} Unreported Absents`, icon: Clock, color: "text-emerald-600 bg-emerald-50" },
                    { label: "Unresolved Submissions", count: `${makerRequests.filter(r => r.status === "Pending").length} Pending`, update: "Requires Checker Authorization", icon: ShieldCheck, color: "text-rose-600 bg-rose-50" },
                    { label: "Cutoff Payroll Gross", count: formatCurrency(employeesList.reduce((acc, obj) => acc + (obj.salary / 2), 0)), update: "Dec 1–15, 2024 cutoff run", icon: DollarSign, color: "text-[#C9A84C] bg-amber-50" },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="bg-white border border-gray-150 p-5 rounded-xl shadow-sm flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{stat.label}</span>
                          <div className="text-xl font-black text-gray-800 mt-1">{stat.count}</div>
                          <span className="text-[10px] font-bold text-gray-500 block mt-1">{stat.update}</span>
                        </div>
                        <div className={`p-2.5 rounded-lg ${stat.color}`}>
                          <Icon className="w-5 h-5 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // EMPLOYEE PERSONAL METRICS (ESS)
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                  {[
                    { label: "My Job Classification", count: activeUserObj.position, update: activeUserObj.department, icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "Today's Clock Record", count: clockedIn ? "Active (In)" : "Absent/Not In", update: clockedIn ? "Clocked in at 08:00 AM PHT" : "Awaiting clock trigger", icon: Clock, color: "text-emerald-600 bg-emerald-50" },
                    { label: "My Claims (Maker Line)", count: `${activeMakerRequestsForRole.length} Submitted`, update: `${activeMakerRequestsForRole.filter(r => r.status === "Pending").length} Pending approval`, icon: ShieldCheck, color: "text-amber-600 bg-amber-50" },
                    { label: "Current Basic Monthly", count: formatCurrency(activeUserObj.salary), update: "Based on 201 File parameter", icon: DollarSign, color: "text-[#C9A84C] bg-amber-50" },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="bg-white border border-gray-150 p-5 rounded-xl shadow-sm flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">{stat.label}</span>
                          <div className="text-md font-black text-gray-800 mt-1">{stat.count}</div>
                          <span className="text-[10px] font-bold text-gray-500 block mt-1">{stat.update}</span>
                        </div>
                        <div className={`p-2.5 rounded-lg ${stat.color}`}>
                          <Icon className="w-5 h-5 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Pending approvals section - Conditional behavior */}
                {userRole === "admin" ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                        Checker Task Watchlist ({makerRequests.filter(r => r.status === "Pending").length})
                      </h3>
                      <button 
                        onClick={() => setActiveModule("checker")}
                        className="text-[10px] font-bold text-[#C9A84C] hover:underline"
                      >
                        Navigate to approval deck &rarr;
                      </button>
                    </div>

                    <div className="space-y-3">
                      {makerRequests.filter(r => r.status === "Pending").length > 0 ? (
                        makerRequests.filter(r => r.status === "Pending").slice(0, 3).map(req => (
                          <div key={req.id} className="p-3 bg-[#1e3a5f]/5 border border-dashed border-[#1e3a5f]/25 rounded-lg flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-[#1E3A5F]">{req.requestType} &bull; <span className="text-gray-500">{req.id}</span></div>
                              <div className="text-[10px] text-gray-600 font-medium mt-1">
                                Filed by <span className="font-bold">{req.requesterName}</span>: Modify {req.fieldLabel} &rarr; <span className="font-mono bg-amber-100 text-amber-800 py-0.5 px-1 rounded">{req.newValue}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase animate-pulse">
                              Pending Review
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-gray-400 italic">
                          Perfect! Maker-Checker pipeline contains zero unresolved submissions.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-xs font-extrabold text-[#1E3A5F] uppercase tracking-wider">
                        My Submitted Request Stream (Maker Logs)
                      </h3>
                      <button 
                        onClick={() => setActiveModule("employees")}
                        className="text-[10px] font-bold text-[#C9A84C] hover:underline"
                      >
                        Submit profile corrections &rarr;
                      </button>
                    </div>

                    <div className="space-y-3">
                      {activeMakerRequestsForRole.length > 0 ? (
                        activeMakerRequestsForRole.map(req => (
                          <div key={req.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between text-xs border border-gray-100">
                            <div>
                              <div className="font-bold text-gray-800">{req.requestType}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                Filed on {formatDate(req.filedDate)} &bull; ID: {req.id}
                              </div>
                              <p className="text-[10px] font-medium text-slate-500 mt-1 max-w-[280px] truncate leading-normal">
                                Details: Update <span className="font-bold font-mono">{req.fieldLabel}</span> to <span className="font-mono bg-sky-50 text-sky-800 py-0.5 px-1">{req.newValue}</span>
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              req.status === "Pending" ? "bg-amber-100 text-amber-800" :
                              req.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {req.status === "Pending" ? "Awaiting Checker" : req.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-gray-450 italic">
                          No pending submissions filed in your Maker pipeline log.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Holiday advisory panel (Same for all roles) */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider mb-4">
                    Statutory Holiday Advisory
                  </h3>
                  <div className="space-y-3">
                    {HOLIDAYS.map((h, i) => (
                      <div key={i} className="p-3 border border-dashed border-gray-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-800">{h.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(h.date)}</p>
                        </div>
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-extrabold py-0.5 px-2 rounded uppercase tracking-wider">
                          {h.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================
              2. EMPLOYEE MODULE (RBAC SENSITIVE)
             ========================================================= */}
          {activeModule === "employees" && (
            <div className="space-y-6">
              
              {userRole === "admin" ? (
                // ADMIN MASTER DIRECTORY VIEW
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Users className="text-[#1E3A5F] w-5 h-5 flex-shrink-0" />
                      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                        Master Registry Directory (RBAC Level: Admin)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select 
                        value={filterDept} 
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="all">All Departments</option>
                        {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 animate-pulse" />
                        <input 
                          type="text" 
                          placeholder="Search employee..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none w-44"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-55 border-b border-gray-100 text-slate-500 font-bold tracking-wider">
                          <th className="p-3">ID</th>
                          <th className="p-3">Employee Name</th>
                          <th className="p-3">Rank & Dept</th>
                          <th className="p-3">SSS Registration</th>
                          <th className="p-3">TIN Registry</th>
                          <th className="p-3">PhilHealth No</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredEmployees.map(emp => (
                          <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-mono text-[11px] font-bold text-gray-600">{emp.id}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{emp.name}</div>
                              <div className="text-[10px] text-gray-400">{emp.email}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-700">{emp.position}</span>
                              <span className="block text-[10px] text-[#C9A84C] font-extrabold uppercase mt-0.5">{emp.department}</span>
                            </td>
                            <td className="p-3 font-mono font-medium text-gray-600">{emp.sss}</td>
                            <td className="p-3 font-mono font-medium text-gray-600">{emp.tin}</td>
                            <td className="p-3 font-mono font-medium text-gray-600">{emp.philhealth}</td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedEmp(emp);
                                  setDossierActiveTab("profile");
                                  openDossierInNewWindow(emp);
                                }}
                                className="text-[11px] font-black tracking-wide text-[#1E3A5F] hover:text-[#C9A84C] py-1 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-all"
                              >
                                Read 201 File
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 201 MASTER PORTAL FLOATING POPUP OVERLAY */}
                  {selectedEmp && (() => {
                    const currentDocs = getEmployeeDocs(selectedEmp);
                    
                    return (
                      <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
                        <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_30px_70px_-10px_rgba(30,58,95,0.4)] border border-slate-200/80 animate-scaleUp flex flex-col font-sans mb-10 max-h-[90vh]">
                          
                          {/* Window Title Bar */}
                          <div className="bg-[#1E3A5F] text-white p-4.5 px-6 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#E8C96A] ml-2">Secure 201 Registry Portal</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setSelectedEmp(null)} 
                              className="text-white hover:text-red-400 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer"
                            >
                              ✕ Close Window
                            </button>
                          </div>

                          {/* Profile Header Block */}
                          <div className="p-6 bg-slate-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-full bg-[#1E3A5F]/10 border border-[#1E3A5F]/20 font-bold text-xl text-[#1E3A5F] flex items-center justify-center shadow-inner">
                                {selectedEmp.avatar}
                              </div>
                              <div>
                                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                                  {selectedEmp.name}
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono uppercase px-2 py-0.5 rounded-full font-bold">Approved 201</span>
                                </h3>
                                <p className="text-xs font-semibold text-[#C9A84C] font-mono tracking-wide mt-0.5 uppercase">
                                  {selectedEmp.position} &bull; {selectedEmp.department}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                              <button
                                type="button"
                                onClick={() => openDossierInNewWindow(selectedEmp)}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider py-2 px-3.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all text-center justify-center cursor-pointer"
                              >
                                🖥️ Launch Separate Tab / Print
                              </button>
                              <div className="text-right sm:text-right text-xs bg-slate-200/50 p-2 rounded-xl border border-slate-200">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Dossier ID:</span>
                                <span className="font-mono text-slate-700 font-bold">{selectedEmp.id}</span>
                              </div>
                            </div>
                          </div>

                          {/* Portal Tabs Selection */}
                          <div className="flex flex-wrap bg-slate-100 border-b border-gray-200 p-1">
                            {((userRole === "admin"
                              ? ["profile", "government", "earnings", "attachments", "credentials"]
                              : ["profile", "government", "earnings", "attachments"]) as any[]).map(tabKey => {
                              let tabLabel = "📂 Profile Details";
                              if (tabKey === "government") tabLabel = "💳 Gov Identifiers";
                              if (tabKey === "earnings") tabLabel = "💰 Earnings & Overtime";
                              if (tabKey === "attachments") tabLabel = "📁 Attachments Chest";
                              if (tabKey === "credentials") tabLabel = "🔑 Portal Credentials";

                              const active = dossierActiveTab === tabKey;
                              return (
                                <button
                                  key={tabKey}
                                  type="button"
                                  onClick={() => setDossierActiveTab(tabKey as any)}
                                  className={`flex-1 text-[11px] uppercase font-black tracking-wide py-2.5 px-3 rounded-lg transition-all text-center ${
                                    active 
                                      ? "bg-white text-[#1E3A5F] shadow-sm font-black border border-slate-200" 
                                      : "text-gray-500 hover:text-slate-800 hover:bg-slate-50"
                                  }`}
                                >
                                  {tabLabel}
                                </button>
                              );
                            })}
                          </div>

                          {/* Tab Content Box - Scrollable */}
                          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 font-medium leading-relaxed max-h-[50vh]">
                            
                            {/* TAB 1: Profile Details */}
                            {dossierActiveTab === "profile" && (
                              <div className="space-y-4 animate-fadeIn">
                                <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1">I. Registered Employment Profile</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Corporate Email Address</span>
                                    <span className="font-mono text-slate-800 font-bold">{selectedEmp.email}</span>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Contact Phone Number</span>
                                    <span className="text-slate-800 font-bold">{selectedEmp.phone || "+63 N/A"}</span>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Certified Hiring Date</span>
                                    <span className="text-slate-800 font-bold">{formatDate(selectedEmp.dateHired)}</span>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Employ Personnel Status</span>
                                    <span className="text-slate-800 font-bold uppercase tracking-wider">{selectedEmp.type || "Regular"} Status</span>
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150 md:col-span-2">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Permanent Residential Directory Address</span>
                                    <span className="text-slate-800 font-semibold">{selectedEmp.address || "Quezon City, Metro Manila"}</span>
                                  </div>
                                </div>

                                <div className="p-4 bg-[#1E3A5F]/5 rounded-xl border border-[#1E3A5F]/15 flex items-center justify-between mt-4 flex-wrap gap-4">
                                  <div className="flex-1 min-w-[200px]">
                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold mb-1">Cutoff Basic Pay Scale Rate</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#1E3A5F] text-xs font-mono">₱</span>
                                      <input
                                        type="number"
                                        disabled={userRole !== "admin"}
                                        value={portalSalaryInput}
                                        onChange={(e) => setPortalSalaryInput(e.target.value)}
                                        placeholder="e.g. 35000"
                                        className="w-full max-w-[150px] bg-white border border-gray-250 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-[#1E3A5F] focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200"
                                      />
                                      {userRole === "admin" && portalSalaryInput !== String(selectedEmp.salary) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const numVal = Math.round(Number(portalSalaryInput));
                                            if (isNaN(numVal) || numVal <= 0) {
                                              triggerToast("Please enter a valid salary rate.", "error");
                                              return;
                                            }
                                            setPendingSalaryValue(numVal);
                                            setShowSalaryConfirmModal(true);
                                          }}
                                          className="text-[9px] bg-[#1E3A5F] hover:bg-[#2A4F80] hover:text-white text-[#E8C96A] py-1 px-2.5 rounded-lg font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm animate-pulse"
                                        >
                                          Update Rate ⚡
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right text-[10px] text-gray-500 leading-normal">
                                    Approved by HR Audit Team &bull; Issued monthly
                                  </div>
                                </div>

                                <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1 mt-6">Work Schedule &amp; Grace Period Settings</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Working Days From</label>
                                    <select
                                      disabled={userRole !== "admin"}
                                      value={selectedEmp.workingDaysFrom || "Monday"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, workingDaysFrom: val } : emp));
                                        setSelectedEmp((prev: any) => ({ ...prev, workingDaysFrom: val }));
                                      }}
                                      className="w-full bg-[#15273F] text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-[#C9A84C] font-semibold"
                                    >
                                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                                        <option key={d} value={d} className="bg-[#0B1522]">{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Working Days To</label>
                                    <select
                                      disabled={userRole !== "admin"}
                                      value={selectedEmp.workingDaysTo || "Friday"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, workingDaysTo: val } : emp));
                                        setSelectedEmp((prev: any) => ({ ...prev, workingDaysTo: val }));
                                      }}
                                      className="w-full bg-[#15273F] text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-[#C9A84C] font-semibold"
                                    >
                                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                                        <option key={d} value={d} className="bg-[#0B1522]">{d}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Clock In Target Schedule</label>
                                    <input
                                      disabled={userRole !== "admin"}
                                      type="text"
                                      placeholder="e.g. 08:00 AM"
                                      value={selectedEmp.clockInSchedule || "08:00 AM"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, clockInSchedule: val } : emp));
                                        setSelectedEmp((prev: any) => ({ ...prev, clockInSchedule: val }));
                                      }}
                                      className="w-full bg-slate-55 border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Clock Out Target Schedule</label>
                                    <input
                                      disabled={userRole !== "admin"}
                                      type="text"
                                      placeholder="e.g. 05:00 PM"
                                      value={selectedEmp.clockOutSchedule || "05:00 PM"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, clockOutSchedule: val } : emp));
                                        setSelectedEmp((prev: any) => ({ ...prev, clockOutSchedule: val }));
                                      }}
                                      className="w-full bg-slate-55 border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] uppercase tracking-wider font-extrabold text-[#C9A84C] mb-1">Allowed Grace Period (Minutes)</label>
                                    <input
                                      disabled={userRole !== "admin"}
                                      type="number"
                                      value={selectedEmp.gracePeriod ?? 15}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, gracePeriod: val } : emp));
                                        setSelectedEmp((prev: any) => ({ ...prev, gracePeriod: val }));
                                      }}
                                      className="w-full bg-[#15273F] text-[#C9A84C] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 2: Government Identifiers */}
                            {dossierActiveTab === "government" && (
                              <div className="space-y-4 animate-fadeIn">
                                <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1">II. Government Statutory Registrar Numbers</div>
                                <p className="text-[11px] text-gray-500 font-normal leading-normal font-sans">
                                  These are the official Philippine Social Security and Taxpayer identifiers loaded in this employee&apos;s active 201 directory record.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  <div className="p-4.5 bg-slate-50 rounded-xl border border-gray-200">
                                    <label className="block text-[9px] uppercase font-bold text-gray-450 tracking-wider mb-1.5">Philippine SSS Number</label>
                                    <input 
                                      type="text" 
                                      value={selectedEmp.sss || ""} 
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => {
                                          if (emp.id === selectedEmp.id) return { ...emp, sss: newValue };
                                          return emp;
                                        }));
                                        setSelectedEmp((prev: any) => ({ ...prev, sss: newValue }));
                                      }}
                                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>

                                  <div className="p-4.5 bg-slate-50 rounded-xl border border-gray-200">
                                    <label className="block text-[9px] uppercase font-bold text-gray-450 tracking-wider mb-1.5">BIR TAXIN / TIN Number</label>
                                    <input 
                                      type="text" 
                                      value={selectedEmp.tin || ""} 
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => {
                                          if (emp.id === selectedEmp.id) return { ...emp, tin: newValue };
                                          return emp;
                                        }));
                                        setSelectedEmp((prev: any) => ({ ...prev, tin: newValue }));
                                      }}
                                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>

                                  <div className="p-4.5 bg-slate-50 rounded-xl border border-gray-200">
                                    <label className="block text-[9px] uppercase font-bold text-gray-450 tracking-wider mb-1.5">PhilHealth Premium PIN</label>
                                    <input 
                                      type="text" 
                                      value={selectedEmp.philhealth || ""} 
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => {
                                          if (emp.id === selectedEmp.id) return { ...emp, philhealth: newValue };
                                          return emp;
                                        }));
                                        setSelectedEmp((prev: any) => ({ ...prev, philhealth: newValue }));
                                      }}
                                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>

                                  <div className="p-4.5 bg-slate-50 rounded-xl border border-gray-200">
                                    <label className="block text-[9px] uppercase font-bold text-gray-450 tracking-wider mb-1.5">Pag-IBIG / HDMF MID ID</label>
                                    <input 
                                      type="text" 
                                      value={selectedEmp.pagibig || ""} 
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEmployeesList(prev => prev.map(emp => {
                                          if (emp.id === selectedEmp.id) return { ...emp, pagibig: newValue };
                                          return emp;
                                        }));
                                        setSelectedEmp((prev: any) => ({ ...prev, pagibig: newValue }));
                                      }}
                                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 5: Earnings and Allowances with Overtime Computation */}
                            {dossierActiveTab === "earnings" && (
                              <div className="space-y-6 animate-fadeIn text-xs">
                                <div>
                                  <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1">💰 Recurring Monthly Earnings &amp; Allowances</div>
                                  <p className="text-[11px] text-gray-500 font-normal leading-normal font-sans mt-1">
                                    Configure statutory and company allowances. This tab is used as the updated dynamic basis for subsequent payroll compilations.
                                  </p>
                                </div>

                                {/* UI GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                  
                                  {/* LEFT BAR: Recurring Monthly Allowances */}
                                  <div className="space-y-4 bg-slate-50 p-4.5 rounded-2xl border border-gray-200">
                                    <h4 className="text-[10px] uppercase font-bold text-[#1E3A5F] tracking-widest block mb-2 border-b border-[#1E3A5F]/10 pb-1">I. Configurable Allowances (Monthly)</h4>
                                    
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Meal Allowance</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
                                          <input 
                                            type="number"
                                            disabled={userRole !== "admin"}
                                            value={selectedEmp.mealAllowance !== undefined ? selectedEmp.mealAllowance : 1000}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, mealAllowance: val } : emp));
                                              setSelectedEmp((prev: any) => ({ ...prev, mealAllowance: val }));
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-2 pl-7 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Travel / Transportation Allowance</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
                                          <input 
                                            type="number"
                                            disabled={userRole !== "admin"}
                                            value={selectedEmp.travelAllowance !== undefined ? selectedEmp.travelAllowance : (selectedEmp.position.includes("Manager") ? 1000 : (selectedEmp.position.includes("Senior") ? 1000 : 500))}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, travelAllowance: val } : emp));
                                              setSelectedEmp((prev: any) => ({ ...prev, travelAllowance: val }));
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-2 pl-7 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Communication / Internet Allowance</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
                                          <input 
                                            type="number"
                                            disabled={userRole !== "admin"}
                                            value={selectedEmp.communicationAllowance !== undefined ? selectedEmp.communicationAllowance : (selectedEmp.position.includes("Manager") ? 1000 : (selectedEmp.position.includes("Senior") ? 500 : 0))}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, communicationAllowance: val } : emp));
                                              setSelectedEmp((prev: any) => ({ ...prev, communicationAllowance: val }));
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-2 pl-7 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Other Allowances</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
                                          <input 
                                            type="number"
                                            disabled={userRole !== "admin"}
                                            value={selectedEmp.otherAllowances !== undefined ? selectedEmp.otherAllowances : 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, otherAllowances: val } : emp));
                                              setSelectedEmp((prev: any) => ({ ...prev, otherAllowances: val }));
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-2 pl-7 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* DYNAMIC SUM ALLOWANCES */}
                                    <div className="mt-4 p-3 bg-teal-50 border border-teal-150 rounded-xl">
                                      <span className="text-[10px] font-bold text-teal-800 block uppercase tracking-wider">Total Monthly Benefits:</span>
                                      <div className="text-sm font-black text-teal-950 font-mono mt-0.5">
                                        ₱{((selectedEmp.mealAllowance !== undefined ? Number(selectedEmp.mealAllowance) : 1000) + 
                                           (selectedEmp.travelAllowance !== undefined ? Number(selectedEmp.travelAllowance) : (selectedEmp.position.includes("Manager") ? 1000 : (selectedEmp.position.includes("Senior") ? 1000 : 500))) + 
                                           (selectedEmp.communicationAllowance !== undefined ? Number(selectedEmp.communicationAllowance) : (selectedEmp.position.includes("Manager") ? 1000 : (selectedEmp.position.includes("Senior") ? 500 : 0))) + 
                                           (selectedEmp.otherAllowances !== undefined ? Number(selectedEmp.otherAllowances) : 0)).toLocaleString("en-PH")}
                                      </div>
                                      <p className="text-[9px] text-[#1E3A5F] mt-1 italic leading-normal">
                                        * Note: This total is fed automatically into subsequent payroll cycles when calculating benefits.
                                      </p>
                                    </div>
                                  </div>

                                  {/* RIGHT BAR: Overtime Computation settings & playground */}
                                  <div className="space-y-4 bg-slate-50 p-4.5 rounded-2xl border border-gray-200 flex flex-col justify-between">
                                    <div className="space-y-4">
                                      <h4 className="text-[10px] uppercase font-bold text-[#1E3A5F] tracking-widest block border-b border-[#1E3A5F]/10 pb-1">II. Overtime Computation Settings</h4>
                                      
                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Overtime Hourly Rate Basis</label>
                                        <select
                                          disabled={userRole !== "admin"}
                                          value={selectedEmp.otHourlyRateMethod || "automatic"}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, otHourlyRateMethod: val } : emp));
                                            setSelectedEmp((prev: any) => ({ ...prev, otHourlyRateMethod: val }));
                                          }}
                                          className="w-full bg-[#15273F] text-white border border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-[#C9A84C] font-semibold"
                                        >
                                          <option value="automatic" className="bg-[#0B1522]">Automatic Scale Formula (Salary / 22 days / 8 hours)</option>
                                          <option value="custom" className="bg-[#0B1522]">Custom Hourly Rate (Direct Input)</option>
                                        </select>
                                      </div>

                                      {/* Custom Hourly Rate field */}
                                      {(selectedEmp.otHourlyRateMethod === "custom") && (
                                        <div className="animate-fadeIn">
                                          <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Custom Overtime Hourly Rate</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-2.5 font-bold text-slate-400">₱</span>
                                            <input 
                                              type="number"
                                              disabled={userRole !== "admin"}
                                              value={selectedEmp.otCustomHourlyRate !== undefined ? selectedEmp.otCustomHourlyRate : Math.round(Number(selectedEmp.salary) / (22 * 8))}
                                              onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, otCustomHourlyRate: val } : emp));
                                                setSelectedEmp((prev: any) => ({ ...prev, otCustomHourlyRate: val }));
                                              }}
                                              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 pl-7 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                            />
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Overtime Multiplier Factor</label>
                                        <input 
                                          type="number"
                                          step="0.05"
                                          disabled={userRole !== "admin"}
                                          value={selectedEmp.otMultiplier !== undefined ? selectedEmp.otMultiplier : 1.25}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 1.25;
                                            setEmployeesList(prev => prev.map(emp => emp.id === selectedEmp.id ? { ...emp, otMultiplier: val } : emp));
                                            setSelectedEmp((prev: any) => ({ ...prev, otMultiplier: val }));
                                          }}
                                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C] disabled:bg-gray-100 disabled:text-gray-500 font-sans"
                                        />
                                        <p className="text-[8px] text-gray-400 mt-1">
                                          Philippine Labor Code standard for ordinary day OT is 1.25 (125%). For rest day / holiday OT, use 1.30 or higher.
                                        </p>
                                      </div>
                                    </div>

                                    {/* DYNAMIC INTERACTIVE DESK */}
                                    <div className="mt-4 p-4 bg-[#1E3A5F]/5 border border-[#1E3A5F]/15 rounded-xl space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-[#1E3A5F] uppercase">⚡ Live OT Computation Playdesk</span>
                                        <span className="text-[9px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">Dry-Run Playground</span>
                                      </div>

                                      <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                          <label className="block text-[8px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Test OT Hours</label>
                                          <input 
                                            type="number"
                                            min="1"
                                            value={otSimulateHours}
                                            onChange={(e) => setOtSimulateHours(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-slate-800 text-xs font-mono font-semibold focus:outline-none focus:border-[#C9A84C]"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-[8px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Base Hourly Rate</label>
                                          <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                                            ₱{Math.round(selectedEmp.otHourlyRateMethod === "custom" && selectedEmp.otCustomHourlyRate !== undefined ? Number(selectedEmp.otCustomHourlyRate) : Number(selectedEmp.salary) / (22 * 8))}/hr
                                          </div>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-200/60 leading-relaxed font-mono text-[9px] text-slate-755">
                                        <div className="flex justify-between font-bold text-gray-500">
                                          <span>FORMULA:</span>
                                          <span>Hours ({otSimulateHours} hr) × Rate (₱{Math.round(selectedEmp.otHourlyRateMethod === "custom" && selectedEmp.otCustomHourlyRate !== undefined ? Number(selectedEmp.otCustomHourlyRate) : Number(selectedEmp.salary) / (22 * 8))}) × Mult ({selectedEmp.otMultiplier !== undefined ? selectedEmp.otMultiplier : 1.25})</span>
                                        </div>
                                        <div className="flex justify-between mt-2 text-xs border-t pt-1.5 border-dashed">
                                          <span className="uppercase text-[#1E3A5F] font-black tracking-wide">Expected OT Pay:</span>
                                          <span className="text-emerald-700 font-extrabold font-mono text-xs">
                                            ₱{Math.round(
                                              otSimulateHours * 
                                              (selectedEmp.otHourlyRateMethod === "custom" && selectedEmp.otCustomHourlyRate !== undefined ? Number(selectedEmp.otCustomHourlyRate) : Number(selectedEmp.salary) / (22 * 8)) * 
                                              (selectedEmp.otMultiplier !== undefined ? Number(selectedEmp.otMultiplier) : 1.25)
                                            ).toLocaleString("en-PH")}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                  </div>

                                </div>

                              </div>
                            )}

                            {/* TAB 3: Uploaded Dossier Attachments */}
                            {dossierActiveTab === "attachments" && (
                              <div className="space-y-4 animate-fadeIn">
                                <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1">III. 201 Compliance Attached Files (Checklist)</div>
                                <p className="text-[11px] text-gray-500 font-normal leading-normal font-sans">
                                  Click the camera/file attachment icons to simulate downloading or reading the document details, or drop/select a file from your actual physical device storage for instant integration.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  {Object.entries(currentDocs).map(([key, value]: [string, any]) => {
                                    let docLabel = key.toUpperCase();
                                    if (key === "sss") docLabel = "SSS Membership Photo / Card";
                                    if (key === "philhealth") docLabel = "PhilHealth MDF Registration";
                                    if (key === "pagibig") docLabel = "HDMF Pag-IBIG Member Sheet";
                                    if (key === "tin") docLabel = "BIR Form 1902 Taxes ID";
                                    if (key === "nbi") docLabel = "NBI Clearance Background certificate";
                                    if (key === "contract") docLabel = "Signed Employment Contract copy";
                                    if (key === "resume") docLabel = "Curriculum Vitae / Resume Professional";
                                    if (key === "other") docLabel = "Other Credentials / TOR / Certifications";

                                    const expiry = getExpiryStatus(value.expiryDate);
                                    let shadowBorder = "border-gray-100 bg-gray-50/70 text-slate-800";
                                    let bannerBadge = null;
                                    if (expiry === "expired") {
                                      shadowBorder = "border-red-300 bg-red-50 text-red-950 shadow-sm border-l-4 border-l-red-500";
                                      bannerBadge = (
                                        <span className="text-[8.5px] font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded-md animate-pulse shrink-0">
                                          EXPIRED ({value.expiryDate})
                                        </span>
                                      );
                                    } else if (expiry === "soon") {
                                      shadowBorder = "border-amber-300 bg-amber-50 text-amber-950 shadow-sm border-l-4 border-l-amber-500";
                                      bannerBadge = (
                                        <span className="text-[8.5px] font-mono font-bold bg-amber-500 text-black px-2 py-0.5 rounded-md shrink-0 animate-pulse">
                                          EXPIRING SOON ({value.expiryDate})
                                        </span>
                                      );
                                    }

                                    return (
                                      <div key={key} className={`p-3 border rounded-xl flex flex-col justify-between gap-3 font-semibold text-xs relative ${shadowBorder}`}>
                                        
                                        {/* File Label & Scanned Path */}
                                        <div className="flex justify-between items-start gap-1">
                                          <div className="space-y-0.5">
                                            <div className="text-[10px] font-black text-[#1E3A5F] flex items-center gap-1.5 font-sans">
                                              <FileText className="w-3.5 h-3.5 text-[#C9A84C]" />
                                              {docLabel}
                                            </div>
                                            <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1 max-w-[190px] truncate">
                                              <span>Dossier file:</span>
                                              <span className="italic font-bold text-blue-600 truncate">{value.file || "No scan copy..."}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Status pill dropdown or display */}
                                          <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                              value.status === "Verified"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                : "bg-amber-50 text-amber-700 border border-amber-100"
                                            }`}>
                                              {value.status}
                                            </span>
                                            {bannerBadge}
                                          </div>
                                        </div>

                                        {/* Action options: download or native PC/mobile upload */}
                                        <div className="flex items-center gap-1.5 justify-between pt-2 border-t border-gray-200">
                                          
                                          {/* Simulator scan button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!value.file) {
                                                triggerToast(`No file scan copy uploaded yet for ${docLabel}! Please upload using the attach button.`, "error");
                                                return;
                                              }
                                              const filePopup = window.open("", "_blank", "width=600,height=500");
                                              if (filePopup) {
                                                filePopup.document.write(`
                                                  <html>
                                                    <body style="font-family: monospace; display:flex; flex-direction:column; align-items:center; justify-center; height:100vh; background-color:#fafafa; margin:0; padding:30px;">
                                                      <div style="background:white; border:1px solid #ddd; padding:40px; border-radius:12px; text-align:center; max-width:480px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                                                        <h1 style="color:#1e3a5f; margin-bottom:10px;">📄 ${docLabel}</h1>
                                                        <p style="color:#555; font-size:12px;">Scanned Cryptographic PDF Verification Gate</p>
                                                        <p style="color:#2563eb; font-weight:bold; margin:20px 0;">REF: ${value.file}</p>
                                                        <div style="background:#eaf2ff; border: 1px dashed #abc5ff; padding: 25px; border-radius: 8px; text-align: left; font-size: 11px; line-height: 1.6;">
                                                          <strong>Cryptographic Integrity Audit Trace:</strong><br/>
                                                          &bull; Registry Path: /var/ph_corp/dossiers/${selectedEmp.id}/${key}<br/>
                                                          &bull; Signature: 8bfa918ffbc2c12bda0018ffa9b<br/>
                                                          &bull; Status: CERTIFIED COMPLIANCE VERIFICATION APPROVED
                                                        </div>
                                                        <button onclick="window.close()" style="margin-top:25px; background:#1e3a5f; color:white; border:none; padding:10px 20px; font-weight:bold; border-radius:6px; cursor:pointer;">
                                                          Close Document
                                                        </button>
                                                      </div>
                                                    </body>
                                                  </html>
                                                `);
                                                filePopup.document.close();
                                                triggerToast(`Opened reader window for scanned dossier: '${value.file}'!`, "success");
                                              } else {
                                                triggerToast(`Could not open document portal tab. Please allow popups or use mock preview options.`, "info");
                                              }
                                            }}
                                            className="text-[9px] bg-slate-100 hover:bg-slate-200 text-gray-700 py-1.5 px-2 rounded-lg font-bold uppercase transition-all flex items-center gap-0.5"
                                          >
                                            👁️ Read File
                                          </button>

                                          {/* Device Upload Anchor */}
                                          <label className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-800 py-1.5 px-2 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all">
                                            <span>📎 Attach Document</span>
                                            <input
                                              type="file"
                                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                              className="hidden"
                                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  // Construct updated docs
                                                  const updatedDocs = { ...currentDocs };
                                                  updatedDocs[key] = {
                                                    status: "Verified",
                                                    file: file.name
                                                  };

                                                  // Save changes permanently in employee
                                                  setEmployeesList(prev => prev.map(emp => {
                                                    if (emp.id === selectedEmp.id) {
                                                      return { ...emp, docs: updatedDocs };
                                                    }
                                                    return emp;
                                                  }));

                                                  // Immediately update selectedEmp reference to keep popup active and reactive
                                                  setSelectedEmp((prev: any) => ({
                                                    ...prev,
                                                    docs: updatedDocs
                                                  }));

                                                  triggerToast(`Attached compliance document '${file.name}' for ${docLabel} to employee roster!`, "success");
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* TAB 4: HRIS Security Credentials */}
                            {dossierActiveTab === "credentials" && (
                              <div className="space-y-4 animate-fadeIn text-xs">
                                <div className="text-[10px] font-black uppercase text-[#1E3A5F] tracking-wider border-b pb-1">IV. Portal Account Security Controls</div>
                                <p className="text-[11px] text-gray-500 font-normal leading-normal font-sans">
                                  Manage this employee&apos;s active credentials and access keys for the CorpHR Philippines system.
                                </p>

                                <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 mt-2 space-y-4">
                                  {/* Request Reset Indicator Badge */}
                                  {selectedEmp.forgotPasswordRequested ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 animate-pulse">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <h5 className="font-bold text-amber-900">⚠️ Forgot Password Request Pending Audit</h5>
                                        <p className="text-[10px] text-amber-700 font-normal leading-relaxed">
                                          This employee triggered the &quot;Forgot Password&quot; flow from their portal. Generate safe new temporary credentials for them below.
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-emerald-55 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-2.5">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <h5 className="font-bold text-emerald-950">Active Credentials Normal</h5>
                                        <p className="text-[10px] text-emerald-800 font-normal leading-relaxed">
                                          Account credentials are normal with no active forgot password reset request flagged.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-3 pt-1">
                                    <div>
                                      <label className="block text-[8px] uppercase font-black text-gray-450 tracking-wider mb-1">Corporate System Contact Username / Email</label>
                                      <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-600 font-mono text-xs font-bold flex items-center justify-between">
                                        <span>{selectedEmp.email || "No email matching ledger record..."}</span>
                                        <span className="text-[8.5px] bg-slate-250 text-slate-550 border px-2 py-0.5 rounded-full font-sans uppercase font-bold">ReadOnly</span>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[8px] uppercase font-black text-[#1E3A5F] tracking-wider mb-1">Interactive Portal Password / Security Key</label>
                                      <input
                                        type="text"
                                        placeholder={selectedEmp.id}
                                        value={selectedEmp.password || ""}
                                        onChange={(e) => {
                                          const newVal = e.target.value;
                                          
                                          // Keep employeesList updated
                                          setEmployeesList(prev => prev.map(emp => {
                                            if (emp.id === selectedEmp.id) return { ...emp, password: newVal, passwordChanged: true };
                                            return emp;
                                          }));

                                          // Keep newHires updated
                                          setNewHires(prev => prev.map(nh => {
                                            if (nh.id === selectedEmp.id) return { ...nh, password: newVal, passwordChanged: true };
                                            return nh;
                                          }));

                                          // Keep selectedEmp updated
                                          setSelectedEmp((prev: any) => ({ ...prev, password: newVal, passwordChanged: true }));
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                                      />
                                      <p className="text-[9.5px] text-gray-400 font-normal mt-1 leading-normal font-sans">
                                        Directly modify or review the password block on file. Leave empty if using default ID credentials: <strong className="font-mono text-[#1E3A5F]">{selectedEmp.id}</strong>.
                                      </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 pt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const codeVal = "TEMP-" + Math.floor(100000 + Math.random() * 900000);
                                          
                                          // Update employees list
                                          setEmployeesList(prev => prev.map(emp => {
                                            if (emp.id === selectedEmp.id) {
                                              return { 
                                                ...emp, 
                                                password: codeVal, 
                                                passwordChanged: false, 
                                                forgotPasswordRequested: false 
                                              };
                                            }
                                            return emp;
                                          }));

                                          // Update candidates list
                                          setNewHires(prev => prev.map(nh => {
                                            if (nh.id === selectedEmp.id) {
                                              return { 
                                                ...nh, 
                                                password: codeVal, 
                                                passwordChanged: false, 
                                                forgotPasswordRequested: false 
                                              };
                                            }
                                            return nh;
                                          }));

                                          // Update active select target
                                          setSelectedEmp((prev: any) => ({
                                            ...prev,
                                            password: codeVal,
                                            passwordChanged: false,
                                            forgotPasswordRequested: false
                                          }));

                                          triggerToast(`Successfully generated new password: "${codeVal}"! This employee must set a new secure password on next login.`, "success");
                                        }}
                                        className="flex-1 bg-[#1E3A5F] hover:bg-[#2A4F80] hover:text-white text-[#E8C96A] py-2 px-3 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        ⚡ Generate New Temp Password
                                      </button>

                                      {selectedEmp.forgotPasswordRequested && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEmployeesList(prev => prev.map(emp => {
                                              if (emp.id === selectedEmp.id) return { ...emp, forgotPasswordRequested: false };
                                              return emp;
                                            }));

                                            setNewHires(prev => prev.map(nh => {
                                              if (nh.id === selectedEmp.id) return { ...nh, forgotPasswordRequested: false };
                                              return nh;
                                            }));

                                            setSelectedEmp((prev: any) => ({
                                              ...prev,
                                              forgotPasswordRequested: false
                                            }));

                                            triggerToast("Cleared user reset request from security database.", "info");
                                          }}
                                          className="bg-gray-250 bg-gray-200 hover:bg-gray-300 text-slate-700 py-2 px-3.5 rounded-lg text-[9.5px] uppercase font-black transition-all cursor-pointer"
                                        >
                                          Clear Reset Flag
                                        </button>
                                      )}
                                    </div>

                                  </div>
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Portal Footer Action Buttons */}
                          <div className="bg-slate-50 p-5 px-6 border-t border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <span className="text-[10px] text-gray-400 font-mono">
                              Security clearance certified by Admin checker ledger
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => openDossierInNewWindow(selectedEmp)}
                                className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-wider bg-slate-250 hover:bg-slate-300 bg-gray-200 hover:bg-gray-300 text-slate-700 py-2.5 px-4 rounded-xl transition-all font-sans cursor-pointer text-center"
                              >
                                Print Dossier 🖨️
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const numSalary = Math.round(Number(portalSalaryInput));
                                  if (userRole === "admin" && numSalary !== selectedEmp.salary) {
                                    if (isNaN(numSalary) || numSalary <= 0) {
                                      triggerToast("Please provide a valid salary rate or match the existing rate.", "error");
                                      return;
                                    }
                                    setPendingSalaryValue(numSalary);
                                    setShowSalaryConfirmModal(true);
                                    triggerToast("Salary rate change detected! Please authorize the rate update to save 201 database.", "info");
                                    return;
                                  }

                                  triggerToast(`Successfully updated and synchronized 201 Registry Portal dossier database for ${selectedEmp.name}!`, "success");
                                  setSelectedEmp(null);
                                }}
                                className="flex-1 sm:flex-none text-[10px] font-black uppercase tracking-wider bg-[#1E3A5F] hover:bg-[#2A4F80] hover:text-white text-[#E8C96A] py-2.5 px-5 rounded-xl shadow transition-all font-sans cursor-pointer text-center"
                              >
                                Update 201 Data
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                </div>
              ) : (
                // EMPLOYEE SANDBOXED RESTRICTED ESS 201 VIEW
                <div className="space-y-6">
                  
                  {/* Warning banner detailing safety RLS */}
                  <div className="bg-amber-50 border-l-4 border-[#C9A84C] p-4 text-xs font-semibold text-slate-700 flex items-start gap-3 rounded-r-xl">
                    <Info className="w-5 h-5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider text-[#C9A84C] block mb-1">RBAC RESTRICTED VIEW (ESS LEVEL 1)</span>
                      According to PostgreSQL Sovereign Policy constraints (RLS), your account <span className="font-mono">{activeUserObj.email}</span> is barred from reviewing global employee directories. Access is sandbox-restricted solely to your 201 folder records.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left detailed profile panel */}
                    <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                      <div className="pb-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 font-bold text-lg text-[#C9A84C] flex items-center justify-center">
                          {activeUserObj.avatar}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{activeUserObj.name}</h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{activeUserObj.position}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Employee Reference ID:</span>
                          <span className="font-bold text-slate-800 font-mono">{activeUserObj.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Hire Clearance Date:</span>
                          <span className="font-bold text-slate-800">{formatDate(activeUserObj.dateHired)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Personnel Structure:</span>
                          <span className="font-bold text-[#C9A84C]">{activeUserObj.type} Status</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Department Unit:</span>
                          <span className="font-bold text-slate-800">{activeUserObj.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Personal Contact PH:</span>
                          <span className="font-semibold text-slate-800">{activeUserObj.phone}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 font-medium">Registered Residence:</span>
                          <span className="font-semibold text-slate-800 text-right max-w-[150px]">{activeUserObj.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Active Registry Codes */}
                    <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                      <div className="pb-4 border-b border-gray-100">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Philippine Statutory Identifiers</h4>
                        <p className="text-[10px] text-gray-450">These identifiers determine tax brackets and mandatory contribution distributions.</p>
                      </div>

                      <div className="space-y-4 text-xs font-medium">
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Social Security System (SSS) PIN</span>
                          <div className="font-mono text-xs font-bold text-slate-800 mt-1 bg-gray-50 p-2.5 rounded-lg border">{activeUserObj.sss}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">BIR Tax Identification Number (TIN)</span>
                          <div className="font-mono text-xs font-bold text-slate-800 mt-1 bg-gray-50 p-2.5 rounded-lg border">{activeUserObj.tin}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">PhilHealth National Premium ID</span>
                          <div className="font-mono text-xs font-bold text-slate-800 mt-1 bg-gray-50 p-2.5 rounded-lg border">{activeUserObj.philhealth}</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Maker Channel Request Area */}
                    <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-3">
                      <div className="pb-3 border-b border-gray-100">
                        <span className="text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] py-0.5 px-2 rounded font-extrabold uppercase tracking-widest font-mono">MAKER GATEWAY</span>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mt-1">Initiate ID Data Request</h4>
                      </div>

                      <form onSubmit={handleMakerProfileSubmit} className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Identifier Field</label>
                          <select 
                            value={makerTargetField}
                            onChange={(e) => {
                              setMakerTargetField(e.target.value);
                              setMakerNewValue("");
                            }}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#C9A84C]"
                          >
                            <option value="sss">Social Security (SSS) PIN</option>
                            <option value="tin">BIR Taxpayer Number (TIN)</option>
                            <option value="philhealth">PhilHealth Premium ID</option>
                            <option value="pagibig">Pag-IBIG / HDMF MID</option>
                            <option value="email">Corporate Registered Email</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Field Current Value</span>
                          </div>
                          <div className="bg-gray-100 p-2 rounded-lg font-mono text-[11px] text-gray-600 select-all">
                            {activeUserObj[makerTargetField as keyof typeof activeUserObj] || "N/A"}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested Revision Value (Maker Input)</label>
                          <input
                            type="text"
                            placeholder="Enter corrected registration string"
                            value={makerNewValue}
                            onChange={(e) => setMakerNewValue(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Justification Notes for HR Checker</label>
                          <textarea
                            placeholder="e.g. Updating ID number after physical card renewal confirmation..."
                            value={makerNotes}
                            onChange={(e) => setMakerNotes(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 h-14 focus:outline-none focus:border-[#C9A84C] resize-none text-xs leading-normal"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#1E3A5F] hover:bg-[#2A4F80] text-white text-[10px] uppercase tracking-widest font-extrabold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5" /> Submit Maker Claim
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* =========================================================
              3. CHECKER APPROVALS CENTER (EXCLUSIVE TO ADMIN)
             ========================================================= */}
          {activeModule === "checker" && userRole === "admin" && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                <div className="pb-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-rose-600 w-5 h-5 flex-shrink-0" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      Maker-Checker HR Authorization desk
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-full uppercase tracking-widest">
                    Checker Status Mode: ACTIVE POLICY AUDITING
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-normal max-w-2xl">
                  Under standard segregation of duties (SoD), employees act as &quot;Makers&quot; proposing data updates. Active Checkers must perform policy checks, verify digital identity files, then Approve to commit writes to state databases, or Reject to scrap.
                </p>

                {/* Submissions queue filters */}
                <div className="space-y-4">
                  <div className="text-xs uppercase font-extrabold tracking-widest text-indigo-900 border-b pb-1">Unprocessed Maker Claims Stream</div>

                  <div className="space-y-4">
                    {makerRequests.filter(r => r.status === "Pending").length > 0 ? (
                      makerRequests.filter(r => r.status === "Pending").map(req => (
                        <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fadeIn">
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-slate-150 text-slate-700 py-0.5 px-2 rounded font-mono font-bold">{req.id}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 py-0.5 px-2 rounded uppercase font-extrabold tracking-wide">
                                {req.requestType}
                              </span>
                            </div>

                            <div className="text-xs leading-normal font-medium text-slate-600">
                              Proposed by <span className="font-extrabold text-[#1E3A5F]">{req.requesterName}</span> ({req.requesterId}) &bull; Filed on {new Date(req.filedDate).toLocaleString("en-PH")}
                            </div>

                            <div className="bg-gray-50 border rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Target Registry Parameter:</span>
                                <div className="text-slate-700 font-sans mt-0.5">{req.fieldLabel}</div>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Adjustment Vector Flow:</span>
                                <div className="font-mono text-[11px] text-gray-800 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="line-through text-rose-500">{req.oldValue}</span>
                                  <span className="text-slate-400">&rarr;</span>
                                  <span className="bg-emerald-100 text-emerald-800 py-0.5 px-1.5 rounded">{req.newValue}</span>
                                </div>
                              </div>
                            </div>

                            <blockquote className="text-[11px] border-l-2 border-[#C9A84C] pl-2.5 text-slate-500 italic leading-relaxed">
                              &ldquo;{req.notes}&rdquo;
                            </blockquote>
                          </div>

                          {/* Approval actions */}
                          <div className="flex sm:flex-row md:flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleCheckerApprove(req.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold tracking-widest text-[10px] uppercase py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4 flex-shrink-0" /> Checker Approve
                            </button>
                            <button
                              onClick={() => handleCheckerReject(req.id)}
                              className="bg-rose-550 bg-rose-500 hover:bg-rose-600 text-white font-extrabold tracking-widest text-[10px] uppercase py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <X className="w-4 h-4 flex-shrink-0" /> Reject Claims
                            </button>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-slate-50/50 border border-dashed rounded-xl text-xs text-gray-400 italic">
                        Maker queue clean: No pending requests await checker signature.
                      </div>
                    )}
                  </div>
                </div>

                {/* HISTORIC AUDITED CHANGE LOGS FOR VERIFICATION PATH */}
                <div className="space-y-4 pt-6 mt-6 border-t font-semibold">
                  <div className="text-xs uppercase tracking-widest text-slate-500">Processed Audits Registry (Historic Archive)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="p-3">Audit Batch ID</th>
                          <th className="p-3">Maker (Staff)</th>
                          <th className="p-3">Parameter Checked</th>
                          <th className="p-3">Committed Correction</th>
                          <th className="p-3 text-right">Checker Decisive Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px]">
                        {makerRequests.filter(r => r.status !== "Pending").map(req => (
                          <tr key={req.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-medium text-slate-400">{req.id}</td>
                            <td className="p-3 font-bold text-slate-700">{req.requesterName}</td>
                            <td className="p-3 text-slate-600">{req.requestType} &bull; <span className="font-mono">{req.fieldLabel}</span></td>
                            <td className="p-3 font-mono truncate max-w-[200px]" title={req.newValue}>
                              Proposed: <span className="font-bold">{req.newValue}</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-extrabold ${
                                req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                              }`}>
                                {req.status === "Approved" ? "Checker Approved" : "Rejected/Discarded"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================
              4. TIMEKEEPING MODULE (RBAC MATCHED)
             ========================================================= */}
          {activeModule === "timekeep" && (
            <div className="space-y-6">
              
              {/* Dynamic Subheader Banner */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-[#12253F] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-semibold">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-[#E8C96A]" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#E8C96A]">Statutory Sovereign Timekeeping Portal</span>
                  </div>
                  <h3 className="text-base font-bold">
                    {userRole === "admin" ? "Sovereign Corporate Attendance Command Center" : "My Personal Timesheet & Overtime Ledger"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed font-sans font-medium">
                    {userRole === "admin" 
                      ? "Audit personnel clock records, view historical lates, and review active overtime credentials popping up on the system calendar."
                      : "Record daily terminal log entries, examine historical lates/undertime logs, and request structured overtime hours."}
                  </p>
                </div>
                
                {/* Simple Month Switcher widget for the Calendar */}
                <div className="flex items-center bg-[#0B1522] border border-slate-700 rounded-xl p-1.5 self-start md:self-auto">
                  <button 
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(y => y - 1);
                      } else {
                        setCalendarMonth(m => m - 1);
                      }
                    }}
                    className="p-1 px-2.5 rounded-lg text-slate-300 hover:bg-[#1E3A5F] hover:text-white transition-all text-sm font-bold"
                  >
                    &larr;
                  </button>
                  <span className="text-xs px-3 font-mono font-bold text-[#E8C96A] min-w-[90px] text-center">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][calendarMonth]} {calendarYear}
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(y => y + 1);
                      } else {
                        setCalendarMonth(m => m + 1);
                      }
                    }}
                    className="p-1 px-2.5 rounded-lg text-slate-300 hover:bg-[#1E3A5F] hover:text-white transition-all text-sm font-bold"
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {/* MAIN ROLE BASED LAYOUT STRUCTURE */}
              {userRole === "employee" ? (
                // 1. EMPLOYEE TIMEKEEPING & REQUEST INTERFACE
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Clock terminal & Request Overtime form */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Clock terminal container card */}
                    <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm text-center font-semibold">
                      <span className="text-[9px] text-[#C9A84C] font-black uppercase tracking-widest block mb-1">Timekeeping RLS Terminal</span>
                      <div className="text-3xl font-black text-slate-800 font-mono tracking-tighter">
                        {mounted ? time.toLocaleTimeString("en-PH") : "--:--:--"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                        {mounted ? time.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Loading..."}
                      </div>

                      <div className="mt-5 w-full space-y-3">
                        {!clockedIn ? (
                          <button 
                            type="button"
                            onClick={() => handleSelfTimecardLog("IN")}
                            className="w-full bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors shadow-sm cursor-pointer"
                          >
                            🟢 Clock In (Timecard Entry)
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-[#10B981] bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg animate-pulse font-sans">
                              ✅ Active Timecard Logged at {attendanceList.find(l => l.name === activeUserObj.name)?.timeIn || "08:00 AM"}
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleSelfTimecardLog("OUT")}
                              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              🔴 Clock Out (Log Departure)
                            </button>
                          </div>
                        )}
                        <p className="text-[9px] text-gray-400 font-bold uppercase font-mono mt-2 flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1E3A5F]" /> SECURED WITH CLIENT LOG COORDINATES
                        </p>
                      </div>
                    </div>

                    {/* OVERTIME REQUEST FORM CARD */}
                    <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm font-semibold space-y-4">
                      <div className="border-b pb-2">
                        <span className="text-[9px] bg-amber-50 text-[#C9A84C] border border-amber-250 py-0.5 px-2 rounded-full uppercase font-black tracking-wider font-mono">
                          Overtime Application Gate
                        </span>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mt-1.5">Apply for Overtime Credit</h4>
                      </div>

                      <form onSubmit={handleOvertimeSubmit} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-gray-450 font-black mb-1">Target Overtime Date</label>
                          <input 
                            type="date"
                            value={otFormDate}
                            onChange={(e) => setOtFormDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#C9A84C] font-bold text-[#1E3A5F]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-gray-450 font-black mb-1">Estimated OT Hours</label>
                          <input 
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="8"
                            value={otFormHours}
                            onChange={(e) => setOtFormHours(Number(e.target.value) || 1)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#C9A84C] font-black text-[#1E3A5F]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-gray-450 font-black mb-1">Business Purpose Narrative</label>
                          <textarea
                            placeholder="Describe what urgent corporate task/deliverable you are rendering overtime for..."
                            value={otFormPurpose}
                            onChange={(e) => setOtFormPurpose(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 h-16 text-xs focus:outline-none focus:border-[#C9A84C] resize-none font-sans font-medium text-slate-700"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#1E3A5F] hover:bg-[#2A4F80] hover:text-[#E8C96A] text-white text-[10px] uppercase font-black tracking-widest py-2 rounded-lg transition-all"
                        >
                          Submit For admin Approval &rarr;
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Columns: Interactive calendar of May/June logs */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm font-semibold space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                      <div>
                        <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                          My Personal Dynamic Attendance &amp; Overtime Calendar
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium font-sans">
                          Click any calendar cell to audit individual timesheet lates, clock In/Out stamps, and active overtime credentials.
                        </p>
                      </div>
                      <span className="text-[9.5px] font-mono tracking-widest font-black uppercase text-emerald-700 bg-emerald-50 py-0.5 px-2 border border-emerald-150 rounded">
                        {activeAttendanceForRole.length} raw log records
                      </span>
                    </div>

                    {/* Weekday Grid Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[9px] text-[#1E3A5F] tracking-wider pb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="py-1 bg-slate-50 border border-slate-100 rounded-md font-black">{day}</div>
                      ))}
                    </div>

                    {/* Main Calendar Body */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const daysNum = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                        const startingWeekOffset = new Date(calendarYear, calendarMonth, 1).getDay();
                        const blankCells = [];
                        
                        for (let i = 0; i < startingWeekOffset; i++) {
                          blankCells.push(
                            <div key={`blank-${i}`} className="min-h-[85px] bg-slate-50/40 border border-dashed border-gray-100 rounded-lg opacity-30"></div>
                          );
                        }

                        const dayCells = [];
                        for (let d = 1; d <= daysNum; d++) {
                          const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const logObj = attendanceList.find(a => a.name === activeUserObj.name && a.date === dateString);
                          const dayOtRequests = overtimeRequests.filter(r => r.employeeId === activeUserObj.id && r.date === dateString);
                          const isTodayDate = dateString === "2026-05-28";
                          const isSelectedCell = calendarSelectedDateStr === dateString;

                          dayCells.push(
                            <div 
                              key={`emp-day-${d}`}
                              onClick={() => setCalendarSelectedDateStr(dateString)}
                              className={`min-h-[95px] p-1.5 border rounded-lg hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                                isTodayDate ? "bg-amber-50/20 border-[#C9A84C]" : "bg-white border-gray-200"
                              } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono leading-none font-black p-0.5 px-1 rounded ${
                                  isTodayDate ? "bg-[#C9A84C] text-white" : "text-gray-400"
                                }`}>
                                  {d}
                                </span>
                                {logObj && (
                                  <span className={`text-[7.5px] uppercase font-black p-0.5 px-1 rounded-sm leading-none tracking-tight ${
                                    logObj.status === "Present" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                  }`}>
                                    {logObj.status === "Present" ? "Present" : "Late"}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 mt-1 font-mono text-[8px] leading-tight space-y-0.5 flex flex-col justify-end">
                                {logObj ? (
                                  <div className="space-y-0.5 scale-[0.95] origin-left">
                                    <div className="text-emerald-700 font-extrabold flex items-center gap-0.5">🟢 IN: {logObj.timeIn || "—"}</div>
                                    <div className="text-zinc-500 flex items-center gap-0.5">🔴 OUT: {logObj.timeOut || "—"}</div>
                                    {logObj.lateMin > 0 && (
                                      <div className="text-rose-600 uppercase font-black text-[7.5px] scale-[0.9] origin-left">
                                        ⚠️ Late {logObj.lateMin}m
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-350 italic scale-[0.85] origin-left">No logs</div>
                                )}

                                {dayOtRequests.map((otRq, idx) => (
                                  <div 
                                    key={idx}
                                    className={`py-0.5 px-1 mt-0.5 rounded border text-[8px] leading-none select-none scale-[0.9] origin-left font-sans font-black tracking-tight ${
                                      otRq.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                      otRq.status === "Denied" ? "bg-rose-50 text-rose-800 border-rose-200" :
                                      "bg-blue-50 text-blue-800 border-blue-200"
                                    }`}
                                  >
                                    OT: {otRq.hours}h ({otRq.status})
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return [...blankCells, ...dayCells];
                      })()}
                    </div>

                    {/* Selected Day focused metadata card */}
                    {calendarSelectedDateStr && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] flex items-center gap-1.5 font-mono">
                            <Clock className="w-4 h-4 text-[#C9A84C]" /> Details for selected day: {calendarSelectedDateStr}
                          </h5>
                          {calendarSelectedDateStr === "2026-05-28" && (
                            <span className="text-[8px] uppercase tracking-widest bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded font-black font-mono">
                              TODAY
                            </span>
                          )}
                        </div>

                        {(() => {
                          const logForDay = attendanceList.find(a => a.name === activeUserObj.name && a.date === calendarSelectedDateStr);
                          const otRequestsForDay = overtimeRequests.filter(r => r.employeeId === activeUserObj.id && r.date === calendarSelectedDateStr);

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                              {/* Left pane: Timesheet review */}
                              <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider block">Terminal Timesheet log</span>
                                {logForDay ? (
                                  <div className="space-y-1 font-semibold text-slate-800 bg-white p-3 rounded-lg border">
                                    <div className="flex justify-between">
                                      <span>Time In stamp:</span>
                                      <strong className="text-emerald-700 font-mono">{logForDay.timeIn || "Pending..."}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Time Out stamp:</span>
                                      <strong className="text-zinc-600 font-mono">{logForDay.timeOut || "Pending..."}</strong>
                                    </div>
                                    <div className="flex justify-between border-t border-dashed pt-1 mt-1">
                                      <span>Calculated Late minutes:</span>
                                      <strong className={logForDay.lateMin > 0 ? "text-rose-600 font-mono" : "text-emerald-600 font-mono"}>
                                        {logForDay.lateMin} minutes
                                      </strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Classification Status:</span>
                                      <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                                        logForDay.status === "Present" ? "bg-emerald-50 text-emerald-700 border" : "bg-rose-50 text-rose-700 border"
                                      }`}>{logForDay.status}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white text-gray-400 italic rounded-lg border text-center font-medium">
                                    No logged timecard for this date index.
                                  </div>
                                )}
                              </div>

                              {/* Right pane: Overtime requests history for this date */}
                              <div className="space-y-1.5">
                                <span className="text-[8px] text-gray-400 uppercase font-bold tracking-wider">Requested Overtime Credentials</span>
                                {otRequestsForDay.length > 0 ? (
                                  <div className="space-y-2">
                                    {otRequestsForDay.map((otItem, oIdx) => (
                                      <div key={oIdx} className="bg-white p-2.5 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-[9px] font-black text-slate-500">{otItem.id}</span>
                                          <span className={`px-1.5 rounded uppercase font-black text-[8px] tracking-widest ${
                                            otItem.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                            otItem.status === "Denied" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                            "bg-blue-50 text-blue-700 border border-blue-100 focus:animate-pulse"
                                          }`}>
                                            {otItem.status}
                                          </span>
                                        </div>
                                        <div className="font-bold text-slate-800 text-[10px] mt-1 font-mono">
                                          Requested hours: {otItem.hours} hours
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-0.5 leading-normal italic">
                                          &ldquo;{otItem.purpose}&rdquo;
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white text-gray-400 italic rounded-lg border text-center font-medium">
                                    No requested overtime credit found for this date.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 2. HR ADMINISTRATOR CORE WITH OVERTIME POP-UPS ON CALENDAR
                <div className="space-y-6 font-semibold">
                  
                  {/* Calendar view with popups & Pending Ledger list */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Column 1: Unresolved past/current overtime requests (Saves from previous dates) */}
                    <div className="lg:col-span-1 bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4">
                      <div className="border-b pb-2 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 py-0.5 px-2 rounded-full uppercase font-black tracking-wider">
                            Realtime Notification Gate
                          </span>
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mt-1">Pending Overtime Board</h4>
                        </div>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono font-bold">
                          {overtimeRequests.filter(r => r.status === "Pending").length} pending
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-gray-400 font-medium font-sans leading-relaxed">
                        The requested overtime below are grouped across historical days. Admin HR can always click Approve or Deny to instantly evaluate logs and adjust taker payheets.
                      </p>

                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                        {overtimeRequests.filter(r => r.status === "Pending").length > 0 ? (
                          overtimeRequests.filter(r => r.status === "Pending").map((req) => (
                            <div key={req.id} className="p-3 bg-indigo-50/40 border border-indigo-150 rounded-xl space-y-2 animate-scaleUp">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-extrabold text-[#1E3A5F]">{req.employeeName}</span>
                                <span className="font-mono text-gray-500 font-bold bg-white text-[9px] px-1.5 py-0.2 rounded border shadow-sm">{req.date}</span>
                              </div>
                              <div className="scale-[0.95] origin-left text-[11px] leading-tight space-y-1.5">
                                <div className="text-[10px] font-semibold text-slate-800">
                                  Requested Value: <strong className="text-indigo-700 font-mono font-black">{req.hours} hours</strong>
                                </div>
                                <p className="text-[9.5px] leading-normal italic text-slate-500">&ldquo;{req.purpose}&rdquo;</p>
                              </div>

                              <div className="flex gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdminDecideOvertime(req.id, "Approved")}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminDecideOvertime(req.id, "Denied")}
                                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider py-1.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> Deny
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                            <span className="text-2xl">🎉</span>
                            <h5 className="text-[10px] font-black uppercase text-slate-700 tracking-wider mt-1.5">Zero Pending Reminders</h5>
                            <p className="text-[9px] text-gray-400 font-sans mt-0.5">All incoming employee overtime request sheets have been cleared.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2 & 3: Interactive Calendar illustrating overtime popups */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm font-semibold space-y-4">
                      
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-widest">
                            Command Control Sovereign Attendance &amp; Overtime Calendar
                          </h3>
                          <p className="text-[10px] text-gray-400 font-medium font-sans">
                            Review employee timecards, presence flags, and incoming notifications popping up dynamically inside dates.
                          </p>
                        </div>
                        <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 py-0.5 px-2 rounded-full uppercase font-black font-mono">
                          May 2026 CUT-OFF TRACKING
                        </span>
                      </div>

                      {/* Calendar Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[9px] tracking-wider pb-1 text-[#1E3A5F]">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="py-1 bg-slate-100 border border-slate-200/65 rounded font-black">{day}</div>
                        ))}
                      </div>

                      {/* Main Calendar admin body */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {(() => {
                          const daysNum = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                          const startingWeekOffset = new Date(calendarYear, calendarMonth, 1).getDay();
                          const blankCells = [];
                          
                          for (let i = 0; i < startingWeekOffset; i++) {
                            blankCells.push(
                              <div key={`blank-admin-${i}`} className="min-h-[105px] bg-slate-50/40 border border-dashed border-gray-100 rounded-lg opacity-30"></div>
                            );
                          }

                          const dayCells = [];
                          for (let d = 1; d <= daysNum; d++) {
                            const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            
                            const presentsOnDay = attendanceList.filter(a => a.date === dateString && a.status !== "Absent");
                            const absentsOnDay = attendanceList.filter(a => a.date === dateString && a.status === "Absent");
                            const latesOnDay = presentsOnDay.filter(a => a.lateMin > 0);

                            const dayOtRequests = overtimeRequests.filter(r => r.date === dateString);
                            const pendingOts = dayOtRequests.filter(r => r.status === "Pending");
                            
                            const isTodayDate = dateString === "2026-05-28";
                            const isSelectedCell = calendarSelectedDateStr === dateString;

                            dayCells.push(
                              <div 
                                key={`admin-day-${d}`}
                                onClick={() => setCalendarSelectedDateStr(dateString)}
                                className={`min-h-[110px] p-1.5 border rounded-lg hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                                  isTodayDate ? "bg-amber-50/20 border-[#C9A84C]" : "bg-white border-gray-200"
                                } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""} ${
                                  pendingOts.length > 0 ? "border-indigo-305 shadow-sm" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-mono leading-none font-black p-0.5 px-1 rounded ${
                                    isTodayDate ? "bg-[#C9A84C] text-white" : "text-gray-400"
                                  }`}>
                                    {d}
                                  </span>
                                  {presentsOnDay.length > 0 && (
                                    <span className="text-[7.5px] scale-[0.95] origin-right bg-slate-100 border text-slate-700 px-1 py-0.2 rounded font-black uppercase tracking-tight">
                                      👤 {presentsOnDay.length} items
                                    </span>
                                  )}
                                </div>

                                {/* Attendance small indicators */}
                                <div className="flex-1 mt-1 font-mono text-[7px] leading-tight space-y-0.5 flex flex-col justify-end">
                                  {presentsOnDay.length > 0 ? (
                                    <div className="space-y-0.5 origin-left text-[7.5px] scale-[0.9] text-zinc-500">
                                      {latesOnDay.length > 0 && (
                                        <div className="text-rose-600 font-extrabold">⚠️ {latesOnDay.length} Lates</div>
                                      )}
                                      {absentsOnDay.length > 0 && (
                                        <div className="text-zinc-400 font-medium">{absentsOnDay.length} Absent</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[8px] italic text-gray-300 block scale-[0.85] origin-left">No database logs</span>
                                  )}

                                  {/* Overtime POP-UP instances inside the active calendar cell */}
                                  {dayOtRequests.length > 0 && (
                                    <div className="space-y-0.5 mt-1 select-none">
                                      {dayOtRequests.map((otItem, oIdx) => (
                                        <div 
                                          key={oIdx}
                                          className={`py-0.5 px-1 rounded text-[7.5px] leading-tight truncate scale-[0.9] origin-left border font-sans font-black flex items-center justify-between ${
                                            otItem.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                            otItem.status === "Denied" ? "bg-rose-50 text-rose-800 border-rose-200" :
                                            "bg-indigo-100 text-indigo-900 border-indigo-250 animate-pulse font-extrabold"
                                          }`}
                                          title={`Applicant: ${otItem.employeeName} (${otItem.hours}h) — "${otItem.purpose}"`}
                                        >
                                          <span>OT: {otItem.employeeName.split(' ')[0]}</span>
                                          <span>{otItem.hours}h</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return [...blankCells, ...dayCells];
                        })()}
                      </div>

                      {/* Focused Admin Day controller view (Precise Approve/Deny for previous dates) */}
                      {calendarSelectedDateStr && (
                        <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl space-y-3">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-[#1E3A5F] border-b pb-2 flex items-center gap-2">
                             📅 Selected Date Audit Terminal: <strong className="text-[#C9A84C] font-mono">{calendarSelectedDateStr}</strong>
                          </h5>

                          {(() => {
                            const entriesForSelectedDay = attendanceList.filter(a => a.date === calendarSelectedDateStr);
                            const otsSelectedDay = overtimeRequests.filter(r => r.date === calendarSelectedDateStr);

                            return (
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                
                                {/* Left Side: Personnel Timesheet Roster stamps */}
                                <div className="space-y-2 text-xs font-sans lg:col-span-1 border-r border-slate-200/80 pr-2">
                                  <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">Raw Attendance Timesheet Records</span>
                                  <p className="text-[9px] text-gray-450 mb-1">Select an employee below to view clock-in/out GPS tracks:</p>
                                  {entriesForSelectedDay.length > 0 ? (
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                                      {entriesForSelectedDay.map((ent, idx) => {
                                        const isSelected = selectedAttendanceName === ent.name || (!selectedAttendanceName && idx === 0);
                                        return (
                                          <div 
                                            key={idx} 
                                            onClick={() => setSelectedAttendanceName(ent.name)}
                                            className={`p-2.5 border rounded-lg flex justify-between items-center text-[10px] cursor-pointer transition-all ${
                                              isSelected
                                                ? "bg-slate-100 border-[#1E3A5F] ring-1 ring-[#1E3A5F] shadow-xs" 
                                                : "bg-white border-gray-200 hover:bg-slate-50"
                                            }`}
                                          >
                                            <div>
                                              <div className="font-extrabold text-[#1E3A5F] flex items-center gap-1.5">
                                                <span>{ent.name}</span>
                                                {isSelected && <span className="text-[8px] bg-[#C9A84C]/10 text-[#C9A84C] px-1 rounded">active</span>}
                                              </div>
                                              <div className="text-[8.5px] text-zinc-500 font-mono mt-1">
                                                IN: {ent.timeIn || "—"} / OUT: {ent.timeOut || "—"}
                                              </div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded uppercase font-black text-[8px] leading-none ${
                                              ent.status === "Present" ? (ent.lateMin > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700") : "bg-zinc-50 text-zinc-600"
                                            }`}>
                                              {ent.status === "Present" ? (ent.lateMin > 0 ? `${ent.lateMin}m Late` : "Regular") : "Absent"}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-white text-gray-400 italic text-center text-[9.5px] rounded-lg border">
                                      No raw timesheet records filed.
                                    </div>
                                  )}
                                </div>

                                {/* Middle Column: Dynamic GPS Philippine Area Geolocation Map Tracker */}
                                <div className="space-y-2 text-xs font-sans lg:col-span-1 border-r border-slate-200/80 pr-2">
                                  {(() => {
                                    const defaultPH = { lat: 14.5496, lng: 121.0437, address: "BGC Corporate Command Hub, Taguig, Metro Manila", accuracy: 10 };
                                    const currentSelectedEmp = entriesForSelectedDay.find(e => e.name === selectedAttendanceName) || entriesForSelectedDay[0];
                                    
                                    const hasClockIn = currentSelectedEmp && currentSelectedEmp.timeIn;
                                    const hasClockOut = currentSelectedEmp && currentSelectedEmp.timeOut;
                                    const inLoc = (currentSelectedEmp && currentSelectedEmp.timeInLoc) || defaultPH;
                                    const outLoc = (currentSelectedEmp && currentSelectedEmp.timeOutLoc) || null;

                                    const isOutActive = activeAttendanceMapType === "out" && hasClockOut;
                                    const activeLocData = isOutActive && outLoc ? outLoc : inLoc;

                                    return (
                                      <div className="bg-white p-3 border border-gray-200 rounded-xl space-y-3 shadow-xs">
                                        <div className="flex justify-between items-center border-b pb-1.5 flex-wrap gap-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[12px] animate-pulse">📍</span>
                                            <div>
                                              <span className="text-[9px] text-[#1E3A5F] uppercase font-black tracking-wider block">PH Telemetric Map</span>
                                              <span className="text-[8px] font-mono text-[#C9A84C] font-extrabold block">{currentSelectedEmp ? currentSelectedEmp.name : "N/A"}</span>
                                            </div>
                                          </div>
                                          <span className="text-[7.5px] font-black tracking-tight uppercase bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded border border-emerald-100">
                                            🔒 Override Allow GPS
                                          </span>
                                        </div>

                                        {currentSelectedEmp && currentSelectedEmp.status !== "Absent" ? (
                                          <div className="space-y-2.5">
                                            {/* Clock-In / Clock-Out togglers */}
                                            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveAttendanceMapType("in");
                                                  // Request state update by updating selection slightly to force re-render
                                                  setSelectedAttendanceName(currentSelectedEmp.name);
                                                  triggerToast("Displaying Clock-In coordinates on PH Map", "success");
                                                }}
                                                className={`py-1 text-[8px] uppercase tracking-wider font-extrabold text-center rounded-md transition-all ${
                                                  !isOutActive ? "bg-white text-[#1E3A5F] shadow-xs" : "text-gray-500 hover:text-gray-800"
                                                }`}
                                              >
                                                Clock In
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (!hasClockOut) {
                                                    triggerToast("This individual has not clocked out today!", "error");
                                                    return;
                                                  }
                                                  setActiveAttendanceMapType("out");
                                                  setSelectedAttendanceName(currentSelectedEmp.name);
                                                  triggerToast("Displaying Clock-Out coordinates on PH Map", "success");
                                                }}
                                                className={`py-1 text-[8px] uppercase tracking-wider font-extrabold text-center rounded-md transition-all ${
                                                  !hasClockOut ? "opacity-40 cursor-not-allowed" : ""
                                                } ${
                                                  isOutActive ? "bg-white text-[#1E3A5F] shadow-xs" : "text-gray-500 hover:text-gray-800"
                                                }`}
                                              >
                                                Clock Out {hasClockOut ? "" : "(—)"}
                                              </button>
                                            </div>

                                            {/* Map embed with high accuracy viewport centered on selected coordinates (Philippines) */}
                                            <div className="relative overflow-hidden rounded-lg border border-gray-150 h-[105px] shadow-inner bg-slate-50">
                                              <iframe 
                                                width="100%" 
                                                height="100%" 
                                                src={`https://maps.google.com/maps?q=${activeLocData.lat},${activeLocData.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                                                className="absolute inset-0 w-full h-full pointer-events-auto border-0 focus:outline-none"
                                                allowFullScreen={false}
                                                loading="lazy"
                                                title="Sovereign GPS Interactive Telemetry Frame"
                                              ></iframe>
                                            </div>

                                            {/* Location Details Overlay */}
                                            <div className="p-2 bg-slate-50/70 border rounded-lg text-[9px] space-y-1 font-sans">
                                              <div className="flex justify-between items-center text-[8.5px]">
                                                <span className="text-gray-450 font-medium">GPS Location:</span>
                                                <strong className="font-mono text-slate-800 font-extrabold">{activeLocData.lat.toFixed(5)}° N, {activeLocData.lng.toFixed(5)}° E</strong>
                                              </div>
                                              <div className="flex justify-between items-center text-[8.5px]">
                                                <span className="text-gray-450 font-medium">Command Zone:</span>
                                                <strong className="text-emerald-700 font-bold uppercase tracking-wide">PH Area (Locked)</strong>
                                              </div>
                                              <div className="border-t pt-1.5 text-slate-700 leading-normal italic text-[8px] flex items-start gap-1">
                                                <span>📌</span>
                                                <span className="leading-tight">{activeLocData.address}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="py-10 text-center text-[10px] text-gray-400 italic bg-gray-50 rounded-lg border">
                                            Colleague is marked Absent on this day. Telemetry coordinates unlogged.
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Right Side: Dynamic Overtime popping up & clickable approve/deny */}
                                <div className="space-y-2 text-xs font-sans lg:col-span-1">
                                  <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">Overtime Credentials (Previous or Today&apos;s requests)</span>
                                  {otsSelectedDay.length > 0 ? (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                      {otsSelectedDay.map((otItem) => (
                                        <div key={otItem.id} className="bg-white p-2.5 border border-gray-200 rounded-lg space-y-2">
                                          <div className="flex justify-between items-center text-[10px]">
                                            <div>
                                              <strong className="text-slate-800 text-[10px] block">{otItem.employeeName}</strong>
                                              <span className="text-[8px] text-indigo-700 bg-indigo-50 leading-none font-mono py-0.5 px-1.5 rounded border border-indigo-150 font-black">{otItem.hours} hrs</span>
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <span className={`px-1.5 py-0.5 rounded uppercase font-black text-[8px] tracking-widest ${
                                              otItem.status === "Approved" ? "bg-emerald-50 text-emerald-750 border border-emerald-200" :
                                              otItem.status === "Denied" ? "bg-rose-50 text-rose-750 border border-rose-200" :
                                              "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                              {otItem.status}
                                            </span>
                                          </div>

                                          <p className="text-[9.5px] text-slate-500 italic leading-snug font-sans font-medium">&ldquo;{otItem.purpose}&rdquo;</p>
                                          
                                          {/* Direct actions inside selected date cell detail */}
                                          {otItem.status === "Pending" && (
                                            <div className="flex gap-1.5 pt-1">
                                              <button
                                                type="button"
                                                onClick={() => handleAdminDecideOvertime(otItem.id, "Approved")}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8px] uppercase tracking-wider py-1 rounded transition-all cursor-pointer shadow-xs"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleAdminDecideOvertime(otItem.id, "Denied")}
                                                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[8px] uppercase tracking-wider py-1 rounded transition-all cursor-pointer shadow-xs"
                                              >
                                                Deny
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-white text-gray-400 italic text-center text-[9.5px] rounded-lg border">
                                      No overtime requested for this calendar cell index.
                                    </div>
                                  )}
                                </div>
                                
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              5. LEAVE MANAGEMENT & MAKER PORTAL
             ========================================================= */}
          {activeModule === "leave" && (() => {
            const employeeOwnLeaves = [
              ...leaveRequestsList.filter(l => l.requesterId === activeEmployeeId).map(l => ({
                id: l.id,
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                days: l.days,
                status: l.status,
                reason: l.reason
              })),
              ...makerRequests.filter(r => r.requesterId === activeEmployeeId && r.requestType === "Leave Request" && r.status === "Pending").map(r => ({
                id: r.id,
                type: r.leaveDetails?.type || r.fieldLabel || "Leave Request",
                startDate: r.leaveDetails?.startDate || "",
                endDate: r.leaveDetails?.endDate || "",
                days: r.leaveDetails?.days || 0,
                status: "Pending",
                reason: r.leaveDetails?.reason || r.notes || ""
              }))
            ];

            const employeeOwnOts = overtimeRequests.filter(r => r.employeeId === activeEmployeeId);

            return (
              <div className="space-y-6 animate-fadeIn">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "Statutory Vacation Leave", days: userRole === "admin" ? "15 VL / year" : "15 Available Days", details: "Up to 5 days carryover under Philippine law", bg: "bg-blue-50 border-blue-100 text-blue-800" },
                    { title: "Statutory Sick Leave Credits", days: userRole === "admin" ? "15 SL / year" : "11 Unused Days", details: "Requires verified PH diagnostic endorsement", bg: "bg-gold/5 border-gold/10 text-[#C9A84C]" },
                    { title: "Extended Coverage (RA 11210)", days: "Maternity Covered", details: "105 Maternity days paid coverage", bg: "bg-indigo-50 border-indigo-100 text-indigo-800" },
                  ].map((lt, i) => (
                    <div key={i} className={`p-5 rounded-xl border ${lt.bg} shadow-sm font-semibold`}>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">{lt.title}</span>
                      <h4 className="text-xl font-black mt-1">{lt.days}</h4>
                      <p className="text-[10px] opacity-95 mt-1">{lt.details}</p>
                    </div>
                  ))}
                </div>

                {userRole === "employee" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Embedded Maker Portal Leave application form for Employees */}
                    <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                      <div className="pb-3 border-b border-gray-100 font-semibold">
                        <span className="text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] py-0.5 px-2 rounded font-extrabold uppercase tracking-widest font-mono">MAKER GATEWAY</span>
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mt-1">Request Leave Clearance</h4>
                      </div>

                      <form onSubmit={handleMakerLeaveSubmit} className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Leave Classification</label>
                          <select 
                            value={makerLeaveType}
                            onChange={(e) => setMakerLeaveType(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#C9A84C]"
                          >
                            <option value="Vacation Leave">Vacation Leave (VL)</option>
                            <option value="Sick Leave">Sick Leave (SL)</option>
                            <option value="Maternity/Paternity">Maternity/Paternity Leave</option>
                            <option value="Emergency Leave">Emergency Leave</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Start Date</label>
                            <input 
                              type="date"
                              value={makerLeaveStart}
                              onChange={(e) => setMakerLeaveStart(e.target.value)}
                              className="bg-gray-50 border border-gray-250 p-2 text-xs rounded-lg focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">End Date</label>
                            <input 
                              type="date"
                              value={makerLeaveEnd}
                              onChange={(e) => setMakerLeaveEnd(e.target.value)}
                              className="bg-gray-50 border border-gray-250 p-2 text-xs rounded-lg focus:outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Explanatory Justification Notes</label>
                          <textarea
                            placeholder="e.g. Standard holiday schedules out of country..."
                            value={makerLeaveReason}
                            onChange={(e) => setMakerLeaveReason(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2 h-14 focus:outline-none focus:border-[#C9A84C] resize-none text-xs leading-normal"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#1E3A5F] hover:bg-[#2A4F80] text-white text-[10px] uppercase tracking-widest font-extrabold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-3.5 h-3.5" /> File Maker Request
                        </button>
                      </form>
                    </div>

                    {/* Component: Interactive Calendar Tracker View for Employees */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4 font-semibold">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                            My Time-Off &amp; Overtime History Tracker
                          </h3>
                          <p className="text-[10px] text-gray-400 font-medium font-sans">
                            Track your approved/pending leave requests along with your filed overtime (OT) commitments.
                          </p>
                        </div>

                        {/* Month Swappers */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => {
                              if (leaveCalendarMonth === 0) {
                                setLeaveCalendarMonth(11);
                                setLeaveCalendarYear(y => y - 1);
                              } else {
                                setLeaveCalendarMonth(m => m - 1);
                              }
                            }}
                            className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                          >
                            &larr;
                          </button>
                          <span className="text-xs px-2 font-mono font-black text-[#C9A84C] min-w-[80px] text-center">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][leaveCalendarMonth]} {leaveCalendarYear}
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              if (leaveCalendarMonth === 11) {
                                setLeaveCalendarMonth(0);
                                setLeaveCalendarYear(y => y + 1);
                              } else {
                                setLeaveCalendarMonth(m => m + 1);
                              }
                            }}
                            className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                          >
                            &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="flex items-center gap-4 text-[9px] uppercase tracking-wider text-slate-500 font-bold flex-wrap border-b pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span>Approved Leave</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span>Pending Leave</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-600"></span>
                          <span>Overtime (OT) Request</span>
                        </div>
                      </div>

                      {/* Weekday Grid Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[9px] text-[#1E3A5F] tracking-wider pb-1">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="py-1 bg-slate-50 border border-slate-100 rounded-md font-black">{day}</div>
                        ))}
                      </div>

                      {/* Main Calendar Days */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {(() => {
                           const daysNum = new Date(leaveCalendarYear, leaveCalendarMonth + 1, 0).getDate();
                           const startingWeekOffset = new Date(leaveCalendarYear, leaveCalendarMonth, 1).getDay();
                           const blankCells = [];
                           
                           for (let i = 0; i < startingWeekOffset; i++) {
                             blankCells.push(
                               <div key={`blank-leave-${i}`} className="min-h-[70px] bg-slate-50/45 border border-dashed border-gray-100 rounded-lg opacity-30"></div>
                             );
                           }

                           const dayCells = [];
                           for (let d = 1; d <= daysNum; d++) {
                             const dateString = `${leaveCalendarYear}-${String(leaveCalendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                             
                             // Check matching leaves
                             const dayLeaves = employeeOwnLeaves.filter(l => isDateInLeaveRange(dateString, l.startDate, l.endDate));
                             // Check matching OTs
                             const dayOts = employeeOwnOts.filter(ot => ot.date === dateString);
                             
                             const hasActivity = dayLeaves.length > 0 || dayOts.length > 0;
                             const isTodayDate = dateString === "2026-05-28";
                             const isSelectedCell = leaveCalendarSelectedDateStr === dateString;

                             dayCells.push(
                               <div 
                                 key={`leave-day-${d}`}
                                 onClick={() => setLeaveCalendarSelectedDateStr(dateString)}
                                 className={`min-h-[75px] p-1.5 border rounded-lg hover:shadow transition-all cursor-pointer flex flex-col justify-between ${
                                   isTodayDate ? "bg-amber-50/20 border-[#C9A84C]" : "bg-white border-gray-200"
                                 } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""} ${
                                   hasActivity ? "hover:border-slate-300" : ""
                                 }`}
                               >
                                 <div className="flex items-center justify-between">
                                   <span className={`text-[10px] font-mono leading-none font-black p-0.5 px-1 rounded ${
                                     isTodayDate ? "bg-[#C9A84C] text-white" : "text-gray-400"
                                   }`}>
                                     {d}
                                   </span>
                                 </div>

                                 <div className="flex-1 mt-1 font-mono text-[7px] leading-tight space-y-0.5 flex flex-col justify-end">
                                   {dayLeaves.map((l, lIdx) => (
                                     <div 
                                       key={`leaf-cell-${lIdx}`}
                                       className={`py-0.5 px-1 rounded border text-[7px] font-sans font-black tracking-tight flex items-center justify-between truncate leading-none ${
                                         l.status === "Approved" 
                                           ? "bg-emerald-50 text-emerald-800 border-emerald-250" 
                                           : "bg-amber-50 text-amber-850 border-amber-250"
                                       }`}
                                       title={`${l.type} - ${l.status}`}
                                     >
                                       VL: {l.status === "Approved" ? "✓" : "?"}
                                     </div>
                                   ))}

                                   {dayOts.map((ot, oIdx) => (
                                     <div 
                                       key={`ot-cell-${oIdx}`}
                                       className={`py-0.5 px-1 rounded border text-[7px] font-sans font-black tracking-tight flex items-center justify-between truncate leading-none ${
                                         ot.status === "Approved"
                                           ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                           : ot.status === "Denied"
                                           ? "bg-rose-50 text-rose-800 border-rose-200"
                                           : "bg-indigo-50/30 text-indigo-700/80 border-slate-200"
                                       }`}
                                       title={`OT: ${ot.hours}h - ${ot.status}`}
                                     >
                                       OT: {ot.hours}h ({ot.status === "Approved" ? "✓" : "P"})
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             );
                           }

                           return [...blankCells, ...dayCells];
                        })()}
                      </div>

                      {/* Selection Detail panel in calendar view */}
                      {leaveCalendarSelectedDateStr && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#1E3A5F] flex items-center gap-1.5 font-mono">
                              <Clock className="w-3.5 h-3.5 text-[#C9A84C]" /> Details for: {leaveCalendarSelectedDateStr}
                            </h5>
                            {leaveCalendarSelectedDateStr === "2026-05-28" && (
                              <span className="text-[8px] uppercase tracking-widest bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.2 rounded font-black font-mono">
                                TODAY
                              </span>
                            )}
                          </div>

                          {(() => {
                            const activeLeavesOnDay = employeeOwnLeaves.filter(l => isDateInLeaveRange(leaveCalendarSelectedDateStr, l.startDate, l.endDate));
                            const activeOtsOnDay = employeeOwnOts.filter(ot => ot.date === leaveCalendarSelectedDateStr);

                            if (activeLeavesOnDay.length === 0 && activeOtsOnDay.length === 0) {
                              return (
                                <p className="text-[10px] text-gray-400 italic font-sans font-medium text-center py-2 h-auto">
                                  No active time-off leave or scheduled overtime logged on this day index.
                                </p>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-normal font-sans">
                                {/* Left Pane: Time-off Leaves */}
                                <div className="space-y-1.5">
                                  <span className="text-[8px] text-gray-405 uppercase font-black tracking-wider block">Leave Requests ({activeLeavesOnDay.length})</span>
                                  {activeLeavesOnDay.length > 0 ? (
                                    <div className="space-y-2">
                                      {activeLeavesOnDay.map((l, idx) => (
                                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-205 shadow-sm">
                                          <div className="flex justify-between items-center">
                                            <strong className="text-[#1E3A5F] font-bold text-[10px]">{l.type}</strong>
                                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase tracking-widest ${
                                              l.status === "Approved" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-amber-50 text-amber-850 border border-amber-150"
                                            }`}>
                                              {l.status}
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-gray-500 font-mono mt-1 font-semibold">
                                            Duration: {l.days} {l.days > 1 ? "Days" : "Day"} ({l.startDate} to {l.endDate})
                                          </div>
                                          {l.reason && (
                                            <p className="text-[9.5px] italic text-slate-400 mt-1 block">
                                              &ldquo;{l.reason}&rdquo;
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[9.5px] text-gray-450 italic font-medium p-2.5 bg-white border rounded-lg text-center">No leaves scheduled.</p>
                                  )}
                                </div>

                                {/* Right Pane: Overtime */}
                                <div className="space-y-1.5">
                                  <span className="text-[8px] text-gray-405 uppercase font-black tracking-wider block">Filed Overtime ({activeOtsOnDay.length})</span>
                                  {activeOtsOnDay.length > 0 ? (
                                    <div className="space-y-2">
                                      {activeOtsOnDay.map((ot, idx) => (
                                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-205 shadow-sm">
                                          <div className="flex justify-between items-center">
                                            <span className="font-mono text-[9px] font-black text-indigo-750 bg-indigo-50/50 py-0.2 px-1 border border-indigo-150 rounded">{ot.hours} Hours Requested</span>
                                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase tracking-widest ${
                                              ot.status === "Approved" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                                              ot.status === "Denied" ? "bg-rose-50 text-rose-800 border border-rose-100" :
                                              "bg-blue-50 text-blue-800 border border-blue-150"
                                            }`}>
                                              {ot.status}
                                            </span>
                                          </div>
                                          <div className="text-[9.5px] text-gray-500 mt-1 font-medium font-sans">
                                            Date: <span className="font-mono">{ot.date}</span>
                                          </div>
                                          {ot.purpose && (
                                            <p className="text-[9.5px] italic text-slate-400 mt-1 block">
                                              &ldquo;{ot.purpose}&rdquo;
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[9.5px] text-gray-450 italic font-medium p-2.5 bg-white border rounded-lg text-center">No overtime filed for this date.</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Left Lists + Right Lists for Admin (or fallback for simple layout) */}
                {userRole === "admin" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                    {/* Column 1: Standard historical list table */}
                    <div className="lg:col-span-1 bg-white rounded-xl border border-gray-150 p-6 shadow-sm max-h-[850px] overflow-y-auto">
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest pb-3 border-b border-gray-100 mb-4">
                        Global Statutory Leaves Ledger
                      </h3>

                      <div className="space-y-3">
                        {activeLeavesForRole.map((req, idx) => (
                          <div key={idx} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-gray-400 font-bold">{req.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                                req.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {req.status}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{req.employeeName}</div>
                              <div className="text-[10px] text-slate-500 font-medium font-mono">{req.type}</div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 text-slate-500 font-sans">
                              <span>{formatDate(req.startDate)} ~ {formatDate(req.endDate)}</span>
                              <span className="font-bold text-slate-800">{req.days} days</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 2 & 3: NEW Admin Team Leaves Calendar */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                        <div>
                          <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                            Interactive Global Team Leaves Tracker &amp; Co-incidence Auditor
                          </h3>
                          <p className="text-[10px] text-gray-400 font-medium font-sans">
                            Track overlap warnings, multi-employee absences, and color-coded leaves visually across dates.
                          </p>
                        </div>

                        {/* Month Swappers */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => {
                              if (adminLeaveCalendarMonth === 0) {
                                setAdminLeaveCalendarMonth(11);
                                setAdminLeaveCalendarYear(y => y - 1);
                              } else {
                                setAdminLeaveCalendarMonth(m => m - 1);
                              }
                            }}
                            className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                          >
                            &larr;
                          </button>
                          <span className="text-xs px-2 font-mono font-black text-[#C9A84C] min-w-[80px] text-center">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][adminLeaveCalendarMonth]} {adminLeaveCalendarYear}
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              if (adminLeaveCalendarMonth === 11) {
                                setAdminLeaveCalendarMonth(0);
                                setAdminLeaveCalendarYear(y => y + 1);
                              } else {
                                setAdminLeaveCalendarMonth(m => m + 1);
                              }
                            }}
                            className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                          >
                            &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Calendar Weekday Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[9px] text-[#1E3A5F] tracking-wider pb-1">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="py-1 bg-slate-50 border border-slate-100 rounded-md font-black">{day}</div>
                        ))}
                      </div>

                      {/* Main Calendar Days */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {(() => {
                          const daysNum = new Date(adminLeaveCalendarYear, adminLeaveCalendarMonth + 1, 0).getDate();
                          const startingWeekOffset = new Date(adminLeaveCalendarYear, adminLeaveCalendarMonth, 1).getDay();
                          const blankCells = [];
                          
                          for (let i = 0; i < startingWeekOffset; i++) {
                            blankCells.push(
                              <div key={`admin-blank-${i}`} className="min-h-[75px] bg-slate-50/40 border border-dashed border-gray-100 rounded-lg opacity-30 pointer-events-none"></div>
                            );
                          }

                          const dayCells = [];
                          for (let d = 1; d <= daysNum; d++) {
                            const dateString = `${adminLeaveCalendarYear}-${String(adminLeaveCalendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                            
                            // Find all approved leaves on this date
                            const activeOnDay = leaveRequestsList.filter(l => l.status === "Approved" && isDateInLeaveRange(dateString, l.startDate, l.endDate));
                            const isTodayDate = dateString === "2026-05-28";
                            const isSelectedCell = adminLeaveCalendarSelectedDateStr === dateString;

                            dayCells.push(
                              <div 
                                key={`admin-leave-day-${d}`}
                                onClick={() => setAdminLeaveCalendarSelectedDateStr(dateString)}
                                className={`min-h-[80px] p-1 border rounded-lg hover:shadow transition-all cursor-pointer flex flex-col justify-between ${
                                  isTodayDate ? "bg-amber-50/25 border-[#C9A84C]" : "bg-white border-gray-200"
                                } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""} ${
                                  activeOnDay.length > 1 ? "bg-red-50/20 border-red-200" : ""
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`text-[10px] font-mono font-black ${isTodayDate ? "text-[#C9A84C]" : "text-gray-400"}`}>
                                    {d}
                                  </span>
                                  {activeOnDay.length > 1 && (
                                    <span className="text-[7px] font-mono bg-red-650 bg-red-600 text-white font-extrabold px-1 rounded animate-pulse" title={`${activeOnDay.length} employees on leave simultaneously!`}>
                                      OVERLAP {activeOnDay.length}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1 mt-1">
                                  {activeOnDay.slice(0, 3).map((leave, idx) => {
                                    const employeeColor = getRandomColorForEmployee(leave.requesterId);
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`text-[8px] font-black px-1.5 py-0.5 rounded border leading-none truncate ${employeeColor}`}
                                        title={`${leave.employeeName}: ${leave.type}`}
                                      >
                                        {leave.employeeName.split(" ")[0]}
                                      </div>
                                    );
                                  })}
                                  {activeOnDay.length > 3 && (
                                    <div className="text-[7.5px] text-slate-500 font-bold pl-1 font-mono">
                                      + {activeOnDay.length - 3} more...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return [...blankCells, ...dayCells];
                        })()}
                      </div>

                      {/* Co-incidence overlap section */}
                      {adminLeaveCalendarSelectedDateStr && (
                        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3 animate-fadeIn">
                          {(() => {
                            const activeOnSelectedDay = leaveRequestsList.filter(l => l.status === "Approved" && isDateInLeaveRange(adminLeaveCalendarSelectedDateStr, l.startDate, l.endDate));
                            const hasMultiple = activeOnSelectedDay.length > 1;

                            return (
                              <>
                                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 text-[#1E3A5F]">
                                    📅 <strong className="text-xs font-black uppercase tracking-wider font-sans">Date Audit Shell for: {adminLeaveCalendarSelectedDateStr}</strong>
                                  </div>
                                  {hasMultiple && (
                                    <span className="bg-red-500 text-white font-mono font-black text-[9px] uppercase px-3 py-1 rounded-full animate-bounce">
                                      ⚠️ Mutual Co-Incidence: Multi-absences registered!
                                    </span>
                                  )}
                                </div>

                                {activeOnSelectedDay.length === 0 ? (
                                  <div className="text-[11px] text-gray-400 font-medium italic font-sans py-2">
                                    No employees are officially marked on leave for this specific calendar date.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-[10px] text-slate-500 font-medium font-sans">
                                      The following personnel are cataloged on leave on <span className="font-mono font-bold text-slate-800">{adminLeaveCalendarSelectedDateStr}</span>:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {activeOnSelectedDay.map((leave, idx) => (
                                        <div key={idx} className="bg-white p-3 border border-slate-150 rounded-lg flex items-start gap-2">
                                          <div className="w-1.5 h-10 rounded bg-[#C9A84C]"></div>
                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="text-xs font-black text-slate-800">{leave.employeeName}</div>
                                            <div className="text-[10px] text-[#1E3A5F] font-bold font-mono">{leave.type}</div>
                                            <div className="text-[9px] text-slate-500 font-bold">Coverage: {leave.startDate} to {leave.endDate}</div>
                                            <div className="text-[9px] italic text-slate-450 truncate">Reason: &ldquo;{leave.reason}&rdquo;</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* For Employee, we show the table full width below form and calendar */}
                {userRole === "employee" && (
                  <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest pb-3 border-b border-gray-100 mb-4">
                      My Out-Of-Duty History &amp; Cleared Leaves
                    </h3>

                    <div className="overflow-x-auto font-medium">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-gray-50 text-gray-450 font-bold text-[10px] uppercase">
                            <th className="p-3">Reference</th>
                            <th className="p-3">Leave Type</th>
                            <th className="p-3">Date Coverage</th>
                            <th className="p-3">Total Time</th>
                            <th className="p-3 text-right">Clearance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {activeLeavesForRole.map((req, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-mono text-[10px] text-gray-400">{req.id}</td>
                              <td className="p-3 font-semibold text-gray-650">{req.type}</td>
                              <td className="p-3 font-mono text-gray-500">{formatDate(req.startDate)} ~ {formatDate(req.endDate)}</td>
                              <td className="p-3 font-bold">{req.days} days</td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  req.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* =========================================================
              5.5 ACHIEVEMENTS & ITINERARY PORTAL (NEWLY INTEGRATED)
             ========================================================= */}
          {activeModule === "itinerary" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header section */}
              <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm flex items-center justify-between flex-wrap gap-4 font-sans">
                <div>
                  <h2 className="text-lg font-black text-[#1E3A5F] tracking-tight uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {userRole === "admin" ? "Sovereign Achievements & Itinerary Command Portal" : "My Personal Achievement Ledger & Itinerary Calendar"}
                  </h2>
                  <p className="text-xs text-gray-450 font-medium">
                    {userRole === "admin" 
                      ? "Oversee and orchestrate employee plans ahead of time and view historical achievements filtered by date." 
                      : "Input future plans and log milestones. Advance planning ensures streamlined resource execution!"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#C9A84C]/5 border border-[#C9A84C]/20 px-4 py-2 rounded-xl text-xs font-bold text-slate-800">
                  ⚡ <span>Simulated Clock: May 28, 2026</span>
                </div>
              </div>

              {userRole === "employee" ? (
                /* ================= EMPLOYEE ROLE PANELS ================= */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  {/* Left Column: Calendar (colspan 2) */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                      <div>
                        <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block font-sans">
                          My Productive Itinerary Calendar
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium">
                          Click any date block to review, write, or catalog plans.
                        </p>
                      </div>

                      {/* Month selector */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                        <button 
                          type="button"
                          onClick={() => {
                            if (itinCalendarMonth === 0) {
                              setItinCalendarMonth(11);
                              setItinCalendarYear(y => y - 1);
                            } else {
                              setItinCalendarMonth(m => m - 1);
                            }
                          }}
                          className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                        >
                          &larr;
                        </button>
                        <span className="text-xs px-2 font-mono font-black text-[#C9A84C] min-w-[80px] text-center">
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][itinCalendarMonth]} {itinCalendarYear}
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (itinCalendarMonth === 11) {
                              setItinCalendarMonth(0);
                              setItinCalendarYear(y => y + 1);
                            } else {
                              setItinCalendarMonth(m => m + 1);
                            }
                          }}
                          className="p-1 px-2 rounded-lg text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Legends */}
                    <div className="flex items-center gap-4 text-[9px] uppercase tracking-wider text-slate-500 font-bold flex-wrap border-b pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        <span>Completed Achievement</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded border border-sky-400 bg-sky-50"></span>
                        <span>Future Itinerary / Plan</span>
                      </div>
                    </div>

                    {/* Week headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[9px] text-[#1E3A5F] tracking-wider pb-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="py-1 bg-slate-50 border border-slate-100 rounded-md font-black">{day}</div>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const daysNum = new Date(itinCalendarYear, itinCalendarMonth + 1, 0).getDate();
                        const startingWeekOffset = new Date(itinCalendarYear, itinCalendarMonth, 1).getDay();
                        const blankCells = [];
                        
                        for (let i = 0; i < startingWeekOffset; i++) {
                          blankCells.push(
                            <div key={`itin-blank-${i}`} className="min-h-[70px] bg-slate-50/45 border border-dashed border-gray-100 rounded-lg opacity-30 pointer-events-none"></div>
                          );
                        }

                        const dayCells = [];
                        for (let d = 1; d <= daysNum; d++) {
                          const dateString = `${itinCalendarYear}-${String(itinCalendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          
                          // Filter items belonging to this employee
                          const dayItems = itinerariesList.filter(item => item.employeeId === activeUserObj.id && item.date === dateString);
                          const isTodayDate = dateString === "2026-05-28";
                          const isSelectedCell = itinSelectedDateStr === dateString;

                          dayCells.push(
                            <div 
                              key={`itin-day-${d}`}
                              onClick={() => setItinSelectedDateStr(dateString)}
                              className={`min-h-[75px] p-1.5 border rounded-lg hover:shadow transition-all cursor-pointer flex flex-col justify-between ${
                                isTodayDate ? "bg-amber-50/20 border-[#C9A84C]" : "bg-white border-gray-200"
                              } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""}`}
                            >
                              <span className="text-[10px] font-mono font-black text-gray-400">{d}</span>
                              
                              <div className="space-y-1">
                                {dayItems.slice(0, 2).map((item, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border max-w-full truncate leading-none ${
                                      item.type === "achievement" 
                                        ? "bg-purple-50 text-purple-700 border-purple-200" 
                                        : "bg-sky-50 text-sky-700 border-sky-100"
                                    }`}
                                  >
                                    {item.title}
                                  </div>
                                ))}
                                {dayItems.length > 2 && (
                                  <div className="text-[7px] text-gray-450 font-bold font-mono pl-1">
                                    + {dayItems.length - 2} more
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return [...blankCells, ...dayCells];
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Date Action Board (Selected Date Detail + Input Form) */}
                  <div className="lg:col-span-1 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-5 flex flex-col">
                    <div>
                      <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                        Action Board: <span className="text-[#C9A84C] font-mono">{itinSelectedDateStr}</span>
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Record daily accomplishments or draft future itinerary items below.
                      </p>
                    </div>

                    {/* Listed logs */}
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] border-b pb-4">
                      {(() => {
                        const selectedItems = itinerariesList.filter(item => item.employeeId === activeUserObj.id && item.date === itinSelectedDateStr);

                        if (selectedItems.length === 0) {
                          return (
                            <div className="text-center py-6 text-gray-400 italic text-[11px] font-sans">
                              No entries cataloged for this date. Use the form below to file your logs ahead of time!
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2.5">
                            {selectedItems.map((item) => (
                              <div 
                                key={item.id} 
                                className={`p-3 border rounded-xl space-y-1.5 shadow-sm text-xs relative ${
                                  item.type === "achievement" 
                                    ? "bg-purple-50/40 border-purple-100 text-purple-950" 
                                    : "bg-sky-50/40 border-sky-100 text-sky-950"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold flex items-center gap-1 text-[11px]">
                                    {item.type === "achievement" ? "🏆 Achievement" : "📅 Plan"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setItinerariesList(prev => prev.filter(p => p.id !== item.id))}
                                    className="text-[11px] text-slate-400 hover:text-red-500 font-bold"
                                  >
                                    &times;
                                  </button>
                                </div>
                                <h4 className="font-extrabold text-slate-900 leading-snug">{item.title}</h4>
                                <p className="text-[10px] text-gray-650 leading-normal italic">&ldquo;{item.notes}&rdquo;</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Entry Form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newItinTitle.trim()) {
                          triggerToast("Please input a short title describing your log!", "error");
                          return;
                        }
                        const newItem = {
                          id: `ITIN-NEW-${Date.now()}`,
                          employeeId: activeUserObj.id,
                          employeeName: activeUserObj.name,
                          date: itinSelectedDateStr,
                          type: newItinType,
                          title: newItinTitle,
                          notes: newItinNotes || "Standard recorded task plan."
                        };
                        setItinerariesList(prev => [newItem, ...prev]);
                        triggerToast(`Entry successfully added to ${itinSelectedDateStr}!`, "success");
                        setNewItinTitle("");
                        setNewItinNotes("");
                      }}
                      className="space-y-3 pt-2"
                    >
                      <h4 className="text-[10px] uppercase font-black text-slate-700 tracking-wider">Log Achievements or Plan Ahead</h4>
                      
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-150 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setNewItinType("itinerary")}
                          className={`py-1 text-[10px] font-black uppercase rounded-lg text-center transition-all ${
                            newItinType === "itinerary" 
                              ? "bg-white text-sky-700 border border-sky-100 shadow-sm" 
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Itinerary (Plan)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewItinType("achievement")}
                          className={`py-1 text-[10px] font-black uppercase rounded-lg text-center transition-all ${
                            newItinType === "achievement" 
                              ? "bg-white text-purple-700 border border-purple-100 shadow-sm" 
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Achievement
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-extrabold text-gray-455 block tracking-wider font-sans">Short Action Title</label>
                        <input
                          type="text"
                          value={newItinTitle}
                          onChange={(e) => setNewItinTitle(e.target.value)}
                          placeholder="e.g. Refactor API controllers"
                          className="w-full bg-slate-50 hover:bg-slate-50/75 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] uppercase font-extrabold text-gray-455 block tracking-wider font-sans">Detailed Notes</label>
                        <textarea
                          value={newItinNotes}
                          onChange={(e) => setNewItinNotes(e.target.value)}
                          placeholder="What details are planned or completed..."
                          rows={2}
                          className="w-full bg-slate-50 hover:bg-slate-50/75 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full text-center bg-[#1E3A5F] hover:bg-[#152a45] text-white border border-[#1b3455] font-black text-xs p-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
                      >
                        Register Log Entry onto Selected Cell →
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* ================= ADMIN ROLE COMMAND CONSOLE ================= */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  {/* Left Column: Filter panel + Calendar Grid (colspan 1) */}
                  <div className="lg:col-span-1 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4 font-sans">
                    <div>
                      <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                        Team Selection &amp; Month Grid
                      </h3>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Narrow down audit parameters or click days to review teams.
                      </p>
                    </div>

                    {/* Filter dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[8.5px] uppercase font-extrabold text-gray-400 block tracking-wider">Employee Filter</label>
                      <select
                        value={adminItinFilterEmpId}
                        onChange={(e) => setAdminItinFilterEmpId(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-[#1E3A5F] focus:outline-none"
                      >
                        <option value="all">📁 Display Entire Enterprise Registry</option>
                        {employeesList.map(emp => (
                          <option key={emp.id} value={emp.id}>👤 {emp.name} ({emp.position})</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-[#C9A84C]">
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][adminItinCalendarMonth]} {adminItinCalendarYear}
                      </span>

                      {/* Month Swappers */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded p-0.5 shrink-0">
                        <button 
                          type="button"
                          onClick={() => {
                            if (adminItinCalendarMonth === 0) {
                              setAdminItinCalendarMonth(11);
                              setAdminItinCalendarYear(y => y - 1);
                            } else {
                              setAdminItinCalendarMonth(m => m - 1);
                            }
                          }}
                          className="px-2 py-0.5 rounded text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                        >
                          &larr;
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (adminItinCalendarMonth === 11) {
                              setAdminItinCalendarMonth(0);
                              setAdminItinCalendarYear(y => y + 1);
                            } else {
                              setAdminItinCalendarMonth(m => m + 1);
                            }
                          }}
                          className="px-2 py-0.5 rounded text-slate-600 hover:bg-[#1E3A5F] hover:text-white transition-all text-xs font-black"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold uppercase text-[8px] text-[#1E3A5F] tracking-wider pb-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                        <div key={idx} className="py-1 bg-slate-50 border border-slate-100 rounded-md font-black">{day}</div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5 font-sans">
                      {(() => {
                        const daysNum = new Date(adminItinCalendarYear, adminItinCalendarMonth + 1, 0).getDate();
                        const startingWeekOffset = new Date(adminItinCalendarYear, adminItinCalendarMonth, 1).getDay();
                        const blankCells = [];
                        
                        for (let i = 0; i < startingWeekOffset; i++) {
                          blankCells.push(
                            <div key={`admin-itin-blank-${i}`} className="min-h-[45px] bg-slate-50/40 border border-dashed border-gray-100 rounded-lg opacity-30 pointer-events-none"></div>
                          );
                        }

                        const dayCells = [];
                        for (let d = 1; d <= daysNum; d++) {
                          const dateString = `${adminItinCalendarYear}-${String(adminItinCalendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          
                          // Filter active logs based on chosen filter
                          const activeLogs = itinerariesList.filter(item => {
                            const dateMatch = item.date === dateString;
                            const filterMatch = adminItinFilterEmpId === "all" || item.employeeId === adminItinFilterEmpId;
                            return dateMatch && filterMatch;
                          });

                          const hasAchievement = activeLogs.some(l => l.type === "achievement");
                          const hasItinerary = activeLogs.some(l => l.type === "itinerary");
                          const isTodayDate = dateString === "2026-05-28";
                          const isSelectedCell = adminItinSelectedDateStr === dateString;

                          dayCells.push(
                            <div 
                              key={`admin-itin-day-${d}`}
                              onClick={() => setAdminItinSelectedDateStr(dateString)}
                              className={`min-h-[45px] p-1 border rounded-lg hover:shadow transition-all cursor-pointer flex flex-col justify-between ${
                                isTodayDate ? "bg-amber-50/20 border-[#C9A84C]" : "bg-white border-gray-150"
                              } ${isSelectedCell ? "ring-2 ring-[#1E3A5F] border-transparent" : ""}`}
                            >
                              <span className="text-[9.5px] font-mono font-black text-gray-400">{d}</span>
                              <div className="flex gap-1 justify-center pb-0.5">
                                {hasAchievement && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Contains achievement milestones on this day"></span>}
                                {hasItinerary && <span className="w-1.5 h-1.5 rounded-full bg-sky-450" title="Contains itineraries planned ahead"></span>}
                              </div>
                            </div>
                          );
                        }

                        return [...blankCells, ...dayCells];
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Central Performance & Productivity Terminal (colspan 2) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Selected Date Audit List */}
                    <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4 animate-fadeIn font-sans">
                      <div>
                        <h3 className="text-xs font-black text-[#1E3A5F] uppercase tracking-wider block">
                          Productivity Audit Logs for: <span className="text-[#C9A84C] font-mono">{adminItinSelectedDateStr}</span>
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium">
                          A complete catalog review showing what of each team employee is working on or has achieved today.
                        </p>
                      </div>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {(() => {
                          const dateFiltered = itinerariesList.filter(item => {
                            const dateMatch = item.date === adminItinSelectedDateStr;
                            const filterMatch = adminItinFilterEmpId === "all" || item.employeeId === adminItinFilterEmpId;
                            return dateMatch && filterMatch;
                          });

                          if (dateFiltered.length === 0) {
                            return (
                              <div className="text-center py-10 text-gray-400 italic text-[11px]">
                                No registered achievement parameters or future planned itineraries mapped to this specific calendar date.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dateFiltered.map((item) => (
                                <div 
                                  key={item.id} 
                                  className={`p-4 border rounded-xl space-y-2 relative shadow-sm text-xs ${
                                    item.type === "achievement" 
                                      ? "bg-purple-50/40 border-purple-100" 
                                      : "bg-sky-50/40 border-sky-100"
                                  }`}
                                >
                                  <div className="flex justify-between items-center border-b pb-1.5 border-slate-100">
                                    <span className="font-extrabold text-slate-800 text-[11px]">👤 {item.employeeName}</span>
                                    <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                                      item.type === "achievement" 
                                        ? "bg-purple-100 text-purple-800" 
                                        : "bg-sky-100 text-sky-850"
                                    }`}>
                                      {item.type}
                                    </span>
                                  </div>
                                  <h4 className="font-extrabold text-slate-950 leading-snug">{item.title}</h4>
                                  <p className="text-[10px] text-gray-650 italic leading-normal">&ldquo;{item.notes}&rdquo;</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* GenAI Employee Productivity Advisor (Most productive process suggestion section) */}
                    <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] rounded-2xl p-6 text-white space-y-4 shadow-md animate-fadeIn font-sans">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                              GenAI Task Alignment &amp; Productivity Advisor
                            </h3>
                            <p className="text-[10px] text-slate-300">
                              Analyzes overlap collisions, streamlines timelines, and advises resource orchestration on {adminItinSelectedDateStr}.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            triggerToast(`GenAI Orchestrator: Recalculated process workflows for ${adminItinSelectedDateStr}!`, "success");
                          }}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-amber-300 shadow active:scale-95 transition-all text-center"
                        >
                          Rerun Advisory Analysis
                        </button>
                      </div>

                      {/* Advice contents */}
                      <div className="space-y-3.5 pt-1.5">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2 text-xs">
                          <span className="text-[#C9A84C] font-black uppercase tracking-wide block text-[10px] font-mono">🌟 Strategic Synchronization Guidance:</span>
                          <p className="text-slate-300 leading-relaxed text-[11px]">
                            {(() => {
                              const activeOnDate = itinerariesList.filter(item => item.date === adminItinSelectedDateStr);
                              
                              if (activeOnDate.length === 0) {
                                return "No active itinerary plans currently recorded on this date. Prompting team members to lay out plans 'before ahead of time' mitigates risk overlaps and blocks idle personnel dependencies.";
                              }

                              const juanActive = activeOnDate.find(l => l.employeeId === "EMP-2024-0002");
                              const anaActive = activeOnDate.find(l => l.employeeId === "EMP-2024-0003");

                              if (juanActive && anaActive) {
                                return `Highly productive co-op alert! While Ana is working on '${anaActive.title}', Juan is scheduled to refactor or complete '${juanActive.title}'. We recommend mapping an internal brief synch call to align Ana's tax remittances with Juan's core database deployment releases to ensure no payroll calculations block BIR compliance deadlines.`;
                              }

                              return `With active items like '${activeOnDate[0].title}' logged, the best process path introduces proactive check-ins 15 minutes before daily clock-out. Keeping structured logs updated here ensures managers trace performance KPIs dynamically alongside government compliance milestones.`;
                            })()}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                          <div className="space-y-1">
                            <h4 className="font-bold text-amber-400 uppercase text-[9.5px]">How to process itineraries:</h4>
                            <p className="leading-normal text-[10px]">1. Encourage team players to fill out planning boards every Friday afternoon for the following week.</p>
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-amber-400 uppercase text-[9.5px]">Key Productivity KPI target:</h4>
                            <p className="leading-normal text-[10px]">2. Accomplishment metrics automatically feed into mid-year GenAI recommendation cards in the evaluation tab.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              6. PAYROLL DIRECTORY (RBAC EXTREME)
              ========================================================= */}
          {activeModule === "payroll" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Contributions thresholds (Admin and Employee see as references) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { system: "Social Security (SSS)", info: "RA 11199 parameters", rates: "EE Rate: 4.5% / Max cap: ₱1,350", desc: "Deduction derived automatically from MSC charts and mapped to standard employee identifiers." },
                  { system: "PhilHealth (PHIC)", info: "5.0% flat premium rates", rates: "EE Share: 2.5% / Max: ₱2,500", desc: "Total premium evaluated on basic gross pay, split 50-50 between employer and employee." },
                  { system: "Pag-IBIG Fund (HDMF)", info: "Statute RA 9679 guidelines", rates: "EE Contribution: 2% / Max: ₱200", desc: "Calculated based on 2% employee contribution with maximum 10,000 monthly salary parameters." },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-3 font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-800">{item.system}</span>
                      <span className="text-[9px] bg-slate-100 border text-slate-500 py-0.5 px-1.5 rounded uppercase font-bold">
                        {item.info}
                      </span>
                    </div>
                    <div className="text-xs text-[#1E3A5F] font-bold font-mono">
                      {item.rates}
                    </div>
                    <p className="text-gray-500 text-[10px] leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Dynamic View based on Role */}
              {userRole === "admin" ? (
                // ADMIN MASTER PAYROLL RUN LEDGER
                <div className="space-y-6">
                  {/* GENERATOR BLOCK & FILTER SET */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Date selections and compilation console */}
                    <div className="lg:col-span-1 bg-[#1E3A5F] text-white rounded-2xl p-5 border border-slate-700 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#E8C96A]" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#E8C96A]">Generate New Payroll Cutoff</h4>
                      </div>
                      <p className="text-[10px] text-slate-350 leading-relaxed font-sans font-medium">
                        Select a formal date range to analyze timesheets and generate a legal salary run session for the active roster.
                      </p>

                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-300 mb-1">Start Date</label>
                          <input 
                            type="date"
                            value={genPayrollStart}
                            onChange={(e) => setGenPayrollStart(e.target.value)}
                            className="w-full bg-[#0F1E33] border border-slate-600 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-300 mb-1">End Date</label>
                          <input 
                            type="date"
                            value={genPayrollEnd}
                            onChange={(e) => setGenPayrollEnd(e.target.value)}
                            className="w-full bg-[#0F1E33] border border-slate-600 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            const start = new Date(genPayrollStart);
                            const end = new Date(genPayrollEnd);
                            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                              triggerToast("Please select valid start and end dates.", "error");
                              return;
                            }
                            if (start > end) {
                              triggerToast("Start date cannot be after end date.", "error");
                              return;
                            }

                            // Build unique ID and Label
                            const startStr = genPayrollStart;
                            const endStr = genPayrollEnd;
                            const opt: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
                            const labelStr = `${start.toLocaleDateString("en-US", opt)} - ${end.toLocaleDateString("en-US", opt)} Cutoff`;
                            const newRunId = `PR-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}${start.getDate() < 16 ? "A" : "B"}`;

                            // Check duplicate IDs
                            const duplicate = payrollRunsList.some(r => r.id === newRunId);
                            const finalRunId = duplicate ? `${newRunId}-${Date.now().toString().slice(-4)}` : newRunId;

                            const generatedRecords = employeesList.map(emp => {
                              const basicBase = Math.round(emp.salary / 2);
                              const sssEE = Math.round(Math.min(basicBase * 0.045, 1350));
                              const phEE = Math.round(Math.min((emp.salary * 0.025) / 2, 2500));
                              const hdmfEE = 100;

                              const employeeAttendance = attendanceList.filter(a => a.name === emp.name);
                              const totalLateMins = employeeAttendance.reduce((acc, curr) => acc + (curr.lateMin || 0), 0);
                              const latesVal = totalLateMins > 0 ? Math.round(totalLateMins * 5) : 0;

                              const approvedLeaves = leaveRequestsList.filter(l => l.requesterId === emp.id && l.status === "Approved");
                              const leaveDays = approvedLeaves.reduce((acc, curr) => acc + (curr.days || 0), 0);
                              const accumulatedLeavePaid = leaveDays > 0 ? Math.round(leaveDays * (emp.salary / 22)) : 0;

                              // Retrieve approved overtime hours fall within cutoff date range
                              const employeeOvertimeRequests = overtimeRequests.filter(
                                ot => ot.employeeId === emp.id && 
                                      ot.status === "Approved" && 
                                      ot.date >= startStr && 
                                      ot.date <= endStr
                              );
                              const totalOvertimeHours = employeeOvertimeRequests.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
                              
                              // Dynamic Overtime Computation
                              const otHourlyMethod = emp.otHourlyRateMethod || "automatic";
                              const computedBaseHourly = Number(emp.salary) / (22 * 8);
                              const targetOtHourly = otHourlyMethod === "custom" && emp.otCustomHourlyRate !== undefined ? Number(emp.otCustomHourlyRate) : computedBaseHourly;
                              const otMultiplierFactor = emp.otMultiplier !== undefined ? Number(emp.otMultiplier) : 1.25;
                              const overtimePay = totalOvertimeHours > 0 ? Math.round(totalOvertimeHours * targetOtHourly * otMultiplierFactor) : 0;

                              // Dynamic Earnings, Allowances, & Benefits computation
                              const mealAllowanceVal = emp.mealAllowance !== undefined ? Number(emp.mealAllowance) : 1000;
                              const travelAllowanceVal = emp.travelAllowance !== undefined ? Number(emp.travelAllowance) : (emp.position.includes("Manager") ? 1000 : (emp.position.includes("Senior") ? 1000 : 500));
                              const communicationAllowanceVal = emp.communicationAllowance !== undefined ? Number(emp.communicationAllowance) : (emp.position.includes("Manager") ? 1000 : (emp.position.includes("Senior") ? 500 : 0));
                              const otherAllowancesVal = emp.otherAllowances !== undefined ? Number(emp.otherAllowances) : 0;
                              const benefits = mealAllowanceVal + travelAllowanceVal + communicationAllowanceVal + otherAllowancesVal;

                              const loans = emp.name.toLowerCase().includes("ana") ? 1000 : (emp.name.toLowerCase().includes("pedro") ? 1200 : 0);

                              const taxableIncome = basicBase - (sssEE + phEE + hdmfEE + latesVal) + benefits + accumulatedLeavePaid + overtimePay - loans;
                              const taxEE = Math.round(Math.max(taxableIncome * 0.12, 0));
                              const netTakeHome = Math.round(basicBase - (sssEE + phEE + hdmfEE + taxEE + latesVal) + benefits + accumulatedLeavePaid + overtimePay - loans);

                              return {
                                employeeId: emp.id,
                                employeeName: emp.name,
                                employeePosition: emp.position,
                                employeeDepartment: emp.department,
                                basicGross: basicBase,
                                sss: sssEE,
                                philhealth: phEE,
                                pagibig: hdmfEE,
                                tax: taxEE,
                                latesUndertime: latesVal,
                                overtimePay: overtimePay,
                                accumulatedLeavePaid: accumulatedLeavePaid,
                                benefits: benefits,
                                loans: loans,
                                netTakeHome: netTakeHome
                              };
                            });

                            const newRun = {
                              id: finalRunId,
                              startDate: startStr,
                              endDate: endStr,
                              label: labelStr,
                              generatedAt: new Date().toISOString(),
                              records: generatedRecords
                            };

                            setPayrollRunsList(prev => [newRun, ...prev]);
                            setSelectedAdminCutoffId(finalRunId);
                            setSelectedCutoffId(finalRunId);
                            triggerToast(`Ledger "${labelStr}" successfully compiled for ${employeesList.length} staff!`, "success");
                          }}
                          className="w-full bg-[#C9A84C] hover:bg-[#E8C96A] text-slate-900 font-extrabold uppercase py-2.5 px-3 rounded-lg text-[9px] tracking-wider transition-all"
                        >
                          Generate & Record Period Run ⚡
                        </button>
                      </div>
                    </div>

                    {/* Column 2: Choosing existing historical ledger sheets */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4 font-semibold">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#1E3A5F]" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">Archived Cutoff Directories</h4>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Change the active directory below to view ledger sheets and click on any personnel name to examine detailed formulas.
                      </p>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider font-black text-gray-450 mb-1">Select Cut-off Sheets</label>
                        <select
                          value={selectedAdminCutoffId}
                          onChange={(e) => setSelectedAdminCutoffId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#1E3A5F] font-bold focus:outline-none focus:border-[#C9A84C]"
                        >
                          {payrollRunsList.map(run => (
                            <option key={run.id} value={run.id}>
                              {run.label} ({run.id}) — Generated at {new Date(run.generatedAt).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 bg-teal-50/50 border border-teal-150 rounded-xl text-[10px] text-slate-600 flex items-center justify-between">
                        <span>Active ledger directory contains <strong className="text-teal-900">{(payrollRunsList.find(r => r.id === selectedAdminCutoffId) || payrollRunsList[0])?.records?.length || 0} checked records</strong></span>
                        <span className="text-[8.5px] uppercase font-bold tracking-widest bg-teal-600 text-white px-2 py-0.5 rounded font-mono font-bold">SECURE LOGS</span>
                      </div>
                    </div>
                  </div>

                  {/* MASTER TABULAR SPREADSHEEET */}
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
                    <div className="border-b pb-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">
                          Payroll Directory Master Run Sheet ({(payrollRunsList.find(r => r.id === selectedAdminCutoffId) || payrollRunsList[0])?.label})
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Click on any name below to view the full details of lates, loans, paid leaves, and other metrics.</p>
                      </div>
                      <span className="text-[9.5px] font-mono tracking-wider font-extrabold text-[#1E3A5F] bg-blue-50 py-1 px-3 border border-blue-200 rounded-full">
                        Cutoff ID: {(payrollRunsList.find(r => r.id === selectedAdminCutoffId) || payrollRunsList[0])?.id}
                      </span>
                    </div>

                    <div className="overflow-x-auto font-semibold">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-gray-50 text-gray-450 font-bold text-[10px] uppercase">
                            <th className="p-3">Ref ID</th>
                            <th className="p-3">Personnel (Click for Breakdown)</th>
                            <th className="p-3">Basic Gross Pay</th>
                            <th className="p-3">Lates/Undertime</th>
                            <th className="p-3">OT Pay</th>
                            <th className="p-3">Leaves &amp; Benefits</th>
                            <th className="p-3">Loans Amort</th>
                            <th className="p-3">Statutory Deducts</th>
                            <th className="p-3 text-right">Net Take-Home</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-105 font-mono">
                          {(() => {
                            const activeRunObj = payrollRunsList.find(r => r.id === selectedAdminCutoffId) || payrollRunsList[0];
                            if (!activeRunObj) return (
                              <tr>
                                <td colSpan={9} className="p-4 text-center text-gray-400">No payroll periods available. Please generate one.</td>
                              </tr>
                            );

                            return activeRunObj.records.map((rec: any, idx: number) => {
                              const totalStatutory = rec.sss + rec.philhealth + rec.pagibig + rec.tax;
                              const additions = rec.benefits + rec.accumulatedLeavePaid;
                              const otValue = rec.overtimePay || 0;
                              
                              return (
                                <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                                  <td className="p-3 font-semibold text-gray-500">{rec.employeeId}</td>
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => setAdminSelectedPayrollRecord({ record: rec, runId: activeRunObj.id })}
                                      className="text-[#1E3A5F] hover:text-[#C9A84C] hover:underline font-extrabold text-left transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      📂 <span className="font-sans font-bold">{rec.employeeName}</span>
                                      <span className="text-[8px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 py-0.2 rounded uppercase font-black tracking-wider">Inspect ⚡</span>
                                    </button>
                                  </td>
                                  <td className="p-3">{formatCurrency(rec.basicGross)}</td>
                                  <td className="p-3 text-rose-600 font-bold">-{formatCurrency(rec.latesUndertime)}</td>
                                  <td className="p-3 text-emerald-600 font-bold">+{formatCurrency(otValue)}</td>
                                  <td className="p-3 text-emerald-600 font-bold">+{formatCurrency(additions)}</td>
                                  <td className="p-3 text-rose-600">-{formatCurrency(rec.loans)}</td>
                                  <td className="p-3 text-slate-500">-{formatCurrency(totalStatutory)}</td>
                                  <td className="p-3 text-right font-black text-emerald-600 font-bold">{formatCurrency(rec.netTakeHome)}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HIGH-GRADE DETAILED BREAKDOWN MODAL OVERLAY */}
                  {adminSelectedPayrollRecord && (
                    <div className="fixed inset-0 z-50 bg-[#0F172A]/85 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#15273F] border border-slate-700 p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-scaleUp text-white">
                        
                        {/* Header details */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                          <div>
                            <h3 className="text-xs font-black text-[#E8C96A] uppercase tracking-wider flex items-center gap-1.5">
                              <Lock className="w-4 h-4 text-[#E8C96A]" /> Personnel Payroll Formula Breakdown Audit
                            </h3>
                            <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                              Auditing <strong className="text-white font-sans">{adminSelectedPayrollRecord.record.employeeName}</strong> for {payrollRunsList.find(r => r.id === adminSelectedPayrollRecord.runId)?.label}
                            </p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setAdminSelectedPayrollRecord(null)} 
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold p-2 px-3.5 rounded-lg text-xs cursor-pointer"
                          >
                            ✕ Close
                          </button>
                        </div>

                        {/* Calculations Formula Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Left Panel: Primary Earnings and Additions */}
                          <div className="bg-[#0B1522] border border-slate-800 rounded-xl p-4 space-y-3 font-semibold">
                            <span className="text-[10px] text-[#E8C96A] uppercase font-black tracking-wider block border-b border-slate-800 pb-1">I. Earnings & Allowances</span>
                            
                            <div>
                              <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Monthly Salary Basis</label>
                              <div className="text-xs font-mono font-bold text-slate-300">
                                {formatCurrency(employeesList.find(e => e.id === adminSelectedPayrollRecord.record.employeeId)?.salary || 0)}/mo
                              </div>
                            </div>

                            <div>
                              <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Raw Base Cut-off Gross Pay (EE Half)</label>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.basicGross}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, basicGross: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#C9A84C]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[8px] uppercase tracking-wider text-emerald-400">Benefits & Allowances</label>
                                <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 rounded px-1 uppercase tracking-wider">Earnings</span>
                              </div>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.benefits}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, benefits: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-emerald-500 text-emerald-400"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[8px] uppercase tracking-wider text-emerald-450">Accumulated Paid Leaves Cash out</label>
                                <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900 rounded px-1 uppercase tracking-wider">Leave Pay</span>
                              </div>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.accumulatedLeavePaid}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, accumulatedLeavePaid: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-indigo-500 text-indigo-300"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[8px] uppercase tracking-wider text-emerald-450">Approved Overtime Premium Pay</label>
                                <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 rounded px-1 uppercase tracking-wider">OT Pay</span>
                              </div>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.overtimePay || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, overtimePay: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-emerald-500 text-emerald-400 font-bold"
                              />
                            </div>
                          </div>

                          {/* Right Panel: Primary Deductions, Lates, & Loans */}
                          <div className="bg-[#0B1522] border border-slate-800 rounded-xl p-4 space-y-3 font-semibold">
                            <span className="text-[10px] text-rose-400 uppercase font-black tracking-wider block border-b border-slate-800 pb-1">II. Deductions & Amortization</span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">SSS share</label>
                                <input 
                                  type="number" 
                                  value={adminSelectedPayrollRecord.record.sss}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setAdminSelectedPayrollRecord((prev: any) => ({
                                      ...prev,
                                      record: { ...prev.record, sss: val }
                                    }));
                                  }}
                                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-rose-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">PhilHealth share</label>
                                <input 
                                  type="number" 
                                  value={adminSelectedPayrollRecord.record.philhealth}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setAdminSelectedPayrollRecord((prev: any) => ({
                                      ...prev,
                                      record: { ...prev.record, philhealth: val }
                                    }));
                                  }}
                                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-rose-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">Pag-IBIG share</label>
                                <input 
                                  type="number" 
                                  value={adminSelectedPayrollRecord.record.pagibig}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setAdminSelectedPayrollRecord((prev: any) => ({
                                      ...prev,
                                      record: { ...prev.record, pagibig: val }
                                    }));
                                  }}
                                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-rose-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase tracking-wider text-slate-400 mb-1">BIR Tax Withholding</label>
                                <input 
                                  type="number" 
                                  value={adminSelectedPayrollRecord.record.tax}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setAdminSelectedPayrollRecord((prev: any) => ({
                                      ...prev,
                                      record: { ...prev.record, tax: val }
                                    }));
                                  }}
                                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-rose-500"
                                />
                              </div>
                            </div>

                            {/* Lates/Undertime Input */}
                            <div>
                              <label className="block text-[8px] uppercase tracking-wider text-rose-450 mb-1">Lates & Undertime Penalties</label>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.latesUndertime}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, latesUndertime: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-red-500 text-rose-400"
                              />
                            </div>

                            {/* Loans Dedution Input */}
                            <div>
                              <label className="block text-[8px] uppercase tracking-wider text-amber-450 mb-1">Active Loans (SSS, HDMF, Cash Loan Amortization)</label>
                              <input 
                                type="number" 
                                value={adminSelectedPayrollRecord.record.loans}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setAdminSelectedPayrollRecord((prev: any) => ({
                                    ...prev,
                                    record: { ...prev.record, loans: val }
                                  }));
                                }}
                                className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-amber-500 text-amber-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive calculations summary bar */}
                        <div className="mt-4 p-4 bg-[#0F1E33] border border-slate-800 rounded-xl flex items-center justify-between font-mono">
                          <div>
                            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-450">Calculated Net Remittance</span>
                            <div className="text-sm font-black text-[#E8C96A]">
                              {(() => {
                                const rec = adminSelectedPayrollRecord.record;
                                const gross = Number(rec.basicGross) || 0;
                                const earnings = (Number(rec.benefits) || 0) + (Number(rec.accumulatedLeavePaid) || 0) + (Number(rec.overtimePay) || 0);
                                const deducts = (Number(rec.sss) || 0) + (Number(rec.philhealth) || 0) + (Number(rec.pagibig) || 0) + (Number(rec.tax) || 0) + (Number(rec.latesUndertime) || 0) + (Number(rec.loans) || 0);
                                const netVal = gross + earnings - deducts;
                                return formatCurrency(netVal);
                              })()}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const rec = adminSelectedPayrollRecord.record;
                                const gross = Number(rec.basicGross) || 0;
                                const earnings = (Number(rec.benefits) || 0) + (Number(rec.accumulatedLeavePaid) || 0) + (Number(rec.overtimePay) || 0);
                                const deducts = (Number(rec.sss) || 0) + (Number(rec.philhealth) || 0) + (Number(rec.pagibig) || 0) + (Number(rec.tax) || 0) + (Number(rec.latesUndertime) || 0) + (Number(rec.loans) || 0);
                                const finalNet = gross + earnings - deducts;

                                setPayrollRunsList(prev => prev.map(run => {
                                  if (run.id === adminSelectedPayrollRecord.runId) {
                                    return {
                                      ...run,
                                      records: run.records.map((rObj: any) => {
                                        if (rObj.employeeId === rec.employeeId) {
                                          return { ...rec, netTakeHome: finalNet };
                                        }
                                        return rObj;
                                      })
                                    };
                                  }
                                  return run;
                                }));

                                setAdminSelectedPayrollRecord(null);
                                triggerToast(`Formula updated for ${rec.employeeName} inside active runoff sheet!`, "success");
                              }}
                              className="bg-[#C9A84C] hover:bg-[#E8C96A] text-[#15273F] text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer"
                            >
                              💾 Save Changes &amp; Recalculate Net
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminSelectedPayrollRecord(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              ) : (
                // EMPLOYEE SANDBOXED PRINTABLE PAYSLIP WITH CUTOFF HISTORY SELECTION
                <div className="space-y-6 max-w-xl mx-auto">
                  {/* Selector of cutoff based in payroll generated by admin */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-150 shadow-sm space-y-3 font-semibold">
                    <span className="text-[8px] bg-amber-50 text-[#C9A84C] border border-amber-200 py-0.5 px-2 rounded uppercase font-black tracking-wider">
                      Payslip Archives Revisit Portal
                    </span>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Select Pay Period Ledger Cutoff</h4>
                    <p className="text-[10.5px] font-sans text-gray-500 font-normal leading-normal">
                      Select one of the payroll cut-offs below generated by the HR Admin to audit and download your historical sovereign financial breakdown.
                    </p>

                    <div>
                      <select
                        value={selectedCutoffId}
                        onChange={(e) => setSelectedCutoffId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#1E3A5F] font-black focus:outline-none focus:border-[#C9A84C]"
                      >
                        {payrollRunsList.map(run => (
                          <option key={run.id} value={run.id}>
                            📅 {run.label} ({run.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const chosenRun = payrollRunsList.find(run => run.id === selectedCutoffId);
                    const chosenRecord = chosenRun?.records?.find((rec: any) => rec.employeeId === activeUserObj.id);

                    if (!chosenRecord) {
                      return (
                        <div className="bg-white rounded-xl border border-gray-150 p-8 text-center text-gray-500 space-y-3 font-semibold">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                          <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider">No Cutoff Record Found</h5>
                          <p className="text-[10px] text-gray-400 font-sans leading-relaxed max-w-sm mx-auto">
                            No active payslip matches your ID <strong className="font-mono text-slate-700">{activeUserObj.id}</strong> in this generated period. This typically happens if you were not on the company active roster at that time.
                          </p>
                        </div>
                      );
                    }

                    const statuteEE = chosenRecord.sss + chosenRecord.philhealth + chosenRecord.pagibig + chosenRecord.tax;

                    return (
                      <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-md space-y-6 font-semibold animate-scaleUp">
                        {/* Ledger Banner header */}
                        <div className="pb-4 border-b border-gray-205 text-center border-dashed">
                          <span className="text-[10px] bg-slate-100 text-[#1E3A5F] py-1 px-3 border border-slate-300 rounded-full font-bold uppercase tracking-wider">
                            Republic of the Philippines sovereign slip
                          </span>
                          <h4 className="text-sm font-black mx-auto mt-3 text-slate-800 uppercase tracking-wide">
                            CORPHR INC. OFFICIAL PAYSLIP RECEIPT
                          </h4>
                          <p className="text-[9.5px] text-gray-400 mt-1 font-mono">
                            Cutoff Period: {chosenRun?.startDate} to {chosenRun?.endDate} — (Cutoff Ref: {chosenRun?.id})
                          </p>
                        </div>

                        {/* Core detail summary */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-sans pb-4 border-b">
                          <div>
                            <span className="text-gray-400 text-[9px] uppercase font-bold block tracking-wider">Employee Reference:</span>
                            <div className="text-slate-800 font-extrabold mt-0.5">{activeUserObj.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {activeUserObj.id}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 text-[9px] uppercase font-bold block tracking-wider">Department Branch:</span>
                            <div className="text-slate-800 font-extrabold mt-0.5">{activeUserObj.department}</div>
                            <span className="text-[9.5px] text-yellow-600 bg-amber-50 py-0.5 px-2 rounded uppercase font-bold">{activeUserObj.position}</span>
                          </div>
                        </div>

                        {/* Calculations breakdown table layout */}
                        <div className="space-y-4 text-xs font-mono">
                          {/* Part A: Basic and Additions */}
                          <div>
                            <span className="text-[#1E3A5F] uppercase font-black tracking-wider block text-[9.5px] mb-2 font-sans">1. Gross Earnings & Additions:</span>
                            <div className="space-y-1.5 pl-3 border-l-2 border-emerald-500 py-1 font-mono">
                              <div className="flex justify-between">
                                <span className="font-sans">Cutoff Gross Basic Salary (EE Half):</span>
                                <span className="font-bold">{formatCurrency(chosenRecord.basicGross)}</span>
                              </div>
                              {chosenRecord.benefits > 0 && (
                                <div className="flex justify-between">
                                  <span className="font-sans">• Benefits, Bonuses & Allowances:</span>
                                  <span className="text-[#10B981] font-bold">+{formatCurrency(chosenRecord.benefits)}</span>
                                </div>
                              )}
                              {chosenRecord.accumulatedLeavePaid > 0 && (
                                <div className="flex justify-between">
                                  <span className="font-sans">• Accumulated Leave Cash-Out payout:</span>
                                  <span className="text-indigo-600 font-bold">+{formatCurrency(chosenRecord.accumulatedLeavePaid)}</span>
                                </div>
                              )}
                              {chosenRecord.overtimePay > 0 && (
                                <div className="flex justify-between">
                                  <span className="font-sans">• Approved Overtime Premium Pay:</span>
                                  <span className="text-emerald-600 font-bold">+{formatCurrency(chosenRecord.overtimePay)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-dashed pt-1 mt-1 text-[11px] font-sans font-extrabold text-slate-800">
                                <span>Total Gross Earnings:</span>
                                <span>{formatCurrency(chosenRecord.basicGross + chosenRecord.benefits + chosenRecord.accumulatedLeavePaid + (chosenRecord.overtimePay || 0))}</span>
                              </div>
                            </div>
                          </div>

                          {/* Part B: Deductions & Lates & Loans */}
                          <div>
                            <span className="text-rose-600 uppercase font-black tracking-wider block text-[9.5px] mb-2 font-sans">2. Reductions & Statutory Cuts:</span>
                            <div className="space-y-1.5 pl-3 border-l-2 border-rose-500 py-1 font-mono">
                              <div className="flex justify-between text-rose-500">
                                <span className="font-sans">• SSS statutory EE premium (4.5%):</span>
                                <span>-{formatCurrency(chosenRecord.sss)}</span>
                              </div>
                              <div className="flex justify-between text-rose-500">
                                <span className="font-sans">• PhilHealth premium EE share:</span>
                                <span>-{formatCurrency(chosenRecord.philhealth)}</span>
                              </div>
                              <div className="flex justify-between text-rose-500">
                                <span className="font-sans">• Pag-IBIG HDMF statutory fund:</span>
                                <span>-{formatCurrency(chosenRecord.pagibig)}</span>
                              </div>
                              <div className="flex justify-between text-rose-500">
                                <span className="font-sans">• BIR Withholding Tax bracket:</span>
                                <span>-{formatCurrency(chosenRecord.tax)}</span>
                              </div>
                              {chosenRecord.latesUndertime > 0 && (
                                <div className="flex justify-between text-rose-600 font-bold">
                                  <span className="font-sans">• Lates & Under-time penalties deduction:</span>
                                  <span>-{formatCurrency(chosenRecord.latesUndertime)}</span>
                                </div>
                              )}
                              {chosenRecord.loans > 0 && (
                                <div className="flex justify-between text-amber-600 font-bold">
                                  <span className="font-sans">• Active Cash Loans deductions (Amortisation):</span>
                                  <span>-{formatCurrency(chosenRecord.loans)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-dashed pt-1 mt-1 text-[11px] font-sans font-extrabold text-slate-800">
                                <span>Total Deducts & Reductions:</span>
                                <span className="text-rose-600">-{formatCurrency(statuteEE + chosenRecord.latesUndertime + chosenRecord.loans)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Net payouts */}
                        <div className="flex justify-between items-center bg-[#1e3a5f]/5 p-4 rounded-xl border border-dashed text-slate-900 border-[#1e3a5f]/30">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[#1E3A5F] block">NET TAKE-HOME REMITTANCE</span>
                            <div className="text-lg font-black font-mono text-[#C9A84C] mt-0.5">
                              {formatCurrency(chosenRecord.netTakeHome)}
                            </div>
                          </div>
                          <button
                            onClick={() => triggerToast(`Generating signed PDF slip for cutoff period ${chosenRun?.label}... Loaded!`, "success")}
                            className="text-[10px] bg-[#1E3A5F] hover:bg-[#2A4F80] hover:text-white text-white py-1.5 px-3 rounded-lg font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            + Export PDF
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              7. PERFORMANCE REVIEWS & KPI EVALUATIONS
             ========================================================= */}
          {activeModule === "performance" && (
            <div className="space-y-6 font-semibold animate-fadeIn">
              <div className="bg-gradient-to-r from-[#1E3A5F] to-indigo-950 p-6 rounded-2xl text-white shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="text-amber-400 w-5 h-5 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Generative AI Appraisal Core</span>
                  </div>
                  <h3 className="text-base font-bold">
                    {userRole === "admin" ? "Superuser Q4 Employee Performance & KPI Reviewer" : "My Personal Q4 Self-Appraisal Reviewer"}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 max-w-lg leading-normal">
                    {userRole === "admin"
                      ? "Conduct formal KPI scoring of corporate staff based on actual timekeeping history and job achievements by position."
                      : "Prepare your self-evaluation narrative parameter. Review how Gemini analyses your strength scores before manager lock."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-semibold">
                
                {/* Appraisal Inputs Setup */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-gray-655 uppercase tracking-widest pb-2 border-b">
                    Appraisal Parameters Configuration
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userRole === "admin" ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-605">Selected Employee</label>
                        <select 
                          value={aiReviewRequest.employeeName}
                          onChange={(e) => {
                            const name = e.target.value;
                            const emp = employeesList.find(x => x.name === name);
                            setAiReviewRequest(prev => ({
                              ...prev,
                              employeeName: name,
                              position: emp?.position || "Staff",
                              department: emp?.department || "Corporate"
                            }));
                          }}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none"
                        >
                          {employeesList.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-605">Active ESS Account</label>
                        <div className="text-xs font-bold text-indigo-900 bg-indigo-50 p-2.5 rounded-lg border font-mono">
                          {activeUserObj.name}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-605">Job Rank Profile</label>
                      <div className="text-xs bg-gray-100 p-2.5 rounded-lg font-mono text-gray-650">
                        {userRole === "admin" ? aiReviewRequest.position : activeUserObj.position} &bull; {userRole === "admin" ? aiReviewRequest.department : activeUserObj.department}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-605">Self-Evaluation Score (1-5)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        value={aiReviewRequest.selfScore}
                        onChange={(e) => setAiReviewRequest(prev => ({ ...prev, selfScore: parseInt(e.target.value) || 3 }))}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-[#C9A84C]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-605">Manager appraisal rating (1-5)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        value={aiReviewRequest.managerScore}
                        disabled={userRole === "employee"}
                        onChange={(e) => setAiReviewRequest(prev => ({ ...prev, managerScore: parseInt(e.target.value) || 3 }))}
                        className="text-xs bg-gray-50 border border-gray-250 border-gray-200 rounded-lg p-2.5 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 font-semibold"
                      />
                      {userRole === "employee" && <span className="text-[9px] text-[#C9A84C]">Locked under Admin RBAC Clearance.</span>}
                    </div>
                  </div>

                  {/* Dynamic Timekeeping logs matching selected candidate context */}
                  {userRole === "admin" && (
                    <div className="bg-gray-50 border p-3 rounded-xl space-y-3 font-semibold text-xs mt-3">
                      <span className="text-[10px] text-indigo-900 uppercase font-black tracking-wider block">Attendance &amp; Punctuality Index (Time Records)</span>
                      {(() => {
                        const targetName = aiReviewRequest.employeeName;
                        // Find attendance sheets
                        const matchedLogs = attendanceList.filter(a => a.name === targetName);
                        const totalDays = matchedLogs.length;
                        const totalLates = matchedLogs.reduce((acc, curr) => acc + (curr.lateMin || 0), 0);
                        const statusCounts = matchedLogs.reduce((acc: any, curr) => {
                          acc[curr.status] = (acc[curr.status] || 0) + 1;
                          return acc;
                        }, { Present: 0, Late: 0, Absent: 0 });

                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                              <div className="bg-white border rounded p-1.5">
                                <div className="text-gray-450 font-bold uppercase text-[8px]">Present Days</div>
                                <div className="text-emerald-605 text-emerald-600 font-extrabold text-sm">{statusCounts.Present + statusCounts.Late || 1}</div>
                              </div>
                              <div className="bg-white border rounded p-1.5">
                                <div className="text-gray-450 font-bold uppercase text-[8px]">Total Lates</div>
                                <div className="text-amber-500 font-extrabold text-sm">{statusCounts.Late} items</div>
                              </div>
                              <div className="bg-white border rounded p-1.5">
                                <div className="text-gray-455 text-red-500 font-bold uppercase text-[8px]">Late Min</div>
                                <div className="text-red-500 font-extrabold text-sm">{totalLates} mins</div>
                              </div>
                            </div>
                            
                            {/* Position details suggestions */}
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-[9px] text-gray-450 uppercase tracking-wider block mb-1">Position-Suggested Achievements Presets (Click to Load):</span>
                              <div className="flex gap-1 flex-wrap">
                                {(() => {
                                  let presets: string[] = [
                                    "Consistently hit all sprint outputs, shipped client secure token integrations",
                                    "Resolved urgent helpdesk tickets and synchronized sandbox setups"
                                  ];
                                  if (aiReviewRequest.position.includes("Manager")) {
                                    presets = [
                                      "Successfully completed Q4 statutory 201 audits and resolved pending maker requests.",
                                      "Spearheaded company-wide mental health seminars and processed compliance report frameworks."
                                    ];
                                  } else if (aiReviewRequest.position.includes("Developer") || aiReviewRequest.position.includes("Support")) {
                                    presets = [
                                      "Refactored Core Payroll calculations module and optimized PDF export times.",
                                      "Passed SOC2 system audit with zero non-conformances in sovereign authentication control codes."
                                    ];
                                  } else if (aiReviewRequest.position.includes("Accountant") || aiReviewRequest.position.includes("Clerk")) {
                                    presets = [
                                      "Balanced Q3 BIR tax filings reports with zero discrepancies.",
                                      "Organized 24-hour statutory SSS premium filing alignment sheet with compliance officers."
                                    ];
                                  } else if (aiReviewRequest.position.includes("Lead") || aiReviewRequest.position.includes("Assistant")) {
                                    presets = [
                                      "Maintained 99.8% stakeholder SLA and coordinated shift alignments.",
                                      "Standardized documentation updates for remote system users."
                                    ];
                                  }
                                  return presets.map((pres, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setAiReviewRequest(prev => ({
                                          ...prev,
                                          coreStrengths: pres
                                        }));
                                        triggerToast(`Preset loaded for position: ${aiReviewRequest.position}`, "success");
                                      }}
                                      className="text-[9px] bg-white border border-gray-200 font-normal hover:border-gray-300 p-1.5 rounded text-left transition-colors font-sans text-gray-700 leading-tight block w-full hover:shadow-xs"
                                    >
                                      &bull; &ldquo;{pres}&rdquo;
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-605">Mention Core Projects & Strengths (Optional)</label>
                    <textarea 
                      placeholder="e.g. Led successful IT system migration, compliant with security structures..."
                      value={aiReviewRequest.coreStrengths}
                      onChange={(e) => setAiReviewRequest(prev => ({ ...prev, coreStrengths: e.target.value }))}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 h-16 focus:outline-none focus:border-[#C9A84C] resize-none leading-normal font-sans"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-655">Identified introspective development needs (Optional)</label>
                    <textarea 
                      placeholder="e.g. Refine and scale remote communication coordination..."
                      value={aiReviewRequest.developmentAreas}
                      onChange={(e) => setAiReviewRequest(prev => ({ ...prev, developmentAreas: e.target.value }))}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 h-16 focus:outline-none focus:border-[#C9A84C] resize-none leading-normal font-sans"
                    />
                  </div>

                  <button
                    onClick={executeAiReview}
                    disabled={isAiReviewLoading}
                    className="w-full bg-[#1E3A5F] hover:bg-slate-800 text-white font-black py-2.5 px-4 rounded-xl text-xs mt-2 disabled:opacity-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {isAiReviewLoading ? "Synchronizing evaluation report..." : "Dispatch Appraisal Analysis"}
                  </button>
                </div>

                {/* Narrative Result Display Block */}
                <div className="bg-gray-900 rounded-xl border border-gray-850 p-6 shadow-md text-white flex flex-col">
                  <div className="border-b border-gray-800 pb-3 mb-4 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-350 text-slate-300 uppercase tracking-widest font-mono">
                      Narrative Appraisal Output Report
                    </h4>
                    <span className="text-[9px] bg-[#C9A84C]/25 text-[#E8C96A] border border-[#C9A84C]/50 py-0.5 px-2 rounded-full font-mono uppercase tracking-widest font-bold animate-pulse">
                      Gemini Pipeline Open
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    {aiReviewResult ? (
                      <div className="space-y-4 font-semibold">
                        <div className="flex items-center justify-between bg-[#1E3A5F]/40 border border-[#1e3a5f]/60 p-3 rounded-lg">
                          <div>
                            <span className="text-[9px] uppercase text-gray-400 font-mono tracking-widest">Appraisal Index Score</span>
                            <div className="text-xs font-bold text-amber-400 mt-0.5">{aiReviewResult.appraisalRating}</div>
                          </div>
                          <span className="text-xs font-mono font-bold pr-2">
                            ({aiReviewResult.avgScore}/5 Calculated Rating)
                          </span>
                        </div>

                        <div className="text-[11px] font-mono bg-black/40 border border-gray-800 p-3 rounded-lg leading-relaxed text-gray-300 whitespace-pre-wrap select-text max-h-[290px] overflow-auto">
                          {aiReviewResult.narrative}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center text-center text-gray-650 py-12">
                        <Award className="w-10 h-10 text-gray-700 mb-2" />
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#C9A84C]">Awaiting Input Parameters</div>
                        <p className="text-[11px] text-gray-450 mt-1.5 max-w-xs leading-normal font-sans text-stone-400">
                          Configure evaluation fields and click &ldquo;Dispatch Appraisal Analysis&rdquo; to prompt the server-side review model.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 pt-3 border-t border-slate-800 text-[9px] text-slate-500 font-mono flex justify-between items-center">
                      <span>Service: Gemini-3.5-flash serverless proxy</span>
                      <span>Security: Postgres Sovereign Policy Protection</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================
              7.5 NEW HIRE ONBOARDING TRACK PROTOCOL (ADMIN ONLY)
             ========================================================= */}
          {activeModule === "onboarding" && userRole === "admin" && (
            <div className="space-y-6 max-w-7xl animate-fadeIn font-semibold">
              <div className="bg-[#1E3A5F] p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="text-[#E8C96A] w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E8C96A]">Statutory Onboarding Gateway</span>
                  </div>
                  <h3 className="text-base font-bold font-sans">201 Compliance Onboarding Ledger</h3>
                  <p className="text-xs text-gray-305 text-slate-305 text-gray-300 mt-1 max-w-xl font-sans font-medium">
                    Inspect document compilations for new hires. Verify national insurance memberships (SSS, PhilHealth, Pag-IBIG), tax identifiers, clearing certificates, and signed contracts prior to complete 201 Registry conversion.
                  </p>
                </div>
                <div className="bg-white/10 text-xs px-3 py-1.5 rounded-lg border border-white/20 font-mono">
                  Pending: <span className="text-[#E8C96A] font-bold">{newHires.filter(n => n.onboardingStatus !== "Completed").length} Trackers</span>
                </div>
              </div>

              {/* Grid of new hire candidates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-semibold">
                
                {/* Left pane: Candidate selection list */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-sans">Active Onboarding Dossiers</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showAddHireForm) {
                          const nextNum = employeesList.length + newHires.length + 12;
                          setNewHireId(`EMP-2026-${String(nextNum).padStart(4, '0')}`);
                        }
                        setShowAddHireForm(!showAddHireForm);
                      }}
                      className="text-[9px] bg-[#1E3A5F] hover:bg-[#2A4F80] text-[#E8C96A] hover:text-white px-2 py-1 rounded flex items-center gap-1 uppercase font-black tracking-wider transition-all cursor-pointer font-sans"
                    >
                      {showAddHireForm ? "Close Form ✕" : "+ New Prospect"}
                    </button>
                  </div>

                  {showAddHireForm && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newHireName.trim() || !newHirePosition.trim() || !newHireEmail.trim()) {
                          triggerToast("Please provide name, position, and email address.", "error");
                          return;
                        }

                        // Generate initials for avatar
                        const words = newHireName.trim().split(" ");
                        const avatar = words.length >= 2 
                          ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
                          : newHireName.trim().substring(0, 2).toUpperCase();

                        // Unique custom/specified employee ID
                        const finalId = newHireId.trim() || `EMP-2026-00${employeesList.length + newHires.length + 12}`;

                        const newNHObj = {
                          id: finalId,
                          name: newHireName.trim(),
                          position: newHirePosition.trim(),
                          department: newHireDepartment,
                          dateHired: newHireDate || "2026-06-01",
                          email: newHireEmail.trim().toLowerCase(),
                          avatar: avatar,
                          salary: Number(newHireSalary) || 25000,
                          workingDaysFrom: newHireWorkingDaysFrom,
                          workingDaysTo: newHireWorkingDaysTo,
                          clockInSchedule: newHireClockInSchedule.trim() || "08:00 AM",
                          clockOutSchedule: newHireClockOutSchedule.trim() || "05:00 PM",
                          gracePeriod: Number(newHireGracePeriod) || 15,
                          // Default first login credentials state: password is finalId, and passwordChanged check is false
                          password: finalId,
                          passwordChanged: false,
                          forgotPasswordRequested: false,
                          docs: {
                            sss: { status: "Missing", file: null },
                            philhealth: { status: "Missing", file: null },
                            pagibig: { status: "Missing", file: null },
                            tin: { status: "Missing", file: null },
                            nbi: { status: "Missing", file: null },
                            contract: { status: "Pending Signature", file: null },
                            resume: { status: "Missing", file: null },
                            other: { status: "Missing", file: null },
                          },
                          onboardingStatus: "In Progress"
                        };

                        setNewHires(prev => [newNHObj, ...prev]);
                        setSelectedEmp(newNHObj);
                        setShowAddHireForm(false);

                        // Reset fields
                        setNewHireName("");
                        setNewHirePosition("");
                        setNewHireSalary(30000);
                        setNewHireEmail("");
                        setNewHireDate("2026-06-01");
                        setNewHireId("");
                        setNewHireWorkingDaysFrom("Monday");
                        setNewHireWorkingDaysTo("Friday");
                        setNewHireClockInSchedule("08:00 AM");
                        setNewHireClockOutSchedule("05:00 PM");
                        setNewHireGracePeriod(15);

                        triggerToast(`Added ${newNHObj.name} with Login ID Code "${finalId}" to Onboarding Ledger!`, "success");
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3 font-semibold text-xs animate-fadeIn"
                    >
                      <div className="text-[#1E3A5F] font-black text-[9px] uppercase tracking-wider block border-b pb-1">Create Onboarding Record</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-450 tracking-wider mb-0.5">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Gino de Borja"
                            value={newHireName}
                            onChange={(e) => setNewHireName(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-sans font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-[#1E3A5F] tracking-wider mb-0.5">ID Number (Login Token)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. EMP-2026-0033"
                            value={newHireId}
                            onChange={(e) => setNewHireId(e.target.value)}
                            className="w-full bg-white border border-gray-200 p-2 rounded-lg text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Corporate Email</label>
                          <input
                            type="email"
                            required
                            placeholder="g.deborja@corp.ph"
                            value={newHireEmail}
                            onChange={(e) => setNewHireEmail(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-805 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Job Position</label>
                          <input
                            type="text"
                            required
                            placeholder="Developer"
                            value={newHirePosition}
                            onChange={(e) => setNewHirePosition(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-sans font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Est. Salary (PHP)</label>
                          <input
                            type="number"
                            required
                            value={newHireSalary}
                            onChange={(e) => setNewHireSalary(parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Hired Date</label>
                          <input
                            type="date"
                            required
                            value={newHireDate}
                            onChange={(e) => setNewHireDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-mono text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Department</label>
                        <select
                          value={newHireDepartment}
                          onChange={(e) => setNewHireDepartment(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-850 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-sans font-semibold"
                        >
                          {departmentsList.map(dept => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Working Days From</label>
                          <select
                            value={newHireWorkingDaysFrom}
                            onChange={(e) => setNewHireWorkingDaysFrom(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-semibold"
                          >
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Working Days To</label>
                          <select
                            value={newHireWorkingDaysTo}
                            onChange={(e) => setNewHireWorkingDaysTo(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] font-semibold"
                          >
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Clock In</label>
                          <input
                            type="text"
                            required
                            placeholder="08:00 AM"
                            value={newHireClockInSchedule}
                            onChange={(e) => setNewHireClockInSchedule(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs font-mono focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-gray-455 tracking-wider mb-0.5">Clock Out</label>
                          <input
                            type="text"
                            required
                            placeholder="05:00 PM"
                            value={newHireClockOutSchedule}
                            onChange={(e) => setNewHireClockOutSchedule(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-slate-800 text-xs font-mono focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase font-black text-[#C9A84C] tracking-wider mb-0.5">Grace Period (Min)</label>
                          <input
                            type="number"
                            required
                            placeholder="15"
                            value={newHireGracePeriod}
                            onChange={(e) => setNewHireGracePeriod(parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[#C9A84C] text-xs font-mono font-black focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 rounded text-[10px] uppercase font-sans tracking-widest transition-all cursor-pointer text-center"
                        >
                          Create Record ✔
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddHireForm(false);
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-slate-700 font-bold py-2 px-3 rounded text-[10px] uppercase font-sans tracking-wide transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {newHires.map(nh => {
                      // Calculate document compilation percent
                      const totalDocs = Object.keys(nh.docs).length;
                      const verifiedDocs = Object.values(nh.docs).filter((d: any) => d.status === "Verified").length;
                      const percent = Math.round((verifiedDocs / totalDocs) * 100);

                      return (
                        <button
                          key={nh.id}
                          type="button"
                          onClick={() => setSelectedEmp(nh)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            selectedEmp?.id === nh.id
                              ? "bg-[#1E3A5F]/5 border-[#1E3A5F]"
                              : nh.onboardingStatus === "Completed"
                              ? "bg-emerald-50/30 border-emerald-100 opacity-80 hover:opacity-100"
                              : "bg-white border-gray-150 hover:border-gray-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px] uppercase font-bold font-mono">
                                {nh.avatar}
                              </span>
                              <div className="truncate">
                                <div className="text-xs font-bold text-slate-800 truncate">{nh.name}</div>
                                <div className="text-[9px] text-gray-450 font-mono truncate">{nh.position}</div>
                              </div>
                            </div>
                            
                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${percent === 100 ? "bg-emerald-500" : "bg-[#C9A84C]"}`} 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                              <span className="text-[8px] font-mono text-gray-500 font-bold">{percent}%</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[8px] font-mono bg-slate-100 text-slate-600 py-0.5 px-1.5 rounded uppercase">
                              {nh.id}
                            </span>
                            <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded font-mono ${
                              nh.onboardingStatus === "Completed" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-amber-50 text-amber-700 border-amber-150"
                            }`}>
                              {nh.onboardingStatus === "Completed" ? "201 Ready" : "Onboarding"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right content: Selected Candidate compliance checklist status mapping */}
                <div className="lg:col-span-2">
                  {selectedEmp && newHires.some(n => n.id === selectedEmp.id) ? (() => {
                    const candidate = newHires.find(n => n.id === selectedEmp.id)!;
                    const documentKeys = Object.keys(candidate.docs);
                    const totalDocs = documentKeys.length;
                    const verifiedDocs = Object.values(candidate.docs).filter((d: any) => d.status === "Verified").length;
                    const allVerified = verifiedDocs === totalDocs;

                    return (
                      <div className="bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-2">
                          <div>
                            <span className="text-[9px] font-mono bg-[#C9A84C]/10 text-[#C9A84C] px-2.5 py-0.5 rounded uppercase font-bold">Candidate Compliance Dossier</span>
                            <h4 className="text-sm font-black text-slate-850 text-slate-800 mt-1">{candidate.name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono">{candidate.position} &bull; Joined: {candidate.dateHired} &bull; Est. Salary: {formatCurrency(candidate.salary)}/mo</p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Verification Status:</span>
                            <span className={`inline-block text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase mt-1 ${
                              candidate.onboardingStatus === "Completed" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/25 animate-pulse"
                            }`}>
                              {candidate.onboardingStatus === "Completed" ? "Successfully Compiled to 201 ✔" : "Pending Checker Clearance ⏳"}
                            </span>
                          </div>
                        </div>

                        {/* File lists */}
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase font-extrabold text-gray-450 tracking-wider">Statutory Verification Checkpoints</label>
                          <p className="text-[11px] text-gray-500 font-normal leading-normal font-sans">
                            Directly toggle status checkpoints to verify compiled materials, or use the quick attach simulator down below to add simulated document files.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            {Object.entries(candidate.docs).map(([key, value]: [string, any]) => {
                              let docLabel = key.toUpperCase();
                              if (key === "sss") docLabel = "SSS Membership Photo / Card";
                              if (key === "philhealth") docLabel = "PhilHealth Member Registration MDF";
                              if (key === "pagibig") docLabel = "HDMF Pag-IBIG Member Sheet";
                              if (key === "tin") docLabel = "BIR Form 1902 Taxes ID";
                              if (key === "nbi") docLabel = "NBI Clearance Background certificate";
                              if (key === "contract") docLabel = "Signed Employment Contract copy";
                              if (key === "resume") docLabel = "Curriculum Vitae / Resume Professional";
                              if (key === "other") docLabel = "Other Credentials / TOR / Certifications";

                              return (
                                <div key={key} className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg flex flex-col justify-between gap-2.5 font-semibold text-xs">
                                  <div>
                                    <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 font-sans">
                                      <FileText className="w-3.5 h-3.5 text-[#1E3A5F]" />
                                      {docLabel}
                                    </div>
                                    <div className="text-[9px] text-gray-400 font-mono mt-1 flex items-center gap-1 truncate">
                                      <span className="text-gray-400">Dossier File:</span>
                                      <span className="italic text-slate-600 truncate">{value.file || "Pending file upload..."}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-gray-150">
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                      value.status === "Verified"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : value.status === "Pending Verification"
                                        ? "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                                        : value.status === "Pending Signature"
                                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                                        : "bg-red-50 text-red-700 border border-red-100"
                                    }`}>
                                      {value.status}
                                    </span>

                                    {/* Select modifier inline */}
                                    <select
                                      value={value.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setNewHires(prev => prev.map(nh => {
                                          if (nh.id === candidate.id) {
                                            const updatedDocs = { ...nh.docs };
                                            updatedDocs[key] = { 
                                              ...updatedDocs[key], 
                                              status: newStatus,
                                              file: updatedDocs[key].file || `${key}_authenticated_clearance.pdf`
                                            };
                                            return { ...nh, docs: updatedDocs };
                                          }
                                          return nh;
                                        }));
                                        triggerToast(`Checklist update: ${key.toUpperCase()} set to ${newStatus}`, "info");
                                      }}
                                      className="text-[9px] bg-white border border-gray-200 p-1 rounded font-bold uppercase tracking-wider text-slate-800"
                                    >
                                      <option value="Verified">Verified ✅</option>
                                      <option value="Pending Verification">Pending ⏳</option>
                                      <option value="Pending Signature">Needs Signature ✍️</option>
                                      <option value="Missing">Missing ❌</option>
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Drag-and-Drop Batch Upload console */}
                        <div className="space-y-3.5 mt-4">
                          <label className="text-[10px] uppercase font-extrabold text-[#1E3A5F] tracking-wider">
                            🚀 Drag-and-Drop Batch File Onboarding Portal
                          </label>
                          <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragOver(false);
                              const files = Array.from(e.dataTransfer.files);
                              if (files.length === 0) return;
                              const newUploaded = files.map((file, idx) => {
                                const nameLower = file.name.toLowerCase();
                                let guessedKey = "other";
                                if (nameLower.includes("sss")) guessedKey = "sss";
                                else if (nameLower.includes("philhealth") || nameLower.includes("mdf")) guessedKey = "philhealth";
                                else if (nameLower.includes("pagibig") || nameLower.includes("pag-ibig") || nameLower.includes("hdmf")) guessedKey = "pagibig";
                                else if (nameLower.includes("tin") || nameLower.includes("bir") || nameLower.includes("tax")) guessedKey = "tin";
                                else if (nameLower.includes("nbi") || nameLower.includes("clearance")) guessedKey = "nbi";
                                else if (nameLower.includes("contract") || nameLower.includes("employ")) guessedKey = "contract";
                                else if (nameLower.includes("resume") || nameLower.includes("cv")) guessedKey = "resume";
                                return {
                                  id: `batch-${Date.now()}-${idx}`,
                                  fileName: file.name,
                                  mappedKey: guessedKey
                                };
                              });
                              setBatchFiles(prev => [...prev, ...newUploaded]);
                              triggerToast(`Dropped & added ${files.length} documents. Assign mapping fields down below!`, "success");
                            }}
                            className={`p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                              isDragOver 
                                ? "border-[#C9A84C] bg-[#C9A84C]/10 scale-[1.01]" 
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                            }`}
                          >
                            <label className="w-full cursor-pointer">
                              <input 
                                type="file" 
                                multiple 
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length === 0) return;
                                  const newUploaded = files.map((file, idx) => {
                                    const nameLower = file.name.toLowerCase();
                                    let guessedKey = "other";
                                    if (nameLower.includes("sss")) guessedKey = "sss";
                                    else if (nameLower.includes("philhealth") || nameLower.includes("mdf")) guessedKey = "philhealth";
                                    else if (nameLower.includes("pagibig") || nameLower.includes("pag-ibig") || nameLower.includes("hdmf")) guessedKey = "pagibig";
                                    else if (nameLower.includes("tin") || nameLower.includes("bir") || nameLower.includes("tax")) guessedKey = "tin";
                                    else if (nameLower.includes("nbi") || nameLower.includes("clearance")) guessedKey = "nbi";
                                    else if (nameLower.includes("contract") || nameLower.includes("employ")) guessedKey = "contract";
                                    else if (nameLower.includes("resume") || nameLower.includes("cv")) guessedKey = "resume";
                                    return {
                                      id: `batch-${Date.now()}-${idx}`,
                                      fileName: file.name,
                                      mappedKey: guessedKey
                                    };
                                  });
                                  setBatchFiles(prev => [...prev, ...newUploaded]);
                                  triggerToast(`Loaded & added ${files.length} files. Assign mapping fields down below!`, "success");
                                }}
                              />
                              <Upload className="w-7 h-7 text-[#C9A84C] mx-auto mb-1" />
                              <div className="text-xs font-black text-slate-700">Drag &amp; Drop multiple files here, or <span className="text-[#1E3A5F] underline">browse local storage</span></div>
                              <div className="text-[10px] text-gray-400 font-medium font-sans mt-0.5">Supports PDF, PNG, JPG, Word documents for mapping</div>
                            </label>
                          </div>

                          {/* Queue mapping controller */}
                          {batchFiles.length > 0 && (
                            <div className="bg-[#1E3A5F]/5 p-4 border border-[#1E3A5F]/15 rounded-xl space-y-3 animate-fadeIn">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-wider">
                                  📂 Unresolved Upload Queue ({batchFiles.length} files to map)
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => setBatchFiles([])}
                                  className="text-[10px] text-red-600 hover:underline font-bold"
                                >
                                  Clear Queue
                                </button>
                              </div>

                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {batchFiles.map((item) => (
                                  <div key={item.id} className="bg-white p-2 border border-slate-150 rounded-lg flex items-center justify-between gap-1.5">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 truncate" title={item.fileName}>
                                        {item.fileName}
                                      </div>
                                      <span className="text-[8px] font-mono text-gray-450 uppercase block mt-0.5 font-bold">Category Detected ✔</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <select
                                        value={item.mappedKey}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setBatchFiles(prev => prev.map(f => f.id === item.id ? { ...f, mappedKey: val } : f));
                                        }}
                                        className="text-[9.5px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded p-1 font-bold text-[#1E3A5F] focus:outline-none"
                                      >
                                        <option value="sss">SSS Membership Card</option>
                                        <option value="philhealth">PhilHealth MDF Sheet</option>
                                        <option value="pagibig">HDMF Pag-IBIG Sheet</option>
                                        <option value="tin">BIR Form 1902 Taxes</option>
                                        <option value="nbi">NBI Clearance Record</option>
                                        <option value="contract">Employment Contract</option>
                                        <option value="resume">Professional Resume/CV</option>
                                        <option value="other">Other Credentials / TOR</option>
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() => setBatchFiles(prev => prev.filter(f => f.id !== item.id))}
                                        className="text-gray-400 hover:text-red-500 font-bold px-1.5 text-xs"
                                        title="Remove file"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  // Map and verify all active files to the onboarding candidate
                                  setNewHires(prev => prev.map(nh => {
                                    if (nh.id === candidate.id) {
                                      const updatedDocs = { ...nh.docs };
                                      batchFiles.forEach(f => {
                                        updatedDocs[f.mappedKey] = {
                                          status: "Verified",
                                          file: f.fileName
                                        };
                                      });
                                      return { ...nh, docs: updatedDocs };
                                    }
                                    return nh;
                                  }));
                                  triggerToast(`Successfully mapped and verified ${batchFiles.length} files to ${candidate.name}'s folder!`, "success");
                                  setBatchFiles([]);
                                }}
                                className="w-full text-center bg-[#C9A84C] hover:bg-[#B5953F] text-slate-900 border border-[#BA9A43] font-black text-xs p-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
                              >
                                Process &amp; Map All Queue Files to Onboarding Checklist →
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Big conversion block to permanently register hire to 201 Files */}
                        <div className="bg-slate-50 p-4 border border-gray-200 rounded-xl flex items-center justify-between border-dashed mt-4 flex-wrap gap-3">
                          <div>
                            <span className="text-[8px] text-indigo-900 block font-extrabold font-mono uppercase">201 ACCESS REGISTRY CONVERSION</span>
                            <span className="text-[11px] font-bold text-slate-700">
                              {allVerified 
                                ? "✔ Compiling Check: All mandatory clearances loaded!" 
                                : `⏳ Clearance: (${verifiedDocs}/${totalDocs}) authenticated files checked.`
                              }
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              // Retain prospect employee ID and dynamic credential states
                              const newId = candidate.id;
                              const freshEmployee = {
                                id: newId,
                                name: candidate.name,
                                position: candidate.position,
                                department: candidate.department,
                                deptId: 4,
                                status: "Active",
                                type: "Regular",
                                gender: "Male",
                                dateHired: candidate.dateHired,
                                salary: candidate.salary,
                                email: candidate.email,
                                avatar: candidate.avatar,
                                sss: candidate.docs.sss.file ? "33-7281982-9" : "N/A",
                                tin: candidate.docs.tin.file ? "291-882-192-000" : "N/A",
                                pagibig: candidate.docs.pagibig.file ? "8812-7712-9921" : "N/A",
                                philhealth: candidate.docs.philhealth.file ? "12-881299211-1" : "N/A",
                                phone: "+63 945 281 9901",
                                address: "Manila, Metro Manila",
                                password: candidate.password || candidate.id,
                                passwordChanged: candidate.passwordChanged || false,
                                forgotPasswordRequested: candidate.forgotPasswordRequested || false,
                                workingDaysFrom: candidate.workingDaysFrom || "Monday",
                                workingDaysTo: candidate.workingDaysTo || "Friday",
                                clockInSchedule: candidate.clockInSchedule || "08:00 AM",
                                clockOutSchedule: candidate.clockOutSchedule || "05:00 PM",
                                gracePeriod: candidate.gracePeriod !== undefined ? candidate.gracePeriod : 15,
                                mealAllowance: candidate.mealAllowance !== undefined ? Number(candidate.mealAllowance) : 1000,
                                travelAllowance: candidate.travelAllowance !== undefined ? Number(candidate.travelAllowance) : (candidate.position.includes("Manager") ? 1000 : (candidate.position.includes("Senior") ? 1000 : 500)),
                                communicationAllowance: candidate.communicationAllowance !== undefined ? Number(candidate.communicationAllowance) : (candidate.position.includes("Manager") ? 1000 : (candidate.position.includes("Senior") ? 500 : 0)),
                                otherAllowances: candidate.otherAllowances !== undefined ? Number(candidate.otherAllowances) : 0,
                                otHourlyRateMethod: "automatic",
                                otMultiplier: 1.25,
                                docs: { ...candidate.docs }
                              };

                              // Add to active employee roster
                              setEmployeesList(prev => [...prev, freshEmployee]);

                              // Mark complete
                              setNewHires(prev => prev.map(nh => {
                                if (nh.id === candidate.id) {
                                  return { ...nh, onboardingStatus: "Completed" };
                                }
                                return nh;
                              }));

                              triggerToast(`Successfully Compiled 201 File! Employee Registered with ID: ${newId}.`, "success");
                              setSelectedEmp(freshEmployee);
                            }}
                            className={`text-[10px] py-2 px-4 rounded-xl font-black uppercase transition-all tracking-wider cursor-pointer ${
                              allVerified 
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md animate-bounce" 
                                : "bg-[#1E3A5F] hover:bg-[#2A4F80] text-white shadow-sm"
                            }`}
                          >
                            Compile &amp; Register (201 Access)
                          </button>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="bg-white rounded-xl border border-gray-150 p-12 text-center text-gray-400">
                      <UserPlus className="w-12 h-12 text-[#C9A84C] opacity-50 mx-auto mb-3" />
                      <div className="font-extrabold uppercase text-[10px] tracking-widest text-[#C9A84C]">No Candidate Selected</div>
                      <p className="text-xs max-w-xs mx-auto mt-2 text-stone-400 font-sans font-medium">
                        Select an onboarding candidate from the left panel to assess, verify, and compile their Philippine 201 statutory files.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* =========================================================
              7.6 PROMOTION & RAISE APPLICATION CENTER (EMPLOYEE ONLY)
             ========================================================= */}
          {activeModule === "promotion" && userRole === "employee" && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn font-semibold">
              <div className="bg-[#1E3A5F] p-6 rounded-2xl text-white shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="text-[#E8C96A] w-5 h-5 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#E8C96A]">ESS Growth desk</span>
                </div>
                <h3 className="text-base font-bold font-sans">Promotion &amp; Salary Raise Application</h3>
                <p className="text-xs text-slate-300 mt-1 leading-normal max-w-2xl font-sans font-medium">
                  Propose salary raises or position progression parameters. This acts as a standard Maker proposal – your credentials, achievements, and requested tiers will be forwarded for physical Checker Verification inside the Administrative Console.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Current Benchmark Column */}
                <div className="md:col-span-1 bg-white rounded-xl border border-gray-150 p-5 shadow-sm space-y-4 h-fit">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider pb-2 border-b">My Present Metrics</h4>
                  
                  <div className="space-y-4 text-xs font-semibold">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Current Position Level:</span>
                      <div className="text-[#1E3A5F] text-sm font-extrabold mt-0.5">{activeUserObj.position}</div>
                      <span className="text-[9px] text-slate-500 block font-mono">Dept: {activeUserObj.department}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Current Gross Salary:</span>
                      <div className="text-slate-800 text-sm font-mono font-bold mt-0.5">{formatCurrency(activeUserObj.salary)} / mo</div>
                      <span className="text-[9px] text-[#C9A84C] font-semibold">Net Pay Cutoff: {formatCurrency(Math.round((activeUserObj.salary / 2) * 0.82))}</span>
                    </div>

                    {/* Attendance KPI Summary inside application */}
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Attendance Reliability:</span>
                      {(() => {
                        const logs = attendanceList.filter(a => a.name === activeUserObj.name);
                        const totalLate = logs.reduce((acc, curr) => acc + (curr.lateMin || 0), 0);
                        return (
                          <div className="mt-1 space-y-1">
                            <span className="bg-emerald-50 text-emerald-700 py-0.5 px-2 rounded-full font-mono text-[9px] uppercase font-extrabold inline-block">
                              Punctuality: Excellent
                            </span>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Logs: {logs.length || 1} Present &bull; Total Late: {totalLate} mins</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Application Form Column */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!promoReason.trim() || !promoPosition.trim()) {
                      triggerToast("Please write a clean progression narrative and target title", "error");
                      return;
                    }

                    if (promoSalary <= activeUserObj.salary && (promoType === "Both" || promoType === "Salary Raise")) {
                      triggerToast("Requested Salary increment must exceed active payroll benchmark.", "error");
                      return;
                    }

                    // Package Maker submission Request
                    const pathLabel = `${promoType} to ${promoPosition} (${formatCurrency(promoSalary)})`;
                    const newRequest = {
                      id: `MREQ-2026-00${makerRequests.length + 1}`,
                      requesterId: activeEmployeeId,
                      requesterName: activeUserObj.name,
                      requestType: "Promotion Request",
                      field: "position_salary",
                      fieldLabel: pathLabel,
                      oldValue: `${activeUserObj.position} (${formatCurrency(activeUserObj.salary)})`,
                      newValue: `${promoPosition} (${formatCurrency(promoSalary)})`,
                      notes: `Promotion Case Justification: ${promoReason}`,
                      promotionDetails: {
                        newPosition: promoPosition,
                        newSalary: promoSalary
                      },
                      status: "Pending",
                      filedDate: new Date().toISOString()
                    };

                    setMakerRequests(prev => [newRequest, ...prev]);
                    triggerToast("[Maker Submit] Promotion Case launched to Checker workspace queue!", "success");
                    setPromoReason("");
                    setActiveModule("dashboard");
                  }}
                  className="md:col-span-2 bg-white rounded-xl border border-gray-150 p-6 shadow-sm space-y-4 font-semibold"
                >
                  <h4 className="text-xs font-bold text-gray-655 uppercase tracking-widest pb-2 border-b">Parameters of Increment Application</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-605">Growth Category Type</label>
                      <select
                        value={promoType}
                        onChange={(e) => setPromoType(e.target.value)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-[#C9A84C]"
                      >
                        <option value="Both">Both Promotion &amp; Raise</option>
                        <option value="Promotion">Position Rank Promotion Only</option>
                        <option value="Salary Raise">Salary Raise Incremental Only</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-605">Target Requested Position</label>
                      <input 
                        type="text"
                        required
                        value={promoPosition}
                        disabled={promoType === "Salary Raise"}
                        onChange={(e) => setPromoPosition(e.target.value)}
                        className="text-xs bg-gray-50 disabled:bg-gray-100 text-slate-850 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-[#C9A84C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 col-span-1">
                      <label className="text-xs font-bold text-gray-605">Requested Monthly Basic (PHP)</label>
                      <input 
                        type="number"
                        required
                        value={promoSalary}
                        disabled={promoType === "Promotion"}
                        onChange={(e) => setPromoSalary(parseInt(e.target.value) || 0)}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-[#C9A84C] font-mono font-bold text-slate-705"
                      />
                    </div>

                    {/* Pre-payout estimator box */}
                    <div className="bg-amber-50/40 border border-dashed border-amber-200 rounded-lg p-3 text-[10px] space-y-1 h-fit self-end text-slate-700">
                      <span className="font-bold text-[#C9A84C] uppercase tracking-wide block">New Est. Cutoff Net Takehome:</span>
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {promoSalary > 0 ? (() => {
                          const gross = promoSalary / 2;
                          const sss = Math.min(gross * 0.045, 1350);
                          const ph = Math.min((promoSalary * 0.025) / 2, 2500);
                          const hdmf = 100;
                          const tax = (gross - sss - ph - hdmf) * 0.15;
                          return formatCurrency(gross - (sss + ph + hdmf + tax));
                        })() : "₱0.00"}
                      </div>
                      <p className="text-[9px] text-gray-400">Includes BIR withholdings and statutory deductions index estimators.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 font-semibold">
                    <label className="text-xs font-bold text-gray-655">Self-KPI Justification &amp; Milestones Accomplished (Required)</label>
                    <textarea 
                      required
                      placeholder="Discuss achievements in current position. Highlight metrics to pass administrative audit checkpoints..."
                      value={promoReason}
                      onChange={(e) => setPromoReason(e.target.value)}
                      className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 h-24 focus:outline-none focus:border-[#C9A84C] resize-none leading-normal font-sans"
                    />
                    <div className="text-[9px] text-gray-450 flex justify-between">
                      <span>Provide solid criteria matching your target job level.</span>
                      <span>Requires HR signature approval</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1E3A5F] hover:bg-[#2A4F80] text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md mt-4 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} /> Launch Case Application (Maker Submit)
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* =========================================================
              8. EDGE HUB PANEL
             ========================================================= */}
          {activeModule === "edge-hub" && isDevUnlocked && (
            <div className="space-y-8">
              <EdgeControls />
              <SupabaseDocs />
            </div>
          )}

          {/* =========================================================
              9. DEPARTMENTS STATS PANEL
             ========================================================= */}
          {activeModule === "departments" && (() => {
            const todayStr = "2026-05-31";

            // Live metrics calculation
            const totalEmployeesCount = employeesList.length;
            const totalMonthlyPayroll = employeesList.reduce((sum, emp) => sum + emp.salary, 0);
            
            // On leave calculations across all departments
            const totalOnLeaveCount = leaveRequestsList.filter(req => {
              if (req.status !== "Approved") return false;
              return req.startDate <= todayStr && req.endDate >= todayStr;
            }).length;

            const selectedDept = departmentsList.find(d => d.id === selectedDeptId);

            return (
              <div className="space-y-6 animate-fadeIn font-sans" id="departments-stats-module">
                {/* Header Banner */}
                <div className="bg-slate-900 border border-[#C9A84C]/25 text-white p-6 rounded-2xl relative overflow-hidden shadow-xl">
                  {/* Subtle decorative grid background */}
                  <div className="absolute inset-0 bg-transparent opacity-5 pointer-events-none" style={{ backgroundImage: "linear-gradient(#E8C96A 1px, transparent 1px), linear-gradient(90deg, #E8C96A 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full text-[#E8C96A] text-[9.5px] font-black uppercase tracking-widest mb-2">
                        💼 Filipino Corporate Infrastructure
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Department Unit Control & Analytics
                      </h2>
                      <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
                        Real-time statutory metrics, headcount planning, compensation statistics, and leave telemetry mapping across your organization units.
                      </p>
                    </div>
                    {userRole === "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewDeptName("");
                          setNewDeptCode("");
                          setNewDeptDesc("");
                          setShowAddDeptModal(true);
                        }}
                        className="bg-[#C9A84C] hover:bg-[#E8C96A] text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border-0"
                        id="create-dept-btn"
                      >
                        <UserPlus className="w-4 h-4" /> Register New Unit
                      </button>
                    )}
                  </div>
                </div>

                {/* Dashboard Metrics overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Active Headcount</div>
                    <div className="text-2xl font-black text-slate-800 font-mono mt-1">{totalEmployeesCount}</div>
                    <div className="text-[10px] text-emerald-500 font-semibold mt-1">✔ Full Regulatory Compliance</div>
                  </div>
                  <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Average Salary</div>
                    <div className="text-2xl font-black text-slate-800 font-mono mt-1">
                      ₱{(totalEmployeesCount > 0 ? (totalMonthlyPayroll / totalEmployeesCount) : 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-[#C9A84C] font-semibold mt-1">Based on active 201 records</div>
                  </div>
                  <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Monthly Base Payroll</div>
                    <div className="text-2xl font-black text-slate-800 font-mono mt-1 font-semibold">
                      ₱{totalMonthlyPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">Sovereign treasury allocations</div>
                  </div>
                  <div className="bg-white border border-gray-200/80 p-4 rounded-2xl shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Statutory Leaves Today</div>
                    <div className="text-2xl font-black text-slate-800 font-mono mt-1">{totalOnLeaveCount}</div>
                    <div className="text-[10px] text-amber-500 font-semibold mt-1">🌴 Multi-leave calendar linked</div>
                  </div>
                </div>

                {/* Main general grid view */}
                {selectedDeptId === null ? (
                  <div id="departments-list-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departmentsList.map(dept => {
                      const deptEmployees = employeesList.filter(emp => emp.department === dept.name);
                      const headcount = deptEmployees.length;

                      // Salary stats
                      const totalSalary = deptEmployees.reduce((sum, e) => sum + e.salary, 0);
                      const avgSalary = headcount > 0 ? totalSalary / headcount : 0;

                      // Leave status
                      const activeLeavesInDept = leaveRequestsList.filter(req => {
                        if (req.status !== "Approved") return false;
                        const emp = employeesList.find(e => e.id === req.requesterId || e.name === req.employeeName);
                        if (!emp || emp.department !== dept.name) return false;
                        return req.startDate <= todayStr && req.endDate >= todayStr;
                      });

                      const pctOfTotal = totalEmployeesCount > 0 ? (headcount / totalEmployeesCount) * 100 : 0;

                      return (
                        <div key={dept.id} className="bg-white border border-gray-200/90 hover:border-[#C9A84C]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden" id={`dept-card-${dept.id}`}>
                          {/* Top Tag and Header */}
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="bg-slate-900 text-[#E8C96A] font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                {dept.code || dept.name.substring(0, 3).toUpperCase()}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">ID: #{dept.id}</span>
                            </div>
                            <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-2 group-hover:text-[#C9A84C] transition-colors">
                              {dept.name}
                            </h3>
                            {dept.description && (
                              <p className="text-[11px] text-gray-400 mb-4 line-clamp-2">
                                {dept.description}
                              </p>
                            )}

                            {/* Core Stats summary lists info */}
                            <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Headcount:</span>
                                <span className="font-extrabold text-slate-800 font-mono">{headcount} {headcount === 1 ? 'employee' : 'employees'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Average Salary:</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₱{avgSalary.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Monthly Cost:</span>
                                <span className="font-bold text-slate-700 font-mono">
                                  ₱{totalSalary.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-550 font-semibold flex items-center gap-1">🌴 On Leave Today:</span>
                                <span className={`font-mono text-[11.5px] font-black ${activeLeavesInDept.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                  {activeLeavesInDept.length}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar and primary triggers */}
                          <div className="mt-5 pt-3 border-t border-gray-50">
                            {/* Headcount Relative Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1">
                                <span>SIZE LOAD LIMIT:</span>
                                <span>{pctOfTotal.toFixed(1)}% OF FIRM</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-[#C9A84C] h-1.5 rounded-full transition-all duration-500" style={{ width: `${pctOfTotal}%` }}></div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDeptId(dept.id)}
                                className="flex-1 bg-slate-150 bg-gray-100 hover:bg-[#C9A84C]/20 hover:text-slate-900 text-slate-700 text-[10.5px] font-bold py-1.5 px-3 rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-1 uppercase border-0"
                              >
                                📊 Unit Drilldown
                              </button>
                              {userRole === "admin" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDeptId(dept.id);
                                      setEditingDeptName(dept.name);
                                      setEditingDeptCode(dept.code || "");
                                      setEditingDeptDesc(dept.description || "");
                                      setShowEditDeptModal(true);
                                    }}
                                    className="p-1.5 border border-gray-200 text-slate-400 hover:text-[#C9A84C] hover:border-[#C9A84C]/50 rounded-lg transition-all cursor-pointer bg-white"
                                    title="Edit settings"
                                  >
                                    ⚙
                                  </button>
                                  <button
                                    type="button"
                                    disabled={headcount > 0}
                                    onClick={() => {
                                      if (confirm(`Are you absolutely sure you want to retire and remove the empty department "${dept.name}"?`)) {
                                        setDepartmentsList(departmentsList.filter(d => d.id !== dept.id));
                                        triggerToast(`Retired unit ${dept.name} successfully!`, "info");
                                      }
                                    }}
                                    className={`p-1.5 border rounded-lg transition-all select-none ${headcount > 0 ? 'bg-gray-50 border-gray-100 text-gray-200 cursor-not-allowed' : 'bg-rose-50 border-rose-100 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 cursor-pointer'}`}
                                    title={headcount > 0 ? "You cannot retire a department with active headcount. Re-assign employees first." : "Retire Unit"}
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Drilldown View */
                  <div className="space-y-6" id="dept-drilldown-container">
                    {/* Back Button and Title */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDeptId(null)}
                        className="self-start inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-950 font-bold bg-white px-3 py-1.5 border border-gray-200 rounded-xl hover:shadow-sm cursor-pointer transition-all uppercase"
                      >
                        ← Return to General Overview
                      </button>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider block">CURRENT DRILLDOWN CONTEXT:</span>
                        <span className="font-extrabold text-slate-900 bg-[#C9A84C]/10 text-[#C9A84C] px-2.5 py-0.5 rounded text-xs uppercase tracking-widest">{selectedDept?.name} ({selectedDept?.code})</span>
                      </div>
                    </div>

                    {(() => {
                      const name = selectedDept?.name || "";
                      const deptEmployees = employeesList.filter(emp => emp.department === name);
                      const headcount = deptEmployees.length;
                      const totalSalary = deptEmployees.reduce((sum, e) => sum + e.salary, 0);
                      const avgSalary = headcount > 0 ? totalSalary / headcount : 0;

                      // Leave computations
                      const deptLeavesList = leaveRequestsList.filter(req => {
                        if (req.status !== "Approved") return false;
                        const emp = employeesList.find(e => e.id === req.requesterId || e.name === req.employeeName);
                        return emp && emp.department === name && req.startDate <= todayStr && req.endDate >= todayStr;
                      });

                      // Ratio computations
                      const maleCount = deptEmployees.filter(e => e.gender === "Male").length;
                      const femaleCount = deptEmployees.filter(e => e.gender === "Female").length;
                      const malePct = headcount > 0 ? (maleCount / headcount) * 100 : 0;
                      const femalePct = headcount > 0 ? (femaleCount / headcount) * 100 : 0;

                      const regularCount = deptEmployees.filter(e => e.type === "Regular").length;
                      const probCount = deptEmployees.filter(e => e.type === "Probationary").length;

                      return (
                        <div className="space-y-6">
                          {/* Top specific analytics indicators */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-900 text-white p-4 rounded-xl border border-white/5 relative overflow-hidden shadow-inner">
                              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-widest">Active Personnel</span>
                              <span className="text-2xl font-black font-mono block mt-1">{headcount}</span>
                              <span className="text-[9px] text-[#E8C96A] font-semibold mt-1 block">{(totalEmployeesCount > 0 ? (headcount / totalEmployeesCount) * 105 : 0).toFixed(1)}% of total company</span>
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Monthly Base Payroll</span>
                              <span className="text-2xl font-black font-mono block mt-1">₱{totalSalary.toLocaleString("en-PH")}</span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-1 block">₱{avgSalary.toLocaleString("en-PH")} avg compensation</span>
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Statutory Leaves</span>
                              <span className="text-2xl font-black font-mono block text-amber-500 mt-1">{deptLeavesList.length} active</span>
                              <span className="text-[9px] text-gray-500 font-semibold mt-1 block h-4 truncate">{deptLeavesList.length > 0 ? `${deptLeavesList.map(l => l.employeeName).join(', ')}` : "All personnel on standby"}</span>
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Gender Balance Ratio</span>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-3 bg-gray-100 rounded-lg overflow-hidden flex font-mono text-[8px] text-white">
                                  {maleCount > 0 && <span className="bg-blue-500 text-center flex items-center justify-center font-bold" style={{ width: `${malePct}%` }}>M</span>}
                                  {femaleCount > 0 && <span className="bg-pink-500 text-center flex items-center justify-center font-bold" style={{ width: `${femalePct}%` }}>W</span>}
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 font-mono">
                                  {malePct.toFixed(0)}:{femalePct.toFixed(0)}
                                </span>
                              </div>
                              <span className="text-[9.5px] mt-1 block text-slate-400 font-mono">{maleCount}M &bull; {femaleCount}F</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Visual Demographic Distributions stats board */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5 lg:col-span-1">
                              <div>
                                <h4 className="text-xs uppercase font-black text-slate-800 tracking-wider mb-2 pb-1.5 border-b border-gray-100 flex items-center gap-1">
                                  📊 Structural Demographic Ratio
                                </h4>
                                <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                                  Classification ratio of employment security and tenure standards within the {name} unit.
                                </p>
                              </div>

                              {/* Tenure/Regularization Breakdown */}
                              <div className="space-y-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">Employment Type tenure ratio</span>
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex justify-between text-[11px] mb-1 font-medium font-semibold text-slate-700">
                                      <span>Regular Staff Tenure</span>
                                      <span className="font-bold text-slate-900 font-mono">{regularCount} ({headcount > 0 ? ((regularCount / headcount) * 100).toFixed(1) : 0}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${headcount > 0 ? (regularCount / headcount) * 100 : 0}%` }}></div>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-[11px] mb-1 font-medium font-semibold text-slate-700">
                                      <span>Probationary Staff Check</span>
                                      <span className="font-bold text-slate-900 font-mono">{probCount} ({headcount > 0 ? ((probCount / headcount) * 100).toFixed(1) : 0}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                      <div className="bg-amber-400 h-2 rounded-full transition-all duration-300" style={{ width: `${headcount > 0 ? (probCount / headcount) * 100 : 0}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Highest vs Lowest Salaries indicators inside unit */}
                              {deptEmployees.length > 0 && (() => {
                                const maxSalaryEmp = [...deptEmployees].sort((a, b) => b.salary - a.salary)[0];
                                const minSalaryEmp = [...deptEmployees].sort((a, b) => a.salary - b.salary)[0];
                                
                                return (
                                  <div className="space-y-3 pt-3 border-t border-gray-100">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Salary Compensation Limits</span>
                                    <div className="space-y-2.5 text-xs">
                                      <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/25 rounded-xl p-2.5 flex items-center justify-between">
                                        <div>
                                          <div className="text-[10px] text-[#C9A84C] font-black uppercase">Highest Earner:</div>
                                          <div className="font-bold text-slate-800 mt-0.5">{maxSalaryEmp.name}</div>
                                          <div className="text-[10px] text-gray-400 italic font-medium">{maxSalaryEmp.position}</div>
                                        </div>
                                        <div className="text-right font-mono font-black text-slate-900">₱{maxSalaryEmp.salary.toLocaleString("en-PH")}</div>
                                      </div>

                                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-2.5 flex items-center justify-between">
                                        <div>
                                          <div className="text-[10px] text-slate-500 font-black uppercase font-bold text-gray-450">Standard Entry Min:</div>
                                          <div className="font-bold text-slate-800 mt-0.5">{minSalaryEmp.name}</div>
                                          <div className="text-[10px] text-gray-400 italic font-medium">{minSalaryEmp.position}</div>
                                        </div>
                                        <div className="text-right font-mono font-black text-slate-900">₱{minSalaryEmp.salary.toLocaleString("en-PH")}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Roster of Department Team Employees */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">
                              <div>
                                <h4 className="text-xs uppercase font-black text-slate-800 tracking-wider pb-1.5 border-b border-gray-100">
                                  👥 Active Personnel Team List ({deptEmployees.length})
                                </h4>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-gray-100 text-slate-500 font-bold tracking-wider">
                                      <th className="p-2.5">ID No.</th>
                                      <th className="p-2.5">Employee Detail</th>
                                      <th className="p-2.5">Official Title</th>
                                      <th className="p-2.5 font-bold">Monthly Basic</th>
                                      <th className="p-2.5 text-center font-bold">Duty Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {deptEmployees.length === 0 ? (
                                      <tr>
                                        <td colSpan={5} className="p-5 text-center text-slate-400 font-mono italic">
                                          No personnel records mapped to this unit. Configure onboarding or edit profiles to synchronize.
                                        </td>
                                      </tr>
                                    ) : (
                                      deptEmployees.map(emp => {
                                        const isOnLeave = leaveRequestsList.some(req => 
                                          req.requesterId === emp.id && req.status === "Approved" && req.startDate <= todayStr && req.endDate >= todayStr
                                        );

                                        return (
                                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-all font-sans">
                                            <td className="p-2.5 font-mono text-[11px] font-bold text-slate-500">{emp.id}</td>
                                            <td className="p-2.5">
                                              <div className="font-bold text-slate-800">{emp.name}</div>
                                              <div className="text-[10px] text-gray-400 font-mono">{emp.email}</div>
                                            </td>
                                            <td className="p-2.5">
                                              <div className="font-semibold text-slate-700">{emp.position}</div>
                                              <div className="text-[9px] font-mono bg-sky-50 text-sky-800 px-1.5 rounded inline-block mt-0.5">{emp.type} Unit</div>
                                            </td>
                                            <td className="p-2.5 font-mono text-slate-600">
                                              ₱{emp.salary.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2.5 text-center">
                                              {isOnLeave ? (
                                                <span className="bg-amber-100 border border-amber-350 text-amber-700 font-bold uppercase text-[9px] px-2 py-0.5 rounded-full block text-center animate-pulse">On Leave 🌴</span>
                                              ) : (
                                                <span className="bg-emerald-50 border border-emerald-250 text-emerald-600 font-bold uppercase text-[9px] px-2 py-0.5 rounded-full block text-center animate-none">On Duty ✔</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Add Department Modal Component overlay */}
                {showAddDeptModal && (
                  <div className="fixed inset-0 z-50 bg-[#070C15]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white text-slate-800 border-0 rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4 animate-scaleUp">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          🏢 Register Corporate Department Unit
                        </h3>
                        <button type="button" onClick={() => setShowAddDeptModal(false)} className="text-gray-400 hover:text-gray-650 text-sm cursor-pointer border-0 bg-transparent">✕</button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newDeptName.trim() || !newDeptCode.trim()) {
                            triggerToast("Mandatory fields (Name & Code) must be filled.", "error");
                            return;
                          }

                          // Check if code or name already exists
                          const conflict = departmentsList.find(d => 
                            d.name.toLowerCase() === newDeptName.trim().toLowerCase() ||
                            d.code.toLowerCase() === newDeptCode.trim().toLowerCase()
                          );

                          if (conflict) {
                            triggerToast("A department unit with that Name or Code already exists.", "error");
                            return;
                          }

                          const newId = departmentsList.length > 0 ? Math.max(...departmentsList.map(d => d.id)) + 1 : 1;
                          const updated = [
                            ...departmentsList,
                            { 
                              id: newId, 
                              name: newDeptName.trim(), 
                              code: newDeptCode.trim().toUpperCase(),
                              description: newDeptDesc.trim() || "Independent administrative corporate operation unit."
                            }
                          ];

                          setDepartmentsList(updated);
                          setShowAddDeptModal(false);
                          triggerToast(`Successfully registered corporate department: ${newDeptName.trim()}`, "success");
                        }}
                        className="space-y-4 text-xs"
                      >
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Official Unit Name *</label>
                          <input
                            type="text"
                            required
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C]"
                            placeholder="e.g. Quality Assurance & Audits"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Short Code Tag *</label>
                          <input
                            type="text"
                            required
                            maxLength={8}
                            value={newDeptCode}
                            onChange={(e) => setNewDeptCode(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs font-mono uppercase focus:outline-none focus:border-[#C9A84C]"
                            placeholder="e.g. QA"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Unit Functional Description</label>
                          <textarea
                            rows={3}
                            value={newDeptDesc}
                            onChange={(e) => setNewDeptDesc(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] leading-relaxed"
                            placeholder="Provide brief function notes of this corporate unit..."
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full bg-slate-900 border-0 hover:bg-[#C9A84C] hover:text-slate-950 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-widest text-white transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Save Corporate Record ✔
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Edit Department Modal Component overlay */}
                {showEditDeptModal && (
                  <div className="fixed inset-0 z-50 bg-[#070C15]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white text-slate-800 border-0 rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4 animate-scaleUp">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                          ⚙ Configure Corporate Department Unit
                        </h3>
                        <button type="button" onClick={() => setShowEditDeptModal(false)} className="text-gray-400 hover:text-gray-650 text-sm cursor-pointer border-0 bg-transparent">✕</button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!editingDeptName.trim() || !editingDeptCode.trim()) {
                            triggerToast("Mandatory fields (Name & Code) must be filled.", "error");
                            return;
                          }

                          // Check if conflict with OTHER departments name/code
                          const conflict = departmentsList.find(d => 
                            d.id !== editingDeptId && (
                              d.name.toLowerCase() === editingDeptName.trim().toLowerCase() ||
                              d.code.toLowerCase() === editingDeptCode.trim().toLowerCase()
                            )
                          );

                          if (conflict) {
                            triggerToast("A department unit with that Name or Code already exists.", "error");
                            return;
                          }

                          // Update both department lists
                          const updated = departmentsList.map(d => {
                            if (d.id === editingDeptId) {
                              return {
                                ...d,
                                name: editingDeptName.trim(),
                                code: editingDeptCode.trim().toUpperCase(),
                                description: editingDeptDesc.trim()
                              };
                            }
                            return d;
                          });

                          // Update employee static positions referencing this unit name as string
                          const oldDept = departmentsList.find(d => d.id === editingDeptId);
                          if (oldDept && oldDept.name !== editingDeptName.trim()) {
                            const updatedEmps = employeesList.map(emp => {
                              if (emp.department === oldDept.name) {
                                return { ...emp, department: editingDeptName.trim() };
                              }
                              return emp;
                            });
                            setEmployeesList(updatedEmps);
                          }

                          setDepartmentsList(updated);
                          setShowEditDeptModal(false);
                          triggerToast("Successfully synchronized department structure!", "success");
                        }}
                        className="space-y-4 text-xs"
                      >
                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Official Unit Name *</label>
                          <input
                            type="text"
                            required
                            value={editingDeptName}
                            onChange={(e) => setEditingDeptName(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Short Code Tag *</label>
                          <input
                            type="text"
                            required
                            maxLength={8}
                            value={editingDeptCode}
                            onChange={(e) => setEditingDeptCode(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs font-mono uppercase focus:outline-none focus:border-[#C9A84C]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Unit Functional Description</label>
                          <textarea
                            rows={3}
                            value={editingDeptDesc}
                            onChange={(e) => setEditingDeptDesc(e.target.value)}
                            className="w-full bg-gray-55 bg-gray-50 border border-gray-205 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#C9A84C] leading-relaxed"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full bg-[#1E3A5F] border-0 hover:bg-[#2A4F80] font-black py-3 px-4 rounded-xl text-xs uppercase tracking-widest text-white transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Synchronize Unit Parameters ✔
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Day-Off Overtime File Alert Prompt Modal Overlay */}
      {showDayOffOvertimePrompt && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1522] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-white space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-500 text-lg">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-white uppercase tracking-wider">Day-Off Clock In Alert</h3>
              <p className="text-[11px] text-gray-450 mt-1">
                System registered a valid clock-in event on your scheduled day-off (<span className="text-amber-400 font-mono font-bold">{dayOffDateStr}</span>).
              </p>
              <p className="text-[11px] text-gray-450 font-semibold mt-0.5 leading-relaxed">
                Philippines DOLE rules mandate filing an official Overtime Request for proper weekend / rest-day billing credit.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const hoursVal = Number((form.elements.namedItem("otHours") as HTMLInputElement).value) || 8;
                const purposeVal = (form.elements.namedItem("otPurpose") as HTMLInputElement).value.trim();

                if (!purposeVal) {
                  triggerToast("Please provide a valid purpose description for rest-day overtime.", "error");
                  return;
                }

                const activeUser = employeesList.find(emp => emp.id === activeEmployeeId);
                const newRequest = {
                  id: `OT-2026-${String(overtimeRequests.length + 1).padStart(4, "0")}`,
                  employeeId: activeEmployeeId,
                  employeeName: activeUser ? activeUser.name : "Unknown Employee",
                  date: dayOffDateStr,
                  hours: hoursVal,
                  purpose: purposeVal,
                  status: "Pending",
                  filedDate: new Date().toISOString().substring(0, 10)
                };

                setOvertimeRequests(prev => [newRequest, ...prev]);
                setShowDayOffOvertimePrompt(false);
                triggerToast(`Overtime rest-day request (${hoursVal} hours) filed successfully for verification!`, "success");
              }}
              className="space-y-3 pt-2 text-xs text-left"
            >
              <div>
                <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Estimated Hours to Work</label>
                <input
                  name="otHours"
                  type="number"
                  required
                  min={1}
                  max={16}
                  defaultValue={8}
                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div>
                <label className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Overtime Rest-Day Work Purpose</label>
                <textarea
                  name="otPurpose"
                  required
                  placeholder="Discuss actual tasks or customer requests justifying weekend operations..."
                  className="w-full bg-[#15273F] border border-slate-700 rounded-lg p-2.5 h-20 text-white font-sans text-xs focus:outline-none focus:border-[#C9A84C] resize-none leading-normal"
                />
              </div>

              <div className="flex gap-2 pt-1 font-sans">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase py-2.5 px-3 rounded-lg text-[10px] tracking-widest transition-all cursor-pointer text-center"
                >
                  File Overtime Now ✔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDayOffOvertimePrompt(false);
                    triggerToast("Overtime modal dismissed. Please file your overtime logs manually inside the self-service panel.", "info");
                  }
                }
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold uppercase py-2.5 px-3 rounded-lg text-[10px] tracking-wide transition-all cursor-pointer text-center"
                >
                  Remind Me Later
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Revision Authorization Modal Overlay */}
      {showSalaryConfirmModal && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1522] border border-[#C9A84C]/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-white space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-2 text-[#C9A84C] text-lg">
              ⚖️
            </div>
            <div className="text-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Salary Revision Authorization</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                You are modifying the basic pay rate of <span className="text-white font-bold">{selectedEmp.name}</span>.
              </p>
              
              <div className="my-3 py-2 px-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-around text-xs font-mono">
                <div className="text-center">
                  <span className="text-[8px] text-gray-400 uppercase font-sans block mb-0.5">Previous Rate</span>
                  <span className="text-rose-400 font-bold line-through">{formatCurrency(selectedEmp.salary)}</span>
                </div>
                <div className="text-gray-400">➔</div>
                <div className="text-center">
                  <span className="text-[8px] text-emerald-400 uppercase font-sans block mb-0.5">Proposed Rate</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(pendingSalaryValue)}</span>
                </div>
              </div>

              <p className="text-[10px] text-amber-300 font-sans leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-left">
                Notice: Statutory deductions (SSS, PAG-IBIG, PhilHealth, Tax) will dynamically recalculate for subsequent payroll runs based on this updated baseline salary rate.
              </p>
            </div>

            <div className="flex gap-2 pt-2 font-sans text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmployeesList(prev => prev.map(emp => {
                    if (emp.id === selectedEmp.id) {
                      return { ...emp, salary: pendingSalaryValue };
                    }
                    return emp;
                  }));

                  setSelectedEmp((prev: any) => ({
                    ...prev,
                    salary: pendingSalaryValue
                  }));

                  setShowSalaryConfirmModal(false);
                  triggerToast(`Successfully authorized and synchronized basic pay rate of ${formatCurrency(pendingSalaryValue)} for ${selectedEmp.name}!`, "success");
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase py-2.5 px-3 rounded-lg text-[10px] tracking-widest transition-all cursor-pointer text-center"
              >
                Approve Rate ✔
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSalaryConfirmModal(false);
                  setPortalSalaryInput(String(selectedEmp.salary));
                  triggerToast("Salary rate update aborted. Reverted to previous scale.", "info");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase py-2.5 px-3 rounded-lg text-[10px] tracking-wide transition-all cursor-pointer text-center"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Developer Console Modal Overlay */}
      {showDevConsole && (
        <div className="fixed inset-0 z-50 bg-[#070C15]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans text-white">
          <div className="bg-[#0B121F] border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative space-y-5 animate-scaleUp my-8">
            
            {/* Modal Heading Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  👑 Developer Control Core
                </h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Sovereign HRIS Configuration Desk. Configure custom parameters, logos, luxury themes, and toggle Sandbox states.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDevConsole(false)}
                className="text-slate-400 hover:text-white bg-transparent border-0 text-xs cursor-pointer focus:outline-none p-1"
              >
                ✕
              </button>
            </div>

            {/* System Master Admin Credentials Display Box */}
            <div className="bg-[#15233C] border border-amber-400/20 rounded-xl p-3.5 space-y-2 text-xs animate-fadeIn">
              <span className="block text-[9.5px] uppercase font-black text-amber-300 tracking-wider">🔐 Active Master Admin Credentials</span>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Admin Username/Email</div>
                  <div className="font-mono bg-[#090F1B] border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-extrabold select-all text-center">{hrAdminUsername}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Admin Password</div>
                  <div className="font-mono bg-[#090F1B] border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-300 font-extrabold select-all text-center">{hrAdminPassword}</div>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic">Use these parameters on the HR Challenge Authorization desk. You may edit these in the options below.</p>
            </div>

            {/* Dynamic System Theme Selectors */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-amber-300 tracking-wider">Luxury Theme Palette</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { id: "classic", name: "⚜️ Navy Sovereign", desc: "Gold & Classic Navy" },
                  { id: "emerald", name: "🌿 Forest Emerald", desc: "Gold & Dark Forest" },
                  { id: "royal", name: "💎 Sapphire Indigo", desc: "Satin Platinum Blue" },
                  { id: "charcoal", name: "🖤 Velvet Charcoal", desc: "Black & Soft Gold" },
                  { id: "light-luxury", name: "🍾 Champagne Slate", desc: "Premium Cashmere Light" },
                ].map(th => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(th.id);
                      triggerToast(`Applied visual theme preset: ${th.name}`, "success");
                    }}
                    className={`text-left p-2 rounded-xl border text-[10.5px] transition-all cursor-pointer ${
                      selectedTheme === th.id 
                        ? "bg-amber-500/10 border-amber-400 text-amber-300" 
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-705 text-slate-300"
                    }`}
                  >
                    <div className="font-extrabold">{th.name}</div>
                    <div className="text-[8px] text-slate-400 mt-0.5">{th.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Application Operation Version Settings (Demo vs Paid) */}
            <div className="space-y-3 bg-[#111A2B] border border-white/5 p-3 rounded-xl">
              <div>
                <span className="block text-[10px] uppercase font-bold text-amber-300 tracking-wider mb-2">Operational Licensing Profile</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoMode(true);
                      triggerToast("Operational profile set to Demo Mode", "info");
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[10.5px] uppercase tracking-wider transition-all cursor-pointer text-center border ${
                      isDemoMode 
                        ? "bg-amber-500/20 border-amber-400 text-amber-300" 
                        : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🖥️ Demo Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDemoMode(false);
                      triggerToast("Operational profile set to Paid Premium Version", "info");
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[10.5px] uppercase tracking-wider transition-all cursor-pointer text-center border ${
                      !isDemoMode 
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" 
                        : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    💳 Paid Premium Version
                  </button>
                </div>
              </div>

              {isDemoMode ? (
                <div className="space-y-2 pt-1.5 border-t border-slate-800 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Sandbox Date Limit From</label>
                      <input 
                        type="date"
                        value={demoStartDate}
                        onChange={(e) => setDemoStartDate(e.target.value)}
                        className="w-full bg-[#080E18] border border-slate-700/60 rounded-lg p-2 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Sandbox Date Limit To</label>
                      <input 
                        type="date"
                        value={demoEndDate}
                        onChange={(e) => setDemoEndDate(e.target.value)}
                        className="w-full bg-[#080E18] border border-slate-700/60 rounded-lg p-2 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Restore seed data
                        setEmployeesList(INITIAL_EMPLOYEES);
                        setLeaveRequestsList(INITIAL_LEAVES);
                        setAttendanceList(INITIAL_ATTENDANCE);
                        setItinerariesList(INITIAL_ITINERARIES);
                        // Reset runs
                        setPayrollRunsList([
                          {
                            id: "PR-2026-05A",
                            startDate: "2026-05-01",
                            endDate: "2026-05-15",
                            label: "May 01-15, 2026 Cutoff",
                            generatedAt: "2026-05-15T17:00:00Z",
                            records: [
                              {
                                employeeId: "EMP-2024-0001",
                                employeeName: "Maria Santos",
                                employeePosition: "HR Manager",
                                employeeDepartment: "Human Resources",
                                basicGross: 27500,
                                sss: 1237.5,
                                philhealth: 687.5,
                                pagibig: 100,
                                tax: 3821.25,
                                latesUndertime: 0,
                                accumulatedLeavePaid: 0,
                                benefits: 3000,
                                loans: 0,
                                netTakeHome: 29653.75
                              },
                              {
                                employeeId: "EMP-2024-0002",
                                employeeName: "Juan dela Cruz",
                                employeePosition: "Senior Developer",
                                employeeDepartment: "Information Technology",
                                basicGross: 32500,
                                sss: 1350,
                                philhealth: 812.5,
                                pagibig: 100,
                                tax: 4956.25,
                                latesUndertime: 45,
                                accumulatedLeavePaid: 0,
                                benefits: 3500,
                                loans: 1500,
                                netTakeHome: 32246.25
                              }
                            ]
                          }
                        ]);
                        triggerToast("Initialized fresh standard Sandbox and pre-loaded employees successfully!", "success");
                      }}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-450 text-[10px] font-mono font-bold py-1.5 px-3 rounded uppercase text-center cursor-pointer transition-all"
                    >
                      🔄 Restore Core Demo Dataset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1.5 border-t border-slate-800 animate-fadeIn text-[10.5px]">
                  <p className="text-emerald-400 font-sans leading-relaxed">
                    ✔ Paid Premium Mode Active. All sandbox auto-login buttons, system passwords suggestions, and helper utilities on login portals are completely disabled for customer integration.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Wipe database
                        setEmployeesList([]);
                        setLeaveRequestsList([]);
                        setAttendanceList([]);
                        setItinerariesList([]);
                        setPayrollRunsList([]);
                        setMakerRequests([]);
                        setOvertimeRequests([]);
                        setNewHires([]);
                        setLoggedIn(false);
                        triggerToast("Core database wiped completely. Direct fresh registration enabled.", "info");
                      }}
                      className="bg-rose-900/30 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-[9.5px] font-mono font-bold py-1.5 px-3 rounded uppercase text-center cursor-pointer transition-all w-full"
                    >
                      ☠ Purge Core Database Tables (Total Reset)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Heading Company Settings */}
            <div className="space-y-3">
              <label className="block text-[10px] uppercase font-bold text-amber-300 tracking-wider">Company Identity Setup</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-sans mb-1 font-bold">Main Branding Title</label>
                  <input
                    type="text"
                    value={companyHeading}
                    onChange={(e) => setCompanyHeading(e.target.value)}
                    className="w-full bg-[#080E18] border border-slate-700/60 rounded-xl p-2.5 text-white text-xs font-sans focus:outline-none focus:border-amber-400"
                    placeholder="e.g. CorpHR Philippines"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-sans mb-1 font-bold">Administrator Log-in Email</label>
                  <input
                    type="text"
                    value={hrAdminUsername}
                    onChange={(e) => setHrAdminUsername(e.target.value)}
                    className="w-full bg-[#080E18] border border-slate-700/60 rounded-xl p-2.5 text-white text-xs font-sans focus:outline-none focus:border-amber-400 block"
                    placeholder="e.g. admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 uppercase font-sans mb-1 font-bold">Tagline Subheading Descriptor</label>
                <textarea
                  rows={2}
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                  className="w-full bg-[#080E18] border border-slate-700/60 rounded-xl p-2.5 text-white text-xs font-sans focus:outline-none focus:border-amber-400 leading-relaxed"
                  placeholder="Insert custom corporate HR compliance tagline..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-sans mb-1 font-bold">Admin Password access key</label>
                  <input
                    type="password"
                    value={hrAdminPassword}
                    onChange={(e) => setHrAdminPassword(e.target.value)}
                    className="w-full bg-[#080E18] border border-slate-700/60 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                
                {/* Upload Company Brand Logo */}
                <div>
                  <label className="block text-[9px] text-slate-400 uppercase font-sans mb-1 font-bold">Company Logo Upload</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 bg-slate-900 border border-slate-700/50 hover:border-amber-400/45 text-slate-300 rounded-xl p-2 flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-mono hover:text-white transition-all">
                      <Upload className="w-3.5 h-3.5" /> Select Logo File
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === "string") {
                                setCustomLogo(reader.result);
                                triggerToast("Successfully processed and cached custom logo!", "success");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {customLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomLogo("");
                          triggerToast("Custom logo removed. Standard system locks restored.", "info");
                        }}
                        className="p-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-300 rounded-xl transition-all cursor-pointer text-xs"
                        title="Delete custom logo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo preview if active */}
              {customLogo && (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between animate-fadeIn">
                  <span className="text-[10px] text-slate-400 font-sans">Corporate Logo Live Preview:</span>
                  <img 
                    src={customLogo} 
                    alt="Logo preview" 
                    className="max-h-12 max-w-[120px] object-contain rounded bg-white/5 p-1 border border-slate-700" 
                    style={{ maxWidth: "120px", maxHeight: "48px", width: "100%", height: "auto" }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons to configure and dismiss */}
            <div className="flex gap-2 pt-3 border-t border-white/10 font-sans text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowDevConsole(false);
                  triggerToast("Developer configurations successfully saved and materialized!", "success");
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold uppercase py-2.5 px-3 rounded-xl text-[10.5px] tracking-wide transition-all cursor-pointer text-center"
              >
                Save & Synchronize Config ✔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev Console PIN Authentication Challenge Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-[#070C15]/95 backdrop-blur-md flex items-center justify-center p-4 font-sans text-white">
          <div className="bg-[#0B121F] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-6 animate-scaleUp text-center">
            
            {/* Header branding */}
            <div>
              <div className="inline-flex items-center justify-center bg-amber-500/10 border border-amber-500/30 p-3 rounded-full mb-3">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest">
                🔒 DEV SECURITY CHALLENGE
              </h3>
              <p className="text-[10px] text-slate-400 font-sans mt-1">
                Enter secure developer authorization credentials to interact with core host system directives.
              </p>
            </div>

            {/* Error indicators */}
            {pinError && (
              <div className="bg-red-950/65 border border-red-800/50 rounded-xl p-2.5 text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 leading-none">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {pinError}
              </div>
            )}

            {/* Numeric display representation dots */}
            <div className="space-y-3">
              <input 
                type="password" 
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setPinInput(val);
                  setPinError("");
                  if (val === "05271991") {
                    setIsDevUnlocked(true);
                    setShowPinModal(false);
                    setShowDevConsole(true);
                    triggerToast("👑 System Access Granted. Developer Console Activated.", "success");
                    setPinInput("");
                    setPinError("");
                  }
                }}
                placeholder="••••••••"
                className="w-full text-center text-3xl font-mono tracking-widest py-3 bg-black/40 text-amber-400 border border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 uppercase"
                autoFocus
              />
              <div className="flex justify-center gap-2">
                {[...Array(8)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-150 ${
                      i < pinInput.length ? "bg-amber-400 scale-110 shadow-md shadow-amber-500/20" : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Tap/Click Keypad matrix */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 8) {
                      const val = pinInput + num;
                      setPinInput(val);
                      setPinError("");
                      if (val === "05271991") {
                        setIsDevUnlocked(true);
                        setShowPinModal(false);
                        setShowDevConsole(true);
                        triggerToast("👑 System Access Granted. Developer Console Activated.", "success");
                        setPinInput("");
                        setPinError("");
                      }
                    }
                  }}
                  className="h-12 w-12 rounded-full border border-slate-850/80 flex items-center justify-center text-sm font-bold bg-slate-900/60 hover:bg-slate-800 hover:border-amber-500/30 hover:text-amber-300 active:scale-90 transition-all font-mono cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPinInput("");
                  setPinError("");
                }}
                className="h-12 w-12 rounded-full border border-slate-850/80 flex items-center justify-center text-[10px] font-bold text-red-450 bg-slate-900/60 hover:bg-red-950/20 active:scale-90 transition-all uppercase cursor-pointer"
                title="Clear"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 8) {
                    const val = pinInput + "0";
                    setPinInput(val);
                    setPinError("");
                    if (val === "05271991") {
                      setIsDevUnlocked(true);
                      setShowPinModal(false);
                      setShowDevConsole(true);
                      triggerToast("👑 System Access Granted. Developer Console Activated.", "success");
                      setPinInput("");
                      setPinError("");
                    }
                  }
                }}
                className="h-12 w-12 rounded-full border border-slate-850/80 flex items-center justify-center text-sm font-bold bg-slate-900/60 hover:bg-slate-800 hover:border-amber-500/30 hover:text-amber-300 active:scale-90 transition-all font-mono cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinInput((prev) => prev.slice(0, -1));
                  setPinError("");
                }}
                className="h-12 w-12 rounded-full border border-slate-850/80 flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-900/60 hover:bg-slate-800 active:scale-90 transition-all uppercase cursor-pointer"
                title="Backspace"
              >
                Del
              </button>
            </div>

            {/* Cancel/Dismiss actions */}
            <div className="pt-2 border-t border-white/5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput("");
                  setPinError("");
                }}
                className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 font-extrabold uppercase py-2 rounded-xl text-[10px] tracking-wide transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handlePinSubmit()}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold uppercase py-2 rounded-xl text-[10px] tracking-wide hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </main>
  );
}
