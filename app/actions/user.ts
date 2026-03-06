"use server";

import { UserRole } from "@/types";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) throw new Error("Unauthorized: Admin role required");
}

export async function changeUserRole(userId: string, newRole: UserRole) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to change user role:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_user", {
    target_user_id: userId,
  });

  if (error) {
    console.error("Failed to delete user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() || "member";

  if (role !== "admin" && role !== "editor" && role !== "member") {
    return { error: "Vai trò không hợp lệ." };
  }

  const isActiveStr = formData.get("is_active")?.toString();
  const isActive = isActiveStr === "false" ? false : true;

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  if (password.length < 8) {
    return { error: "Mật khẩu phải có ít nhất 8 ký tự." };
  }

  const supabase = await getSupabase();

  const { error } = await supabase.rpc("admin_create_user", {
    new_email: email,
    new_password: password,
    new_role: role,
    new_active: isActive,
  });

  if (error) {
    console.error("Failed to create user:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_active_status", {
    target_user_id: userId,
    new_status: newStatus,
  });

  if (error) {
    console.error("Failed to change user status:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function approveUser(userId: string) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: "active",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectUser(userId: string) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: "rejected",
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function batchApproveUsers(userIds: string[]) {
  try { await requireAdmin(); } catch { return { error: "Không có quyền thực hiện." }; }
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: "active",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .in("id", userIds);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard");
  return { success: true };
}
