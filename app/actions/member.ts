"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function changeUserRole(userId: string, newRole: UserRole) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) {
    throw new Error("Không thể thay đổi quyền người dùng.");
  }

  revalidatePath("/dashboard/users");
}
