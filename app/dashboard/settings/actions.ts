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

export interface NotificationSettingsData {
  id: string | null;
  enabled: boolean;
  days_before: number[];
  email_recipients: string[];
}

export async function getNotificationSettings(): Promise<NotificationSettingsData> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = await getSupabase();
  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return { id: null, enabled: false, days_before: [7], email_recipients: [] };
  }

  return {
    id: data.id as string,
    enabled: data.enabled as boolean,
    days_before: (data.days_before as number[]) ?? [7],
    email_recipients: (data.email_recipients as string[]) ?? [],
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && !/[\r\n]/.test(email);
}

export async function saveNotificationSettings(
  enabled: boolean,
  daysBefore: number[],
  emailRecipients: string[],
): Promise<void> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  if (!emailRecipients.every(isValidEmail)) {
    throw new Error("One or more email addresses are invalid");
  }

  const supabase = await getSupabase();

  // Get existing row id if any
  const { data: existing } = await supabase
    .from("notification_settings")
    .select("id")
    .limit(1)
    .single();

  if (existing?.id) {
    const { error } = await supabase
      .from("notification_settings")
      .update({
        enabled,
        days_before: daysBefore,
        email_recipients: emailRecipients,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("notification_settings").insert({
      enabled,
      days_before: daysBefore,
      email_recipients: emailRecipients,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}

export async function sendTestNotificationEmail(
  recipients: string[],
): Promise<void> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  if (recipients.length === 0) throw new Error("No email recipients configured");

  const html = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #78350f;">🔔 Email thông báo thử nghiệm</h2>
  <p>Đây là email thử nghiệm từ hệ thống thông báo Gia Phả OS.</p>
  <p>Nếu bạn nhận được email này, tức là cấu hình email của bạn đã hoạt động đúng.</p>
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 16px 0;" />
  <p style="color: #78716c; font-size: 13px;">Gia Phả OS — Hệ thống quản lý gia phả</p>
</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Gia Phả OS <onboarding@resend.dev>",
      to: recipients,
      subject: "🔔 Email thông báo thử nghiệm — Gia Phả OS",
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error: ${response.status} ${body}`);
  }
}
