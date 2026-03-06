export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child"
  | "step_parent"
  | "sibling"
  | "half_sibling"
  | "godparent";
export type UserRole = "admin" | "editor" | "member";

export interface Profile {
  id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Person {
  id: string;
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  avatar_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;

  // Private fields (optional, as they might not be returned for members)
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;

  // New fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  place_of_birth: string | null;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  person_a: string; // UUID
  person_b: string; // UUID
  note?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for UI
export interface PersonWithDetails extends Person {
  spouses?: Person[];
  children?: Person[];
  parents?: Person[];
}

// ==========================================
// GRAVE MODULE TYPES (v1.1)
// ==========================================

export type BurialType =
  | "burial"
  | "cremation"
  | "cremation_urn"
  | "sea_burial"
  | "other";

export type GraveStatus =
  | "no_grave"
  | "has_grave"
  | "grave_moved"
  | "cremated_urn"
  | "unknown";

export type RemainsStatus =
  | "in_ground"
  | "exhumed"
  | "cremated_ashes"
  | "urn_home"
  | "unknown";

export type GraveEventType =
  | "burial"
  | "exhumation"
  | "grave_construction"
  | "grave_renovation"
  | "cremation"
  | "urn_placement"
  | "cleaning"
  | "other";

export interface GraveRecord {
  id: string;
  person_id: string;

  burial_type: BurialType | null;
  grave_status: GraveStatus;
  remains_status: RemainsStatus;

  grave_type: string | null;
  cemetery_name: string | null;
  cemetery_address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;

  cause_of_death: string | null;
  epitaph: string | null;
  caretaker_person_id: string | null;
  branch_head_person_id: string | null;

  panorama_url: string | null;
  public_memorial: boolean;

  created_at: string;
  updated_at: string;
}

export interface GraveEvent {
  id: string;
  grave_id: string;
  event_type: GraveEventType;
  event_date: string | null;         // ISO date string
  event_lunar_day: number | null;
  event_lunar_month: number | null;
  event_lunar_year: number | null;
  event_lunar_is_leap: boolean;
  notes: string | null;
  conducted_by: string | null;
  created_at: string;
}

export interface GravePhoto {
  id: string;
  grave_id: string;
  storage_path: string;
  caption: string | null;
  photo_tag: string | null;
  is_panorama: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface GraveRecordWithDetails extends GraveRecord {
  events?: GraveEvent[];
  photos?: GravePhoto[];
  caretaker?: Person | null;
  branch_head?: Person | null;
}
