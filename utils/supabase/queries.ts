import { Profile } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

// Hàm này được cache lại để đảm bảo chỉ tạo 1 Supabase Client duy nhất cho mỗi request
export const getSupabase = cache(async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
});

export const getUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getSettings = cache(async () => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
  return data;
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
