-- ==============================================================================
-- EduVault: Fix Legacy Trigger on auth.users
-- ==============================================================================
-- The legacy prototype schema installed a trigger 'on_auth_user_created' on auth.users
-- that calls 'public.handle_new_user()', which attempts to insert into 'public.profiles'.
-- Because 'public.profiles' was replaced by 'public.users' in Phase 1, any new user
-- creation in auth.users fails with "Database error creating new user".
--
-- Running this script removes that broken legacy trigger and allows Supabase Auth
-- to create/invite institutional users cleanly.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify trigger is removed
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';
