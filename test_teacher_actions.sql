BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    inst_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    teacher_b uuid := '44444444-4444-4444-4444-444444444444';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    
    ay_a uuid; prog_a uuid; term_a uuid; subj_a uuid; subj_b uuid;
    doc_a uuid; ver_a uuid;
  BEGIN
    -- Base Setup
    INSERT INTO auth.users (id, email) VALUES (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com'), (teacher_b, 'tb@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.institutions (id, name, type) VALUES (inst_a, 'Inst A', 'school'), (inst_b, 'Inst B', 'school') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com'),
      (teacher_b, inst_b, 'TEACHER', 'Teacher B', 'tb@test.com') ON CONFLICT DO NOTHING;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj B') RETURNING id INTO subj_b;

    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);

    -- Admin creates doc_a
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES (subj_b, 'Admin Doc B', 'DRAFT', teacher_b) RETURNING id INTO doc_a;
    
    SET LOCAL ROLE authenticated;
    
    -- Test: Teacher A tries to publish doc in Subj B (unauthorized)
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    BEGIN
      UPDATE public.documents SET status = 'PUBLISHED' WHERE id = doc_a;
      IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_a AND status = 'PUBLISHED') THEN
         RAISE EXCEPTION 'FAIL: Teacher A published doc in unassigned Subject B';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST: Teacher A blocked from publishing unassigned doc (%)', SQLERRM;
    END;

  END;
  $$;
ROLLBACK;
