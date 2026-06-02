-- =====================================================================
-- CORPHR PHILIPPINES DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Includes Tables, Constraints, Indexes, and Row Level Security (RLS)
-- =====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. DEPARTMENTS
create table if not exists public.departments (
    id serial primary key,
    code varchar(10) unique not null,
    name varchar(100) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. EMPLOYEES (201 Profile)
create table if not exists public.employees (
    id varchar(50) primary key, -- Custom identifier format: e.g. EMP-2024-0001
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    email varchar(255) unique not null,
    position varchar(100) not null,
    dept_id integer references public.departments(id),
    status varchar(50) default 'Active' check (status in ('Active', 'On Leave', 'Inactive')),
    employment_type varchar(50) default 'Probationary' check (employment_type in ('Regular', 'Probationary', 'Contractual', 'Project-based', 'Part-time')),
    gender varchar(50) check (gender in ('Male', 'Female', 'Other')),
    date_hired date not null,
    salary numeric(12, 2) not null check (salary >= 0),
    sss_number varchar(30),
    tin_number varchar(30),
    pagibig_number varchar(30),
    philhealth_number varchar(30),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index search performance
create index if not exists idx_employees_email on public.employees(email);
create index if not exists idx_employees_dept on public.employees(dept_id);

-- 3. ATTENDANCE LOGS
create table if not exists public.attendance_logs (
    id uuid default gen_random_uuid() primary key,
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    work_date date default current_date not null,
    time_in timestamp with time zone,
    time_out timestamp with time zone,
    hours_worked numeric(5, 2) default 0,
    late_minutes integer default 0,
    ot_hours numeric(5, 2) default 0,
    status varchar(50) default 'Present' check (status in ('Present', 'Late', 'Absent', 'Half-Day')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(employee_id, work_date)
);

-- 4. LEAVE REQUESTS
create table if not exists public.leave_requests (
    id varchar(50) primary key, -- Custom identifier: LR-YYYY-XXX
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    leave_type varchar(100) not null,
    start_date date not null,
    end_date date not null,
    total_days integer not null check (total_days > 0),
    status varchar(50) default 'Pending' check (status in ('Pending', 'Manager Approved', 'Approved', 'Denied', 'Returned for Revision', 'Cancelled')),
    reason text not null,
    denial_reason text,
    filed_on date default current_date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint check_dates check (end_date >= start_date)
);

-- 5. PAYROLL RUNS
create table if not exists public.payroll_runs (
    id varchar(50) primary key, -- PR-YYYY-XXX
    pay_period varchar(100) not null,
    total_gross numeric(14, 2) default 0 check (total_gross >= 0),
    total_deductions numeric(14, 2) default 0 check (total_deductions >= 0),
    total_net numeric(14, 2) default 0 check (total_net >= 0),
    employee_count integer not null check (employee_count >= 0),
    pay_date date not null,
    status varchar(50) default 'Draft' check (status in ('Draft', 'Processing', 'Finalized')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. DOUBLE COMPTROLLER AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    performed_by varchar(100) not null,
    action_type varchar(50) not null, -- INSERT, UPDATE, DELETE
    table_name varchar(100) not null,
    description text not null,
    performed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Secure personal employee profiles and confidential salary logs
-- =====================================================================

-- Turn on RLS for tables
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.audit_logs enable row level security;

-- Establish HR Admin security role policy
-- Using native custom database claims or check of authenticated user email containing @acme.corp/hr domain
create policy "HR administrators can inspect and modify all departments"
on public.departments for all
to authenticated
using (auth.jwt() ->> 'email' like '%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com');

create policy "Employees can inspect their own 201 profile"
on public.employees for select
to authenticated
using (email = auth.jwt() ->> 'email');

create policy "HR administrators can manage all employees profiles"
on public.employees for all
to authenticated
using (auth.jwt() ->> 'email' like '%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com')
with check (auth.jwt() ->> 'email' like '%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com');

create policy "Employees can inspect their own attendance logs"
on public.attendance_logs for select
to authenticated
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email'));

create policy "HR administrators and managers can manage all attendance logs"
on public.attendance_logs for all
to authenticated
using (auth.jwt() ->> 'email' like '%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com');

create policy "Employees can manage their own leave requests"
on public.leave_requests for all
to authenticated
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email'))
with check (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email'));

create policy "HR administrators can review all leave requests"
on public.leave_requests for all
to authenticated
using (auth.jwt() ->> 'email' like '%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com');

create policy "Only HR administrators can manage payroll runs"
on public.payroll_runs for all
to authenticated
using (auth.jwt() ->> 'email' like '%%@corp.ph' or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com');
