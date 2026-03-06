"use server";

import { getIsAdmin, getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `giapha_${hex}`;
}

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

export async function toggleApiKey(enabled: boolean) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const user = await getUser();
  const supabase = await getSupabase();

  const { error } = await supabase.from("family_settings").upsert(
    {
      setting_key: "api_key_enabled",
      setting_value: enabled ? "true" : "false",
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );

  if (error) throw new Error(error.message);

  // Generate a key automatically on first enable if none exists
  if (enabled) {
    const { data: existing } = await supabase
      .from("family_settings")
      .select("setting_value")
      .eq("setting_key", "api_key_value")
      .single();

    if (!existing?.setting_value) {
      const newKey = generateApiKey();
      const { error: keyError } = await supabase.from("family_settings").upsert(
        {
          setting_key: "api_key_value",
          setting_value: newKey,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      );
      if (keyError) throw new Error(keyError.message);
      revalidatePath("/dashboard/settings");
      return newKey;
    }
  }

  revalidatePath("/dashboard/settings");
  return null;
}

export async function regenerateApiKey() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const user = await getUser();
  const supabase = await getSupabase();

  const newKey = generateApiKey();

  const { error } = await supabase.from("family_settings").upsert(
    {
      setting_key: "api_key_value",
      setting_value: newKey,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return newKey;
}
