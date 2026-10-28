-- Burial place of a member (nơi an táng): where the grave is, so the family
-- knows where to go for tomb sweeping. Before this column it could only be
-- written into the free-form note.
--
-- Public like the dates of death: every active member can read it (the RLS
-- of persons is unchanged), it is not a private detail.
--
-- Additive only: the column is nullable, no row is changed, and an app that
-- does not know the column yet keeps working. restore_backup and
-- merge_persons are redefined because both list the persons columns:
--   * a restore keeps the burial place (a backup without it restores null),
--   * a merge fills an empty burial place of the kept member from the
--     merged-away one and counts it in person_fields_filled.

ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS burial_place text;

CREATE OR REPLACE FUNCTION private.restore_backup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  section text;
  expected integer;
  actual integer;
  inserted jsonb := '{}'::jsonb;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
  END IF;

  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid restore payload: expected a JSON object.'
      USING ERRCODE = '22023';
  END IF;

  IF payload->'version' IS DISTINCT FROM '1'::jsonb THEN
    RAISE EXCEPTION 'Unsupported restore payload version: %. Update the app and run the pending migrations.',
      COALESCE(payload->>'version', 'missing')
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(payload->'counts') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid restore payload: "counts" is missing.'
      USING ERRCODE = '22023';
  END IF;

  FOREACH section IN ARRAY ARRAY[
    'persons', 'relationships', 'person_details_private', 'custom_events'
  ] LOOP
    IF jsonb_typeof(payload->section) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Invalid restore payload: "%" must be an array.', section
        USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(payload->'counts'->section) IS DISTINCT FROM 'number'
       OR (payload->'counts'->>section)::numeric
          <> jsonb_array_length(payload->section) THEN
      RAISE EXCEPTION 'Invalid restore payload: "%" has % rows, counts says %.',
        section, jsonb_array_length(payload->section),
        COALESCE(payload->'counts'->>section, 'missing')
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- Same limits as the app (utils/backupPayload.ts).
  IF jsonb_array_length(payload->'persons') = 0 THEN
    RAISE EXCEPTION 'Invalid restore payload: the backup has no members.'
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(payload->'persons') > 10000
     OR jsonb_array_length(payload->'relationships') > 30000
     OR jsonb_array_length(payload->'person_details_private') > 10000
     OR jsonb_array_length(payload->'custom_events') > 10000 THEN
    RAISE EXCEPTION 'Invalid restore payload: too many rows.'
      USING ERRCODE = '22023';
  END IF;

  -- Children first, because of the foreign keys. WHERE true keeps
  -- safeupdate-style "DELETE needs a WHERE clause" guards happy.
  DELETE FROM public.custom_events WHERE true;
  DELETE FROM public.relationships WHERE true;
  DELETE FROM public.person_details_private WHERE true;
  DELETE FROM public.persons WHERE true;

  -- A backup made before burial places has no burial_place: null.
  INSERT INTO public.persons (
    id, full_name, gender,
    birth_year, birth_month, birth_day,
    death_year, death_month, death_day,
    death_lunar_year, death_lunar_month, death_lunar_day,
    is_deceased, is_in_law, birth_order, generation,
    other_names, avatar_url, note, burial_place
  )
  SELECT
    p.id, p.full_name, p.gender,
    p.birth_year, p.birth_month, p.birth_day,
    p.death_year, p.death_month, p.death_day,
    p.death_lunar_year, p.death_lunar_month, p.death_lunar_day,
    COALESCE(p.is_deceased, false), COALESCE(p.is_in_law, false),
    p.birth_order, p.generation,
    p.other_names, p.avatar_url, p.note, p.burial_place
  FROM jsonb_to_recordset(payload->'persons') AS p(
    id uuid, full_name text, gender public.gender_enum,
    birth_year integer, birth_month integer, birth_day integer,
    death_year integer, death_month integer, death_day integer,
    death_lunar_year integer, death_lunar_month integer, death_lunar_day integer,
    is_deceased boolean, is_in_law boolean, birth_order integer, generation integer,
    other_names text, avatar_url text, note text, burial_place text
  );
  GET DIAGNOSTICS actual = ROW_COUNT;
  inserted := inserted || jsonb_build_object('persons', actual);

  INSERT INTO public.relationships (type, person_a, person_b, note)
  SELECT r.type, r.person_a, r.person_b, r.note
  FROM jsonb_to_recordset(payload->'relationships') AS r(
    type public.relationship_type_enum, person_a uuid, person_b uuid, note text
  );
  GET DIAGNOSTICS actual = ROW_COUNT;
  inserted := inserted || jsonb_build_object('relationships', actual);

  INSERT INTO public.person_details_private (
    person_id, phone_number, occupation, current_residence
  )
  SELECT d.person_id, d.phone_number, d.occupation, d.current_residence
  FROM jsonb_to_recordset(payload->'person_details_private') AS d(
    person_id uuid, phone_number text, occupation text, current_residence text
  );
  GET DIAGNOSTICS actual = ROW_COUNT;
  inserted := inserted || jsonb_build_object('person_details_private', actual);

  -- created_by is the admin who restores, as with a manual insert.
  -- A backup made before events could repeat has no recurrence: 'none'.
  INSERT INTO public.custom_events (
    id, name, content, event_date, location, recurrence, created_by
  )
  SELECT e.id, e.name, e.content, e.event_date, e.location,
    COALESCE(NULLIF(e.recurrence, ''), 'none'), auth.uid()
  FROM jsonb_to_recordset(payload->'custom_events') AS e(
    id uuid, name text, content text, event_date date, location text,
    recurrence text
  );
  GET DIAGNOSTICS actual = ROW_COUNT;
  inserted := inserted || jsonb_build_object('custom_events', actual);

  FOREACH section IN ARRAY ARRAY[
    'persons', 'relationships', 'person_details_private', 'custom_events'
  ] LOOP
    expected := jsonb_array_length(payload->section);
    IF (inserted->>section)::integer <> expected THEN
      RAISE EXCEPTION 'Restore of "%" inserted % rows instead of %.',
        section, inserted->>section, expected;
    END IF;
  END LOOP;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION private.restore_backup(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.restore_backup(jsonb) TO authenticated;

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

  -- 5. Empty columns of the kept member (burial place included) take the
  --    dropped member's values;
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
    + (CASE WHEN COALESCE(keep_row.burial_place, '') = ''
            AND COALESCE(drop_row.burial_place, '') <> '' THEN 1 ELSE 0 END)
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
      burial_place = COALESCE(NULLIF(p.burial_place, ''), NULLIF(drop_row.burial_place, '')),
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

-- Let PostgREST see the new column right away.
NOTIFY pgrst, 'reload schema';
