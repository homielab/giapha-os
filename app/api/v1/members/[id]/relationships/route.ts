import { validateApiKey } from "@/utils/validateApiKey";
import { createApiSupabaseClient } from "@/utils/supabase/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function errorResponse(error: string, code: string, status: number) {
  return Response.json({ error, code }, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return errorResponse(auth.error ?? "Unauthorized", "UNAUTHORIZED", 401);
  }

  const { id } = await params;
  const supabase = createApiSupabaseClient();

  // Verify person exists
  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id, full_name")
    .eq("id", id)
    .single();

  if (personError || !person) {
    return errorResponse("Member not found", "NOT_FOUND", 404);
  }

  const { data: relationships, error } = await supabase
    .from("relationships")
    .select("id, type, person_a, person_b, note")
    .or(`person_a.eq.${id},person_b.eq.${id}`);

  if (error) {
    return errorResponse("Failed to fetch relationships", "DB_ERROR", 500);
  }

  const relatedIds = (relationships ?? []).flatMap((r) =>
    r.person_a === id ? [r.person_b] : [r.person_a],
  );

  let relatedPersons: Record<
    string,
    { id: string; full_name: string; gender: string; generation: number | null }
  > = {};
  if (relatedIds.length > 0) {
    const { data: related } = await supabase
      .from("persons")
      .select("id, full_name, gender, generation")
      .in("id", relatedIds);
    relatedPersons = Object.fromEntries((related ?? []).map((p) => [p.id, p]));
  }

  const data = (relationships ?? []).map((r) => {
    const otherId = r.person_a === id ? r.person_b : r.person_a;
    const direction = r.person_a === id ? "outgoing" : "incoming";
    return {
      id: r.id,
      type: r.type,
      direction,
      related_person: relatedPersons[otherId] ?? { id: otherId },
      note: r.note ?? null,
    };
  });

  return jsonResponse({ member_id: id, data });
}
