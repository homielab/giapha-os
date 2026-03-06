"use server";

import { Relationship } from "@/types";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload shape cho file backup JSON.
 * Các field DB-managed (created_at, updated_at) được giữ để tham khảo
 * nhưng sẽ bị loại bỏ khi import lại.
 */
interface PersonExport {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  avatar_url: string | null;
  note: string | null;
  // DB-managed fields (kept in export for traceability, stripped on import)
  created_at?: string;
  updated_at?: string;
}

interface RelationshipExport {
  id?: string;
  type: string;
  person_a: string;
  person_b: string;
  created_at?: string;
  updated_at?: string;
}

interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonExport[];
  relationships: RelationshipExport[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_GENDERS = new Set(["male", "female", "other"]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_RELATIONSHIP_TYPES = new Set([
  "parent_child", "spouse", "sibling", "adopted", "step_parent",
  "parent", "child", "husband", "wife", "other",
]);

function isNullableInt(v: unknown): boolean {
  return v === null || (typeof v === "number" && Number.isInteger(v));
}

function validatePerson(p: unknown, index: number): string | null {
  if (typeof p !== "object" || p === null) return `persons[${index}]: không phải object`;
  const obj = p as Record<string, unknown>;

  if (typeof obj.id !== "string" || !UUID_REGEX.test(obj.id))
    return `persons[${index}]: id phải là UUID hợp lệ`;
  if (typeof obj.full_name !== "string" || obj.full_name.trim().length === 0)
    return `persons[${index}]: full_name không được rỗng`;
  if (obj.full_name.length > 255)
    return `persons[${index}]: full_name quá dài (tối đa 255 ký tự)`;
  if (typeof obj.gender !== "string" || !VALID_GENDERS.has(obj.gender))
    return `persons[${index}] "${obj.full_name}": gender phải là male/female/other`;
  if (!isNullableInt(obj.birth_year)) return `persons[${index}]: birth_year phải là số nguyên hoặc null`;
  if (!isNullableInt(obj.birth_month)) return `persons[${index}]: birth_month phải là số nguyên hoặc null`;
  if (!isNullableInt(obj.birth_day)) return `persons[${index}]: birth_day phải là số nguyên hoặc null`;
  if (!isNullableInt(obj.death_year)) return `persons[${index}]: death_year phải là số nguyên hoặc null`;
  if (!isNullableInt(obj.death_month)) return `persons[${index}]: death_month phải là số nguyên hoặc null`;
  if (!isNullableInt(obj.death_day)) return `persons[${index}]: death_day phải là số nguyên hoặc null`;

  const birthYear = obj.birth_year as number | null;
  const deathYear = obj.death_year as number | null;
  if (birthYear !== null && (birthYear < 1 || birthYear > 2100))
    return `persons[${index}]: birth_year ngoài phạm vi hợp lệ (1–2100)`;
  if (deathYear !== null && birthYear !== null && deathYear < birthYear)
    return `persons[${index}] "${obj.full_name}": death_year (${deathYear}) không thể nhỏ hơn birth_year (${birthYear})`;

  return null;
}

function validateRelationship(r: unknown, index: number, personIds: Set<string>): string | null {
  if (typeof r !== "object" || r === null) return `relationships[${index}]: không phải object`;
  const obj = r as Record<string, unknown>;

  if (typeof obj.type !== "string" || (!VALID_RELATIONSHIP_TYPES.has(obj.type) && !obj.type))
    return `relationships[${index}]: type không hợp lệ`;
  if (typeof obj.person_a !== "string" || !UUID_REGEX.test(obj.person_a))
    return `relationships[${index}]: person_a phải là UUID hợp lệ`;
  if (typeof obj.person_b !== "string" || !UUID_REGEX.test(obj.person_b))
    return `relationships[${index}]: person_b phải là UUID hợp lệ`;
  if (obj.person_a === obj.person_b)
    return `relationships[${index}]: person_a và person_b không được giống nhau`;
  if (!personIds.has(obj.person_a as string))
    return `relationships[${index}]: person_a (${obj.person_a}) không tồn tại trong danh sách persons`;
  if (!personIds.has(obj.person_b as string))
    return `relationships[${index}]: person_b (${obj.person_b}) không tồn tại trong danh sách persons`;

  return null;
}

/** Validate import payload structure and data integrity. Returns error string or null. */
function validateImportPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null)
    return "Dữ liệu không hợp lệ: phải là object JSON.";

  const obj = payload as Record<string, unknown>;

  if (!Array.isArray(obj.persons))
    return "Dữ liệu không hợp lệ: thiếu mảng persons.";
  if (!Array.isArray(obj.relationships))
    return "Dữ liệu không hợp lệ: thiếu mảng relationships.";
  if (obj.persons.length === 0)
    return "File backup trống — không có thành viên nào để phục hồi.";
  if (obj.persons.length > 50_000)
    return `Quá nhiều bản ghi persons (${obj.persons.length}). Tối đa 50,000.`;
  if (obj.relationships.length > 200_000)
    return `Quá nhiều bản ghi relationships (${obj.relationships.length}). Tối đa 200,000.`;

  // Validate persons
  for (let i = 0; i < obj.persons.length; i++) {
    const err = validatePerson(obj.persons[i], i);
    if (err) return err;
  }

  // Check for duplicate IDs
  const personIds = new Set<string>();
  for (const p of obj.persons as Array<{ id: string }>) {
    if (personIds.has(p.id)) return `persons: trùng id "${p.id}"`;
    personIds.add(p.id);
  }

  // Validate relationships (referential integrity check)
  for (let i = 0; i < obj.relationships.length; i++) {
    const err = validateRelationship(obj.relationships[i], i, personIds);
    if (err) return err;
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Các field được phép insert vào bảng persons (loại bỏ created_at/updated_at)
function sanitizePerson(
  p: PersonExport,
): Omit<PersonExport, "created_at" | "updated_at"> {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null,
  };
}

function sanitizeRelationship(
  r: RelationshipExport,
): Omit<RelationshipExport, "id" | "created_at" | "updated_at"> {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(
  exportRootId?: string,
): Promise<BackupPayload | { error: string }> {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  const supabase = await getSupabase();

  // Fetch ALL persons and relationships first to perform traversal in memory.
  // This is safe since typical family trees are < 10,000 nodes, easily fitting in memory.
  const { data: allPersons, error: personsError } = await supabase
    .from("persons")
    .select(
      "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note, created_at, updated_at",
    )
    .order("created_at", { ascending: true });

  if (personsError)
    return { error: "Lỗi tải dữ liệu persons: " + personsError.message };

  const { data: allRels, error: relationshipsError } = await supabase
    .from("relationships")
    .select("id, type, person_a, person_b, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (relationshipsError)
    return {
      error: "Lỗi tải dữ liệu relationships: " + relationshipsError.message,
    };

  let exportPersons = (allPersons ?? []) as PersonExport[];
  let exportRels = (allRels ?? []) as RelationshipExport[];

  // If a root person is selected, filter the export to only their subtree
  if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
    const includedPersonIds = new Set<string>([exportRootId]);

    // 1. Traverse biological and adopted children recursively
    const findDescendants = (parentId: string) => {
      exportRels
        .filter(
          (r) =>
            (r.type === "biological_child" || r.type === "adopted_child") &&
            r.person_a === parentId,
        )
        .forEach((r) => {
          if (!includedPersonIds.has(r.person_b)) {
            includedPersonIds.add(r.person_b);
            findDescendants(r.person_b);
          }
        });
    };
    findDescendants(exportRootId);

    // 2. Add spouses for everyone in the tree so far
    const descendantsArray = Array.from(includedPersonIds); // snapshot current members
    descendantsArray.forEach((personId) => {
      exportRels
        .filter(
          (r) =>
            r.type === "marriage" &&
            (r.person_a === personId || r.person_b === personId),
        )
        .forEach((r) => {
          const spouseId = r.person_a === personId ? r.person_b : r.person_a;
          includedPersonIds.add(spouseId);
        });
    });

    // 3. Filter the payload
    exportPersons = exportPersons.filter((p) => includedPersonIds.has(p.id));
    exportRels = exportRels.filter(
      (r) =>
        includedPersonIds.has(r.person_a) && includedPersonIds.has(r.person_b),
    );
  }

  return {
    version: 2, // bumped for schema with birth_order + generation
    timestamp: new Date().toISOString(),
    persons: exportPersons,
    relationships: exportRels,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(
  importPayload:
    | BackupPayload
    | {
        persons: PersonExport[];
        relationships: Relationship[];
      },
) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return { error: "Từ chối truy cập. Chỉ admin mới có quyền này." };
  }

  const supabase = await getSupabase();

  // Validate payload structure and data integrity before touching the database
  const validationError = validateImportPayload(importPayload);
  if (validationError) return { error: validationError };

  // 1. Xoá relationships trước (FK constraint)
  const { error: delRelError } = await supabase
    .from("relationships")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (delRelError)
    return { error: "Lỗi khi xoá relationships cũ: " + delRelError.message };

  // 2. Xoá persons
  const { error: delPersonsError } = await supabase
    .from("persons")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (delPersonsError)
    return { error: "Lỗi khi xoá persons cũ: " + delPersonsError.message };

  // 3. Insert persons (sanitized — chỉ giữ các field schema hiện tại)
  const CHUNK = 200;
  const persons = importPayload.persons.map(sanitizePerson);

  for (let i = 0; i < persons.length; i += CHUNK) {
    const chunk = persons.slice(i, i + CHUNK);
    const { error } = await supabase.from("persons").insert(chunk);
    if (error)
      return {
        error: `Lỗi khi import persons (chunk ${i / CHUNK + 1}): ${error.message}`,
      };
  }

  // 4. Insert relationships (stripped of id/created_at to avoid conflicts)
  const relationships = importPayload.relationships.map(sanitizeRelationship);

  for (let i = 0; i < relationships.length; i += CHUNK) {
    const chunk = relationships.slice(i, i + CHUNK);
    const { error } = await supabase.from("relationships").insert(chunk);
    if (error)
      return {
        error: `Lỗi khi import relationships (chunk ${i / CHUNK + 1}): ${error.message}`,
      };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/data");

  return {
    success: true,
    imported: {
      persons: persons.length,
      relationships: relationships.length,
    },
  };
}
