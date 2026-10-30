-- Locking a user also revokes their open approval link. The link mailed to
-- the administrators stays valid for 7 days; without this, clicking it (or a
-- forwarded copy) after the user was locked in User management turned the
-- account back on.
--
-- Compatible: no table change; private.set_user_active_status is redefined to
-- close the user's unused approval request when the new status is inactive.
-- The approval route answers 410 for a used link whose account is inactive.
-- Unlocking works as before.

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
    SET is_active = new_status
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
