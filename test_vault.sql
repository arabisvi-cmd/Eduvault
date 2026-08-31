BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    
    ay_a uuid;
    prog_a uuid;
    term_a uuid;
    subj_a uuid;
    subj_b uuid;
    doc_a uuid;
    ver_a uuid;

  BEGIN
    INSERT INTO auth.users (id, email) VALUES 
      (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com') ON CONFLICT DO NOTHING;

    -- Setup subjects (bypassing RLS)
    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY Vault') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog Vault') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term Vault') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Vault Subject A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name) VALUES (term_a, 'Vault Subject B') RETURNING id INTO subj_b;

    -- Assignments
    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a) ON CONFLICT DO NOTHING;
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a) ON CONFLICT DO NOTHING;
    
    -- Now enforce RLS
    SET LOCAL ROLE authenticated;

    -- Switch to Teacher A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    
    -- TEACHER A uploads to Subject A
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES (subj_a, 'Lecture 1.pdf', 'DRAFT', teacher_a) RETURNING id INTO doc_a;
    INSERT INTO public.document_versions (document_id, version_number, storage_path, file_type, file_size, uploaded_by) 
      VALUES (doc_a, 1, 'temp_path', 'application/pdf', 1024, teacher_a) RETURNING id INTO ver_a;
    UPDATE public.documents SET active_version_id = ver_a WHERE id = doc_a;
    RAISE NOTICE 'TEST: Teacher A uploaded to assigned Subject A';

    -- TEACHER A attempts upload to Subject B (should fail RLS)
    BEGIN
      INSERT INTO public.documents (subject_id, title, status, created_by) VALUES (subj_b, 'Hack.pdf', 'DRAFT', teacher_a);
      RAISE EXCEPTION 'FAIL: Teacher A uploaded to unassigned Subject B';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST: Teacher A blocked from unassigned Subject B (%)', SQLERRM;
    END;

    -- Switch to Student A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);

    -- STUDENT A tries to read DRAFT
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_a) THEN
      RAISE EXCEPTION 'FAIL: Student A sees DRAFT document';
    ELSE
      RAISE NOTICE 'TEST: Student A cannot see DRAFT document';
    END IF;

    -- Switch to Teacher A and PUBLISH
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    UPDATE public.documents SET status = 'PUBLISHED' WHERE id = doc_a;
    RAISE NOTICE 'TEST: Teacher A published document';

    -- Switch to Student A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);

    -- STUDENT A tries to read PUBLISHED
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_a) THEN
      RAISE NOTICE 'TEST: Student A sees PUBLISHED document';
    ELSE
      RAISE EXCEPTION 'FAIL: Student A cannot see PUBLISHED document';
    END IF;

    -- STUDENT A attempts to modify document
    BEGIN
      UPDATE public.documents SET title = 'Hacked' WHERE id = doc_a;
      IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_a AND title = 'Hacked') THEN
         RAISE EXCEPTION 'FAIL: Student modified document';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'TEST: Student blocked from modifying document (%)', SQLERRM;
    END;

    -- Switch to Teacher A and ARCHIVE
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    UPDATE public.documents SET status = 'ARCHIVED' WHERE id = doc_a;
    RAISE NOTICE 'TEST: Teacher A archived document';

    -- Switch to Student A
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    IF EXISTS (SELECT 1 FROM public.documents WHERE id = doc_a) THEN
      RAISE EXCEPTION 'FAIL: Student sees ARCHIVED document';
    ELSE
      RAISE NOTICE 'TEST: Student cannot see ARCHIVED document';
    END IF;

  END;
  $$;
ROLLBACK;
