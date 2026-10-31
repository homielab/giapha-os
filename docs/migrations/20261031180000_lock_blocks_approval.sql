-- A locked account stays locked: it no longer asks for approval again, and
-- an approval link cannot turn it back on, even when the lock lands while
-- the administrator is on the approval page.
--
-- Before, "locked" and "waiting for approval" were the same state
-- (is_active = false), so a locked user who signed in again got a fresh
-- approval request and the administrators a new email. And the approval
-- link activated the account in two separate requests (read, then update),
-- so a lock that landed in between was undone.
--
-- Additive only, no data removed:
--   * profiles.locked_at (nullable): set when an administrator locks the
--     account, cleared when they unlock it. Filled for accounts already
--     locked with an approval link that was used or revoked (inactive with a
--     used request); other inactive accounts stay "waiting for approval".
--   * private.set_user_active_status is redefined to set/clear locked_at
--     (it still revokes the open approval link when locking).
--   * public.approve_user_request(token_hash): approves in one transaction,
--     callable by the server (service_role) only. It locks the profile row,
--     then the request row, in the same order as set_user_active_status, so
--     a lock and an approval running together wait for each other: an
--     approval that comes second sees the lock and leaves the account off.
-- Backup and restore do not include profiles and are unchanged.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

UPDATE public.profiles p
SET locked_at = r.used_at
FROM public.user_approval_requests r
WHERE r.user_id = p.id
  AND p.is_active = false
  AND p.locked_at IS NULL
  AND r.used_at IS NOT NULL;

CREATE OR REPLACE FUNCTION private.set_user_active_status(target_user_id uuid, new_status boolean)
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
    SET is_active = new_status,
        locked_at = CASE WHEN new_status THEN NULL ELSE COALESCE(locked_at, now()) END
    WHERE id = target_user_id;

    IF new_status = false THEN
        UPDATE public.user_approval_requests
        SET used_at = now()
        WHERE user_id = target_user_id
          AND used_at IS NULL;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.set_user_active_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.set_user_active_status(uuid, boolean) TO authenticated;

-- Returns {"status": ..., "email": ...}; status is one of
--   approved   the account is active now and the link is used
--   processed  the link was used before and the account is active
--   revoked    the account is locked (the link is closed, nothing activated)
--   expired    the link is past its expiry date
--   invalid    no request has this token
--   not_found  the request has no profile
CREATE OR REPLACE FUNCTION public.approve_user_request(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_request_id uuid;
    v_user_id uuid;
    v_request public.user_approval_requests%ROWTYPE;
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT r.id, r.user_id INTO v_request_id, v_user_id
    FROM public.user_approval_requests r
    WHERE r.token_hash = p_token_hash;

    IF v_request_id IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid', 'email', NULL);
    END IF;

    -- Profile first, then request: the order set_user_active_status writes
    -- them in, so the two never deadlock and the later one sees the other's
    -- committed change.
    SELECT * INTO v_profile
    FROM public.profiles p
    WHERE p.id = v_user_id
    FOR UPDATE;

    SELECT * INTO v_request
    FROM public.user_approval_requests r
    WHERE r.id = v_request_id
    FOR UPDATE;

    -- Deleted, or re-issued with a new token while we waited.
    IF v_request.id IS NULL OR v_request.token_hash <> p_token_hash THEN
        RETURN jsonb_build_object('status', 'invalid', 'email', NULL);
    END IF;

    IF v_request.used_at IS NOT NULL THEN
        IF v_profile.id IS NOT NULL AND NOT v_profile.is_active THEN
            RETURN jsonb_build_object('status', 'revoked', 'email', v_request.email);
        END IF;
        RETURN jsonb_build_object('status', 'processed', 'email', v_request.email);
    END IF;

    IF v_request.expires_at <= now() THEN
        RETURN jsonb_build_object('status', 'expired', 'email', v_request.email);
    END IF;

    IF v_profile.id IS NULL THEN
        RETURN jsonb_build_object('status', 'not_found', 'email', v_request.email);
    END IF;

    IF v_profile.locked_at IS NOT NULL THEN
        UPDATE public.user_approval_requests
        SET used_at = now()
        WHERE id = v_request.id;
        RETURN jsonb_build_object('status', 'revoked', 'email', v_request.email);
    END IF;

    UPDATE public.profiles
    SET is_active = true
    WHERE id = v_profile.id
      AND is_active = false;

    UPDATE public.user_approval_requests
    SET used_at = now()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('status', 'approved', 'email', v_request.email);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_user_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user_request(text) TO service_role;

-- Let PostgREST see the new function right away.
NOTIFY pgrst, 'reload schema';
