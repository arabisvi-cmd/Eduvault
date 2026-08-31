-- ==============================================================================
-- STEP 2: Bootstrap the two known auth users
-- Replace the UUIDs below with the ACTUAL auth.users UUIDs from:
-- Supabase Dashboard > Authentication > Users
-- ==============================================================================

-- First create the institution
INSERT INTO public.institutions (id, name, type)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- institution UUID (you can keep this or let it auto-generate)
  'EduVault Institution',
  'school'
);

-- Then create the ADMIN user (kprithviraju007@gmail.com)
-- Replace <ADMIN_AUTH_UUID> with the UUID from auth.users for kprithviraju007@gmail.com
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  'f7cd40ff-dbf2-425c-aefb-6a81a47ce395',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'kprithviraju007@gmail.com',
  'Prithvi Raju',
  'ADMIN'
);

-- Then create the TEACHER user (ramanabhaskar99@gmail.com)
-- Replace <TEACHER_AUTH_UUID> with the UUID from auth.users for ramanabhaskar99@gmail.com
INSERT INTO public.users (id, institution_id, email, full_name, role)
VALUES (
  '1a8da864-665a-4d0c-a206-5c3309624e1e',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ramanabhaskar99@gmail.com',
  'Aravind',
  'TEACHER'
);

-- ==============================================================================
-- VERIFICATION: Run these after the above to confirm deployment
-- ==============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM public.institutions;
-- SELECT * FROM public.users;
