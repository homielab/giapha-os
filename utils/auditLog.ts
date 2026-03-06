"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function logAudit(params: {
  personId?: string;
  personName?: string;
  action: "create" | "update" | "delete";
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("audit_log").insert({
      person_id: params.personId ?? null,
      person_name: params.personName ?? null,
      action: params.action,
      field_changed: params.fieldChanged ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      changed_by: user.id,
      changed_by_email: user.email ?? null,
    });
  } catch {
    // Silently fail — don't break the main flow
  }
}
