-- ==============================================================================
-- EduVault Remote Schema Deployment
-- Run this ENTIRE script in the Supabase SQL Editor for project:
-- https://supabase.com/dashboard/project/kxclbimagkfzhxkwcafk
-- ==============================================================================
-- SAFETY NOTE: This will DROP the legacy public.profiles and public.documents
-- tables (which contain only mock seed data and no real uploaded files).
-- Two auth users will need to be re-bootstrapped below in STEP 2.
-- ==============================================================================

-- STEP 1: Deploy Tasks 1-11 Schema
-- (paste entire supabase/schema.sql content below)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop existing tables to cleanly reset the mock database
drop table if exists public.audit_logs cascade;
drop table if exists public.document_versions cascade;
drop table if exists public.documents cascade;
drop table if exists public.folders cascade;
drop table if exists public.student_enrollments cascade;
drop table if exists public.teacher_assignments cascade;
drop table if exists public.subjects cascade;
drop table if exists public.terms cascade;
drop table if exists public.programs cascade;
drop table if exists public.academic_years cascade;
drop table if exists public.notices cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;
drop table if exists public.institutions cascade;

create table public.institutions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('school', 'university')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.users (
  id uuid primary key references auth.users on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('ADMIN', 'TEACHER', 'STUDENT')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function public.get_my_institution_id()
returns uuid
language sql security definer
set search_path = public
as $$
  select institution_id from public.users where id = auth.uid() limit 1;
$$;

create or replace function public.get_my_role()
returns text
language sql security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() limit 1;
$$;

create table public.academic_years (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  is_active boolean default false,
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (institution_id, name)
);

create table public.programs (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (academic_year_id, name)
);

create table public.terms (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (program_id, name)
);

create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid not null references public.terms(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (term_id, name)
);

create table public.teacher_assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, subject_id)
);

create table public.student_enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, subject_id)
);

create table public.folders (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null default 1,
  storage_path text not null,
  file_type text not null,
  file_size bigint not null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.notices (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  content text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function public.verify_notice_institution()
returns trigger as $$
declare
  subject_inst_id uuid;
begin
  if NEW.subject_id is not null then
    select ay.institution_id into subject_inst_id
    from public.subjects s
    join public.terms t on s.term_id = t.id
    join public.programs p on t.program_id = p.id
    join public.academic_years ay on p.academic_year_id = ay.id
    where s.id = NEW.subject_id;
    
    if NEW.institution_id != subject_inst_id then
      raise exception 'Notice institution_id must match the subject''s institution_id';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger notice_institution_check
before insert or update on public.notices
for each row execute procedure public.verify_notice_institution();

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references public.institutions(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function public.log_document_changes()
returns trigger as $$
declare
  log_entity_id uuid;
  log_metadata jsonb;
  v_action text := TG_OP;
begin
  if TG_OP = 'UPDATE' then
    if OLD.status != 'PUBLISHED' and NEW.status = 'PUBLISHED' then
      v_action := 'DOCUMENT_PUBLISHED';
    elsif OLD.status != 'ARCHIVED' and NEW.status = 'ARCHIVED' then
      v_action := 'DOCUMENT_ARCHIVED';
    elsif OLD.status != 'DRAFT' and NEW.status = 'DRAFT' then
      v_action := 'DOCUMENT_LOCKED';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    log_entity_id := OLD.id;
    log_metadata := row_to_json(OLD);
  else
    log_entity_id := NEW.id;
    log_metadata := row_to_json(NEW);
  end if;

  insert into public.audit_logs (institution_id, user_id, action, entity_table, entity_id, metadata)
  values (
    public.get_my_institution_id(),
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    log_entity_id,
    log_metadata
  );
  
  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger document_audit_trigger
after insert or update or delete on public.documents
for each row execute procedure public.log_document_changes();

-- RLS
alter table public.institutions enable row level security;
alter table public.users enable row level security;
alter table public.academic_years enable row level security;
alter table public.programs enable row level security;
alter table public.terms enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.notices enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can view their own institution" on public.institutions
  for select using (id = public.get_my_institution_id());
create policy "Admins can update their institution" on public.institutions
  for update using (id = public.get_my_institution_id() and public.get_my_role() = 'ADMIN');

create policy "Users can view users in their institution" on public.users
  for select using (institution_id = public.get_my_institution_id());
create policy "Admins can manage users in their institution" on public.users
  for all using (institution_id = public.get_my_institution_id() and public.get_my_role() = 'ADMIN');

create policy "Users can view academic years" on public.academic_years
  for select using (institution_id = public.get_my_institution_id());
create policy "Admins can manage academic years" on public.academic_years
  for all using (institution_id = public.get_my_institution_id() and public.get_my_role() = 'ADMIN');

create policy "Users can view programs" on public.programs
  for select using (
    exists (select 1 from public.academic_years where id = academic_year_id and institution_id = public.get_my_institution_id())
  );
create policy "Admins can manage programs" on public.programs
  for all using (
    exists (select 1 from public.academic_years where id = academic_year_id and institution_id = public.get_my_institution_id())
    and public.get_my_role() = 'ADMIN'
  );

create policy "Users can view terms" on public.terms
  for select using (
    exists (
      select 1 from public.programs p 
      join public.academic_years ay on p.academic_year_id = ay.id 
      where p.id = program_id and ay.institution_id = public.get_my_institution_id()
    )
  );
create policy "Admins can manage terms" on public.terms
  for all using (
    exists (
      select 1 from public.programs p 
      join public.academic_years ay on p.academic_year_id = ay.id 
      where p.id = program_id and ay.institution_id = public.get_my_institution_id()
    ) and public.get_my_role() = 'ADMIN'
  );

create policy "Users can view subjects" on public.subjects
  for select using (
    exists (
      select 1 from public.terms t 
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id 
      where t.id = term_id and ay.institution_id = public.get_my_institution_id()
    )
  );
create policy "Admins can manage subjects" on public.subjects
  for all using (
    exists (
      select 1 from public.terms t 
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id 
      where t.id = term_id and ay.institution_id = public.get_my_institution_id()
    ) and public.get_my_role() = 'ADMIN'
  );

create policy "Teachers view their own assignments" on public.teacher_assignments
  for select using (user_id = auth.uid());
create policy "Admins manage teacher assignments in their institution" on public.teacher_assignments
  for all using (
    public.get_my_role() = 'ADMIN' 
    and exists (
      select 1 from public.subjects s
      join public.terms t on s.term_id = t.id
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id
      where s.id = subject_id and ay.institution_id = public.get_my_institution_id()
    )
  );

create policy "Students view their own enrollments" on public.student_enrollments
  for select using (user_id = auth.uid());
create policy "Teachers view enrollments for their subjects" on public.student_enrollments
  for select using (
    public.get_my_role() = 'TEACHER'
    and exists (
      select 1 from public.teacher_assignments ta 
      where ta.subject_id = student_enrollments.subject_id and ta.user_id = auth.uid()
    )
  );
create policy "Admins manage student enrollments in their institution" on public.student_enrollments
  for all using (
    public.get_my_role() = 'ADMIN' 
    and exists (
      select 1 from public.subjects s
      join public.terms t on s.term_id = t.id
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id
      where s.id = subject_id and ay.institution_id = public.get_my_institution_id()
    )
  );

create policy "Admins manage folders in their institution" on public.folders
  for all using (
    public.get_my_role() = 'ADMIN'
    and exists (
      select 1 from public.subjects s
      join public.terms t on s.term_id = t.id
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id
      where s.id = subject_id and ay.institution_id = public.get_my_institution_id()
    )
  );
create policy "Teachers manage folders for their assigned subjects" on public.folders
  for all using (
    public.get_my_role() = 'TEACHER'
    and exists (select 1 from public.teacher_assignments ta where ta.subject_id = folders.subject_id and ta.user_id = auth.uid())
  );
create policy "Students view folders for their enrolled subjects" on public.folders
  for select using (
    public.get_my_role() = 'STUDENT'
    and exists (select 1 from public.student_enrollments se where se.subject_id = folders.subject_id and se.user_id = auth.uid())
  );

create policy "Admins can manage all documents in their institution" on public.documents
  for all using (
    public.get_my_role() = 'ADMIN' 
    and exists (
      select 1 from public.subjects s
      join public.terms t on s.term_id = t.id
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id
      where s.id = subject_id and ay.institution_id = public.get_my_institution_id()
    )
  );
create policy "Teachers can manage documents for their assigned subjects" on public.documents
  for all using (
    public.get_my_role() = 'TEACHER'
    and exists (
      select 1 from public.teacher_assignments ta where ta.subject_id = documents.subject_id and ta.user_id = auth.uid()
    )
  );
create policy "Students can view PUBLISHED documents for their enrolled subjects" on public.documents
  for select using (
    public.get_my_role() = 'STUDENT'
    and status = 'PUBLISHED'
    and exists (
      select 1 from public.student_enrollments se where se.subject_id = documents.subject_id and se.user_id = auth.uid()
    )
  );

create policy "Admins can manage document versions" on public.document_versions
  for all using (
    public.get_my_role() = 'ADMIN' 
    and exists (
      select 1 from public.documents d
      join public.subjects s on d.subject_id = s.id
      join public.terms t on s.term_id = t.id
      join public.programs p on t.program_id = p.id
      join public.academic_years ay on p.academic_year_id = ay.id
      where d.id = document_id and ay.institution_id = public.get_my_institution_id()
    )
  );
create policy "Teachers can manage document versions for their subjects" on public.document_versions
  for all using (
    public.get_my_role() = 'TEACHER'
    and exists (
      select 1 from public.documents d
      join public.teacher_assignments ta on d.subject_id = ta.subject_id
      where d.id = document_id and ta.user_id = auth.uid()
    )
  );
create policy "Students can view latest document versions for enrolled subjects" on public.document_versions
  for select using (
    public.get_my_role() = 'STUDENT'
    and exists (
      select 1 from public.documents d
      join public.student_enrollments se on d.subject_id = se.subject_id
      where d.id = document_id and se.user_id = auth.uid() and d.status = 'PUBLISHED'
    )
  );

create policy "Admins manage notices in their institution" on public.notices
  for all using (public.get_my_role() = 'ADMIN' and institution_id = public.get_my_institution_id());
create policy "Teachers manage notices for their subjects" on public.notices
  for all using (
    public.get_my_role() = 'TEACHER'
    and institution_id = public.get_my_institution_id()
    and exists (select 1 from public.teacher_assignments ta where ta.subject_id = notices.subject_id and ta.user_id = auth.uid())
  );
create policy "Students view notices in their institution" on public.notices
  for select using (
    institution_id = public.get_my_institution_id()
    and (subject_id is null or exists (select 1 from public.student_enrollments se where se.subject_id = notices.subject_id and se.user_id = auth.uid()))
  );

create policy "Admins view audit logs in their institution" on public.audit_logs
  for select using (public.get_my_role() = 'ADMIN' and institution_id = public.get_my_institution_id());
create policy "System insert audit logs" on public.audit_logs
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Storage
insert into storage.buckets (id, name, public) 
values ('eduvault-documents', 'eduvault-documents', false)
on conflict (id) do nothing;

create policy "Storage access requires future upload implementation" on storage.objects
  for all using (false);

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;

-- ==============================================================================
-- STEP 2: Bootstrap the two known auth users
-- Replace the UUIDs below with the ACTUAL auth.users UUIDs from:
-- Supabase Dashboard > Authentication > Users
-- ==============================================================================

-- First create the institution
INSERT INTO public.institutions (id, name, type)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- institution UUID (you can keep this or let it auto-generate)
  'EduVault Institution',
  'school'
);

-- Then create the ADMIN user (kprithviraju007@gmail.com)
-- Replace <ADMIN_AUTH_UUID> with the UUID from auth.users for kprithviraju007@gmail.com
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  '<ADMIN_AUTH_UUID>',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'kprithviraju007@gmail.com',
  'Prithvi Raju',
  'ADMIN'
);

-- Then create the TEACHER user (ramanabhaskar99@gmail.com)
-- Replace <TEACHER_AUTH_UUID> with the UUID from auth.users for ramanabhaskar99@gmail.com
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  '<TEACHER_AUTH_UUID>',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ramanabhaskar99@gmail.com',
  'Aravind',
  'TEACHER'
);

-- ==============================================================================
-- VERIFICATION: Run these after the above to confirm deployment
-- ==============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM public.institutions;
-- SELECT * FROM public.users;
