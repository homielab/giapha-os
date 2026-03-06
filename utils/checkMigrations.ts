import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface MigrationStatus {
  name: string;
  table: string;
  description: string;
  exists: boolean;
  sql: string;
}

const migrations: Omit<MigrationStatus, "exists">[] = [
  {
    name: "Bảng Thành Viên",
    table: "persons",
    description: "Bảng chính lưu thông tin thành viên trong gia phả",
    sql: `-- Enum types (run first if not exists)
DO $$ BEGIN
  CREATE TYPE public.gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.persons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender public.gender_enum NOT NULL,
  birth_year INT,
  birth_month INT,
  birth_day INT,
  death_year INT,
  death_month INT,
  death_day INT,
  is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_law BOOLEAN NOT NULL DEFAULT FALSE,
  birth_order INT,
  generation INT,
  other_names TEXT,
  avatar_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Bảng Quan Hệ",
    table: "relationships",
    description: "Quan hệ giữa các thành viên (cha/mẹ, vợ/chồng, anh/em…)",
    sql: `-- Enum type (run first if not exists)
DO $$ BEGIN
  CREATE TYPE public.relationship_type_enum AS ENUM (
    'parent', 'spouse', 'step_parent', 'sibling', 'half_sibling', 'godparent'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.relationship_type_enum NOT NULL,
  person_a UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  person_b UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_relationship CHECK (person_a != person_b),
  UNIQUE(person_a, person_b, type)
);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Hồ Sơ Người Dùng",
    table: "profiles",
    description: "Thông tin tài khoản, vai trò admin/editor/member",
    sql: `-- Enum type (run first if not exists)
DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM ('admin', 'editor', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role public.user_role_enum DEFAULT 'member' NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Thông Tin Riêng Tư",
    table: "person_details_private",
    description: "SĐT, nghề nghiệp, nơi ở (chỉ admin xem được)",
    sql: `CREATE TABLE IF NOT EXISTS public.person_details_private (
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT,
  occupation TEXT,
  current_residence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.person_details_private ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Sự Kiện",
    table: "custom_events",
    description: "Sự kiện tùy chỉnh của gia đình (giỗ, kỵ, lễ…)",
    sql: `CREATE TABLE IF NOT EXISTS public.custom_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Audit Log",
    table: "audit_log",
    description: "Lịch sử chỉnh sửa dữ liệu (ai, khi nào, thay đổi gì)",
    sql: `CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  person_name TEXT,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "Cài Đặt Gia Đình",
    table: "family_settings",
    description: "Cài đặt chia sẻ công khai, token truy cập",
    sql: `CREATE TABLE IF NOT EXISTS public.family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;`,
  },
];

export async function checkMigrationStatus(): Promise<MigrationStatus[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const results = await Promise.all(
    migrations.map(async (migration) => {
      const { error } = await supabase
        .from(migration.table)
        .select("id")
        .limit(1);

      // error.code '42P01' means "undefined_table" → table doesn't exist
      const exists = !error || error.code !== "42P01";

      return { ...migration, exists };
    }),
  );

  return results;
}
