"use client";

import { useState } from "react";
import { Database, ShieldCheck, Copy, Check, FileCode, CheckCircle2, LockKeyhole } from "lucide-react";

export function SupabaseDocs() {
  const [copied, setCopied] = useState<boolean>(false);

  const sqlSchema = `
-- 1. Create Employees (201 Profiles) Table
CREATE TABLE public.employees (
    id VARCHAR(50) PRIMARY KEY, -- EMP-2024-0001
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    employment_type VARCHAR(50) DEFAULT 'Probationary',
    date_hired DATE NOT NULL,
    salary NUMERIC(12, 2) NOT NULL,
    sss_number VARCHAR(30),
    tin_number VARCHAR(30),
    pagibig_number VARCHAR(30),
    philhealth_number VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Turn on Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Employees
CREATE POLICY "Employees can inspect their own 201 profile"
ON public.employees FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

CREATE POLICY "HR Admins can manage all employee records"
ON public.employees FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' LIKE '%@corp.ph');
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Database className="text-[#3ECF8E] w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800">Production Supabase Configuration</h3>
        </div>
        <p className="text-gray-500 text-xs leading-relaxed mb-6">
          Integrate Supabase Postgres to synchronize live employee state with RLS (Row Level Security) protection. Follow this recommended configuration schema block.
        </p>

        {/* Highlighted policies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-emerald-600 w-4 h-4" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Statutory PHT Compliance</span>
            </div>
            <p className="text-emerald-750 text-xs leading-normal">
              Tables are built according to standard Philippine employee constraints including SSS monthly credit ceilings, PhilHealth brackets, and Pag-IBIG.
            </p>
          </div>

          <div className="p-4 bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <LockKeyhole className="text-[#1E3A5F] w-4 h-4" />
              <span className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Row Level Security (RLS)</span>
            </div>
            <p className="text-[#1E3A5F] text-xs leading-normal">
              Employees can view only their own records based on JWT credentials, while HR Administrators with email domains ending in <strong>@corp.ph</strong> have complete read/write access.
            </p>
          </div>
        </div>

        {/* SQL Schema block with copy button */}
        <div className="relative">
          <div className="flex items-center justify-between bg-gray-900 border-b border-gray-800 px-4 py-2 rounded-t-lg">
            <span className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              supabase-migrations.sql
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono py-1 px-2.5 rounded hover:bg-gray-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy SQL Code"}
            </button>
          </div>
          <pre className="p-4 h-64 bg-gray-950 text-gray-300 font-mono text-[11px] leading-relaxed overflow-auto rounded-b-lg border border-gray-900">
            {sqlSchema}
          </pre>
        </div>
      </div>

      {/* Integration Code Guide */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Supabase client initialization script</h4>
        <pre className="p-4 bg-gray-50 border border-gray-200 text-gray-700 font-mono text-xs rounded-lg leading-relaxed overflow-x-auto">
{`import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-proj.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOi...";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);`}
        </pre>
        <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Both client-side keys are non-sensitive and completely safe to prefix with <strong>NEXT_PUBLIC_</strong>. All private keys stay securely in the backend.</span>
        </div>
      </div>
    </div>
  );
}
