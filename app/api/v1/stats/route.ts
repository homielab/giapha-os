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

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if (!auth.valid) {
    return errorResponse(auth.error ?? "Unauthorized", "UNAUTHORIZED", 401);
  }

  const supabase = createApiSupabaseClient();

  const { data: persons, error } = await supabase
    .from("persons")
    .select("id, gender, generation, is_deceased");

  if (error) {
    return errorResponse("Failed to fetch statistics", "DB_ERROR", 500);
  }

  const all = persons ?? [];
  const total = all.length;

  const byGender = all.reduce(
    (acc, p) => {
      const key = (p.gender as string) ?? "other";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byGeneration = all.reduce(
    (acc, p) => {
      if (p.generation != null) {
        const key = String(p.generation);
        acc[key] = (acc[key] ?? 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const deceased = all.filter((p) => p.is_deceased).length;
  const alive = total - deceased;

  return jsonResponse({
    total,
    by_gender: byGender,
    by_generation: byGeneration,
    alive,
    deceased,
  });
}
