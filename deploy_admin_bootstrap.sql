-- ==============================================================================
-- ADMIN BOOTSTRAP ONLY
-- ==============================================================================

-- First create the institution safely
INSERT INTO public.institutions (id, name, type)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'EduVault Institution',
  'school'
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type;

-- Then create the ADMIN user safely
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  'f7cd40ff-dbf2-425c-aefb-6a81a47ce395',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'kprithviraju007@gmail.com',
  'Prithvi Raju',
  'ADMIN'
)
ON CONFLICT (id) DO UPDATE SET
  institution_id = EXCLUDED.institution_id,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
