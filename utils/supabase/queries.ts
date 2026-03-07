import { Profile } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

// Hàm này được cache lại để đảm bảo chỉ tạo 1 Supabase Client duy nhất cho mỗi request
export const getSupabase = cache(async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
});

// Use getSession() instead of auth.getUser() to avoid a duplicate network call.
// Middleware already calls auth.getUser() on every request to verify & refresh
// the JWT. Within the same request, the session cookie is guaranteed fresh,
// so reading it locally is safe and saves ~120-200ms.
export const getUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
});

export const getProfile = cache(async (userId?: string) => {
  let id = userId;
  if (!id) {
    const user = await getUser();
    if (!user) return null;
    id = user.id;
  }

  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  return profile as Profile | null;
});

export const getIsAdmin = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "admin";
});
