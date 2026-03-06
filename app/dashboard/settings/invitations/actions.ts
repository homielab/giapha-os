"use server";

import { getIsAdmin, getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

export async function createInvitation(data: {
  branch_id: string | null;
  role: "member" | "editor";
  email: string;
  max_uses: number;
  expires_days: number | null;
}) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const user = await getUser();
  const supabase = await getSupabase();

  const expires_at = data.expires_days
    ? new Date(Date.now() + data.expires_days * 86400 * 1000).toISOString()
    : null;

  const { data: created, error } = await supabase
    .from("invitations")
    .insert({
      branch_id: data.branch_id,
      invited_by: user?.id,
      role: data.role,
      email: data.email || null,
      max_uses: data.max_uses,
      expires_at,
    })
    .select("token")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/invitations");
  return created?.token;
}

export async function deleteInvitation(id: string) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized");

  const supabase = await getSupabase();
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings/invitations");
}

export async function useInvitationToken(
  token: string,
  userData: { full_name: string; phone_number: string },
) {
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  // Verify token
  const { data: inv, error: invError } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (invError || !inv) throw new Error("Mã mời không hợp lệ");
  if (inv.uses_count >= inv.max_uses) throw new Error("Mã mời đã hết lượt sử dụng");
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new Error("Mã mời đã hết hạn");

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      account_status: "active",
      is_active: true,
      phone_number: userData.phone_number || null,
      onboarding_completed: true,
      invited_via_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) throw new Error(profileError.message);

  // Increment uses_count
  await supabase
    .from("invitations")
    .update({ uses_count: inv.uses_count + 1 })
    .eq("id", inv.id);

  revalidatePath("/dashboard");
  return { branch_id: inv.branch_id };
}
