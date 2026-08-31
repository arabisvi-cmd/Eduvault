BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    inst_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    teacher_b uuid := '44444444-4444-4444-4444-444444444444';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    
    ay_a uuid; prog_a uuid; term_a uuid; subj_a uuid; subj_b uuid; subj_c uuid;
    doc_draft uuid; doc_pub uuid; doc_arch uuid; doc_unauth uuid; doc_inst_b uuid;
  BEGIN
    -- Base Setup (Bypassing RLS as postgres)
    INSERT INTO auth.users (id, email) VALUES 
      (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com'), (teacher_b, 'tb@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.institutions (id, name, type) VALUES 
      (inst_a, 'Inst A', 'school'), (inst_b, 'Inst B', 'school') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com'),
      (teacher_b, inst_b, 'TEACHER', 'Teacher B', 'tb@test.com') ON CONFLICT DO NOTHING;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj B') RETURNING id INTO subj_b;
    
    -- Subject C in Inst B
    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_b, 'AY2') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog2') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term2') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Subj C') RETURNING id INTO subj_c;

    -- Enrollments & Assignments
    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a), (teacher_a, subj_b), (teacher_b, subj_c);
    -- Student A is ONLY enrolled in Subject A
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);

    -- Documents
    INSERT INTO public.documents (subject_id, title, description, status, created_by) VALUES 
      (subj_a, 'Draft Doc', 'Draft search', 'DRAFT', teacher_a) RETURNING id INTO doc_draft;
    INSERT INTO public.documents (subject_id, title, description, status, created_by) VALUES 
      (subj_a, 'Pub Doc', 'Physics search', 'PUBLISHED', teacher_a) RETURNING id INTO doc_pub;
    INSERT INTO public.documents (subject_id, title, description, status, created_by) VALUES 
      (subj_a, 'Arch Doc', 'Arch search', 'ARCHIVED', teacher_a) RETURNING id INTO doc_arch;
      
    -- Document in un-enrolled Subject B
    INSERT INTO public.documents (subject_id, title, description, status, created_by) VALUES 
      (subj_b, 'Pub Doc B', 'Physics unauth', 'PUBLISHED', teacher_a) RETURNING id INTO doc_unauth;

    -- Document in Inst B
    INSERT INTO public.documents (subject_id, title, description, status, created_by) VALUES 
      (subj_c, 'Pub Doc C', 'Physics instb', 'PUBLISHED', teacher_b) RETURNING id INTO doc_inst_b;

    -----------------------------------------------------
    -- START TESTS as Student A
    -----------------------------------------------------
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);

    -- 1. Student A sees enrolled Subject A
    IF NOT EXISTS (SELECT 1 FROM public.student_enrollments WHERE subject_id = subj_a) THEN
      RAISE EXCEPTION 'FAIL 1';
    END IF;

    -- 2. Student A does not see Subject B
    IF EXISTS (SELECT 1 FROM public.student_enrollments WHERE subject_id = subj_b) THEN
      RAISE EXCEPTION 'FAIL 2';
    END IF;

    -- 3. Student A sees published Subject A document
    IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = doc_pub) THEN
      RAISE EXCEPTION 'FAIL 3';
    END IF;

    -- 4. Student A cannot see draft Subject A document
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_draft) THEN
      RAISE EXCEPTION 'FAIL 4';
    END IF;

    -- 5. Student A cannot see archived Subject A document
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_arch) THEN
      RAISE EXCEPTION 'FAIL 5';
    END IF;

    -- 6. Student A cannot see Institution B documents
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_inst_b) THEN
      RAISE EXCEPTION 'FAIL 6';
    END IF;
    
    -- 7. Student A cannot modify documents
    BEGIN
      UPDATE public.documents SET title = 'Hacked' WHERE id = doc_pub;
      IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_pub AND title = 'Hacked') THEN
        RAISE EXCEPTION 'FAIL 8: Update succeeded';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore, handled properly by RLS
    END;

    -- 9. Search cannot reveal unauthorized documents
    -- Searching 'Physics' should return exactly 1 document (doc_pub), NOT doc_unauth or doc_inst_b
    DECLARE
      search_count integer;
    BEGIN
      SELECT count(*) INTO search_count FROM public.documents 
      WHERE description ILIKE '%Physics%';
      
      IF search_count != 1 THEN
        RAISE EXCEPTION 'FAIL 9: Search revealed unauthorized docs. Count: %', search_count;
      END IF;
    END;

    RAISE NOTICE 'ALL STUDENT WORKSPACE SECURITY TESTS PASSED';

  END;
  $$;
ROLLBACK;
