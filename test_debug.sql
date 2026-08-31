BEGIN;
  DO $$
  DECLARE
    inst_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    student_a uuid := '33333333-3333-3333-3333-333333333333';
  BEGIN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', student_a), true);
    RAISE NOTICE 'Role is: %', public.get_my_role();
    
    IF EXISTS(SELECT 1 FROM public.documents WHERE status = 'DRAFT') THEN
       RAISE NOTICE 'I CAN SEE DRAFTS!';
    END IF;
  END;
  $$;
ROLLBACK;
