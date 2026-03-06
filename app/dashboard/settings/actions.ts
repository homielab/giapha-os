"use server";

import { getIsAdmin, getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export async function togglePublicShare(enabled: boolean) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const user = await getUser();
  const supabase = await getSupabase();

  const { error } = await supabase.from("family_settings").upsert(
    {
      setting_key: "public_share_enabled",
      setting_value: enabled ? "true" : "false",
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function regenerateToken() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const user = await getUser();
  const supabase = await getSupabase();

  const newToken = crypto.randomUUID();

  const { error } = await supabase.from("family_settings").upsert(
    {
      setting_key: "public_share_token",
      setting_value: newToken,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return newToken;
}
