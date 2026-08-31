-- test_rls.sql
begin;

-- ==============================================================================
-- 1. SETUP TEST DATA (Run as postgres bypassing RLS)
-- ==============================================================================
set local role postgres;

-- Create auth users
insert into auth.users (id, instance_id, email) values 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'adminA@test.com'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'teacherA@test.com'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'studentA@test.com'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'adminB@test.com'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'teacherB@test.com'),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'studentB@test.com')
on conflict do nothing;

-- Create Institutions
insert into public.institutions (id, name, type) values 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Institution A', 'school'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Institution B', 'school');

-- Create Users
insert into public.users (id, institution_id, email, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adminA@test.com', 'Admin A', 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'teacherA@test.com', 'Teacher A', 'TEACHER'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'studentA@test.com', 'Student A', 'STUDENT'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'adminB@test.com', 'Admin B', 'ADMIN'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'teacherB@test.com', 'Teacher B', 'TEACHER'),
  ('66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'studentB@test.com', 'Student B', 'STUDENT');

-- Academic Structure Inst A
insert into public.academic_years (id, institution_id, name) values ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026');
insert into public.programs (id, academic_year_id, name) values ('a2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Class 10');
insert into public.terms (id, program_id, name) values ('a3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Term 1');
insert into public.subjects (id, term_id, name) values 
  ('a4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', 'Math A'),
  ('a5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', 'Science A (Unenrolled)');

-- Academic Structure Inst B
insert into public.academic_years (id, institution_id, name) values ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026');
insert into public.programs (id, academic_year_id, name) values ('b2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Class 10');
insert into public.terms (id, program_id, name) values ('b3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'Term 1');
insert into public.subjects (id, term_id, name) values ('b4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 'Math B');

-- Enrollments Inst A
insert into public.teacher_assignments (user_id, subject_id) values ('22222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444');
insert into public.student_enrollments (user_id, subject_id) values ('33333333-3333-3333-3333-333333333333', 'a4444444-4444-4444-4444-444444444444');

-- Enrollments Inst B
insert into public.teacher_assignments (user_id, subject_id) values ('55555555-5555-5555-5555-555555555555', 'b4444444-4444-4444-4444-444444444444');
insert into public.student_enrollments (user_id, subject_id) values ('66666666-6666-6666-6666-666666666666', 'b4444444-4444-4444-4444-444444444444');

-- Documents Inst A
insert into public.documents (id, subject_id, title, status, created_by) values 
  ('c1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Published Math A', 'PUBLISHED', '22222222-2222-2222-2222-222222222222'),
  ('c2222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'Draft Math A', 'DRAFT', '22222222-2222-2222-2222-222222222222'),
  ('c3333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555', 'Published Sci A', 'PUBLISHED', '11111111-1111-1111-1111-111111111111');

-- Documents Inst B
insert into public.documents (id, subject_id, title, status, created_by) values 
  ('d1111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444444', 'Published Math B', 'PUBLISHED', '55555555-5555-5555-5555-555555555555');

-- ==============================================================================
-- 2. TESTS
-- ==============================================================================

DO $$
DECLARE
  res_count INT;
BEGIN
  ---------------------------------------------------------
  -- Test 1: Student A cannot read Inst B documents
  ---------------------------------------------------------
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
  
  select count(*) into res_count from public.documents where id = 'd1111111-1111-1111-1111-111111111111';
  if res_count > 0 then raise exception 'Test 1 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 2: Student A cannot read a DRAFT document
  ---------------------------------------------------------
  select count(*) into res_count from public.documents where id = 'c2222222-2222-2222-2222-222222222222';
  if res_count > 0 then raise exception 'Test 2 Failed'; end if;

  ---------------------------------------------------------
  -- Test 3: Student A can read a PUBLISHED doc (enrolled)
  ---------------------------------------------------------
  select count(*) into res_count from public.documents where id = 'c1111111-1111-1111-1111-111111111111';
  if res_count = 0 then raise exception 'Test 3 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 4: Student A cannot read PUBLISHED doc (unenrolled subject)
  ---------------------------------------------------------
  select count(*) into res_count from public.documents where id = 'c3333333-3333-3333-3333-333333333333';
  if res_count > 0 then raise exception 'Test 4 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 9: Student A cannot modify documents
  ---------------------------------------------------------
  BEGIN
    update public.documents set title = 'Hacked' where id = 'c1111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN others THEN
    -- should fail silently by updating 0 rows due to RLS, not raise an error, but let's check count
  END;
  select count(*) into res_count from public.documents where title = 'Hacked';
  if res_count > 0 then raise exception 'Test 9 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 5 & 6: Teacher A cannot modify unassigned/InstB docs
  ---------------------------------------------------------
  set local "request.jwt.claims" to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
  
  update public.documents set title = 'TeacherHack' where id = 'c3333333-3333-3333-3333-333333333333'; -- Unassigned Inst A
  update public.documents set title = 'TeacherHack' where id = 'd1111111-1111-1111-1111-111111111111'; -- Inst B
  
  select count(*) into res_count from public.documents where title = 'TeacherHack';
  if res_count > 0 then raise exception 'Test 5/6 Failed'; end if;

  ---------------------------------------------------------
  -- Test 7: Admin A cannot access Institution B data
  ---------------------------------------------------------
  set local "request.jwt.claims" to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
  select count(*) into res_count from public.documents where id = 'd1111111-1111-1111-1111-111111111111';
  if res_count > 0 then raise exception 'Test 7 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 8: Admin A can manage Institution A data
  ---------------------------------------------------------
  update public.documents set title = 'AdminEdit' where id = 'c1111111-1111-1111-1111-111111111111';
  select count(*) into res_count from public.documents where title = 'AdminEdit';
  if res_count = 0 then raise exception 'Test 8 Failed'; end if;
  
  ---------------------------------------------------------
  -- Test 10: Unauthenticated users cannot access data
  ---------------------------------------------------------
  set local role anon;
  set local "request.jwt.claims" to '{}';
  select count(*) into res_count from public.documents;
  if res_count > 0 then raise exception 'Test 10 Failed'; end if;
  
  RAISE NOTICE 'ALL TESTS PASSED SUCCESSFULLY';
END $$;

rollback;
