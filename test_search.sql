BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    inst_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    admin_a uuid := '11111111-1111-1111-1111-111111111111';
    teacher_a uuid := '22222222-2222-2222-2222-222222222222';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
    
    ay_a uuid; prog_a uuid; term_a uuid; subj_a uuid; subj_b uuid;
    ay_b uuid; prog_b uuid; term_b uuid; subj_inst_b uuid;
    doc_subj_a_pub uuid; doc_subj_a_draft uuid; doc_subj_b_pub uuid; doc_inst_b_pub uuid;
    not_inst_a uuid; not_subj_a uuid; not_subj_b uuid; not_inst_b uuid;
    c integer;
  BEGIN
    -- Setup Data
    INSERT INTO auth.users (id, email) VALUES 
      (admin_a, 'aa@test.com'), (teacher_a, 'ta@test.com'), (student_a, 'sa@test.com') 
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.institutions (id, name, type) VALUES 
      (inst_a, 'Inst A', 'school'), (inst_b, 'Inst B', 'school') 
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.users (id, institution_id, role, full_name, email) VALUES 
      (admin_a, inst_a, 'ADMIN', 'Admin A', 'aa@test.com'),
      (teacher_a, inst_a, 'TEACHER', 'Teacher A', 'ta@test.com'),
      (student_a, inst_a, 'STUDENT', 'Student A', 'sa@test.com')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'AY') RETURNING id INTO ay_a;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_a, 'Prog') RETURNING id INTO prog_a;
    INSERT INTO public.terms (program_id, name) VALUES (prog_a, 'Term') RETURNING id INTO term_a;
    INSERT INTO public.subjects (term_id, name, code) VALUES (term_a, 'Subj A', 'CODE-A') RETURNING id INTO subj_a;
    INSERT INTO public.subjects (term_id, name, code) VALUES (term_a, 'Subj B', 'CODE-B') RETURNING id INTO subj_b;

    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_b, 'AY-B') RETURNING id INTO ay_b;
    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_b, 'Prog-B') RETURNING id INTO prog_b;
    INSERT INTO public.terms (program_id, name) VALUES (prog_b, 'Term-B') RETURNING id INTO term_b;
    INSERT INTO public.subjects (term_id, name, code) VALUES (term_b, 'Subj Inst B', 'CODE-IB') RETURNING id INTO subj_inst_b;

    INSERT INTO public.teacher_assignments (user_id, subject_id) VALUES (teacher_a, subj_a);
    INSERT INTO public.student_enrollments (user_id, subject_id) VALUES (student_a, subj_a);

    -- Documents
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES 
      (subj_a, 'SEARCH_DOC_A_PUB', 'PUBLISHED', teacher_a) RETURNING id INTO doc_subj_a_pub;
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES 
      (subj_a, 'SEARCH_DOC_A_DRAFT', 'DRAFT', teacher_a) RETURNING id INTO doc_subj_a_draft;
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES 
      (subj_b, 'SEARCH_DOC_B_PUB', 'PUBLISHED', teacher_a) RETURNING id INTO doc_subj_b_pub;
    INSERT INTO public.documents (subject_id, title, status, created_by) VALUES 
      (subj_inst_b, 'SEARCH_DOC_IB_PUB', 'PUBLISHED', admin_a) RETURNING id INTO doc_inst_b_pub;

    -- Notices
    INSERT INTO public.notices (institution_id, title, content, created_by) VALUES 
      (inst_a, 'SEARCH_NOT_IA', 'IA', admin_a) RETURNING id INTO not_inst_a;
    INSERT INTO public.notices (institution_id, subject_id, title, content, created_by) VALUES 
      (inst_a, subj_a, 'SEARCH_NOT_SA', 'SA', admin_a) RETURNING id INTO not_subj_a;
    INSERT INTO public.notices (institution_id, subject_id, title, content, created_by) VALUES 
      (inst_a, subj_b, 'SEARCH_NOT_SB', 'SB', admin_a) RETURNING id INTO not_subj_b;
    INSERT INTO public.notices (institution_id, title, content, created_by) VALUES 
      (inst_b, 'SEARCH_NOT_IB', 'IB', admin_a) RETURNING id INTO not_inst_b;

    -----------------------------------------------------
    -- START TESTS
    -----------------------------------------------------
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);

    -- 1. Student A searches for a Subject A document
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_A_PUB%';
    IF c != 1 THEN RAISE EXCEPTION 'FAIL 1'; END IF;

    -- 2. Student A searches for a Subject B document -> no unauthorized result
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_B_PUB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 2'; END IF;

    -- 3. Student A searches for a draft document -> no result
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_A_DRAFT%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 3'; END IF;

    -- 4. Student A searches for Institution B content -> no result
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_IB_PUB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 4'; END IF;

    -- 5. Student A searches for Subject A -> PASS
    SELECT count(*) INTO c FROM public.subjects WHERE name ilike '%Subj A%';
    IF c != 1 THEN RAISE EXCEPTION 'FAIL 5'; END IF;

    -- 6. Student A searches for Subject B -> no unauthorized result
    SELECT count(*) INTO c FROM public.subjects WHERE name ilike '%Subj B%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 6'; END IF;

    -- 7. Student A searches for an authorized notice (Inst A)
    SELECT count(*) INTO c FROM public.notices WHERE title ilike '%SEARCH_NOT_IA%';
    IF c != 1 THEN RAISE EXCEPTION 'FAIL 7A'; END IF;
    -- Student A searches for an authorized notice (Subj A)
    SELECT count(*) INTO c FROM public.notices WHERE title ilike '%SEARCH_NOT_SA%';
    IF c != 1 THEN RAISE EXCEPTION 'FAIL 7B'; END IF;

    -- 8. Student A searches for unauthorized notice (Subj B or Inst B)
    SELECT count(*) INTO c FROM public.notices WHERE title ilike '%SEARCH_NOT_SB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 8A'; END IF;
    SELECT count(*) INTO c FROM public.notices WHERE title ilike '%SEARCH_NOT_IB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 8B'; END IF;

    -- 9. Teacher A cannot search/access unauthorized Subject B content
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_a), true);
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_B_PUB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 9'; END IF;

    -- 10. Admin A cannot search Institution B content
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_a), true);
    SELECT count(*) INTO c FROM public.documents WHERE title ilike '%SEARCH_DOC_IB_PUB%';
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 10'; END IF;

    -- 11. Changing result IDs cannot bypass destination RLS
    -- Attempting direct row access for an unauthorized row
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    SELECT count(*) INTO c FROM public.documents WHERE id = doc_subj_b_pub;
    IF c != 0 THEN RAISE EXCEPTION 'FAIL 11'; END IF;

    RAISE NOTICE 'ALL GLOBAL SEARCH RLS TESTS PASSED';
  END;
  $$;
ROLLBACK;
