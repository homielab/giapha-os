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
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABLES (Data Preservation: No DROP TABLE commands)
-- ==========================================

-- PROFILES (Application users linked to Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role public.user_role_enum DEFAULT 'member' NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  
  is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_law BOOLEAN NOT NULL DEFAULT FALSE,
  birth_order INT,
  generation INT,
  other_names TEXT,
  avatar_url TEXT,
  note TEXT,
  
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

-- Custom events lookups
CREATE INDEX IF NOT EXISTS idx_custom_events_date ON public.custom_events(event_date);
CREATE INDEX IF NOT EXISTS idx_custom_events_created_by ON public.custom_events(created_by);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_details_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- PERSONS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.persons;
CREATE POLICY "Enable read access for authenticated users" ON public.persons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can update persons" ON public.persons;
DROP POLICY IF EXISTS "Admins can delete persons" ON public.persons;

CREATE POLICY "Admins can insert persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "Admins can update persons" ON public.persons FOR UPDATE TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "Admins can delete persons" ON public.persons FOR DELETE TO authenticated USING (public.is_admin());

-- PERSON_DETAILS_PRIVATE POLICIES
DROP POLICY IF EXISTS "Admins can view private details" ON public.person_details_private;
DROP POLICY IF EXISTS "Authenticated users can view private details" ON public.person_details_private;
CREATE POLICY "Authenticated users can view private details" ON public.person_details_private FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage private details" ON public.person_details_private;
CREATE POLICY "Admins can manage private details" ON public.person_details_private FOR ALL TO authenticated USING (public.is_admin_or_editor());

-- RELATIONSHIPS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.relationships;
CREATE POLICY "Enable read access for authenticated users" ON public.relationships FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.relationships;

CREATE POLICY "Admins can insert relationships" ON public.relationships FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "Admins can update relationships" ON public.relationships FOR UPDATE TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "Admins can delete relationships" ON public.relationships FOR DELETE TO authenticated USING (public.is_admin());

-- CUSTOM_EVENTS POLICIES
ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.custom_events;
CREATE POLICY "Enable read access for authenticated users" ON public.custom_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert custom events" ON public.custom_events;
CREATE POLICY "Authenticated users can insert custom events" ON public.custom_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own custom events" ON public.custom_events;
CREATE POLICY "Users can update own custom events" ON public.custom_events FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own custom events" ON public.custom_events;
CREATE POLICY "Users can delete own custom events" ON public.custom_events FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin());

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
  -- Check if this is the first user (count will be 1 as this is AFTER INSERT)
  SELECT count(*) = 1 FROM auth.users INTO is_first_user;

  INSERT INTO public.profiles (id, role, is_active)
  VALUES (
    new.id, 
    CASE WHEN is_first_user THEN 'admin'::public.user_role_enum ELSE 'member'::public.user_role_enum END,
    true
  );

  UPDATE public.profiles 
  SET is_active = true 
  WHERE id = new.id AND is_first_user = true;

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
  -- If no users exist yet, auto-confirm this first one
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
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
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload avatars." ON storage.objects;
CREATE POLICY "Users can upload avatars." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Users can update avatars." ON storage.objects;
CREATE POLICY "Users can update avatars." ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Users can delete avatars." ON storage.objects;
CREATE POLICY "Users can delete avatars." ON storage.objects FOR DELETE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Initialize 'shared-photos' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-photos', 'shared-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Shared photos are publicly accessible." ON storage.objects;
CREATE POLICY "Shared photos are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'shared-photos' );

DROP POLICY IF EXISTS "Authenticated users can upload shared photos." ON storage.objects;
CREATE POLICY "Authenticated users can upload shared photos." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'shared-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admins can delete shared photos." ON storage.objects;
CREATE POLICY "Admins can delete shared photos." ON storage.objects FOR DELETE USING ( bucket_id = 'shared-photos' AND public.is_admin() );

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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')) THEN
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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
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

-- ==========================================
-- PAGE VIEWS (Visit Tracking)
-- ==========================================

-- One row per user per day — upsert on conflict does nothing
CREATE TABLE IF NOT EXISTS public.page_views (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_date DATE DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, visited_date)
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upsert own views" ON public.page_views;
CREATE POLICY "Users can upsert own views"
  ON public.page_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read count" ON public.page_views;
CREATE POLICY "Authenticated users can read count"
  ON public.page_views FOR SELECT TO authenticated
  USING (true);

-- 5. Set User Active Status (Approve/Block)
CREATE OR REPLACE FUNCTION public.set_user_active_status(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Access denied.';
    END IF;

    UPDATE public.profiles
    SET is_active = new_status
    WHERE id = target_user_id;
END;
$$;
