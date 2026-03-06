import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getIsAdmin } from "@/utils/supabase/queries";

export async function POST(req: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    branchId: string;
    ai_enabled?: boolean;
    ai_provider?: string;
    ai_model?: string;
    ai_api_key?: string;
    ai_base_url?: string;
    ai_system_prompt?: string;
  };

  const { branchId, ...aiFields } = body;

  if (!branchId) {
    return NextResponse.json({ error: "Missing branchId" }, { status: 400 });
  }

  const supabase = await getSupabase();

  const { error } = await supabase
    .from("branch_bots")
    .update({
      ai_enabled: aiFields.ai_enabled ?? false,
      ai_provider: aiFields.ai_provider ?? null,
      ai_model: aiFields.ai_model ?? null,
      ai_api_key: aiFields.ai_api_key || null,
      ai_base_url: aiFields.ai_base_url || null,
      ai_system_prompt: aiFields.ai_system_prompt || null,
    })
    .eq("branch_id", branchId)
    .eq("platform", "telegram");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
