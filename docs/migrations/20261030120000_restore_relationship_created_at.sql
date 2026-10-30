-- Keep the relationships' created_at on restore. The tree, mind map and
-- family book order a member's spouses by the spouse's birth year, then by
-- when the marriage was added; restoring every row with the same now() made
-- that order fall back to the new random ids.
--
-- Compatible: no table change; restore_backup is redefined to read an
-- optional created_at per relationship (older backups restore with now()).

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

  -- created_at comes from the backup (spouse order follows it); a backup
  -- without it gets the restore time.
  INSERT INTO public.relationships (type, person_a, person_b, note, created_at)
  SELECT r.type, r.person_a, r.person_b, r.note, COALESCE(r.created_at, now())
  FROM jsonb_to_recordset(payload->'relationships') AS r(
    type public.relationship_type_enum, person_a uuid, person_b uuid, note text,
    created_at timestamptz
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
