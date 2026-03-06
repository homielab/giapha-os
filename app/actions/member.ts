"use server";

import { logAudit } from "@/utils/auditLog";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string) {
  const profile = await getProfile();
  const supabase = await getSupabase();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return {
      error: "Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền xoá hồ sơ.",
    };
  }

  // 2. Check for existing relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) {
    console.error("Error checking relationships:", relationshipError);
    return { error: "Lỗi kiểm tra mối quan hệ gia đình." };
  }

  if (relationships && relationships.length > 0) {
    return {
      error:
        "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  // 3. Fetch person name before deleting for the audit log
  const { data: person } = await supabase
    .from("persons")
    .select("full_name")
    .eq("id", memberId)
    .single();

  // 4. Delete the member
  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    console.error("Error deleting person:", deleteError);
    return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };
  }

  // 5. Log the deletion
  await logAudit({
    personId: memberId,
    personName: person?.full_name ?? undefined,
    action: "delete",
  });

  // 6. Revalidate and redirect
  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}

export async function bulkDeleteMembers(memberIds: string[]): Promise<{
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const profile = await getProfile();
  const supabase = await getSupabase();

  if (profile?.role !== "admin") {
    return {
      deleted: [],
      failed: memberIds.map((id) => ({ id, error: "Chỉ Admin mới có thể xoá thành viên." })),
    };
  }

  const deleted: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const memberId of memberIds) {
    const { data: relationships, error: relationshipError } = await supabase
      .from("relationships")
      .select("id")
      .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
      .limit(1);

    if (relationshipError) {
      failed.push({ id: memberId, error: "Lỗi kiểm tra mối quan hệ gia đình." });
      continue;
    }

    if (relationships && relationships.length > 0) {
      failed.push({
        id: memberId,
        error: "Có mối quan hệ gia đình, không thể xoá.",
      });
      continue;
    }

    const { data: person } = await supabase
      .from("persons")
      .select("full_name")
      .eq("id", memberId)
      .single();

    const { error: deleteError } = await supabase
      .from("persons")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      failed.push({ id: memberId, error: "Lỗi khi xoá hồ sơ." });
      continue;
    }

    await logAudit({
      personId: memberId,
      personName: person?.full_name ?? undefined,
      action: "delete",
    });

    deleted.push(memberId);
  }

  revalidatePath("/dashboard/members");

  return { deleted, failed };
}
