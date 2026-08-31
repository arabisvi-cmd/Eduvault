BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    
    ay_a uuid; prog_a uuid; term_a uuid; subj_a uuid;
    doc_a uuid;
    audit_count integer;
  BEGIN
    -- Base Setup
    INSERT INTO auth.users (id, email) VALUES (teacher_a, 'ta@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.institutions (id, name, type) VALUES (inst_a, 'Inst A', 'school') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com') ON CONFLICT DO NOTHING;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj A') RETURNING id INTO subj_a;

    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
    
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);

    -- Teacher A creates doc
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES (subj_a, 'Doc 1', 'DRAFT', teacher_a) RETURNING id INTO doc_a;
    
    -- Teacher A publishes doc
    UPDATE public.documents SET status = 'PUBLISHED' WHERE id = doc_a;

    -- Teacher A archives doc
    UPDATE public.documents SET status = 'ARCHIVED' WHERE id = doc_a;

    -- Teacher A deletes doc
    DELETE FROM public.documents WHERE id = doc_a;
    
    -- Switch to postgres (bypass RLS) to count audit logs
    RESET ROLE;
    
    SELECT COUNT(*) INTO audit_count FROM public.audit_logs WHERE entity_id = doc_a;
    IF audit_count = 4 THEN
      RAISE NOTICE 'TEST PASS: Audit logs recorded all 4 actions (INSERT, 2x UPDATE, DELETE)';
    ELSE
      RAISE EXCEPTION 'TEST FAIL: Expected 4 audit logs, got %', audit_count;
    END IF;

  END;
  $$;
ROLLBACK;
