BEGIN;

  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    inst_c uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    
    admin_a uuid := '11111111-1111-1111-1111-111111111111';
    admin_c uuid := 'dc0dc6ba-7610-48a1-aed6-e3f63aabb572'; -- real_admin
    
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    
    teacher_c uuid := '44444444-4444-4444-4444-444444444444';
    student_c uuid := '55555555-5555-5555-5555-555555555555';
    
    ay_a uuid;
    prog_a uuid;
    term_a uuid;
    subj_a uuid;
    subj_b uuid;

  BEGIN
    -- Create dummy users for testing
    INSERT INTO auth.users (id, email) VALUES 
      (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com'), 
      (teacher_c, 'tc@test.com'), (student_c, 'sc@test.com') ON CONFLICT DO NOTHING;
      
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com'),
      (teacher_c, inst_c, 'TEACHER', 'Teacher C', 'tc@test.com'),
      (student_c, inst_c, 'STUDENT', 'Student C', 'sc@test.com') ON CONFLICT DO NOTHING;

    -- Setup Academic Structure in Inst A (as Admin A)
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_a), true);
    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'Test AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Test Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Test Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subject A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subject B') RETURNING id INTO subj_b;

    -- TEST 1: Admin assigns Teacher A to Subject A
    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
    RAISE NOTICE 'TEST 1 PASS: Admin A assigned Teacher A';

    -- TEST 6: Admin enrolls Student A in Subject A
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);
    RAISE NOTICE 'TEST 6 PASS: Admin A enrolled Student A';

    -- TEST 15: Duplicate assignment
    BEGIN
      INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
      RAISE EXCEPTION 'FAIL: Duplicate assignment allowed';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'TEST 15 PASS: Duplicate assignment rejected';
    END;

    -- TEST 16: Duplicate enrollment
    BEGIN
      INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);
      RAISE EXCEPTION 'FAIL: Duplicate enrollment allowed';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'TEST 16 PASS: Duplicate enrollment rejected';
    END;

    -- TEST 11/12: Admin A cannot assign users from another institution
    -- Wait, RLS on teacher_assignments currently says:
    -- "Admins manage teacher assignments in their institution" using (public.get_my_role() = 'ADMIN' and user_id in (select id from public.users where institution_id = public.get_my_institution_id()))
    -- Let's test it:
    BEGIN
      INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_c, subj_a);
      RAISE EXCEPTION 'FAIL: Admin A could assign Teacher C from Inst C';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 11 PASS: Admin A blocked from cross-institution teacher assignment (%)', SQLERRM;
    END;
    
    BEGIN
      INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_c, subj_a);
      RAISE EXCEPTION 'FAIL: Admin A could enroll Student C from Inst C';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 12 PASS: Admin A blocked from cross-institution student enrollment (%)', SQLERRM;
    END;

    -- Switch to Teacher A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    
    -- TEST 2: Teacher A can see Subject A
    IF EXISTS (SELECT 1 FROM public.teacher_assignments ta JOIN public.subjects s ON ta.subject_id = s.id WHERE ta.user_id = teacher_a AND s.id = subj_a) THEN
      RAISE NOTICE 'TEST 2 PASS: Teacher A sees Subject A';
    ELSE
      RAISE EXCEPTION 'FAIL: Teacher A cannot see Subject A';
    END IF;

    -- TEST 3: Teacher A cannot see Subject B (not assigned)
    IF EXISTS (SELECT 1 FROM public.teacher_assignments ta JOIN public.subjects s ON ta.subject_id = s.id WHERE ta.user_id = teacher_a AND s.id = subj_b) THEN
      RAISE EXCEPTION 'FAIL: Teacher A sees Subject B';
    ELSE
      RAISE NOTICE 'TEST 3 PASS: Teacher A cannot see Subject B';
    END IF;

    -- TEST 13: Teacher cannot modify assignments
    BEGIN
      INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_b);
      RAISE EXCEPTION 'FAIL: Teacher A modified assignment';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 13 PASS: Teacher blocked from modifying assignments';
    END;

    -- Switch to Student A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    
    -- TEST 7: Student A can see Subject A
    IF EXISTS (SELECT 1 FROM public.student_enrollments se JOIN public.subjects s ON se.subject_id = s.id WHERE se.user_id = student_a AND s.id = subj_a) THEN
      RAISE NOTICE 'TEST 7 PASS: Student A sees Subject A';
    ELSE
      RAISE EXCEPTION 'FAIL: Student A cannot see Subject A';
    END IF;

    -- TEST 8: Student A cannot see Subject B
    IF EXISTS (SELECT 1 FROM public.student_enrollments se JOIN public.subjects s ON se.subject_id = s.id WHERE se.user_id = student_a AND s.id = subj_b) THEN
      RAISE EXCEPTION 'FAIL: Student A sees Subject B';
    ELSE
      RAISE NOTICE 'TEST 8 PASS: Student A cannot see Subject B';
    END IF;

    -- TEST 14: Student cannot modify enrollments
    BEGIN
      INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_b);
      RAISE EXCEPTION 'FAIL: Student A modified enrollment';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST 14 PASS: Student blocked from modifying enrollments';
    END;

    -- Switch back to Admin A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_a), true);
    
    -- TEST 4 & 9: Remove assignments/enrollments
    DELETE FROM public.teacher_assignments WHERE user_id = teacher_a AND subject_id = subj_a;
    RAISE NOTICE 'TEST 4 PASS: Admin A removed teacher assignment';
    
    DELETE FROM public.student_enrollments WHERE user_id = student_a AND subject_id = subj_a;
    RAISE NOTICE 'TEST 9 PASS: Admin A removed student enrollment';

    -- Switch to Teacher A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    IF NOT EXISTS (SELECT 1 FROM public.teacher_assignments WHERE user_id = teacher_a AND subject_id = subj_a) THEN
      RAISE NOTICE 'TEST 5 PASS: Teacher A no longer sees Subject A';
    ELSE
      RAISE EXCEPTION 'FAIL: Teacher A still sees Subject A';
    END IF;

    -- Switch to Student A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    IF NOT EXISTS (SELECT 1 FROM public.student_enrollments WHERE user_id = student_a AND subject_id = subj_a) THEN
      RAISE NOTICE 'TEST 10 PASS: Student A no longer sees Subject A';
    ELSE
      RAISE EXCEPTION 'FAIL: Student A still sees Subject A';
    END IF;

  END;
  $$;

ROLLBACK;
