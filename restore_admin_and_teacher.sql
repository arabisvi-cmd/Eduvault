-- ==============================================================================
-- EduVault: Restore Admin Role, Remove Test Assignment, and Provision Real Teacher
-- ==============================================================================

-- 1. Restore Admin Profile Role to 'ADMIN'
UPDATE public.users 
SET role = 'ADMIN', updated_at = timezone('utc'::text, now())
WHERE id = 'f7cd40ff-dbf2-425c-aefb-6a81a47ce395';

-- 2. Remove the Accidental QA Teacher Assignment created for Admin on 'physics'
DELETE FROM public.teacher_assignments 
WHERE user_id = 'f7cd40ff-dbf2-425c-aefb-6a81a47ce395' 
  AND subject_id = '915a5b36-c635-4e44-ac20-4a0768842a88';

-- 3. Provision the Real Teacher Profile in public.users
-- Auth User UUID: 1a8da864-665a-4d0c-a206-5c3309624e1e
-- Email: ramanabhaskar99@gmail.com
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  '1a8da864-665a-4d0c-a206-5c3309624e1e',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ramanabhaskar99@gmail.com',
  'Aravind',
  'TEACHER'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'TEACHER',
  institution_id = EXCLUDED.institution_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = timezone('utc'::text, now());

-- ==============================================================================
-- 4. Verification Queries
-- ==============================================================================
-- SELECT id, email, full_name, role, institution_id FROM public.users;
-- SELECT * FROM public.teacher_assignments;
