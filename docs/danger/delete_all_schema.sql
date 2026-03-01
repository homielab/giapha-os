-- ==========================================
-- 🚨 DANGER ZONE: DROP GIAPHA-OS DATABASE SCHEMA 🚨
-- ==========================================
-- WARNING: DO NOT RUN THIS SCRIPT UNLESS YOU KNOW EXACTLY WHAT YOU ARE DOING.
-- This script PERMANENTLY removes all tables, functions, triggers, and types created by schema.sql.
-- All data will be LOST irreversibly.
-- ==========================================

-- 1. DROP TRIGGERS ON EXTERNAL SCHEMAS (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users CASCADE;

-- 2. DROP TABLES 
-- Note: CASCADE will automatically drop associated triggers, indexes, and RLS policies attached to these tables
DROP TABLE IF EXISTS public.relationships CASCADE;
DROP TABLE IF EXISTS public.person_details_private CASCADE;
DROP TABLE IF EXISTS public.persons CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. DROP FUNCTIONS
-- Using CASCADE to ensure any remaining dependent objects are also dropped
DROP FUNCTION IF EXISTS public.set_user_active_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_first_user_confirmation() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- 4. DROP CUSTOM TYPES
DROP TYPE IF EXISTS public.admin_user_data CASCADE;

-- 5. DROP ENUMS
DROP TYPE IF EXISTS public.user_role_enum CASCADE;
DROP TYPE IF EXISTS public.relationship_type_enum CASCADE;
DROP TYPE IF EXISTS public.gender_enum CASCADE;

-- 6. RESET STORAGE (Optional)
-- This will remove the avatars bucket and its policies
-- DELETE FROM storage.objects WHERE bucket_id = 'avatars';
-- DELETE FROM storage.buckets WHERE id = 'avatars';
