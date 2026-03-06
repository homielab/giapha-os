"use server";

import { getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import type { BurialType, GraveStatus, RemainsStatus, GraveEventType } from "@/types";

async function requireEditor() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    throw new Error("Forbidden: Editor or Admin role required");
  }
  return { supabase, user };
}

// ==========================================
// GRAVE RECORDS ACTIONS
// ==========================================

export async function upsertGraveRecord(personId: string, data: {
  burial_type?: BurialType | null;
  grave_status?: GraveStatus;
  remains_status?: RemainsStatus;
  grave_type?: string | null;
  cemetery_name?: string | null;
  cemetery_address?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  cause_of_death?: string | null;
  epitaph?: string | null;
  caretaker_person_id?: string | null;
  branch_head_person_id?: string | null;
  public_memorial?: boolean;
}) {
  const { supabase } = await requireEditor();

  const { error } = await supabase
    .from("grave_records")
    .upsert({ ...data, person_id: personId }, { onConflict: "person_id" });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/members/${personId}`);
}

export async function deleteGraveRecord(personId: string) {
  const { supabase } = await requireEditor();

  const { error } = await supabase
    .from("grave_records")
    .delete()
    .eq("person_id", personId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/members/${personId}`);
}

export async function getGraveRecord(personId: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("grave_records")
    .select("*")
    .eq("person_id", personId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// ==========================================
// GRAVE EVENTS ACTIONS
// ==========================================

export async function addGraveEvent(graveId: string, data: {
  event_type: GraveEventType;
  event_date?: string | null;
  event_lunar_day?: number | null;
  event_lunar_month?: number | null;
  event_lunar_year?: number | null;
  event_lunar_is_leap?: boolean;
  notes?: string | null;
  conducted_by?: string | null;
}) {
  const { supabase } = await requireEditor();

  const { error } = await supabase
    .from("grave_events")
    .insert({ ...data, grave_id: graveId });

  if (error) throw new Error(error.message);
}

export async function updateGraveEvent(eventId: string, data: {
  event_type?: GraveEventType;
  event_date?: string | null;
  event_lunar_day?: number | null;
  event_lunar_month?: number | null;
  event_lunar_year?: number | null;
  event_lunar_is_leap?: boolean;
  notes?: string | null;
  conducted_by?: string | null;
}) {
  const { supabase } = await requireEditor();

  const { error } = await supabase
    .from("grave_events")
    .update(data)
    .eq("id", eventId);

  if (error) throw new Error(error.message);
}

export async function deleteGraveEvent(eventId: string, personId: string) {
  const { supabase } = await requireEditor();

  const { error } = await supabase
    .from("grave_events")
    .delete()
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/members/${personId}`);
}

export async function getGraveEvents(graveId: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("grave_events")
    .select("*")
    .eq("grave_id", graveId)
    .order("event_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ==========================================
// GRAVE PHOTOS ACTIONS
// ==========================================

export async function addGravePhoto(graveId: string, data: {
  storage_path: string;
  caption?: string | null;
  photo_tag?: string | null;
  is_panorama?: boolean;
}) {
  const { supabase, user } = await requireEditor();

  const { error } = await supabase
    .from("grave_photos")
    .insert({ ...data, grave_id: graveId, uploaded_by: user.id });

  if (error) throw new Error(error.message);
}

export async function deleteGravePhoto(photoId: string) {
  const { supabase } = await requireEditor();

  const { data: photo } = await supabase
    .from("grave_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (photo) {
    await supabase.storage.from("grave-photos").remove([photo.storage_path]);
  }

  const { error } = await supabase
    .from("grave_photos")
    .delete()
    .eq("id", photoId);

  if (error) throw new Error(error.message);
}

export async function getGravePhotos(graveId: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("grave_photos")
    .select("*")
    .eq("grave_id", graveId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ==========================================
// CEMETERY MAP (all graves with GPS)
// ==========================================

export async function getAllGravesWithGPS() {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("grave_records")
    .select(`
      id,
      person_id,
      grave_status,
      remains_status,
      cemetery_name,
      cemetery_address,
      gps_lat,
      gps_lng,
      public_memorial,
      persons (id, full_name, death_year)
    `)
    .not("gps_lat", "is", null)
    .not("gps_lng", "is", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}
