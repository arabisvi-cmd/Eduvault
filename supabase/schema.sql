-- ==============================================================================
-- EduVault Database Schema & RLS Setup (Supabase PostgreSQL)
-- Direct Institutional ID Registration & Password Setup
-- (Idempotent: Safe to run and re-run multiple times)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (extends Supabase Auth users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  institution text default 'inst-1',
  role text default 'student' check (role in ('admin', 'teacher', 'student')),
  institutional_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if table was already created in earlier step
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists institutional_id text;

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to create profile automatically on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, institutional_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'institutional_id'
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = coalesce(excluded.role, public.profiles.role),
    institutional_id = coalesce(excluded.institutional_id, public.profiles.institutional_id),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Teachers Roster Table (Pre-existing institutional directory)
-- ------------------------------------------------------------------------------
create table if not exists public.teachers (
  teacher_id text primary key,
  full_name text not null,
  email text unique not null,
  institution text not null default 'inst-1',
  department text not null default 'Science',
  designation text not null default 'Faculty',
  password text, -- NULL until user creates password during registration
  status text not null default 'unregistered' check (status in ('unregistered', 'active', 'suspended')),
  registered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure password column exists if table was created in earlier run
alter table public.teachers add column if not exists password text;

-- Enable RLS on teachers table
alter table public.teachers enable row level security;

drop policy if exists "Teachers roster is viewable by all for ID validation" on public.teachers;
create policy "Teachers roster is viewable by all for ID validation"
  on public.teachers for select
  using (true);

drop policy if exists "Teachers roster can be updated upon registration" on public.teachers;
create policy "Teachers roster can be updated upon registration"
  on public.teachers for update
  using (true);

-- ------------------------------------------------------------------------------
-- 3. Students Roster Table (Pre-existing institutional directory)
-- ------------------------------------------------------------------------------
create table if not exists public.students (
  student_id text primary key,
  full_name text not null,
  email text unique not null,
  institution text not null default 'inst-1',
  grade text not null default 'grade-10',
  section text not null default 'Section A',
  password text, -- NULL until user creates password during registration
  status text not null default 'unregistered' check (status in ('unregistered', 'active', 'suspended')),
  registered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure password column exists if table was created in earlier run
alter table public.students add column if not exists password text;

-- Enable RLS on students table
alter table public.students enable row level security;

drop policy if exists "Students roster is viewable by all for ID validation" on public.students;
create policy "Students roster is viewable by all for ID validation"
  on public.students for select
  using (true);

drop policy if exists "Students roster can be updated upon registration" on public.students;
create policy "Students roster can be updated upon registration"
  on public.students for update
  using (true);

-- ------------------------------------------------------------------------------
-- 4. Documents Table
-- ------------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  institution text not null default 'inst-1',
  academic_year text not null default '2026-2027',
  class_grade text not null default 'grade-10',
  subject text not null default 'physics',
  timeline text not null default 'term-1',
  file_type text not null default 'pdf',
  file_size text not null default '1.0 MB',
  file_url text,
  storage_path text,
  user_id uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on documents
alter table public.documents enable row level security;

drop policy if exists "Documents are viewable by everyone" on public.documents;
create policy "Documents are viewable by everyone"
  on public.documents for select
  using (true);

drop policy if exists "Authenticated users can insert documents" on public.documents;
create policy "Authenticated users can insert documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated' or auth.uid() is null);

drop policy if exists "Users can update documents" on public.documents;
create policy "Users can update documents"
  on public.documents for update
  using (auth.uid() = user_id or auth.uid() is not null);

drop policy if exists "Users can delete documents" on public.documents;
create policy "Users can delete documents"
  on public.documents for delete
  using (auth.uid() = user_id or auth.uid() is not null);

-- ------------------------------------------------------------------------------
-- 5. Initial Seed Data (Teachers, Students, Documents)
-- ------------------------------------------------------------------------------

-- Seed Teachers Roster (password is null initially for unregistered teachers)
insert into public.teachers (teacher_id, full_name, email, institution, department, designation, password, status)
values
  ('TCH-1001', 'Dr. Robert Vance', 'robert.vance@school.edu', 'inst-1', 'Physics', 'HOD Physics', null, 'unregistered'),
  ('TCH-1002', 'Prof. Sarah Jenkins', 'sarah.jenkins@school.edu', 'inst-1', 'Mathematics', 'Senior Lecturer', null, 'unregistered'),
  ('TCH-1003', 'Dr. Marcus Reynolds', 'marcus.reynolds@school.edu', 'inst-1', 'Chemistry', 'Lab Director', null, 'unregistered'),
  ('TCH-2001', 'Elena Rostova', 'elena.rostova@cambridge.edu', 'inst-2', 'Computer Science', 'Lead Faculty', null, 'unregistered')
on conflict (teacher_id) do update
set 
  full_name = excluded.full_name,
  email = excluded.email,
  department = excluded.department,
  designation = excluded.designation;

-- Seed Students Roster (password is null initially for unregistered students)
insert into public.students (student_id, full_name, email, institution, grade, section, password, status)
values
  ('STU-2026-001', 'Alice Chen', 'alice.chen@student.edu', 'inst-1', 'grade-10', 'Section A', null, 'unregistered'),
  ('STU-2026-002', 'Liam Miller', 'liam.miller@student.edu', 'inst-1', 'grade-10', 'Section A', null, 'unregistered'),
  ('STU-2026-042', 'Sophia Rodriguez', 'sophia.rodriguez@student.edu', 'inst-1', 'grade-11', 'Science', null, 'unregistered'),
  ('STU-2026-099', 'David Kim', 'david.kim@student.edu', 'inst-1', 'grade-12', 'Commerce', null, 'unregistered')
on conflict (student_id) do update
set 
  full_name = excluded.full_name,
  email = excluded.email,
  grade = excluded.grade,
  section = excluded.section;

-- Seed Documents
insert into public.documents (title, institution, academic_year, class_grade, subject, timeline, file_type, file_size, created_at)
values
  ('Mid-Term Physics Study Guide', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '2.4 MB', now() - interval '9 days'),
  ('Thermodynamics Lab Report Template', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'doc', '1.2 MB', now() - interval '12 days'),
  ('Optics Formulas & Cheat Sheet', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '850 KB', now() - interval '14 days'),
  ('Grade 10 Physics Syllabus 2026', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '4.1 MB', now() - interval '23 days'),
  ('Calculus Limits & Continuity Exercises', 'inst-1', '2026-2027', 'grade-11', 'mathematics', 'term-1', 'pdf', '1.8 MB', now() - interval '6 days'),
  ('Organic Chemistry Nomenclature Sheet', 'inst-2', '2026-2027', 'grade-12', 'chemistry', 'term-2', 'xlsx', '620 KB', now() - interval '26 days')
on conflict do nothing;
