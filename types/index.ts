export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
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

  // Lunar Date
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;

  // New fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;

  // Gia Pha Viet new fields
  hometown: string | null;
  grave_address: string | null;
  is_eldest_son: boolean;
  is_eldest_grandson: boolean;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  logo_url: string | null;
  footer_address: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  footer_custom_text: string | null;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'cong_duc' | 'khuyen_hoc' | 'thu_chi_chung';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  date: string;
  contributor_name: string | null;
  person_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  thumbnail_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
