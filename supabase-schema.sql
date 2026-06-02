-- =====================================================================
-- MGTECH / HRIS DATABASE SCHEMA
-- Note: Running this script will DROP all existing tables and recreate them.
-- =====================================================================

-- 1. CLEAN UP
drop table if exists public.audit_logs cascade;
drop table if exists public.maker_requests cascade;
drop table if exists public.itineraries cascade;
drop table if exists public.overtime_requests cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.attendance_logs cascade;
drop table if exists public.employees cascade;
drop table if exists public.departments cascade;
drop table if exists public.payroll_runs cascade;
drop table if exists public.admins cascade;

-- 2. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 3. TABLES
-- Admins Table
create table public.admins (
    id uuid default gen_random_uuid() primary key,
    email varchar(255) unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Departments
create table public.departments (
    id serial primary key,
    code varchar(10) unique not null,
    name varchar(100) not null,
    headcount integer default 0 check (headcount >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employees
create table public.employees (
    id varchar(50) primary key, 
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

-- Attendance
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

-- Leaves
create table public.leave_requests (
    id varchar(50) primary key,
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

-- Overtime
create table public.overtime_requests (
    id varchar(50) primary key,
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

-- Itineraries
create table public.itineraries (
    id varchar(50) primary key,
    employee_id varchar(50) references public.employees(id) on delete cascade not null,
    employee_name varchar(200) not null,
    event_date date not null,
    type varchar(50) not null check (type in ('achievement', 'itinerary')),
    title varchar(200) not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Maker Requests
create table public.maker_requests (
    id varchar(50) primary key,
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

-- Payroll Runs
create table public.payroll_runs (
    id varchar(50) primary key,
    pay_period varchar(100) not null,
    total_gross numeric(14, 2) default 0 check (total_gross >= 0),
    total_deductions numeric(14, 2) default 0 check (total_deductions >= 0),
    total_net numeric(14, 2) default 0 check (total_net >= 0),
    employee_count integer not null check (employee_count >= 0),
    pay_date date not null,
    status varchar(50) default 'Draft' check (status in ('Draft', 'Processing', 'Finalized')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit Logs
create table public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    performed_by varchar(255) not null,
    action_type varchar(50) not null,
    table_name varchar(100) not null,
    description text not null,
    performed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS POLICIES (Using admins table)
-- Helper function to check admin status
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 
    from public.admins 
    where email = auth.jwt() ->> 'email'
  );
end;
$$ language plpgsql security definer;

-- Enable RLS
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.itineraries enable row level security;
alter table public.maker_requests enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admins enable row level security;

-- Policies
create policy "Allow public read access to departments" on public.departments for select using (true);
create policy "Admins can manage all departments" on public.departments for all using (public.is_admin());

create policy "Employees can inspect their own profile" on public.employees for select using (email = auth.jwt() ->> 'email' or public.is_admin());
create policy "Admins can manage all employees" on public.employees for all using (public.is_admin());

create policy "Attendance access" on public.attendance_logs for all 
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email') or public.is_admin());

create policy "Leave access" on public.leave_requests for all 
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email') or public.is_admin());

create policy "OT access" on public.overtime_requests for all 
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email') or public.is_admin());

create policy "Itinerary access" on public.itineraries for all 
using (employee_id = (select id from public.employees where email = auth.jwt() ->> 'email') or public.is_admin());

create policy "Maker requests access" on public.maker_requests for all 
using (requester_email = auth.jwt() ->> 'email' or public.is_admin());

create policy "Payroll access" on public.payroll_runs for all using (public.is_admin());
create policy "Audit access" on public.audit_logs for all using (public.is_admin());
create policy "Admin table access" on public.admins for select using (public.is_admin());
