-- ==============================================================================
-- EduVault Database Schema & RLS Setup (Supabase PostgreSQL)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (extends Supabase Auth users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  institution text default 'inst-1',
  role text default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to create profile automatically on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Documents Table
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

-- Documents Policies
create policy "Documents are viewable by everyone"
  on public.documents for select
  using (true);

create policy "Authenticated users can insert documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated' or auth.uid() is null);

create policy "Users can update documents"
  on public.documents for update
  using (auth.uid() = user_id or auth.uid() is not null);

create policy "Users can delete documents"
  on public.documents for delete
  using (auth.uid() = user_id or auth.uid() is not null);

-- ------------------------------------------------------------------------------
-- 3. Initial Seed Data
-- ------------------------------------------------------------------------------
insert into public.documents (title, institution, academic_year, class_grade, subject, timeline, file_type, file_size, created_at)
values
  ('Mid-Term Physics Study Guide', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '2.4 MB', now() - interval '9 days'),
  ('Thermodynamics Lab Report Template', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'doc', '1.2 MB', now() - interval '12 days'),
  ('Optics Formulas & Cheat Sheet', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '850 KB', now() - interval '14 days'),
  ('Grade 10 Physics Syllabus 2026', 'inst-1', '2026-2027', 'grade-10', 'physics', 'term-1', 'pdf', '4.1 MB', now() - interval '23 days'),
  ('Calculus Limits & Continuity Exercises', 'inst-1', '2026-2027', 'grade-11', 'mathematics', 'term-1', 'pdf', '1.8 MB', now() - interval '6 days'),
  ('Organic Chemistry Nomenclature Sheet', 'inst-2', '2026-2027', 'grade-12', 'chemistry', 'term-2', 'xlsx', '620 KB', now() - interval '26 days')
on conflict do nothing;
