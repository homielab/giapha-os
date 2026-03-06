import { validateApiKey } from "@/utils/validateApiKey";
import { createApiSupabaseClient } from "@/utils/supabase/api";
import { NextRequest } from "next/server";

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

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return errorResponse(auth.error ?? "Unauthorized", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
  );
  const generation = searchParams.get("generation");
  const gender = searchParams.get("gender");
  const search = searchParams.get("search");

  const supabase = createApiSupabaseClient();

  let query = supabase
    .from("persons")
    .select(
      "id, full_name, birth_year, death_year, gender, generation, is_deceased, is_in_law, avatar_url",
      { count: "exact" },
    )
    .order("generation", { ascending: true })
    .order("birth_year", { ascending: true, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (generation) {
    query = query.eq("generation", parseInt(generation, 10));
  }
  if (gender) {
    query = query.eq("gender", gender);
  }
  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return errorResponse("Failed to fetch members", "DB_ERROR", 500);
  }

  return jsonResponse({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
