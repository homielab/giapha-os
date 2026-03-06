"use client";

import PersonCard from "@/components/PersonCard";
import { Person } from "@/types";
import { ArrowUpDown, Filter, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboard } from "./DashboardContext";

export default function DashboardMemberList({
  initialPersons,
  canEdit = false,
}: {
  initialPersons: Person[];
  canEdit?: boolean;
}) {
  const { setShowCreateMember } = useDashboard();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("updated_desc");
  const [filterOption, setFilterOption] = useState("all");
  const [generationFilter, setGenerationFilter] = useState("all");

  const generations = useMemo(() => {
    const gens = new Set<number>();
    initialPersons.forEach((p) => {
      if (p.generation != null) gens.add(p.generation);
    });
    return Array.from(gens).sort((a, b) => a - b);
  }, [initialPersons]);

  const filteredPersons = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return initialPersons.filter((person) => {
      const matchesSearch =
        !search ||
        person.full_name.toLowerCase().includes(search) ||
        (person.other_names?.toLowerCase().includes(search) ?? false);

      let matchesFilter = true;
      switch (filterOption) {
        case "male":
          matchesFilter = person.gender === "male";
          break;
        case "female":
          matchesFilter = person.gender === "female";
          break;
        case "in_law_female":
          matchesFilter = person.gender === "female" && person.is_in_law;
          break;
        case "in_law_male":
          matchesFilter = person.gender === "male" && person.is_in_law;
          break;
        case "alive":
          matchesFilter = !person.is_deceased;
          break;
        case "deceased":
          matchesFilter = person.is_deceased;
          break;
        case "first_child":
          matchesFilter = person.birth_order === 1;
          break;
        case "all":
        default:
          matchesFilter = true;
          break;
      }

      const matchesGeneration =
        generationFilter === "all" ||
        person.generation === parseInt(generationFilter);

      return matchesSearch && matchesFilter && matchesGeneration;
    });
  }, [initialPersons, searchTerm, filterOption, generationFilter]);

  const sortedPersons = useMemo(() => {
    return [...filteredPersons].sort((a, b) => {
      switch (sortOption) {
        case "birth_asc":
          return (a.birth_year || 9999) - (b.birth_year || 9999);
        case "birth_desc":
          return (b.birth_year || 0) - (a.birth_year || 0);
        case "name_asc":
          return a.full_name.localeCompare(b.full_name, "vi");
        case "name_desc":
          return b.full_name.localeCompare(a.full_name, "vi");
        case "updated_desc":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );
        case "updated_asc":
          return (
            new Date(a.updated_at || 0).getTime() -
            new Date(b.updated_at || 0).getTime()
          );
        case "generation_asc":
          if (a.generation !== b.generation) {
            return (a.generation || 999) - (b.generation || 999);
          }
          return (a.birth_order || 999) - (b.birth_order || 999);
        case "generation_desc":
          if (b.generation !== a.generation) {
            return (b.generation || 0) - (a.generation || 0);
          }
          return (b.birth_order || 0) - (a.birth_order || 0);
        default:
          return 0;
      }
    });
  }, [filteredPersons, sortOption]);

  const chevronDown = (
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <svg className="size-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  const isFiltered =
    searchTerm !== "" || filterOption !== "all" || generationFilter !== "all";

  return (
    <>
      <div className="mb-6 relative">
        <div className="flex flex-col gap-3 bg-white/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200/60 transition-all duration-300 relative z-10 w-full">
          {/* Row 1: search + add button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder="Tìm theo tên, tên khác..."
                className="bg-white/90 text-stone-900 w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200/80 shadow-sm placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {canEdit && (
              <button
                onClick={() => setShowCreateMember(true)}
                className="btn-primary"
              >
                <Plus className="size-4" strokeWidth={2.5} />
                Thêm thành viên
              </button>
            )}
          </div>

          {/* Row 2: filters + sort */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Filter by category */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
              <select
                className="appearance-none bg-white/90 text-stone-700 w-full sm:w-40 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all focus:bg-white"
                value={filterOption}
                onChange={(e) => setFilterOption(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="alive">Còn sống</option>
                <option value="deceased">Đã mất</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="in_law_female">Dâu</option>
                <option value="in_law_male">Rể</option>
                <option value="first_child">Con trưởng</option>
              </select>
              {chevronDown}
            </div>

            {/* Filter by generation */}
            {generations.length > 0 && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
                <select
                  className="appearance-none bg-white/90 text-stone-700 w-full sm:w-40 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all focus:bg-white"
                  value={generationFilter}
                  onChange={(e) => setGenerationFilter(e.target.value)}
                >
                  <option value="all">Tất cả thế hệ</option>
                  {generations.map((g) => (
                    <option key={g} value={String(g)}>
                      Đời thứ {g}
                    </option>
                  ))}
                </select>
                {chevronDown}
              </div>
            )}

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
              <select
                className="appearance-none bg-white/90 text-stone-700 w-full sm:w-52 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200/80 shadow-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 hover:border-amber-300 font-medium text-sm transition-all focus:bg-white"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="birth_asc">Năm sinh (Tăng dần)</option>
                <option value="birth_desc">Năm sinh (Giảm dần)</option>
                <option value="name_asc">Tên (A-Z)</option>
                <option value="name_desc">Tên (Z-A)</option>
                <option value="updated_desc">Cập nhật (Mới nhất)</option>
                <option value="updated_asc">Cập nhật (Cũ nhất)</option>
                <option value="generation_asc">Theo thế hệ (Tăng dần)</option>
                <option value="generation_desc">Theo thế hệ (Giảm dần)</option>
              </select>
              {chevronDown}
            </div>

            {/* Result count + clear filter */}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-stone-500">
                <span className="font-semibold text-stone-700">
                  {sortedPersons.length}
                </span>
                {isFiltered && (
                  <span className="text-stone-400"> / {initialPersons.length}</span>
                )}{" "}
                thành viên
              </span>
              {isFiltered && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterOption("all");
                    setGenerationFilter("all");
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold hover:underline transition-colors"
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {sortedPersons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPersons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-stone-400 italic">
          {initialPersons.length > 0
            ? "Không tìm thấy thành viên phù hợp."
            : "Chưa có thành viên nào. Hãy thêm thành viên đầu tiên."}
        </div>
      )}
    </>
  );
}
