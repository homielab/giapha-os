"use client";

import { DashboardContext, useDashboard } from "@/components/DashboardContext";
import { Person, RelationshipType } from "@/types";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useState } from "react";
import DefaultAvatar from "./DefaultAvatar";

interface RelationshipManagerProps {
  personId: string;
  isAdmin: boolean;
  canEdit?: boolean;
  personGender: string; // Passed down to calculate default spouse gender
}

interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction:
    | "parent"
    | "child"
    | "spouse"
    | "child_in_law"
    | "step_parent"
    | "step_child"
    | "sibling"
    | "half_sibling"
    | "godparent"
    | "godchild";
  targetPerson: Person;
  note: string | null;
}

export default function RelationshipManager({
  personId,
  isAdmin,
  canEdit = false,
  personGender,
}: RelationshipManagerProps) {
  const supabase = createClient();
  const dashboardContext = useContext(DashboardContext);
  const { setMemberModalId } = useDashboard();
  const router = useRouter();

  // If inside DashboardProvider → open modal; otherwise → navigate to full page
  const handlePersonClick = (id: string) => {
    if (dashboardContext !== undefined) {
      setMemberModalId(id);
    } else {
      router.push(`/dashboard/members/${id}`);
    }
  };

  const [relationships, setRelationships] = useState<EnrichedRelationship[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Add Relationship State
  const [isAdding, setIsAdding] = useState(false);
  const [newRelType, setNewRelType] =
    useState<RelationshipType>("biological_child");
  const [newRelDirection, setNewRelDirection] = useState<
    | "parent"
    | "child"
    | "spouse"
    | "step_parent"
    | "step_child"
    | "sibling"
    | "half_sibling"
    | "godparent"
    | "godchild"
  >("parent");
  const [newRelNote, setNewRelNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [recentMembers, setRecentMembers] = useState<Person[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk Add State
  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [bulkChildren, setBulkChildren] = useState<
    {
      name: string;
      gender: "male" | "female" | "other";
      birthYear: string;
      isProcessing: boolean;
    }[]
  >([{ name: "", gender: "male", birthYear: "", isProcessing: false }]);

  // Quick Add Spouse State
  const [isAddingSpouse, setIsAddingSpouse] = useState(false);
  const [newSpouseName, setNewSpouseName] = useState("");
  const [newSpouseBirthYear, setNewSpouseBirthYear] = useState("");
  const [newSpouseNote, setNewSpouseNote] = useState("");

  // Fetch relationships
  const fetchRelationships = useCallback(async () => {
    try {
      // Get all relationships where this person involved
      // This is a bit complex because we need to check both a and b columns
      const { data: relsA, error: errA } = await supabase
        .from("relationships")
        .select(`*, target:persons!person_b(*)`) // if I am A, target is B
        .eq("person_a", personId);

      const { data: relsB, error: errB } = await supabase
        .from("relationships")
        .select(`*, target:persons!person_a(*)`) // if I am B, target is A
        .eq("person_b", personId);

      if (errA || errB) throw errA || errB;

      const formattedRels: EnrichedRelationship[] = [];

      // Process Rels where I am Person A
      relsA?.forEach((r) => {
        let direction: EnrichedRelationship["direction"] = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "child"; // I am A (Parent), B is Child
        else if (r.type === "step_parent")
          direction = "step_child"; // I am A (step-parent), B is my step-child
        else if (r.type === "sibling") direction = "sibling";
        else if (r.type === "half_sibling") direction = "half_sibling";
        else if (r.type === "godparent")
          direction = "godchild"; // I am A (godparent), B is my godchild

        formattedRels.push({
          id: r.id,
          type: r.type,
          direction,
          targetPerson: r.target,
          note: r.note,
        });
      });

      // Process Rels where I am Person B
      relsB?.forEach((r) => {
        let direction: EnrichedRelationship["direction"] = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "parent"; // I am B (Child), A is Parent
        else if (r.type === "step_parent")
          direction = "step_parent"; // I am B (step-child), A is my step-parent
        else if (r.type === "sibling") direction = "sibling";
        else if (r.type === "half_sibling") direction = "half_sibling";
        else if (r.type === "godparent")
          direction = "godparent"; // I am B (godchild), A is my godparent

        formattedRels.push({
          id: r.id,
          type: r.type,
          direction,
          targetPerson: r.target,
          note: r.note,
        });
      });

      // Fetch in-laws (spouses of children)
      const childrenIds = formattedRels
        .filter((r) => r.direction === "child")
        .map((r) => r.targetPerson.id);

      if (childrenIds.length > 0) {
        const { data: childrenMarriages } = await supabase
          .from("relationships")
          .select(
            `*, person_a_data:persons!person_a(*), person_b_data:persons!person_b(*)`,
          )
          .eq("type", "marriage")
          .or(
            `person_a.in.(${childrenIds.join(",")}),person_b.in.(${childrenIds.join(",")})`,
          );

        if (childrenMarriages) {
          childrenMarriages.forEach((m) => {
            const isAChild = childrenIds.includes(m.person_a);
            const childPerson = isAChild ? m.person_a_data : m.person_b_data;
            const spousePerson = isAChild ? m.person_b_data : m.person_a_data;

            if (spousePerson && childPerson) {
              const spouseGender = spousePerson.gender;
              let noteLabel = `Vợ/chồng của ${childPerson.full_name}`;
              if (spouseGender === "female")
                noteLabel = `Con dâu (vợ của ${childPerson.full_name})`;
              if (spouseGender === "male")
                noteLabel = `Con rể (chồng của ${childPerson.full_name})`;

              // Append existing marriage note if any
              if (m.note) noteLabel += ` - ${m.note}`;

              formattedRels.push({
                id: m.id + "_inlaw",
                type: "marriage",
                direction: "child_in_law",
                targetPerson: spousePerson,
                note: noteLabel,
              });
            }
          });
        }
      }

      setRelationships(formattedRels);
    } catch (err) {
      console.error("Error fetching relationships:", err);
    } finally {
      setLoading(false);
    }
  }, [personId, supabase]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Search for people to add
  useEffect(() => {
    const searchPeople = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from("persons")
        .select("*")
        .ilike("full_name", `%${searchTerm}%`)
        .neq("id", personId) // Exclude self
        .limit(5);

      if (data) setSearchResults(data);
    };

    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, personId, supabase]);

  // Fetch recent members when opening Add form
  useEffect(() => {
    if (isAdding && recentMembers.length === 0) {
      const fetchRecent = async () => {
        const { data } = await supabase
          .from("persons")
          .select("*")
          .neq("id", personId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) setRecentMembers(data);
      };
      fetchRecent();
    }
  }, [isAdding, personId, supabase, recentMembers.length]);

  const handleAddRelationship = async () => {
    if (!selectedTargetId) return;
    setProcessing(true);
    setError(null);

    try {
      let personA = personId;
      let personB = selectedTargetId;
      // Default: I am A, Target is B.

      // Setup payload based on logic
      // Marriage: Order doesn't strictly matter logically, but consistency is good.
      // Parent/Child:
      //    Relationship Type: biological_child
      //    Column A: Parent
      //    Column B: Child

      if (newRelDirection === "parent") {
        // Target is Parent (A), I am Child (B)
        personA = selectedTargetId;
        personB = personId;
      } else if (newRelDirection === "child") {
        // I am Parent (A), Target is Child (B)
        personA = personId;
        personB = selectedTargetId;
      } else if (newRelDirection === "step_parent") {
        // Target is step-parent (A), I am step-child (B)
        personA = selectedTargetId;
        personB = personId;
      } else if (newRelDirection === "step_child") {
        // I am step-parent (A), Target is step-child (B)
        personA = personId;
        personB = selectedTargetId;
      } else if (newRelDirection === "godparent") {
        // Target is godparent (A), I am godchild (B)
        personA = selectedTargetId;
        personB = personId;
      } else if (newRelDirection === "godchild") {
        // I am godparent (A), Target is godchild (B)
        personA = personId;
        personB = selectedTargetId;
      }
      // sibling / half_sibling: default (personA=personId, personB=target)

      // Determine Type
      let type: RelationshipType = "biological_child";
      if (newRelDirection === "spouse") {
        type = "marriage";
      } else if (
        newRelDirection === "parent" ||
        newRelDirection === "child"
      ) {
        type = newRelType === "adopted_child" ? "adopted_child" : "biological_child";
      } else if (
        newRelDirection === "step_parent" ||
        newRelDirection === "step_child"
      ) {
        type = "step_parent";
      } else if (newRelDirection === "sibling") {
        type = "sibling";
      } else if (newRelDirection === "half_sibling") {
        type = "half_sibling";
      } else if (
        newRelDirection === "godparent" ||
        newRelDirection === "godchild"
      ) {
        type = "godparent";
      }

      const { error } = await supabase.from("relationships").insert({
        person_a: personA,
        person_b: personB,
        type: type,
        note: newRelNote ? newRelNote : null,
      });

      if (error) throw error;

      setIsAdding(false);
      setSearchTerm("");
      setSelectedTargetId(null);
      setNewRelNote("");
      fetchRelationships();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm mối quan hệ: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAdd = async () => {
    // Filter out rows without a name
    const validChildren = bulkChildren.filter((c) => c.name.trim() !== "");
    if (validChildren.length === 0) {
      setError("Vui lòng nhập ít nhất tên của 1 người con.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    let successCount = 0;

    try {
      // For each child row, insert a Person, then insert Relationship(s)
      for (let i = 0; i < validChildren.length; i++) {
        const child = validChildren[i];

        // 1. Insert Person
        const personPayload: {
          full_name: string;
          gender: "male" | "female" | "other";
          birth_year?: number;
        } = {
          full_name: child.name.trim(),
          gender: child.gender,
        };
        if (child.birthYear.trim() !== "") {
          const year = parseInt(child.birthYear);
          if (!isNaN(year)) personPayload.birth_year = year;
        }

        const { data: newPersonData, error: insertError } = await supabase
          .from("persons")
          .insert(personPayload)
          .select("id")
          .single();

        if (insertError || !newPersonData) {
          console.error("Error inserting child:", child.name, insertError);
          continue; // Skip setting relationships for this if person insert failed
        }

        const newChildId = newPersonData.id;

        // 2. Insert Relationship to Main Person (parent)
        await supabase.from("relationships").insert({
          person_a: personId,
          person_b: newChildId,
          type: "biological_child",
        });

        // 3. Insert Relationship to Second Parent (spouse), if selected
        if (selectedSpouseId && selectedSpouseId !== "unknown") {
          await supabase.from("relationships").insert({
            person_a: selectedSpouseId,
            person_b: newChildId,
            type: "biological_child",
          });
        }

        successCount++;
      }

      if (successCount === validChildren.length) {
        setIsAddingBulk(false);
        setBulkChildren([
          { name: "", gender: "male", birthYear: "", isProcessing: false },
        ]);
        setSelectedSpouseId("");
        fetchRelationships();
        router.refresh();
      } else {
        setError(
          `Đã xảy ra lỗi. Chỉ lưu thành công ${successCount}/${validChildren.length} người.`,
        );
        setTimeout(() => setError(null), 5000);
        fetchRelationships();
        router.refresh();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm danh sách con: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAddSpouse = async () => {
    if (!newSpouseName.trim()) {
      setError("Vui lòng nhập tên Vợ/Chồng.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      // Determine default gender based on current person defined in personGender prop
      // Default to opposite. If original is other, default to female (arbitrary choice, or let user pick, but standard says opposite)
      const newSpouseGender =
        personGender === "male"
          ? "female"
          : personGender === "female"
            ? "male"
            : "female";

      const personPayload: {
        full_name: string;
        gender: "male" | "female" | "other";
        birth_year?: number;
      } = {
        full_name: newSpouseName.trim(),
        gender: newSpouseGender,
      };

      if (newSpouseBirthYear.trim() !== "") {
        const year = parseInt(newSpouseBirthYear);
        if (!isNaN(year)) personPayload.birth_year = year;
      }

      // 1. Insert Person
      const { data: newPersonData, error: insertError } = await supabase
        .from("persons")
        .insert(personPayload)
        .select("id")
        .single();

      if (insertError || !newPersonData) throw insertError;

      const newSpouseId = newPersonData.id;

      // 2. Insert Marriage Relationship
      const { error: relError } = await supabase.from("relationships").insert({
        person_a: personId,
        person_b: newSpouseId,
        type: "marriage",
        note: newSpouseNote.trim() || null,
      });

      if (relError) throw relError;

      setIsAddingSpouse(false);
      setNewSpouseName("");
      setNewSpouseBirthYear("");
      setNewSpouseNote("");
      fetchRelationships();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm vợ/chồng: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (relId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mối quan hệ này?")) return;
    try {
      const { error } = await supabase
        .from("relationships")
        .delete()
        .eq("id", relId);
      if (error) throw error;
      fetchRelationships();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể xóa: " + e.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const groupByType = (type: string) =>
    relationships
      .filter((r) => r.direction === type)
      .sort((a, b) => {
        const yearA = a.targetPerson.birth_year;
        const yearB = b.targetPerson.birth_year;
        if (yearA == null && yearB == null) return 0;
        if (yearA == null) return 1;
        if (yearB == null) return -1;
        return yearA - yearB;
      });

  if (loading)
    return (
      <div className="text-stone-500 text-sm">
        Đang tải thông tin gia đình...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* List Sections */}
      {[
        "parent",
        "step_parent",
        "spouse",
        "child",
        "step_child",
        "child_in_law",
        "sibling",
        "half_sibling",
        "godparent",
        "godchild",
      ].map((group) => {
        const items = groupByType(group);
        let title = "";
        if (group === "parent") title = "Bố / Mẹ";
        if (group === "step_parent") title = "Cha dượng / Mẹ kế";
        if (group === "spouse") title = "Vợ / Chồng";
        if (group === "child") title = "Con cái";
        if (group === "step_child") title = "Con riêng";
        if (group === "child_in_law") title = "Con dâu / Con rể";
        if (group === "sibling") title = "Anh/Chị/Em";
        if (group === "half_sibling") title = "Anh/Chị/Em cùng cha khác mẹ";
        if (group === "godparent") title = "Cha/Mẹ đỡ đầu";
        if (group === "godchild") title = "Con đỡ đầu";

        if (items.length === 0 && !isAdmin) return null; // Hide empty sections for members? Or show empty state?

        return (
          <div
            key={group}
            className="border-b border-stone-100 pb-4 last:border-0"
          >
            <h4 className="font-bold text-stone-700 mb-3 flex justify-between items-center text-sm uppercase tracking-wide">
              {title}
            </h4>
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((rel) => (
                  <li
                    key={rel.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => handlePersonClick(rel.targetPerson.id)}
                      className="flex items-center gap-3 hover:bg-stone-100 p-2.5 -mx-2.5 rounded-xl transition-all duration-200 flex-1 text-left"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs text-white overflow-hidden
                            ${rel.targetPerson.gender === "male" ? "bg-sky-700" : rel.targetPerson.gender === "female" ? "bg-rose-700" : "bg-stone-500"}`}
                      >
                        {rel.targetPerson.avatar_url ? (
                          <Image
                            unoptimized
                            src={rel.targetPerson.avatar_url}
                            alt={rel.targetPerson.full_name}
                            className="h-full w-full object-cover"
                            width={32}
                            height={32}
                          />
                        ) : (
                          <DefaultAvatar gender={rel.targetPerson.gender} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-stone-900 font-medium text-sm">
                          {rel.targetPerson.full_name}
                        </span>
                        {rel.note && (
                          <span className="text-xs text-amber-600 font-medium italic mt-0.5">
                            ({rel.note})
                          </span>
                        )}
                        {rel.type === "adopted_child" && (
                          <span className="text-xs text-stone-400 italic mt-0.5">
                            (Con nuôi)
                          </span>
                        )}
                      </div>
                    </button>
                    {canEdit && rel.direction !== "child_in_law" && (
                      <button
                        onClick={() => handleDelete(rel.id)}
                        className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 sm:p-2.5 rounded-lg transition-colors flex items-center justify-center ml-2"
                        title="Xóa mối quan hệ"
                        aria-label="Xóa mối quan hệ"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">
                Chưa có thông tin.
              </p>
            )}
          </div>
        );
      })}

      {/* Add Button (Admin) */}
      {canEdit && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-amber-400 hover:text-amber-700 transition-all duration-200"
          >
            + Thêm Quan Hệ
          </button>

          <button
            onClick={() => setIsAddingBulk(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-sky-400 hover:text-sky-700 transition-all duration-200"
          >
            + Thêm Con
          </button>

          <button
            onClick={() => setIsAddingSpouse(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-rose-400 hover:text-rose-700 transition-all duration-200"
          >
            + Thêm Vợ/Chồng
          </button>
        </div>
      )}

      {error && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Add Form (Admin) */}
      {canEdit && isAdding && (
        <div className="mt-4 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200 shadow-sm">
          <h4 className="font-bold text-stone-800 mb-3 text-sm">
            Thêm Quan Hệ Mới
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Ghi chú mối quan hệ (tuỳ chọn)
              </label>
              <input
                type="text"
                placeholder="VD: Vợ cả, Vợ hai, Chồng trước..."
                value={newRelNote}
                onChange={(e) => setNewRelNote(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border mb-3 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Loại quan hệ
              </label>
              <div className="flex gap-2">
                <select
                  value={newRelDirection}
                  onChange={(e) =>
                    setNewRelDirection(
                      e.target.value as
                        | "parent"
                        | "child"
                        | "spouse"
                        | "step_parent"
                        | "step_child"
                        | "sibling"
                        | "half_sibling"
                        | "godparent"
                        | "godchild",
                    )
                  }
                  className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
                >
                  <optgroup label="Quan hệ chính">
                    <option value="parent">Người này là Con của...</option>
                    <option value="spouse">Người này là Vợ/Chồng của...</option>
                    <option value="child">Người này là Bố/Mẹ của...</option>
                  </optgroup>
                  <optgroup label="Quan hệ khác">
                    <option value="step_parent">
                      Người này là Con riêng của...
                    </option>
                    <option value="step_child">
                      Người này là Cha dượng/Mẹ kế của...
                    </option>
                    <option value="sibling">
                      Người này là Anh/Chị/Em của...
                    </option>
                    <option value="half_sibling">
                      Người này là Anh/Chị/Em cùng cha khác mẹ của...
                    </option>
                    <option value="godparent">
                      Người này là Con đỡ đầu của...
                    </option>
                    <option value="godchild">
                      Người này là Cha/Mẹ đỡ đầu của...
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Child Type Sub-selection */}
            {(newRelDirection === "child" || newRelDirection === "parent") && (
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Chi tiết
                </label>
                <select
                  value={newRelType}
                  onChange={(e) =>
                    setNewRelType(e.target.value as RelationshipType)
                  }
                  className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
                >
                  <option value="biological_child">Con ruột</option>
                  <option value="adopted_child">Con nuôi</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Tìm người thân
              </label>
              <input
                type="text"
                placeholder="Nhập tên để tìm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
              />
              {/* Search Results Dropdown */}
              {(searchResults.length > 0 ||
                (searchTerm.length === 0 &&
                  !selectedTargetId &&
                  recentMembers.length > 0)) && (
                <div className="mt-2 bg-white border border-stone-200 rounded-md shadow-lg max-h-[250px] overflow-y-auto">
                  <div className="px-3 py-1.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-200 sticky top-0 z-10">
                    {searchResults.length > 0
                      ? "Kết quả tìm kiếm"
                      : "Thành viên vừa thêm gần đây"}
                  </div>
                  {(searchResults.length > 0
                    ? searchResults
                    : recentMembers
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedTargetId(p.id);
                        setSearchTerm(p.full_name);
                        setSearchResults([]);
                      }}
                      className="px-3 py-2 hover:bg-amber-50 text-sm flex items-center justify-between border-b border-stone-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center justify-center text-[8px] font-bold size-3 rounded-full text-white shrink-0
                               ${
                                 p.gender === "male"
                                   ? "bg-sky-500"
                                   : p.gender === "female"
                                     ? "bg-rose-500"
                                     : "bg-stone-400"
                               }`}
                        >
                          {p.gender === "male"
                            ? "♂"
                            : p.gender === "female"
                              ? "♀"
                              : "?"}
                        </span>
                        <span className="font-medium text-stone-800">
                          {p.full_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {formatDisplayDate(
                          p.birth_year,
                          p.birth_month,
                          p.birth_day,
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedTargetId && (
                <p className="text-xs text-green-600 mt-1">
                  Đã chọn: {searchTerm}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddRelationship}
                disabled={!selectedTargetId || processing}
                className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
              >
                {processing ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedTargetId(null);
                  setSearchTerm("");
                  setNewRelNote("");
                }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Children Form (Admin) */}
      {canEdit && isAddingBulk && (
        <div className="mt-4 bg-sky-50/50 p-4 sm:p-5 rounded-xl border border-sky-200 shadow-sm">
          <h4 className="font-bold text-sky-800 mb-3 text-sm">
            Thêm Nhanh Nhiều Con
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Chọn người mẹ/cha còn lại
              </label>
              <select
                value={selectedSpouseId}
                onChange={(e) => setSelectedSpouseId(e.target.value)}
                className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 sm:p-2.5 border transition-colors"
              >
                <option value="unknown">
                  Không rõ (hoặc Vợ/Chồng khác chưa thêm)
                </option>
                {groupByType("spouse").map((rel) => (
                  <option key={rel.id} value={rel.targetPerson.id}>
                    {rel.targetPerson.full_name}{" "}
                    {rel.note ? `(${rel.note})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Danh sách các con
              </label>
              {bulkChildren.map((child, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-stone-400 text-xs w-4">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder="Họ và tên..."
                    value={child.name}
                    onChange={(e) => {
                      const newBulk = [...bulkChildren];
                      newBulk[index].name = e.target.value;
                      setBulkChildren(newBulk);
                    }}
                    className="flex-2 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
                  />
                  <select
                    value={child.gender}
                    onChange={(e) => {
                      const newBulk = [...bulkChildren];
                      newBulk[index].gender = e.target.value as
                        | "male"
                        | "female"
                        | "other";
                      setBulkChildren(newBulk);
                    }}
                    className="flex-1 bg-white text-stone-900 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Năm sinh"
                    value={child.birthYear}
                    onChange={(e) => {
                      const newBulk = [...bulkChildren];
                      newBulk[index].birthYear = e.target.value;
                      setBulkChildren(newBulk);
                    }}
                    className="flex-1 bg-white text-stone-900 placeholder-stone-400 text-sm rounded-md border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 border w-24"
                  />
                  <button
                    onClick={() => {
                      const newBulk = bulkChildren.filter(
                        (_, i) => i !== index,
                      );
                      // Always keep at least one row
                      if (newBulk.length === 0) {
                        newBulk.push({
                          name: "",
                          gender: "male",
                          birthYear: "",
                          isProcessing: false,
                        });
                      }
                      setBulkChildren(newBulk);
                    }}
                    className="text-stone-400 hover:text-red-500 p-2"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  setBulkChildren([
                    ...bulkChildren,
                    {
                      name: "",
                      gender: "male",
                      birthYear: "",
                      isProcessing: false,
                    },
                  ]);
                }}
                className="text-sky-600 text-xs font-semibold hover:text-sky-800 mt-2 px-6"
              >
                + Thêm dòng
              </button>
            </div>

            <div className="flex gap-2 pt-4 border-t border-stone-200">
              <button
                onClick={handleBulkAdd}
                disabled={
                  processing || bulkChildren.every((c) => c.name.trim() === "")
                }
                className="flex-1 bg-sky-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
              >
                {processing ? "Đang lưu..." : "Lưu Tất Cả"}
              </button>
              <button
                onClick={() => {
                  setIsAddingBulk(false);
                  setBulkChildren([
                    {
                      name: "",
                      gender: "male",
                      birthYear: "",
                      isProcessing: false,
                    },
                  ]);
                  setSelectedSpouseId("");
                }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Spouse Form (Admin) */}
      {canEdit && isAddingSpouse && (
        <div className="mt-4 bg-rose-50/50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-sm">
          <h4 className="font-bold text-rose-800 mb-3 text-sm">
            Thêm Nhanh Vợ/Chồng
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">
                Họ và Tên *
              </label>
              <input
                type="text"
                placeholder="Nhập họ và tên..."
                value={newSpouseName}
                onChange={(e) => setNewSpouseName(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">
                Năm sinh (Tuỳ chọn)
              </label>
              <input
                type="number"
                placeholder="VD: 1980"
                value={newSpouseBirthYear}
                onChange={(e) => setNewSpouseBirthYear(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-rose-700 mb-1">
                Ghi chú mối quan hệ (Ví dụ: Vợ cả, Chồng thứ...)
              </label>
              <input
                type="text"
                placeholder="Tuỳ chọn..."
                value={newSpouseNote}
                onChange={(e) => setNewSpouseNote(e.target.value)}
                className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-md sm:rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
              />
            </div>

            <p className="text-xs text-stone-500 italic mt-1">
              * Giới tính sẽ tự động gán là{" "}
              {personGender === "male"
                ? "Nữ"
                : personGender === "female"
                  ? "Nam"
                  : "Nữ"}{" "}
              (dựa theo giới tính người hiện tại).
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleQuickAddSpouse}
                disabled={!newSpouseName.trim() || processing}
                className="flex-1 bg-rose-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {processing ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                onClick={() => {
                  setIsAddingSpouse(false);
                  setNewSpouseName("");
                  setNewSpouseBirthYear("");
                  setNewSpouseNote("");
                }}
                className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
