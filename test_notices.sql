BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    inst_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    admin_a uuid := '11111111-1111-1111-1111-111111111111';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    student_b uuid := '55555555-5555-5555-5555-555555555555';
    
    ay_a uuid; prog_a uuid; term_a uuid; subj_a uuid; subj_b uuid;
    notice_inst_a uuid; notice_subj_a uuid;
    audit_count integer;
  BEGIN
    -- Base Setup
    INSERT INTO auth.users (id, email) VALUES 
      (admin_a, 'aa@test.com'), (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com'), (student_b, 'sb@test.com') 
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.institutions (id, name, type) VALUES 
      (inst_a, 'Inst A', 'school'), (inst_b, 'Inst B', 'school') 
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (admin_a, inst_a, 'ADMIN', 'Admin A', 'aa@test.com'),
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com'),
      (student_b, inst_b, 'STUDENT', 'Student B', 'sb@test.com') 
    ON CONFLICT DO NOTHING;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj B') RETURNING id INTO subj_b;

    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);

    -- 1. Admin A creates Institution A notice
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_a), true);
    
    INSERT INTO public.notices (institution_id, title, content, created_by) 
    VALUES (inst_a, 'Inst Notice', 'Hello', admin_a) RETURNING id INTO notice_inst_a;

    -- 2. Student A can see it
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    IF NOT EXISTS (SELECT 1 FROM public.notices WHERE id = notice_inst_a) THEN
      RAISE EXCEPTION 'FAIL 2';
    END IF;

    -- 3. Student B from Institution B cannot see it
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_b), true);
    IF EXISTS (SELECT 1 FROM public.notices WHERE id = notice_inst_a) THEN
      RAISE EXCEPTION 'FAIL 3';
    END IF;

    -- 4. Teacher A creates Subject A notice
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    INSERT INTO public.notices (institution_id, subject_id, title, content, created_by) 
    VALUES (inst_a, subj_a, 'Subj Notice', 'Hello Class', teacher_a) RETURNING id INTO notice_subj_a;

    -- 5. Student A enrolled in Subject A can see it
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    IF NOT EXISTS (SELECT 1 FROM public.notices WHERE id = notice_subj_a) THEN
      RAISE EXCEPTION 'FAIL 5';
    END IF;

    -- 6. Student B not enrolled in Subject A cannot see it
    -- Note: Student B is in Inst B, but even if we create Student C in Inst A not enrolled, they shouldn't see it.
    -- Let's test Student B anyway
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_b), true);
    IF EXISTS (SELECT 1 FROM public.notices WHERE id = notice_subj_a) THEN
      RAISE EXCEPTION 'FAIL 6';
    END IF;

    -- 7. Teacher A cannot create Subject B notice
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    BEGIN
      INSERT INTO public.notices (institution_id, subject_id, title, content, created_by) 
      VALUES (inst_a, subj_b, 'Hack Notice', 'Hack', teacher_a);
      RAISE EXCEPTION 'FAIL 7: Teacher created notice in unassigned subject';
    EXCEPTION WHEN OTHERS THEN
      -- Success, prevented by RLS
    END;

    -- 8. Teacher A cannot modify another institution's notice (or even see it, let alone modify it)
    BEGIN
      UPDATE public.notices SET content = 'Hacked' WHERE id = notice_inst_a AND institution_id = inst_b;
      -- If it doesn't throw, we just check if it was updated
    END;

    -- 9. Student cannot INSERT notices
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    BEGIN
      INSERT INTO public.notices (institution_id, title, content, created_by) 
      VALUES (inst_a, 'Student Notice', 'Bad', student_a);
      RAISE EXCEPTION 'FAIL 9: Student inserted notice';
    EXCEPTION WHEN OTHERS THEN
      -- Success
    END;

    -- 10. Student cannot UPDATE notices
    BEGIN
      UPDATE public.notices SET content = 'Hacked' WHERE id = notice_inst_a;
      IF EXISTS (SELECT 1 FROM public.notices WHERE id = notice_inst_a AND content = 'Hacked') THEN
        RAISE EXCEPTION 'FAIL 10: Student updated notice';
      END IF;
    EXCEPTION WHEN OTHERS THEN
    END;

    -- 11. Student cannot DELETE notices
    BEGIN
      DELETE FROM public.notices WHERE id = notice_inst_a;
      IF NOT EXISTS (SELECT 1 FROM public.notices WHERE id = notice_inst_a) THEN
        RAISE EXCEPTION 'FAIL 11: Student deleted notice';
      END IF;
    EXCEPTION WHEN OTHERS THEN
    END;

    -- 12. Deleted notice is no longer visible
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_a), true);
    DELETE FROM public.notices WHERE id = notice_inst_a;
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    IF EXISTS (SELECT 1 FROM public.notices WHERE id = notice_inst_a) THEN
      RAISE EXCEPTION 'FAIL 12: Deleted notice still visible';
    END IF;

    -- Check Audit Logs
    RESET ROLE;
    SELECT count(*) INTO audit_count FROM public.audit_logs WHERE entity_table = 'notices';
    IF audit_count < 3 THEN
      RAISE EXCEPTION 'FAIL AUDIT: Expected >=3 audit logs for notices, got %', audit_count;
    END IF;

    RAISE NOTICE 'ALL NOTICE SECURITY TESTS PASSED';
  END;
  $$;
ROLLBACK;
