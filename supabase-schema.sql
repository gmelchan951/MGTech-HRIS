-- =====================================================================
-- MGTECH / CORPHR PHILIPPINES DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Includes Tables, Constraints, Indexes, Seed Data, and Row Level Security (RLS)
-- PASTE THIS DIRECTLY INTO YOUR SUPABASE SQL EDITOR CONSOLE
-- =====================================================================

-- Clean up any existing tables to allow a clean reset
drop table if exists public.audit_logs cascade;
drop table if exists public.maker_requests cascade;
drop table if exists public.itineraries cascade;
drop table if exists public.overtime_requests cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.attendance_logs cascade;
drop table if exists public.employees cascade;
drop table if exists public.departments cascade;
drop table if exists public.payroll_runs cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. DEPARTMENTS TABLE
create table public.departments (
    id serial primary key,
    code varchar(10) unique not null,
    name varchar(100) not null,
    headcount integer default 0 check (headcount >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. EMPLOYEES TABLE (Comprehensive 201 Profile)
create table public.employees (
    id varchar(50) primary key, -- Custom identifier format: e.g. EMP-2024-0001
    name varchar(200) not null,
    position varchar(100) not null,
    department varchar(100) not null,
    dept_id integer references public.departments(id) on delete set null,
    status varchar(50) default 'Active' check (status in ('Active', 'On Leave', 'Inactive')),
    type varchar(50) default 'Regular' check (type in ('Regular', 'Probationary', 'Contractual', 'Project-based', 'Part-time')),
    gender varchar(50) check (gender in ('Male', 'Female', 'Other')),
    date_hired date not null,
    salary numeric(12, 2) not null check (salary >= 0),
    email varchar(255) unique not null,
    sss varchar(30),
    tin varchar(30),
    pagibig varchar(30),
    philhealth varchar(30),
    phone varchar(50),
    address text,
    working_days_from varchar(30) default 'Monday',
    working_days_to varchar(30) default 'Friday',
    clock_in_schedule varchar(30) default '08:00 AM',
    clock_out_schedule varchar(30) default '05:00 PM',
    grace_period integer default 15,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index search performance
create index idx_employees_email on public.employees(email);
create index idx_employees_dept on public.employees(dept_id);

-- 3. ATTENDANCE LOGS TABLE
create table public.attendance_logs (
    id uuid default gen_random_uuid() primary key,
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    employee_name varchar(200) not null,
    work_date date default current_date not null,
    time_in varchar(30),
    time_out varchar(30),
    hours_worked numeric(5, 2) default 0,
    late_minutes integer default 0,
    status varchar(50) default 'Present' check (status in ('Present', 'Late', 'Absent', 'Half-Day')),
    time_in_latitude double precision,
    time_in_longitude double precision,
    time_in_address text,
    time_in_accuracy double precision,
    time_out_latitude double precision,
    time_out_longitude double precision,
    time_out_address text,
    time_out_accuracy double precision,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(employee_id, work_date)
);

create index idx_attendance_work_date on public.attendance_logs(work_date);

-- 4. LEAVE REQUESTS TABLE
create table public.leave_requests (
    id varchar(50) primary key, -- Custom identifier: LR-YYYY-XXX
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    employee_name varchar(200) not null,
    leave_type varchar(100) not null,
    start_date date not null,
    end_date date not null,
    days integer not null check (days > 0),
    status varchar(50) default 'Pending' check (status in ('Pending', 'Manager Approved', 'Approved', 'Denied', 'Returned for Revision', 'Cancelled')),
    reason text not null,
    denial_reason text,
    filed_on date default current_date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint check_dates check (end_date >= start_date)
);

-- 5. OVERTIME REQUESTS TABLE
create table public.overtime_requests (
    id varchar(50) primary key, -- OT-YYYY-XXX
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    employee_name varchar(200) not null,
    ot_date date not null,
    hours numeric(5, 2) not null check (hours > 0),
    purpose text not null,
    denial_reason text,
    status varchar(50) default 'Pending' check (status in ('Pending', 'Approved', 'Denied', 'Cancelled')),
    filed_on date default current_date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ITINERARIES TABLE (Duty Achievements & Travel Notes)
create table public.itineraries (
    id varchar(50) primary key, -- ITIN-XXX
    employee_id varchar(50) references public.employees(id) on delete cascade   not null,
    employee_name varchar(200) not null,
    event_date date not null,
    type varchar(50) not null check (type in ('achievement', 'itinerary')),
    title varchar(200) not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. MAKER-CHECKER DATA CORRECTION REQUESTS TABLE
create table public.maker_requests (
    id varchar(50) primary key, -- MCR-YYYY-XXX
    requester_email varchar(255) not null,
    employee_id varchar(50) references public.employees(id) on delete cascade,
    target_field varchar(100) not null,
    old_value text,
    new_value text not null,
    status varchar(50) default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
    notes text,
    approved_by varchar(255),
    approved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. PAYROLL RUNS TABLE (Statutory Compliant Aggregators)
create table public.payroll_runs (
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

-- 9. DOUBLE COMPTROLLER AUDIT LOGS TABLE
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    performed_by varchar(255) not null,
    action_type varchar(50) not null, -- INSERT, UPDATE, DELETE, AUTH
    table_name varchar(100) not null,
    description text not null,
    performed_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- =====================================================================
-- SEED DATA SETUP
-- =====================================================================

-- Preload Departments
insert into public.departments (id, code, name, headcount) values
(1, 'HR', 'Human Resources', 5),
(2, 'IT', 'Information Technology', 12),
(3, 'FIN', 'Finance & Accounting', 8),
(4, 'OPS', 'Operations', 20),
(5, 'SAL', 'Sales & Marketing', 15)
on conflict (id) do nothing;

-- Fix sequence counter for auto-increment IDs
select setval('public.departments_id_seq', (select max(id) from public.departments));

-- Preload Employees (201 Profiles matching front-end)
insert into public.employees (id, name, position, department, dept_id, status, type, gender, date_hired, salary, email, sss, tin, pagibig, philhealth, phone, address, working_days_from, working_days_to, clock_in_schedule, clock_out_schedule, grace_period) values
('EMP-2024-0001', 'Maria Santos', 'HR Manager', 'Human Resources', 1, 'Active', 'Regular', 'Female', '2020-03-15', 55000.00, 'm.santos@corp.ph', '33-1234567-8', '123-456-789-000', '1234-5678-9012', '12-123456789-1', '+63 917 123 4567', 'Quezon City, Metro Manila', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15),
('EMP-2024-0002', 'Juan dela Cruz', 'Senior Developer', 'Information Technology', 2, 'Active', 'Regular', 'Male', '2021-06-01', 65000.00, 'j.delacruz@corp.ph', '33-9876543-2', '987-654-321-000', '9876-5432-1098', '12-987654321-0', '+63 918 234 5678', 'Makati City, Metro Manila', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15),
('EMP-2024-0003', 'Ana Reyes', 'Accountant', 'Finance & Accounting', 3, 'Active', 'Regular', 'Female', '2022-01-10', 40000.00, 'a.reyes@corp.ph', '33-5555555-5', '555-555-555-000', '5555-5555-5555', '12-555555555-5', '+63 919 345 6789', 'Pasig City, Metro Manila', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15),
('EMP-2024-0004', 'Pedro Lim', 'Operations Lead', 'Operations', 4, 'Active', 'Regular', 'Male', '2019-08-20', 48000.00, 'p.lim@corp.ph', '33-4444444-4', '444-444-444-000', '4444-4444-4444', '12-444444444-4', '+63 920 456 7890', 'Taguig City, Metro Manila', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15),
('EMP-2024-0005', 'Rosa Fernandez', 'Sales Executive', 'Sales & Marketing', 5, 'Active', 'Probationary', 'Female', '2024-11-01', 32000.00, 'r.fernandez@corp.ph', '33-3333333-3', '333-333-333-000', '3333-3333-3333', '12-333333333-3', '+63 921 567 8901', 'Cebu City, Cebu', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15),
('EMP-2024-0006', 'Carlos Mendoza', 'IT Support', 'Information Technology', 2, 'Active', 'Regular', 'Male', '2023-03-15', 28000.00, 'c.mendoza@corp.ph', '33-2222222-2', '222-222-222-000', '2222-2222-2222', '12-222222222-2', '+63 922 678 9012', 'Davao City, Davao del Sur', 'Monday', 'Friday', '08:00 AM', '05:00 PM', 15)
on conflict (id) do nothing;

-- Preload Leave Requests
insert into public.leave_requests (id, employee_id, employee_name, leave_type, start_date, end_date, days, status, reason, filed_on) values
('LR-2024-001', 'EMP-2024-0005', 'Rosa Fernandez', 'Vacation Leave', '2024-12-23', '2024-12-27', 5, 'Pending', 'Family holiday during Christmas break', '2024-12-10'),
('LR-2024-002', 'EMP-2024-0006', 'Carlos Mendoza', 'Sick Leave', '2024-12-18', '2024-12-18', 1, 'Approved', 'Sudden onset of flu and high fever', '2024-12-17'),
('LR-2024-003', 'EMP-2024-0002', 'Juan dela Cruz', 'Vacation Leave', '2024-12-30', '2025-01-03', 5, 'Approved', 'Standard New Year mandatory holidays', '2024-12-05'),
('LR-2026-001', 'EMP-2024-0002', 'Juan dela Cruz', 'Vacation Leave', '2026-05-25', '2026-05-29', 5, 'Approved', 'Family beach trip in Boracay', '2026-05-10'),
('LR-2026-002', 'EMP-2024-0003', 'Ana Reyes', 'Sick Leave', '2026-05-28', '2026-05-30', 3, 'Approved', 'Fever and medical diagnostics', '2026-05-28'),
('LR-2026-003', 'EMP-2024-0006', 'Carlos Mendoza', 'Vacation Leave', '2026-06-02', '2026-06-04', 3, 'Approved', 'Rest and relaxation in home province', '2026-05-18')
on conflict (id) do nothing;

-- Preload Attendance Logs
insert into public.attendance_logs (id, employee_id, employee_name, work_date, time_in, time_out, hours_worked, late_minutes, status, time_in_latitude, time_in_longitude, time_in_address, time_in_accuracy, time_out_latitude, time_out_longitude, time_out_address, time_out_accuracy) values
('7682db1b-6893-4a16-95f0-e71a48c6606a', 'EMP-2024-0002', 'Juan dela Cruz', '2026-05-28', '08:02 AM', '05:10 PM', 9.13, 2, 'Present', 14.5496, 121.0437, 'BGC High Street, Taguig City, Metro Manila', 12.0, 14.5547, 121.0244, 'Ayala Avenue Office, Makati, Metro Manila', 20.0),
('34f669cc-84bb-4f36-be86-dffd46bfbdf5', 'EMP-2024-0003', 'Ana Reyes', '2026-05-28', '08:00 AM', '05:00 PM', 8.00, 0, 'Present', 14.5995, 120.9842, 'Manila City Hall Area, Ermita, Metro Manila', 8.0, 14.5764, 121.0851, 'Ortigas Center Business Park, Pasig City', 15.0),
('82cb1256-4bca-49ba-8b89-11c56abcb613', 'EMP-2024-0004', 'Pedro Lim', '2026-05-28', '07:55 AM', '06:30 PM', 10.58, 0, 'Present', 14.6760, 121.0437, 'Quezon City Memorial Circle, Quezon City', 25.0, 14.6760, 121.0437, 'Quezon City Memorial Circle, Quezon City', 25.0),
('9bc1ba20-1da2-46cc-a477-71b312dbcf12', 'EMP-2024-0005', 'Rosa Fernandez', '2026-05-28', '09:15 AM', '06:00 PM', 8.75, 75, 'Late', 10.3157, 123.8854, 'Cebu IT Park, Lahug, Cebu City', 18.0, 10.3157, 123.8854, 'Cebu IT Park, Lahug, Cebu City', 18.0),
('6b29c91f-0e24-4ebd-9e12-3b680bfbe98a', 'EMP-2024-0006', 'Carlos Mendoza', '2026-05-28', null, null, 0.00, 0, 'Absent', null, null, null, null, null, null, null, null)
on conflict (id) do nothing;

-- Preload Itineraries
insert into public.itineraries(id, employee_id, employee_name, event_date, type, title, notes) values
('ITIN-1', 'EMP-2024-0002', 'Juan dela Cruz', '2026-05-28', 'achievement', 'Finished high-throughput core payroll VM module testing', 'Achieved double speed in compilation cycles.'),
('ITIN-2', 'EMP-2024-0002', 'Juan dela Cruz', '2026-05-29', 'itinerary', 'Refactor TS enum type imports on middleware layers', 'Optimize latency of token decoding rules.'),
('ITIN-3', 'EMP-2024-0003', 'Ana Reyes', '2026-05-28', 'achievement', 'Completed Q1 statutory tax remittances with BIR', 'All verified by external PH certified auditors.'),
('ITIN-4', 'EMP-2024-0003', 'Ana Reyes', '2026-05-30', 'itinerary', 'Formulate next quarter''s statutory benefit brackets', 'Draft draft spreadsheet for PhilHealth and SSS updates.')
on conflict (id) do nothing;


-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Secure personal employee profiles and audit logs
-- =====================================================================

-- Turn on RLS for tables
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.itineraries enable row level security;
alter table public.maker_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.audit_logs enable row level security;

-- 1. Departments Policies
create policy "Allow public read access to departments"
on public.departments for select
using (true);

create policy "HR administrators can manage all departments"
on public.departments for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 2. Employees Policies
create policy "Allow employees to inspect their own 201 profile"
on public.employees for select
using (
    email = auth.jwt() ->> 'email'
    or auth.role() = 'service_role'
);

create policy "HR administrators can manage all employee profiles"
on public.employees for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
)
with check (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 3. Attendance Logs Policies
create policy "Employees can inspect and register their own attendance logs"
on public.attendance_logs for all
using (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
)
with check (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 4. Leave Requests Policies
create policy "Employees can manage their own leave requests"
on public.leave_requests for all
using (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.role() = 'service_role'
)
with check (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.role() = 'service_role'
);

create policy "HR administrators can review and approve all leave requests"
on public.leave_requests for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 5. Overtime Requests Policies
create policy "Employees can manage their own overtime requests"
on public.overtime_requests for all
using (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.role() = 'service_role'
)
with check (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.role() = 'service_role'
);

create policy "HR administrators can review and approve all overtime requests"
on public.overtime_requests for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 6. Itineraries Policies
create policy "Employees can read and manage their own itineraries"
on public.itineraries for all
using (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
)
with check (
    employee_id = (select id from public.employees where email = auth.jwt() ->> 'email')
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 7. Maker-Checker Requests Policies
create policy "Employees can issue correction requests"
on public.maker_requests for all
using (
    requester_email = auth.jwt() ->> 'email'
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
)
with check (
    requester_email = auth.jwt() ->> 'email'
    or auth.jwt() ->> 'email' like '%@corp.ph'
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 8. Payroll Runs Policies
create policy "Only HR administrators can manage payroll runs"
on public.payroll_runs for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);

-- 9. Audit Logs Policies
create policy "Only system or admin can inspect audit logs"
on public.audit_logs for all
using (
    auth.jwt() ->> 'email' like '%@corp.ph' 
    or auth.jwt() ->> 'email' = 'gmelchan951@gmail.com'
    or auth.role() = 'service_role'
);
