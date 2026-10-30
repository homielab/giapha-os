-- Remove exposed SECURITY DEFINER entry points and make intentionally empty
-- RLS tables explicit deny-by-default. Run after all existing migrations.

-- Functions used by policies and triggers belong in a non-exposed schema. The
-- admin RPC names remain in public as SECURITY INVOKER compatibility wrappers;
-- the wrappers delegate to the private SECURITY DEFINER implementations after
-- the caller has entered through an authenticated session.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Re-running the setup bundle recreates the public functions (schema.sql), so
-- a private copy left by an earlier run is dropped before the public one moves.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.handle_updated_at()')
  ) THEN
    DROP FUNCTION IF EXISTS private.handle_updated_at();
    ALTER FUNCTION public.handle_updated_at() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.is_admin()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.is_admin();
    ALTER FUNCTION public.is_admin() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.is_active_user()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.is_active_user();
    ALTER FUNCTION public.is_active_user() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.is_editor()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.is_editor();
    ALTER FUNCTION public.is_editor() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.handle_new_user()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.handle_new_user();
    ALTER FUNCTION public.handle_new_user() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.handle_first_user_confirmation()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.handle_first_user_confirmation();
    ALTER FUNCTION public.handle_first_user_confirmation() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.get_admin_users()')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.get_admin_users();
    ALTER FUNCTION public.get_admin_users() SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.set_user_role(uuid,text)')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.set_user_role(uuid, text);
    ALTER FUNCTION public.set_user_role(uuid, text) SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.delete_user(uuid)')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.delete_user(uuid);
    ALTER FUNCTION public.delete_user(uuid) SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.admin_create_user(text,text,text,boolean)')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.admin_create_user(text, text, text, boolean);
    ALTER FUNCTION public.admin_create_user(text, text, text, boolean) SET SCHEMA private;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid = to_regprocedure('public.set_user_active_status(uuid,boolean)')
      AND p.prosecdef
  ) THEN
    DROP FUNCTION IF EXISTS private.set_user_active_status(uuid, boolean);
    ALTER FUNCTION public.set_user_active_status(uuid, boolean) SET SCHEMA private;
  END IF;
END;
$$;

-- Make every private SECURITY DEFINER function use an explicit path. Existing
-- function bodies already qualify application objects and trusted extensions.
ALTER FUNCTION private.handle_updated_at() SET search_path = public;
ALTER FUNCTION private.is_admin() SET search_path = '';
ALTER FUNCTION private.is_active_user() SET search_path = '';
ALTER FUNCTION private.is_editor() SET search_path = '';
ALTER FUNCTION private.handle_new_user() SET search_path = public, auth;
ALTER FUNCTION private.handle_first_user_confirmation() SET search_path = auth;
ALTER FUNCTION private.get_admin_users() SET search_path = public, auth;
ALTER FUNCTION private.set_user_role(uuid, text) SET search_path = public, auth;
ALTER FUNCTION private.delete_user(uuid) SET search_path = public, auth;
ALTER FUNCTION private.admin_create_user(text, text, text, boolean) SET search_path = public, auth, extensions;
ALTER FUNCTION private.set_user_active_status(uuid, boolean) SET search_path = public, auth;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_editor() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_editor() TO authenticated;

-- Keep policy and function-body references stable while removing the
-- SECURITY DEFINER attribute from the public API entry points.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.is_admin(); $$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.is_active_user(); $$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.is_editor(); $$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_editor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;

REVOKE ALL ON FUNCTION private.get_admin_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_user_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.delete_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.admin_create_user(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_user_active_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_create_user(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_user_active_status(uuid, boolean) TO authenticated;

-- These wrappers are invoker functions, so the private implementation still
-- enforces the active-admin check while PostgREST exposes no SECURITY DEFINER
-- function in the public API schema.
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF public.admin_user_data
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT * FROM private.get_admin_users(); $$;

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.set_user_role(target_user_id, new_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.delete_user(target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_user(new_email text, new_password text, new_role text, new_active boolean)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.admin_create_user(new_email, new_password, new_role, new_active); $$;

CREATE OR REPLACE FUNCTION public.set_user_active_status(target_user_id uuid, new_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.set_user_active_status(target_user_id, new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_active_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_active_status(uuid, boolean) TO authenticated;

-- Make the intentional server-only tables explicit deny-by-default instead of
-- relying only on RLS's implicit behavior. This also documents why no client
-- policy grants access to these tables.
DO $$
BEGIN
  IF to_regclass('public.user_approval_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "No client access to approval requests" ON public.user_approval_requests;
    CREATE POLICY "No client access to approval requests"
      ON public.user_approval_requests
      FOR ALL TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.app_migrations') IS NOT NULL THEN
    DROP POLICY IF EXISTS "No client access to app migrations" ON public.app_migrations;
    CREATE POLICY "No client access to app migrations"
      ON public.app_migrations
      FOR ALL TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END;
$$;
