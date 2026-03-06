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
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "unknown";
export type Religion = "buddhist" | "catholic" | "protestant" | "islam" | "cao_dai" | "hoa_hao" | "none" | "other";
export type PrivacyLevel = "public" | "masked" | "private";

export interface Profile {
  id: string;
  role: UserRole;
  is_active: boolean;
  account_status?: "pending" | "active" | "rejected" | "suspended";
  phone_number?: string | null;
  onboarding_completed?: boolean;
  linked_person_id?: string | null;
  verified_father_id?: string | null;
  verified_mother_id?: string | null;
  verification_score?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  account_status?: string;
  created_at: string;
}

export interface WorkHistoryEntry {
  org: string;
  role: string;
  start_year?: number | null;
  end_year?: number | null;
}

export interface EducationHistoryEntry {
  school: string;
  degree?: string | null;
  year?: number | null;
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

  // Core fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  place_of_birth: string | null;

  // Phase 6: Extended profile
  birth_name?: string | null;
  common_name?: string | null;
  saint_name?: string | null;
  religion?: Religion | null;
  religious_title?: string | null;
  civil_title?: string | null;
  career_description?: string | null;
  work_history?: WorkHistoryEntry[] | null;
  education_history?: EducationHistoryEntry[] | null;
  awards?: string | null;
  marital_status?: MaritalStatus | null;

  // Phase 6: Privacy
  privacy_level?: PrivacyLevel | null;

  // Phase 6: Branch
  branch_id?: string | null;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  person_a: string;
  person_b: string;
  note?: string | null;
  marriage_order?: number | null;
  marriage_start_year?: number | null;
  marriage_end_year?: number | null;
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
// BRANCH / CHI TYPES (v1.1)
// ==========================================

export interface Branch {
  id: string;
  name: string;
  description?: string | null;
  root_person_id?: string | null;
  display_order: number;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  default_root_person_id?: string | null;
  default_branch_id?: string | null;
  tree_view_mode: string;
  updated_at: string;
}

// ==========================================
// INVITATION TYPES (v1.1)
// ==========================================

export interface Invitation {
  id: string;
  token: string;
  branch_id?: string | null;
  invited_by?: string | null;
  role: "member" | "editor";
  email?: string | null;
  max_uses: number;
  uses_count: number;
  expires_at?: string | null;
  created_at: string;
}

// ==========================================
// FAMILY EVENT TYPES (v1.1)
// ==========================================

export type FamilyEventType = "gio_ho" | "wedding" | "funeral" | "reunion" | "ceremony" | "other";

export interface FamilyEvent {
  id: string;
  title: string;
  event_type: FamilyEventType;
  event_date: string;
  location?: string | null;
  description?: string | null;
  organizer_person_id?: string | null;
  branch_id?: string | null;
  is_public: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface FamilyEventPhoto {
  id: string;
  event_id: string;
  storage_path: string;
  caption?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

// ==========================================
// ACTIVITY FEED TYPES (v1.1)
// ==========================================

export interface ActivityFeedItem {
  id: string;
  activity_type: string;
  actor_user_id?: string | null;
  subject_person_id?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  message: string;
  meta?: Record<string, unknown> | null;
  is_public: boolean;
  created_at: string;
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
