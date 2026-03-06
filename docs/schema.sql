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
    CREATE TYPE public.relationship_type_enum AS ENUM (
      'marriage', 'biological_child', 'adopted_child',
      'step_parent', 'sibling', 'half_sibling', 'godparent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- Add new values to existing databases (idempotent)
DO $$ BEGIN ALTER TYPE public.relationship_type_enum ADD VALUE IF NOT EXISTS 'step_parent'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE public.relationship_type_enum ADD VALUE IF NOT EXISTS 'sibling'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE public.relationship_type_enum ADD VALUE IF NOT EXISTS 'half_sibling'; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE public.relationship_type_enum ADD VALUE IF NOT EXISTS 'godparent'; EXCEPTION WHEN others THEN null; END $$;

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
  place_of_birth TEXT,
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

CREATE POLICY "Admins can insert persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update persons" ON public.persons FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete persons" ON public.persons FOR DELETE TO authenticated USING (public.is_admin());

-- PERSON_DETAILS_PRIVATE POLICIES
DROP POLICY IF EXISTS "Admins can view private details" ON public.person_details_private;
CREATE POLICY "Admins can view private details" ON public.person_details_private FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage private details" ON public.person_details_private;
CREATE POLICY "Admins can manage private details" ON public.person_details_private FOR ALL TO authenticated USING (public.is_admin());

-- RELATIONSHIPS POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.relationships;
CREATE POLICY "Enable read access for authenticated users" ON public.relationships FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can insert relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.relationships;

CREATE POLICY "Admins can insert relationships" ON public.relationships FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update relationships" ON public.relationships FOR UPDATE TO authenticated USING (public.is_admin());
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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
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

-- ==========================================
-- AUDIT LOG (Edit History / Lịch sử chỉnh sửa)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  person_name TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_person_id ON public.audit_log(person_id);

-- RLS: Only authenticated users can insert; only admins can read
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Admins can read audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- FAMILY SETTINGS (Public Share / Cài đặt chia sẻ công khai)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all settings (for admin UI)
CREATE POLICY "Authenticated users can read family settings"
  ON public.family_settings FOR SELECT TO authenticated
  USING (true);

-- Anonymous users can only read non-sensitive settings (for public share token validation)
CREATE POLICY "Anon can read non-sensitive settings"
  ON public.family_settings FOR SELECT TO anon
  USING (setting_key NOT IN ('api_key_value', 'public_share_token'));

-- Only admins can create/update/delete settings
CREATE POLICY "Admins can manage family settings"
  ON public.family_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow anonymous users to read persons when public sharing is enabled
-- This is required for the public family tree view (/public/[token])
DROP POLICY IF EXISTS "Public can read persons when share is enabled" ON public.persons;
CREATE POLICY "Public can read persons when share is enabled"
  ON public.persons FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.family_settings
      WHERE setting_key = 'public_share_enabled' AND setting_value = 'true'
    )
  );

-- Allow anonymous users to read persons when the REST API is enabled
-- Application-level API key validation happens in the route handler.
-- This policy enables the anon Supabase client used by route handlers to access data.
DROP POLICY IF EXISTS "API can read persons when API key is enabled" ON public.persons;
CREATE POLICY "API can read persons when API key is enabled"
  ON public.persons FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.family_settings
      WHERE setting_key = 'api_key_enabled' AND setting_value = 'true'
    )
  );

-- Allow anonymous users to read relationships when the REST API is enabled
DROP POLICY IF EXISTS "API can read relationships when API key is enabled" ON public.relationships;
CREATE POLICY "API can read relationships when API key is enabled"
  ON public.relationships FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.family_settings
      WHERE setting_key = 'api_key_enabled' AND setting_value = 'true'
    )
  );

-- ==========================================
-- PERSON PHOTOS (Gallery Ảnh Thành Viên)
-- ==========================================

CREATE TABLE IF NOT EXISTS person_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_photos_person_id ON person_photos(person_id);

ALTER TABLE person_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view photos" ON person_photos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can insert photos" ON person_photos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

CREATE POLICY "Editors and admins can delete photos" ON person_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- ==========================================
-- EMAIL NOTIFICATION SETTINGS & LOG
-- ==========================================

-- NOTIFICATION_SETTINGS (Single-row config for email reminders)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  days_before INT[] NOT NULL DEFAULT '{7}',
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  thanh_minh_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add column idempotently for existing installations
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS thanh_minh_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage notification settings" ON public.notification_settings;
CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- NOTIFICATION_LOG (Tracks sent reminders to prevent duplicates)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_lookup
  ON public.notification_log(person_id, event_type, scheduled_date);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage notification log" ON public.notification_log;
CREATE POLICY "Admins can manage notification log"
  ON public.notification_log FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==========================================
-- GRAVE RECORDS & EVENTS (Module Mồ Mả v1.1)
-- ==========================================

-- ENUMS for grave module
DO $$ BEGIN
    CREATE TYPE public.burial_type_enum AS ENUM ('burial', 'cremation', 'cremation_urn', 'sea_burial', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.grave_status_enum AS ENUM ('no_grave', 'has_grave', 'grave_moved', 'cremated_urn', 'unknown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.remains_status_enum AS ENUM ('in_ground', 'exhumed', 'cremated_ashes', 'urn_home', 'unknown');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.grave_event_type_enum AS ENUM (
      'burial', 'exhumation', 'grave_construction', 'grave_renovation',
      'cremation', 'urn_placement', 'cleaning', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- GRAVE_RECORDS (One per deceased person)
CREATE TABLE IF NOT EXISTS public.grave_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,

  -- Burial info
  burial_type public.burial_type_enum,
  grave_status public.grave_status_enum NOT NULL DEFAULT 'unknown',
  remains_status public.remains_status_enum NOT NULL DEFAULT 'unknown',

  -- Grave details (for physical graves)
  grave_type TEXT,               -- e.g. "Đá hoa cương", "Gạch", "Đất đắp"
  cemetery_name TEXT,
  cemetery_address TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,

  -- Context
  cause_of_death TEXT,
  epitaph TEXT,                  -- Bia ký / câu thơ tưởng nhớ
  caretaker_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  branch_head_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,

  -- Media
  panorama_url TEXT,             -- URL ảnh 360° trong Supabase Storage

  -- Public memorial
  public_memorial BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grave_records_person_id ON public.grave_records(person_id);
CREATE INDEX IF NOT EXISTS idx_grave_records_cemetery ON public.grave_records(cemetery_name);
CREATE INDEX IF NOT EXISTS idx_grave_records_public ON public.grave_records(public_memorial) WHERE public_memorial = true;

CREATE TRIGGER grave_records_updated_at
  BEFORE UPDATE ON public.grave_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- GRAVE_EVENTS (Timeline: burial → exhumation → construction → renovation...)
CREATE TABLE IF NOT EXISTS public.grave_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grave_id UUID NOT NULL REFERENCES public.grave_records(id) ON DELETE CASCADE,

  event_type public.grave_event_type_enum NOT NULL,
  event_date DATE,               -- Solar date
  event_lunar_day INT,           -- Âm lịch: ngày
  event_lunar_month INT,         -- Âm lịch: tháng
  event_lunar_year INT,          -- Âm lịch: năm
  event_lunar_is_leap BOOLEAN DEFAULT false,

  notes TEXT,
  conducted_by TEXT,             -- Người thực hiện (free text)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grave_events_grave_id ON public.grave_events(grave_id);
CREATE INDEX IF NOT EXISTS idx_grave_events_date ON public.grave_events(event_date);

-- GRAVE_PHOTOS (Photos attached to a grave record)
CREATE TABLE IF NOT EXISTS public.grave_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grave_id UUID NOT NULL REFERENCES public.grave_records(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_tag TEXT,                -- 'construction', 'current', 'exhumation', 'other'
  is_panorama BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grave_photos_grave_id ON public.grave_photos(grave_id);

-- RLS POLICIES

ALTER TABLE public.grave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grave_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grave_photos ENABLE ROW LEVEL SECURITY;

-- grave_records: authenticated users read all
DROP POLICY IF EXISTS "Authenticated users can view grave records" ON public.grave_records;
CREATE POLICY "Authenticated users can view grave records"
  ON public.grave_records FOR SELECT TO authenticated USING (true);

-- grave_records: anon can read only public memorial records
DROP POLICY IF EXISTS "Anon can view public memorial records" ON public.grave_records;
CREATE POLICY "Anon can view public memorial records"
  ON public.grave_records FOR SELECT TO anon
  USING (public_memorial = true);

-- grave_records: editor/admin can insert/update/delete
DROP POLICY IF EXISTS "Editors can manage grave records" ON public.grave_records;
CREATE POLICY "Editors can manage grave records"
  ON public.grave_records FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- grave_events: authenticated read all
DROP POLICY IF EXISTS "Authenticated users can view grave events" ON public.grave_events;
CREATE POLICY "Authenticated users can view grave events"
  ON public.grave_events FOR SELECT TO authenticated USING (true);

-- grave_events: anon can read events for public memorial records
DROP POLICY IF EXISTS "Anon can view events for public memorials" ON public.grave_events;
CREATE POLICY "Anon can view events for public memorials"
  ON public.grave_events FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.grave_records gr
      WHERE gr.id = grave_id AND gr.public_memorial = true
    )
  );

-- grave_events: editor/admin manage
DROP POLICY IF EXISTS "Editors can manage grave events" ON public.grave_events;
CREATE POLICY "Editors can manage grave events"
  ON public.grave_events FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- grave_photos: authenticated read all
DROP POLICY IF EXISTS "Authenticated users can view grave photos" ON public.grave_photos;
CREATE POLICY "Authenticated users can view grave photos"
  ON public.grave_photos FOR SELECT TO authenticated USING (true);

-- grave_photos: anon can read photos for public memorials
DROP POLICY IF EXISTS "Anon can view photos for public memorials" ON public.grave_photos;
CREATE POLICY "Anon can view photos for public memorials"
  ON public.grave_photos FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.grave_records gr
      WHERE gr.id = grave_id AND gr.public_memorial = true
    )
  );

-- grave_photos: editor/admin manage
DROP POLICY IF EXISTS "Editors can manage grave photos" ON public.grave_photos;
CREATE POLICY "Editors can manage grave photos"
  ON public.grave_photos FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- ==========================================
-- PHASE 6 MIGRATIONS
-- ==========================================

-- #57: Enhanced Statistics — marital status & polygamy support
-- Add marital_status to persons
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS marital_status TEXT
  CHECK (marital_status IN ('single','married','divorced','widowed','unknown'))
  DEFAULT 'unknown';

-- Add marriage metadata to relationships
ALTER TABLE public.relationships ADD COLUMN IF NOT EXISTS marriage_order INT DEFAULT 1;
ALTER TABLE public.relationships ADD COLUMN IF NOT EXISTS marriage_start_year INT;
ALTER TABLE public.relationships ADD COLUMN IF NOT EXISTS marriage_end_year INT;

-- #59: Extended Personal Profile
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS birth_name TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS common_name TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS saint_name TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS religion TEXT
  CHECK (religion IN ('buddhist','catholic','protestant','islam','none','other'));
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS religious_title TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS civil_title TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS career_description TEXT;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS education_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS awards TEXT;

-- #58: Privacy Controls
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS privacy_level TEXT
  CHECK (privacy_level IN ('public','masked','private'))
  DEFAULT 'masked';

-- #66: CCCD Unique ID (in person_details_private)
ALTER TABLE public.person_details_private ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.person_details_private ADD COLUMN IF NOT EXISTS national_id_verified BOOLEAN DEFAULT false;
ALTER TABLE public.person_details_private ADD COLUMN IF NOT EXISTS national_id_verified_at TIMESTAMPTZ;
ALTER TABLE public.person_details_private ADD COLUMN IF NOT EXISTS national_id_verified_by UUID REFERENCES public.profiles(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_private_national_id
  ON public.person_details_private(national_id) WHERE national_id IS NOT NULL;

-- #65: Admin Approval Workflow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT
  CHECK (account_status IN ('pending','active','rejected','suspended'))
  DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linked_person_id UUID REFERENCES public.persons(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_score INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_attempts INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_father_id UUID REFERENCES public.persons(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_mother_id UUID REFERENCES public.persons(id);

-- #60: Branch/Chi Management
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  root_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  display_order INT DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- #64: Invitation System
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  invited_by UUID REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','editor')),
  email TEXT,
  max_uses INT DEFAULT 1,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_via_token TEXT;

-- #67: User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  default_root_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  default_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  tree_view_mode TEXT DEFAULT 'tree',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- #61: Family Events
CREATE TABLE IF NOT EXISTS public.family_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('gio_ho','wedding','funeral','reunion','ceremony','other')),
  event_date DATE NOT NULL,
  location TEXT,
  description TEXT,
  organizer_person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.family_events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_event_attendees (
  event_id UUID REFERENCES public.family_events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, person_id)
);

-- #62: Activity Feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE,
  related_id UUID,
  related_type TEXT,
  message TEXT NOT NULL,
  meta JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);

-- RLS for new tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- branches: authenticated read all, admin/editor manage
DROP POLICY IF EXISTS "Authenticated can view branches" ON public.branches;
CREATE POLICY "Authenticated can view branches" ON public.branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Editors can manage branches" ON public.branches;
CREATE POLICY "Editors can manage branches" ON public.branches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- user_preferences: each user manages their own
DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- family_events: authenticated read, editor/admin manage
DROP POLICY IF EXISTS "Authenticated view events" ON public.family_events;
CREATE POLICY "Authenticated view events" ON public.family_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anon view public events" ON public.family_events;
CREATE POLICY "Anon view public events" ON public.family_events FOR SELECT TO anon USING (is_public = true);
DROP POLICY IF EXISTS "Editors manage events" ON public.family_events;
CREATE POLICY "Editors manage events" ON public.family_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- family_event_photos: same as events
DROP POLICY IF EXISTS "Authenticated view event photos" ON public.family_event_photos;
CREATE POLICY "Authenticated view event photos" ON public.family_event_photos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Editors manage event photos" ON public.family_event_photos;
CREATE POLICY "Editors manage event photos" ON public.family_event_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));

-- activity_feed: authenticated read
DROP POLICY IF EXISTS "Authenticated view activity" ON public.activity_feed;
CREATE POLICY "Authenticated view activity" ON public.activity_feed FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert activity" ON public.activity_feed;
CREATE POLICY "Authenticated insert activity" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (true);

-- invitations: admin/editor manage, anyone can read by token
DROP POLICY IF EXISTS "Editors manage invitations" ON public.invitations;
CREATE POLICY "Editors manage invitations" ON public.invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','editor')));
