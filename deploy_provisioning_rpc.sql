-- ==============================================================================
-- EduVault Phase 4A.5: Secure Staff & Student Provisioning RPC
-- ==============================================================================
-- This function serves as the database-level secure server-side boundary
-- for institutional user provisioning. It can be invoked directly by authenticated
-- Administrators via supabase.rpc('provision_institution_user', ...).

CREATE OR REPLACE FUNCTION public.provision_institution_user(
  p_email text,
  p_full_name text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_institution_id uuid;
  v_existing_public_user record;
  v_existing_auth_user record;
  v_new_user_id uuid;
  v_clean_email text;
  v_clean_full_name text;
  v_target_role text;
  v_method text := 'created';
BEGIN
  -- 1. Check authenticated caller
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Session required' USING ERRCODE = '40100';
  END IF;

  -- 2. Verify caller is ADMIN and resolve their institution_id
  SELECT role, institution_id INTO v_caller_role, v_caller_institution_id
  FROM public.users
  WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Forbidden: Only institutional Administrators can provision users' USING ERRCODE = '40300';
  END IF;

  IF v_caller_institution_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: Administrator does not belong to a valid institution' USING ERRCODE = '40301';
  END IF;

  -- 3. Validate Inputs
  v_clean_email := lower(trim(p_email));
  v_clean_full_name := trim(p_full_name);
  v_target_role := upper(trim(p_role));

  IF v_clean_email IS NULL OR v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Please provide a valid email address' USING ERRCODE = '40001';
  END IF;

  IF length(v_clean_full_name) < 2 THEN
    RAISE EXCEPTION 'Please provide a full name (minimum 2 characters)' USING ERRCODE = '40002';
  END IF;

  -- Role integrity: Strictly TEACHER or STUDENT. Rejects ADMIN, OWNER, SUPERADMIN, etc.
  IF v_target_role NOT IN ('TEACHER', 'STUDENT') THEN
    RAISE EXCEPTION 'Role must be either TEACHER or STUDENT' USING ERRCODE = '40003';
  END IF;

  -- 4. Check if user already exists in public.users
  SELECT id, email, institution_id, role, full_name INTO v_existing_public_user
  FROM public.users
  WHERE lower(email) = v_clean_email;

  IF FOUND THEN
    IF v_existing_public_user.institution_id = v_caller_institution_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'DUPLICATE_SAME_INSTITUTION',
        'error', 'This user already belongs to your institution.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'code', 'CONFLICT_OTHER_INSTITUTION',
        'error', 'A user with this email belongs to another institution. Cross-institutional transfer requires explicit administrative authorization.'
      );
    END IF;
  END IF;

  -- 5. Check if Auth user already exists in auth.users (Orphan recovery)
  SELECT id INTO v_existing_auth_user
  FROM auth.users
  WHERE lower(email) = v_clean_email;

  IF FOUND THEN
    v_new_user_id := v_existing_auth_user.id;
    v_method := 'reconciled';
  ELSE
    -- Generate new user in auth.users safely
    v_new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_new_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', v_clean_full_name, 'role', v_target_role, 'institution_id', v_caller_institution_id),
      now(),
      now()
    );
    v_method := 'created';
  END IF;

  -- 6. Insert profile into public.users (auth.users.id = public.users.id)
  INSERT INTO public.users (id, institution_id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_new_user_id,
    v_caller_institution_id,
    v_clean_email,
    v_clean_full_name,
    v_target_role,
    now(),
    now()
  );

  -- 7. Record immutable audit log
  INSERT INTO public.audit_logs (
    institution_id,
    user_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  VALUES (
    v_caller_institution_id,
    v_caller_id,
    'USER_PROVISIONED',
    'users',
    v_new_user_id,
    jsonb_build_object(
      'role', v_target_role,
      'email', v_clean_email,
      'full_name', v_clean_full_name,
      'method', v_method,
      'timestamp', now()
    )
  );

  -- 8. Return safe result
  RETURN jsonb_build_object(
    'success', true,
    'method', v_method,
    'message', CASE 
      WHEN v_method = 'reconciled' THEN 'Existing account reconciled and enrolled as ' || v_target_role || '.'
      ELSE (CASE WHEN v_target_role = 'TEACHER' THEN 'Teacher' ELSE 'Student' END) || ' account provisioned successfully.'
    END,
    'user', jsonb_build_object(
      'id', v_new_user_id,
      'email', v_clean_email,
      'full_name', v_clean_full_name,
      'role', v_target_role,
      'institution_id', v_caller_institution_id
    )
  );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.provision_institution_user(text, text, text) TO authenticated;
