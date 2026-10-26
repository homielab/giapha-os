-- Update the generation (and, for the lineage tool, birth order and in-law
-- flag) of many members in a single statement and transaction.
-- Before this function the app sent one UPDATE per member: a large family
-- needed hundreds of round-trips, and an error halfway left some members on
-- the new generations and the rest on the old ones. Now either every listed
-- member is updated or none is.
--
-- Payload (built by the app, see utils/generationUpdates.ts): a JSON array,
--   [{ "id": "<uuid>", "generation": 3, "birth_order": 1, "is_in_law": false }]
-- "id" is required; a column is only changed when its key is present, so
-- [{ "id": "...", "generation": 4 }] leaves birth_order and is_in_law alone.
-- Returns the number of members updated.
--
-- SECURITY INVOKER on purpose: the UPDATE runs with the caller's rights, so
-- the persons RLS policies (admins and editors only) still apply. A row the
-- caller may not update, or an id that no longer exists, is reported as an
-- error and rolls the whole call back.

CREATE OR REPLACE FUNCTION public.update_generations(updates jsonb)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  expected integer;
  actual integer;
BEGIN
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid generation updates: expected a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  expected := jsonb_array_length(updates);
  IF expected = 0 THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(updates) AS e(item)
    WHERE jsonb_typeof(e.item) IS DISTINCT FROM 'object'
       OR jsonb_typeof(e.item->'id') IS DISTINCT FROM 'string'
  ) THEN
    RAISE EXCEPTION 'Invalid generation updates: every row needs an "id".'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(DISTINCT e.item->>'id')
    FROM jsonb_array_elements(updates) AS e(item)
  ) <> expected THEN
    RAISE EXCEPTION 'Invalid generation updates: a member is listed twice.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.persons AS p
  SET
    generation = CASE WHEN u.item ? 'generation'
      THEN (u.item->>'generation')::integer ELSE p.generation END,
    birth_order = CASE WHEN u.item ? 'birth_order'
      THEN (u.item->>'birth_order')::integer ELSE p.birth_order END,
    is_in_law = CASE WHEN u.item ? 'is_in_law'
      THEN (u.item->>'is_in_law')::boolean ELSE p.is_in_law END
  FROM (
    SELECT (e.item->>'id')::uuid AS id, e.item
    FROM jsonb_array_elements(updates) AS e(item)
  ) AS u
  WHERE p.id = u.id;
  GET DIAGNOSTICS actual = ROW_COUNT;

  IF actual <> expected THEN
    RAISE EXCEPTION 'Updated % of % members: some were deleted meanwhile or you may not edit them. Nothing was changed.',
      actual, expected
      USING ERRCODE = 'P0002';
  END IF;

  RETURN actual;
END;
$$;

REVOKE ALL ON FUNCTION public.update_generations(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_generations(jsonb) TO authenticated;

-- Let PostgREST see the new function right away.
NOTIFY pgrst, 'reload schema';
