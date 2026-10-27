-- Merge two possibly-duplicate members into one (Dashboard → Backup &
-- restore → "People that may be duplicates" → Merge), in a single
-- transaction. Before this function the only way to clean up a duplicate was
-- to delete one profile by hand and re-create every relationship, private
-- detail and date on the other one.
--
-- Everything of the dropped member moves to the kept one:
--   * relationships are re-pointed; ones the kept member already has (same
--     type and same counterpart, a marriage either way round) and the
--     relationship between the two members themselves are removed,
--   * private details fill the kept member's empty fields (kept values win),
--   * empty columns of the kept member take the dropped member's values
--     (dates, birth order, generation, avatar), deceased/in-law flags OR,
--     different names are added to other_names, notes are appended,
--   * the dropped member is deleted; nothing else references it.
-- custom_events and gallery_items are per-user tables, not per-person, so
-- there is nothing to move for them. Only the avatar reference merges here;
-- when the kept member already had a different photo, the app removes the
-- dropped member's file from the avatars bucket after this function commits
-- (app/actions/mergePersons.ts, utils/mergeAvatarCleanup.ts).
--
-- There is no undo: the confirmation in the app asks for a backup first.
-- Returns a JSON summary:
--   { "relationships_moved": n, "relationships_dropped": n,
--     "details_fields_filled": n, "person_fields_filled": n }
--
-- Same layout as the other admin RPCs: the SECURITY DEFINER implementation
-- lives in the non-exposed private schema and checks private.is_admin(); the
-- public name is a SECURITY INVOKER wrapper for the Data API.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.merge_persons(keep_id uuid, drop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  keep_row public.persons%ROWTYPE;
  drop_row public.persons%ROWTYPE;
  keep_private public.person_details_private%ROWTYPE;
  drop_private public.person_details_private%ROWTYPE;
  dropped_pair integer;
  dropped_duplicate integer;
  moved integer;
  person_fields integer := 0;
  details_fields integer := 0;
  new_other_names text;
  new_note text;
  names_added text[];
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  IF keep_id IS NULL OR drop_id IS NULL OR keep_id = drop_id THEN
    RAISE EXCEPTION 'Merge needs two different members.'
      USING ERRCODE = '22023';
  END IF;

  -- Lock both rows so a concurrent edit cannot land in the middle.
  SELECT * INTO keep_row FROM public.persons WHERE id = keep_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The member to keep no longer exists.'
      USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO drop_row FROM public.persons WHERE id = drop_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The member to merge no longer exists.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 1. The relationship between the two members goes away: after the merge
  --    it would be a self-relationship.
  DELETE FROM public.relationships r
  WHERE (r.person_a = keep_id AND r.person_b = drop_id)
     OR (r.person_a = drop_id AND r.person_b = keep_id);
  GET DIAGNOSTICS dropped_pair = ROW_COUNT;

  -- 2. Relationships of the dropped member that the kept member already has
  --    are removed instead of moved. UNIQUE(person_a, person_b, type) is an
  --    ordered pair, so a marriage also matches the other way round.
  DELETE FROM public.relationships r
  WHERE (r.person_a = drop_id OR r.person_b = drop_id)
    AND EXISTS (
      SELECT 1
      FROM public.relationships k
      WHERE k.type = r.type
        AND (
          (k.person_a = CASE WHEN r.person_a = drop_id THEN keep_id ELSE r.person_a END
           AND k.person_b = CASE WHEN r.person_b = drop_id THEN keep_id ELSE r.person_b END)
          OR (r.type = 'marriage'
              AND k.person_a = CASE WHEN r.person_b = drop_id THEN keep_id ELSE r.person_b END
              AND k.person_b = CASE WHEN r.person_a = drop_id THEN keep_id ELSE r.person_a END)
        )
    );
  GET DIAGNOSTICS dropped_duplicate = ROW_COUNT;

  -- 3. The remaining relationships of the dropped member are re-pointed to
  --    the kept member.
  UPDATE public.relationships r
  SET person_a = CASE WHEN r.person_a = drop_id THEN keep_id ELSE r.person_a END,
      person_b = CASE WHEN r.person_b = drop_id THEN keep_id ELSE r.person_b END
  WHERE r.person_a = drop_id OR r.person_b = drop_id;
  GET DIAGNOSTICS moved = ROW_COUNT;

  -- 4. Private details: the kept member's values win, its empty fields take
  --    the dropped member's. A member without a row simply takes the other's.
  SELECT * INTO keep_private FROM public.person_details_private
  WHERE person_id = keep_id;
  SELECT * INTO drop_private FROM public.person_details_private
  WHERE person_id = drop_id;
  IF FOUND THEN
    IF keep_private.person_id IS NULL THEN
      UPDATE public.person_details_private
      SET person_id = keep_id, updated_at = now()
      WHERE person_id = drop_id;
    ELSE
      details_fields :=
        (CASE WHEN COALESCE(keep_private.phone_number, '') = ''
              AND COALESCE(drop_private.phone_number, '') <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN COALESCE(keep_private.occupation, '') = ''
              AND COALESCE(drop_private.occupation, '') <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN COALESCE(keep_private.current_residence, '') = ''
              AND COALESCE(drop_private.current_residence, '') <> '' THEN 1 ELSE 0 END);
      UPDATE public.person_details_private d
      SET phone_number = COALESCE(NULLIF(d.phone_number, ''), drop_private.phone_number),
          occupation = COALESCE(NULLIF(d.occupation, ''), drop_private.occupation),
          current_residence = COALESCE(NULLIF(d.current_residence, ''), drop_private.current_residence),
          updated_at = now()
      WHERE d.person_id = keep_id;
    END IF;
  END IF;

  -- 5. Empty columns of the kept member take the dropped member's values;
  --    a name that differs is remembered in other_names, notes are appended.
  names_added := ARRAY[]::text[];
  IF lower(drop_row.full_name) <> lower(keep_row.full_name) THEN
    names_added := names_added || drop_row.full_name;
  END IF;
  IF COALESCE(drop_row.other_names, '') <> '' THEN
    names_added := names_added ||
      ARRAY(SELECT trim(n)
            FROM unnest(string_to_array(drop_row.other_names, ',')) AS n
            WHERE COALESCE(trim(n), '') <> '');
  END IF;
  names_added := ARRAY(
    SELECT DISTINCT trim(n)
    FROM unnest(names_added) AS n
    WHERE COALESCE(trim(n), '') <> ''
      AND lower(trim(n)) <> lower(keep_row.full_name)
  );
  new_other_names := NULLIF(
    trim(
      BOTH ', ' FROM
      (SELECT string_agg(names.distinct_name, ', ')
       FROM (
         SELECT DISTINCT trim(x) AS distinct_name
         FROM unnest(
           string_to_array(COALESCE(keep_row.other_names, ''), ',') || names_added
         ) AS x
         WHERE COALESCE(trim(x), '') <> ''
       ) AS names
      )
    ), ''
  );
  IF new_other_names IS DISTINCT FROM keep_row.other_names THEN
    person_fields := person_fields + 1;
  END IF;

  new_note := CASE
    WHEN COALESCE(keep_row.note, '') = '' THEN NULLIF(drop_row.note, '')
    WHEN COALESCE(drop_row.note, '') = '' THEN keep_row.note
    ELSE keep_row.note || E'\n' || drop_row.note
  END;
  IF new_note IS DISTINCT FROM keep_row.note THEN
    person_fields := person_fields + 1;
  END IF;

  person_fields := person_fields
    + (CASE WHEN keep_row.birth_year IS NULL AND drop_row.birth_year IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.birth_month IS NULL AND drop_row.birth_month IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.birth_day IS NULL AND drop_row.birth_day IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_year IS NULL AND drop_row.death_year IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_month IS NULL AND drop_row.death_month IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_day IS NULL AND drop_row.death_day IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_lunar_year IS NULL AND drop_row.death_lunar_year IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_lunar_month IS NULL AND drop_row.death_lunar_month IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.death_lunar_day IS NULL AND drop_row.death_lunar_day IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.birth_order IS NULL AND drop_row.birth_order IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.generation IS NULL AND drop_row.generation IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN keep_row.avatar_url IS NULL AND drop_row.avatar_url IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN NOT keep_row.is_deceased AND drop_row.is_deceased THEN 1 ELSE 0 END)
    + (CASE WHEN NOT keep_row.is_in_law AND drop_row.is_in_law THEN 1 ELSE 0 END);

  UPDATE public.persons p
  SET birth_year = COALESCE(p.birth_year, drop_row.birth_year),
      birth_month = COALESCE(p.birth_month, drop_row.birth_month),
      birth_day = COALESCE(p.birth_day, drop_row.birth_day),
      death_year = COALESCE(p.death_year, drop_row.death_year),
      death_month = COALESCE(p.death_month, drop_row.death_month),
      death_day = COALESCE(p.death_day, drop_row.death_day),
      death_lunar_year = COALESCE(p.death_lunar_year, drop_row.death_lunar_year),
      death_lunar_month = COALESCE(p.death_lunar_month, drop_row.death_lunar_month),
      death_lunar_day = COALESCE(p.death_lunar_day, drop_row.death_lunar_day),
      is_deceased = p.is_deceased OR drop_row.is_deceased,
      is_in_law = p.is_in_law OR drop_row.is_in_law,
      birth_order = COALESCE(p.birth_order, drop_row.birth_order),
      generation = COALESCE(p.generation, drop_row.generation),
      other_names = new_other_names,
      avatar_url = COALESCE(p.avatar_url, drop_row.avatar_url),
      note = new_note,
      updated_at = now()
  WHERE p.id = keep_id;

  -- 6. The dropped member leaves; CASCADE clears the rest of its rows.
  DELETE FROM public.persons WHERE id = drop_id;

  RETURN jsonb_build_object(
    'relationships_moved', moved,
    'relationships_dropped', dropped_pair + dropped_duplicate,
    'details_fields_filled', details_fields,
    'person_fields_filled', person_fields
  );
END;
$$;

REVOKE ALL ON FUNCTION private.merge_persons(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.merge_persons(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.merge_persons(keep_id uuid, drop_id uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$ SELECT private.merge_persons(keep_id, drop_id); $$;

REVOKE ALL ON FUNCTION public.merge_persons(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_persons(uuid, uuid) TO authenticated;

-- Let PostgREST see the new function right away.
NOTIFY pgrst, 'reload schema';
