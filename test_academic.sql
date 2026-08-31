-- Create a fake teacher and institution A
BEGIN;
  DO $$
  DECLARE
    inst_c uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    admin_id uuid := 'dc0dc6ba-7610-48a1-aed6-e3f63aabb572'; -- real_admin
    teacher_id uuid := '22222222-2222-2222-2222-222222222222';
    ay_c uuid;
    prog_c uuid;
  BEGIN
    -- Create fake teacher
    INSERT INTO auth.users (id, email) VALUES (teacher_id, 'teacher@test.com') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, institution_id, role, full_name, email) 
    VALUES (teacher_id, inst_c, 'TEACHER', 'Teacher', 'teacher@test.com') ON CONFLICT DO NOTHING;

    -- Test Admin creating for own institution
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', admin_id), true);
    
    INSERT INTO public.academic_years (institution_id, name) VALUES (inst_c, '2026-Admin-Test') RETURNING id INTO ay_c;
    RAISE NOTICE 'Admin created academic year %', ay_c;

    INSERT INTO public.programs (academic_year_id, name) VALUES (ay_c, 'Test Program');
    RAISE NOTICE 'Admin created program';

    -- Test Admin trying to create for another institution (inst_a)
    BEGIN
      INSERT INTO public.academic_years (institution_id, name) VALUES (inst_a, 'Hacked Year');
      RAISE EXCEPTION 'FAIL: Admin was able to create year for institution A';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'PASS: Admin blocked from creating year for institution A (%)', SQLERRM;
    END;

    -- Test Teacher trying to create for own institution
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', teacher_id), true);
    BEGIN
      INSERT INTO public.academic_years (institution_id, name) VALUES (inst_c, 'Teacher Year');
      RAISE EXCEPTION 'FAIL: Teacher was able to create year';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'PASS: Teacher blocked from creating year (%)', SQLERRM;
    END;
  END;
  $$;
ROLLBACK;
