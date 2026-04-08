"use client";

import { Person, Relationship } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface LineageManagerProps {
  persons: Person[];
  relationships: Relationship[];
}

interface ComputedUpdate {
  id: string;
  full_name: string;
  old_generation: number | null;
  new_generation: number | null;
  old_birth_order: number | null;
  new_birth_order: number | null;
  old_is_in_law: boolean;
  new_is_in_law: boolean;
  gender: string;
  changed: boolean;
}

// ─── Algorithm helpers ────────────────────────────────────────────────────────

function computeGenerations(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  // Build child→parents map (only biological/adopted relationships)
  const childParents = new Map<string, string[]>();
  // Build parent→children map
  const parentChildren = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      // person_a = parent, person_b = child
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);

      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    }
  }

  // Build marriage map: person → spouses
  const spouseMap = new Map<string, string[]>();
  for (const r of relationships) {
    if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  }

  // Roots = persons who have NO parents AND NO spouses
  // (If they have a spouse, we'll try to get their generation from the spouse later or vice versa)
  const trueRoots = persons.filter(
    (p) => !childParents.has(p.id) && !spouseMap.has(p.id),
  );

  // Also include persons who have spouses, but neither they nor any of their spouses have parents
  // (to jumpstart disconnected families)
  const processedRoots = new Set(trueRoots.map((p) => p.id));
  for (const p of persons.filter(
    (p) => !childParents.has(p.id) && spouseMap.has(p.id),
  )) {
    const spouses = spouseMap.get(p.id) || [];
    const anySpouseHasParents = spouses.some((sId) => childParents.has(sId));
    if (
      !anySpouseHasParents &&
      !processedRoots.has(p.id) &&
      !spouses.some((sId) => processedRoots.has(sId))
    ) {
      // If neither this person nor their spouse has parents, pick one as a root
      trueRoots.push(p);
      processedRoots.add(p.id);
    }
  }

  const genMap = new Map<string, number>();

  // BFS from roots
  const queue: Array<{ id: string; gen: number }> = trueRoots.map((r) => ({
    id: r.id,
    gen: 1,
  }));

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;

    // Use the longest path (deepest generation)
    // If we've already found a path that makes this person an equal or deeper generation, stop
    if (genMap.has(id) && gen <= genMap.get(id)!) {
      continue;
    }

    genMap.set(id, gen);

    // Propagate to children
    const children = parentChildren.get(id) || [];
    for (const childId of children) {
      queue.push({ id: childId, gen: gen + 1 });
    }

    // Propagate to spouses to ensure they process their children too,
    // and they get an equal generation.
    const spouses = spouseMap.get(id) || [];
    for (const spouseId of spouses) {
      // We don't want to endlessly loop between spouses, so only push if spouse has a smaller/no generation
      if (!genMap.has(spouseId) || gen > genMap.get(spouseId)!) {
        queue.push({ id: spouseId, gen: gen });
      }
    }
  }

  // Fallback for anyone missed (e.g. disconnected loops)
  // Assign generation to spouses based on their partner's generation
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (genMap.has(p.id)) continue;
      const spouses = spouseMap.get(p.id) || [];
      for (const spouseId of spouses) {
        if (genMap.has(spouseId)) {
          genMap.set(p.id, genMap.get(spouseId)!);
          changed = true;
          break;
        }
      }
    }
  }

  // Persons not reachable from any root (orphaned or disconnected in-laws)
  // leave generation as null -- we don't assign them
  return genMap;
}

function computeInLaws(
  persons: Person[],
  relationships: Relationship[],
): Map<string, boolean> {
  // A person is an in-law if they have a spouse in the tree but no parents in the tree
  const childParents = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  }

  const inLawMap = new Map<string, boolean>();

  // Identify "roots" - people with no parents
  for (const p of persons) {
    const hasParents = childParents.has(p.id);
    const hasSpouse = spouseMap.has(p.id);

    // Rule: If they have parents in the tree, they are bloodline (NOT in-law)
    if (hasParents) {
      inLawMap.set(p.id, false);
      continue;
    }

    // Rule: If they have no parents but DO have a spouse
    if (hasSpouse) {
      // Ambiguity check: If NEITHER spouse has parents, one is root, one is in-law.
      // Usually, we keep the one already marked as NOT in-law as the root,
      // or we use gender as a fallback (male = bloodline in many traditional Vietnamese genealogies).
      const spouses = spouseMap.get(p.id) || [];
      const anySpouseHasParents = spouses.some((sId) => childParents.has(sId));

      if (anySpouseHasParents) {
        // Spouse is bloodline -> this person is definitely an in-law
        inLawMap.set(p.id, true);
      } else {
        // Neither has parents. Identify the "core" ancestor.
        // If one is already marked as not in-law in DB, keep it.
        // Otherwise, prioritize male.
        const spousesData = spouses.map((sId) =>
          persons.find((per) => per.id === sId),
        );
        const shouldBeBloodline =
          !p.is_in_law ||
          (p.gender === "male" &&
            spousesData.every((s) => s?.gender !== "male"));

        inLawMap.set(p.id, !shouldBeBloodline);
      }
    } else {
      // No parents and no spouse -> Root (Generation 1) -> NOT in-law
      inLawMap.set(p.id, false);
    }
  }

  return inLawMap;
}

function computeBirthOrders(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  // For each parent→children group, sort by birth_year and assign order
  const parentChildren = new Map<string, Set<string>>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!parentChildren.has(r.person_a))
        parentChildren.set(r.person_a, new Set());
      parentChildren.get(r.person_a)!.add(r.person_b);
    }
  }

  const personsById = new Map(persons.map((p) => [p.id, p]));
  const orderMap = new Map<string, number>();

  for (const [, childIds] of parentChildren) {
    // Sort children by birth_year (nulls last), then by name alphabetically
    const sorted = Array.from(childIds).sort((a, b) => {
      const pa = personsById.get(a);
      const pb = personsById.get(b);
      const aYear = pa?.birth_year ?? Infinity;
      const bYear = pb?.birth_year ?? Infinity;
      if (aYear !== bYear) return aYear - bYear;
      return (pa?.full_name ?? "").localeCompare(pb?.full_name ?? "", "vi");
    });

    // Only assign order to non-in-law children
    let order = 1;
    for (const childId of sorted) {
      const p = personsById.get(childId);
      if (p && !p.is_in_law) {
        // Keep the largest order if already assigned from another parent
        // (e.g., father has 3 kids, mother has 1 kid. the mother's 1st kid might be father's 3rd. assign 3rd)
        if (!orderMap.has(childId) || orderMap.get(childId)! < order) {
          orderMap.set(childId, order);
        }
        order++;
      }
    }
  }

  return orderMap;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LineageManager({
  persons,
  relationships,
}: LineageManagerProps) {
  const supabase = createClient();

  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleCompute = () => {
    setComputing(true);
    setApplied(false);
    setError(null);

    try {
      const genMap = computeGenerations(persons, relationships);
      const orderMap = computeBirthOrders(persons, relationships);
      const inLawMap = computeInLaws(persons, relationships);

      const result: ComputedUpdate[] = persons.map((p) => {
        const newGen = genMap.has(p.id) ? genMap.get(p.id)! : null;
        const newOrder = orderMap.has(p.id) ? orderMap.get(p.id)! : null;
        const newInLaw = inLawMap.get(p.id) ?? false;

        return {
          id: p.id,
          full_name: p.full_name,
          old_generation: p.generation,
          new_generation: newGen,
          old_birth_order: p.birth_order,
          new_birth_order: newOrder,
          old_is_in_law: p.is_in_law,
          new_is_in_law: newInLaw,
          gender: p.gender,
          changed:
            newGen !== p.generation ||
            newOrder !== p.birth_order ||
            newInLaw !== p.is_in_law,
        };
      });

      // Sort: changed first, then by new generation, then by new birth_order
      result.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1;
        const gA = a.new_generation ?? 999;
        const gB = b.new_generation ?? 999;
        if (gA !== gB) return gA - gB;
        const oA = a.new_birth_order ?? 999;
        const oB = b.new_birth_order ?? 999;
        return oA - oB;
      });

      setUpdates(result);
    } catch (err) {
      setError((err as Error).message || "Lỗi tính toán.");
    } finally {
      setComputing(false);
    }
  };

  const handleApply = async () => {
    if (!updates) return;
    setApplying(true);
    setError(null);

    try {
      const changedOnly = updates.filter((u) => u.changed);
      // Batch update in chunks of 20
      const CHUNK = 20;
      for (let i = 0; i < changedOnly.length; i += CHUNK) {
        const chunk = changedOnly.slice(i, i + CHUNK);
        // Update each person individually (Supabase doesn't support bulk upsert with different values easily)
        await Promise.all(
          chunk.map((u) =>
            supabase
              .from("persons")
              .update({
                generation: u.new_generation,
                birth_order: u.new_birth_order,
                is_in_law: u.new_is_in_law,
              })
              .eq("id", u.id),
          ),
        );
      }
      setApplied(true);
    } catch (err) {
      setError((err as Error).message || "Lỗi khi cập nhật dữ liệu.");
    } finally {
      setApplying(false);
    }
  };

  const changedCount = updates?.filter((u) => u.changed).length ?? 0;
  const displayedRows = showAll
    ? (updates ?? [])
    : (updates ?? []).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCompute}
          disabled={computing || applying}
          className="btn-secondary"
        >
          {computing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {computing ? "Đang tính..." : "Tính toán"}
        </button>

        {updates && changedCount > 0 && !applied && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="btn-primary"
          >
            {applying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {applying
              ? "Đang cập nhật..."
              : `Áp dụng (${changedCount} thay đổi)`}
          </button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium"
          >
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {applied && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 text-sm font-semibold"
          >
            <CheckCircle2 className="size-5 shrink-0" />
            Đã áp dụng thành công {changedCount} thay đổi! Tải lại trang để xem
            kết quả.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table */}
      {updates && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-stone-500 font-medium">
              <span className="text-stone-800 font-bold">{changedCount}</span>{" "}
              thành viên sẽ được cập nhật /&nbsp;
              <span className="text-stone-800 font-bold">
                {updates.length}
              </span>{" "}
              tổng
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="bg-stone-50 border-b border-stone-200/80">
                      <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                        Tên
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                        Thế hệ
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                        Thứ tự
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">
                        Dâu/Rể
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-stone-600">
                        Trạng thái
                      </th>
                    </tr>
                </thead>
                <tbody>
                  {displayedRows.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`border-b border-stone-100 last:border-0 transition-colors ${
                        u.changed ? "bg-amber-50/40" : ""
                      } ${i % 2 === 0 && !u.changed ? "bg-white" : !u.changed ? "bg-stone-50/30" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {u.full_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">
                          {u.old_generation ?? "—"}
                        </span>
                        {u.old_generation !== u.new_generation && (
                          <>
                            <span className="mx-2 text-stone-300">→</span>
                            <span className="font-bold text-amber-700">
                              {u.new_generation ?? "—"}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">
                          {u.old_birth_order ?? "—"}
                        </span>
                        {u.old_birth_order !== u.new_birth_order && (
                          <>
                            <span className="mx-2 text-stone-300">→</span>
                            <span className="font-bold text-amber-700">
                              {u.new_birth_order ?? "—"}
                            </span>
                          </>
                        )}
                      </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              u.old_is_in_law !== u.new_is_in_law
                                ? "text-stone-400"
                                : ""
                            }
                          >
                            {u.old_is_in_law
                              ? u.gender === "male"
                                ? "Rể"
                                : "Dâu"
                              : "—"}
                          </span>
                          {u.old_is_in_law !== u.new_is_in_law && (
                            <>
                              <span className="mx-2 text-stone-300">→</span>
                              <span className="font-bold text-amber-700">
                                {u.new_is_in_law
                                  ? u.gender === "male"
                                    ? "Rể"
                                    : "Dâu"
                                  : "Máu thịt"}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.changed ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200/60">
                              Cập nhật
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-400 border border-stone-200/60">
                              Không đổi
                            </span>
                          )}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {updates.length > 20 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-amber-700 transition-colors mx-auto"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-4" /> Thu gọn
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" /> Xem tất cả {updates.length}{" "}
                  thành viên
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
