import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getIsAdmin } from "@/utils/supabase/queries";

export async function POST(req: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    platform_ai_api_key?: string;
    platform_ai_model?: string;
    platform_ai_base_url?: string;
  };

  const supabase = await getSupabase();

  const upserts = Object.entries(body)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ setting_key: key, setting_value: value as string }));

  if (upserts.length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("family_settings")
    .upsert(upserts, { onConflict: "setting_key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
