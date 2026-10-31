-- ==========================================
-- GIAPHA-OS DATABASE SCHEMA
-- ==========================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ENUMS
-- Gender types for family members
DO $$ BEGIN
    CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Relationship types between family members
DO $$ BEGIN
    CREATE TYPE public.relationship_type_enum AS ENUM ('marriage', 'biological_child', 'adopted_child');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- System user roles
DO $$ BEGIN
    CREATE TYPE public.user_role_enum AS ENUM ('admin', 'editor', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================

-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- TABLES (Data Preservation: No DROP TABLE commands)
-- ==========================================

-- PROFILES (Application users linked to Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role public.user_role_enum DEFAULT 'member' NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ, -- Set while an admin has locked the account (not just waiting for approval)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One-time approval links sent to the administrator.
-- The raw token is never stored in the database.
CREATE TABLE IF NOT EXISTS public.user_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- PERSONS (Core entity for family tree)
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender public.gender_enum NOT NULL,
  
  -- Date components (allows for partial dates where only year is known)
  birth_year INT,
  birth_month INT,
  birth_day INT,
  death_year INT,
  death_month INT,
  death_day INT,
  death_lunar_year INT,
  death_lunar_month INT,
  death_lunar_day INT,
  
  is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_law BOOLEAN NOT NULL DEFAULT FALSE,
  birth_order INT,
  generation INT,
  other_names TEXT,
  avatar_url TEXT,
  note TEXT,
  burial_place TEXT, -- Nơi an táng (public, like the dates of death)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERSON_DETAILS_PRIVATE (Sensitive data with restricted RLS)
CREATE TABLE IF NOT EXISTS public.person_details_private (
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT,
  occupation TEXT,
  current_residence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIPS (Links between persons)
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.relationship_type_enum NOT NULL,
  person_a UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  person_b UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-relationships
  CONSTRAINT no_self_relationship CHECK (person_a != person_b),
  
  -- Ensure unique relationships between pairs for a specific type
  UNIQUE(person_a, person_b, type)
);

-- CUSTOM_EVENTS (User-created events)
CREATE TABLE IF NOT EXISTS public.custom_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  -- 'none' = once; yearly_solar / yearly_lunar = every year on the solar or
  -- lunar day and month of event_date.
  recurrence TEXT NOT NULL DEFAULT 'none'
    CONSTRAINT custom_events_recurrence_check
    CHECK (recurrence IN ('none', 'yearly_solar', 'yearly_lunar')),
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Relationship lookups
CREATE INDEX IF NOT EXISTS idx_relationships_person_a ON public.relationships(person_a);
CREATE INDEX IF NOT EXISTS idx_relationships_person_b ON public.relationships(person_b);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON public.relationships(type);

-- Person filtering and sorting
CREATE INDEX IF NOT EXISTS idx_persons_full_name ON public.persons(full_name);
CREATE INDEX IF NOT EXISTS idx_persons_generation ON public.persons(generation);
CREATE INDEX IF NOT EXISTS idx_persons_gender ON public.persons(gender);
CREATE INDEX IF NOT EXISTS idx_persons_is_deceased ON public.persons(is_deceased);
CREATE INDEX IF NOT EXISTS idx_persons_birth_year ON public.persons(birth_year);

-- Profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_approval_requests_expires_at
  ON public.user_approval_requests(expires_at);

-- Custom events lookups
CREATE INDEX IF NOT EXISTS idx_custom_events_date ON public.custom_events(event_date);
CREATE INDEX IF NOT EXISTS idx_custom_events_created_by ON public.custom_events(created_by);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_details_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Helper function to check if the current user has been approved.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- Helper function to check if user is editor
CREATE OR REPLACE FUNCTION PUBLIC.IS_EDITOR()
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'editor' AND is_active = true
  );
END;
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to authenticated;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- PERSONS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.persons;
DROP POLICY IF EXISTS "Active users can view persons" ON public.persons;
CREATE POLICY "Active users can view persons" ON public.persons FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "Admins can manage persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can delete persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins and Editors can delete persons" ON public.persons;

CREATE POLICY "Admins and Editors can insert persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can update persons" ON public.persons FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can delete persons" ON public.persons FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

-- PERSON_DETAILS_PRIVATE POLICIES
DROP POLICY IF EXISTS "Admins can view private details" ON public.person_details_private;
CREATE POLICY "Admins can view private details" ON public.person_details_private FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage private details" ON public.person_details_private;
CREATE POLICY "Admins can manage private details" ON public.person_details_private FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RELATIONSHIPS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.relationships;
DROP POLICY IF EXISTS "Active users can view relationships" ON public.relationships;
CREATE POLICY "Active users can view relationships" ON public.relationships FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins and Editors can delete relationships" ON public.relationships;

CREATE POLICY "Admins and Editors can insert relationships" ON public.relationships FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can update relationships" ON public.relationships FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());
CREATE POLICY "Admins and Editors can delete relationships" ON public.relationships FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

-- CUSTOM_EVENTS POLICIES
ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can view custom events" ON public.custom_events;
CREATE POLICY "Active users can view custom events" ON public.custom_events FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "Authenticated users can insert custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can insert custom events" ON public.custom_events;
CREATE POLICY "Active users can insert custom events" ON public.custom_events FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can update own custom events" ON public.custom_events;
CREATE POLICY "Active users can update own custom events" ON public.custom_events FOR UPDATE TO authenticated USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin())) WITH CHECK (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));

DROP POLICY IF EXISTS "Users can delete own custom events" ON public.custom_events;
DROP POLICY IF EXISTS "Active users can delete own custom events" ON public.custom_events;
CREATE POLICY "Active users can delete own custom events" ON public.custom_events FOR DELETE TO authenticated USING (public.is_active_user() AND (auth.uid() = created_by OR public.is_admin()));

-- ==========================================
-- TRIGGERS
-- ==========================================

-- 1. Updated At Triggers
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_persons_updated_at ON public.persons;
CREATE TRIGGER tr_persons_updated_at BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_person_details_private_updated_at ON public.person_details_private;
CREATE TRIGGER tr_person_details_private_updated_at BEFORE UPDATE ON public.person_details_private FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_relationships_updated_at ON public.relationships;
CREATE TRIGGER tr_relationships_updated_at BEFORE UPDATE ON public.relationships FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_custom_events_updated_at ON public.custom_events;
CREATE TRIGGER tr_custom_events_updated_at BEFORE UPDATE ON public.custom_events FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 2. Handle new user signup (Profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Serialize bootstrap so concurrent signups cannot create two administrators.
  PERFORM pg_advisory_xact_lock(hashtext('giapha_os_first_user'));
  SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id) INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    new.id, 
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    CASE WHEN is_first_user THEN true ELSE false END
  );

  RETURN new;
END;
$$;

-- 3. Auto-confirm first user (Email verification)
CREATE OR REPLACE FUNCTION public.handle_first_user_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = auth
AS $$
BEGIN
  -- Serialize bootstrap so concurrent signups cannot create two administrators.
  PERFORM pg_advisory_xact_lock(hashtext('giapha_os_first_user'));
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id) THEN
    NEW.email_confirmed_at := NOW();
    NEW.last_sign_in_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for auto-confirmation
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_first_user_confirmation();

-- ==========================================
-- STORAGE POLICIES
-- ==========================================

-- Initialize 'avatars' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', false, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Active users can view avatars" ON storage.objects;
CREATE POLICY "Active users can view avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND public.is_active_user());

DROP POLICY IF EXISTS "Users can upload avatars." ON storage.objects;
DROP POLICY IF EXISTS "Admins and editors can upload avatars" ON storage.objects;
CREATE POLICY "Admins and editors can upload avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (public.is_admin() OR public.is_editor()));

DROP POLICY IF EXISTS "Users can update avatars." ON storage.objects;
DROP POLICY IF EXISTS "Admins and editors can update avatars" ON storage.objects;
CREATE POLICY "Admins and editors can update avatars" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (public.is_admin() OR public.is_editor()))
  WITH CHECK (bucket_id = 'avatars' AND (public.is_admin() OR public.is_editor()));

DROP POLICY IF EXISTS "Users can delete avatars." ON storage.objects;
DROP POLICY IF EXISTS "Admins and editors can delete avatars" ON storage.objects;
CREATE POLICY "Admins and editors can delete avatars" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (public.is_admin() OR public.is_editor()));

-- ==========================================
-- ADMIN RPC FUNCTIONS
-- ==========================================

-- Custom type for get_admin_users
DROP TYPE IF EXISTS public.admin_user_data CASCADE;
CREATE TYPE public.admin_user_data AS (
    id uuid,
    email text,
    role public.user_role_enum,
    created_at timestamptz,
    is_active boolean
);

-- 1. Get List of Users for Admin
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF public.admin_user_data
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    RETURN QUERY
    SELECT au.id, au.email::text, p.role, au.created_at, p.is_active
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    ORDER BY au.created_at DESC;
END;
$$;

-- 2. Update User Role
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot change your own role.';
    END IF;

    IF new_role::public.user_role_enum <> 'admin'::public.user_role_enum
       AND (SELECT role FROM public.profiles WHERE id = target_user_id) = 'admin'::public.user_role_enum
       AND (SELECT count(*) FROM public.profiles WHERE role = 'admin' AND is_active) <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last active administrator.';
    END IF;

    UPDATE public.profiles
    SET role = new_role::public.user_role_enum
    WHERE id = target_user_id;
END;
$$;

-- 3. Delete User Account
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;
    
    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Cannot delete yourself.';
    END IF;

    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 4. Admin Create New User
-- IMPORTANT: All token/string columns MUST be set to '' (empty string), NOT NULL.
-- Supabase Auth's Go scanner crashes with "converting NULL to string is unsupported"
-- if any of these fields are NULL.
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email text, 
  new_password text, 
  new_role text,
  new_active boolean
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    new_id uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    IF length(trim(new_email)) < 3 OR position('@' IN new_email) < 2 THEN
        RAISE EXCEPTION 'Invalid email.';
    END IF;
    IF length(new_password) < 8 THEN
        RAISE EXCEPTION 'Password must be at least 8 characters.';
    END IF;

    new_id := gen_random_uuid();

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at,         -- Auto-verify: skip email confirmation
        confirmation_token,         -- Must be '' not NULL (Supabase Auth Go scanner)
        recovery_token,             -- Must be '' not NULL
        email_change_token_new,     -- Must be '' not NULL
        email_change_token_current, -- Must be '' not NULL
        reauthentication_token,     -- Must be '' not NULL
        email_change,               -- Must be '' not NULL
        phone_change,               -- Must be '' not NULL
        phone_change_token,         -- Must be '' not NULL
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
        new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        new_email, extensions.crypt(new_password, extensions.gen_salt('bf')),
        now(),
        '', '', '', '', '', '', '', '',
        '{"provider":"email","providers":["email"]}', '{}', now(), now()
    );

    INSERT INTO public.profiles (id, role, is_active, created_at, updated_at)
    VALUES (new_id, new_role::public.user_role_enum, new_active, now(), now())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;
    
    RETURN new_id;
END;
$function$;

-- 5. Set User Active Status (Approve/Block)
CREATE OR REPLACE FUNCTION public.set_user_active_status(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot change your own active status.';
    END IF;

    IF new_status = false
       AND (SELECT role FROM public.profiles WHERE id = target_user_id) = 'admin'::public.user_role_enum
       AND (SELECT count(*) FROM public.profiles WHERE role = 'admin' AND is_active) <= 1 THEN
        RAISE EXCEPTION 'Cannot deactivate the last active administrator.';
    END IF;

    UPDATE public.profiles
    SET is_active = new_status
    WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_active_status(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_active_status(uuid, boolean) TO authenticated;

-- ========================================================
-- 9. GALLERY MODULE
-- ========================================================

-- Add gallery table
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  event_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Policy: Chỉ tài khoản đã được admin duyệt mới xem được
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gallery_items;
DROP POLICY IF EXISTS "Active users can view gallery" ON public.gallery_items;
CREATE POLICY "Active users can view gallery" ON public.gallery_items FOR SELECT TO authenticated USING (public.is_active_user());

-- Policy: chỉ admin quản lý file gallery; member/editor chỉ xem.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gallery_items;
DROP POLICY IF EXISTS "Active users can insert gallery" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins can insert gallery" ON public.gallery_items;
CREATE POLICY "Admins can insert gallery" ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND auth.uid() = created_by);

-- Policy: Chỉ admin hoặc người tạo mới được sửa
DROP POLICY IF EXISTS "Enable update for admin and owner" ON public.gallery_items;
DROP POLICY IF EXISTS "Active users can update gallery" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins can update gallery" ON public.gallery_items;
CREATE POLICY "Admins can update gallery" ON public.gallery_items FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policy: Chỉ admin hoặc người tạo mới được xóa
DROP POLICY IF EXISTS "Enable delete for admin and owner" ON public.gallery_items;
DROP POLICY IF EXISTS "Active users can delete gallery" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins can delete gallery" ON public.gallery_items;
CREATE POLICY "Admins can delete gallery" ON public.gallery_items FOR DELETE TO authenticated USING (public.is_admin());

-- ========================================================
-- 10. STORAGE BUCKETS
-- ========================================================

-- Create storage bucket for gallery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery', 'gallery', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Active users can view gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view gallery files" ON storage.objects;
CREATE POLICY "Active users can view gallery files"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'gallery' AND public.is_active_user() );

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Active users can upload gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload gallery files" ON storage.objects;
CREATE POLICY "Admins can upload gallery files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'gallery' AND public.is_admin() );

DROP POLICY IF EXISTS "Admin and owner can update" ON storage.objects;
DROP POLICY IF EXISTS "Active users can update gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update gallery files" ON storage.objects;
CREATE POLICY "Admins can update gallery files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'gallery' AND public.is_admin() )
WITH CHECK ( bucket_id = 'gallery' AND public.is_admin() );

DROP POLICY IF EXISTS "Admin and owner can delete" ON storage.objects;
DROP POLICY IF EXISTS "Active users can delete gallery files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery files" ON storage.objects;
CREATE POLICY "Admins can delete gallery files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'gallery' AND public.is_admin() );

-- ========================================================
-- 11. TABLE GRANTS FOR THE DATA API
-- ========================================================

-- Supabase projects created after 2026-05-30 no longer auto-grant table
-- privileges in the public schema to anon, authenticated, and service_role,
-- so PostgREST fails with 42501 "permission denied" even though the RLS
-- policies above are in place. The matrix mirrors the policies: anon gets
-- nothing (the app is login-only and every policy is TO authenticated),
-- authenticated gets the operations a policy allows, service_role gets ALL
-- for the server-side approval and notification flows (BYPASSRLS does not
-- replace GRANT). Future migrations that create a table in public must add
-- explicit grants too — see docs/migrations/20260904000000_add_data_api_table_grants.sql.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

REVOKE ALL ON public.profiles FROM anon;
-- Profiles are written only by the signup trigger and admin RPCs, so
-- clients only ever need to read them.
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.persons TO authenticated;
GRANT ALL ON public.persons TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_details_private TO authenticated;
GRANT ALL ON public.person_details_private TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationships TO authenticated;
GRANT ALL ON public.relationships TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_events TO authenticated;
GRANT ALL ON public.custom_events TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

-- Server-only table: the deny-by-default RLS policy keeps clients out, but
-- the one-time approval links read and claim rows through service_role.
REVOKE ALL ON public.user_approval_requests FROM anon, authenticated;
GRANT ALL ON public.user_approval_requests TO service_role;
