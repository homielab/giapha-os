"use client";

import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, User, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchPerson {
  id: string;
  full_name: string;
  other_names: string | null;
  birth_year: number | null;
  gender: string;
  is_deceased: boolean;
  generation: number | null;
  avatar_url: string | null;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [persons, setPersons] = useState<SearchPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const fetchPersons = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true; // set immediately to prevent duplicate calls
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("persons")
        .select(
          "id, full_name, other_names, birth_year, gender, is_deceased, generation, avatar_url",
        )
        .order("full_name");
      if (error) throw error;
      if (data) setPersons(data);
    } catch (err) {
      console.error("GlobalSearch: failed to fetch persons", err);
      loaded.current = false; // allow retry on error
    } finally {
      setLoading(false);
    }
  }, []);

  const openSearch = useCallback(() => {
    setOpen(true);
    fetchPersons();
    setQuery("");
    setActiveIndex(0);
  }, [fetchPersons]);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) { closeSearch(); } else { openSearch(); }
      }
      if (e.key === "Escape" && open) closeSearch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, openSearch, closeSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = query.trim()
    ? persons.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.full_name.toLowerCase().includes(q) ||
          (p.other_names?.toLowerCase().includes(q) ?? false) ||
          (p.birth_year?.toString().includes(q) ?? false)
        );
      })
    : persons.slice(0, 8);

  // Reset active index when results change
  useEffect(() => setActiveIndex(0), [query]);

  const handleSelect = (person: SearchPerson) => {
    closeSearch();
    router.push(`/dashboard/members/${person.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      handleSelect(results[activeIndex]);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-stone-500 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
        title="Tìm kiếm (Ctrl+K)"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline text-stone-400">Tìm kiếm...</span>
        <kbd className="hidden sm:inline text-[10px] font-mono bg-white border border-stone-300 rounded px-1 py-0.5 text-stone-400">
          ⌘K
        </kbd>
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={closeSearch}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
                  {loading ? (
                    <Loader2 className="size-5 text-stone-400 shrink-0 animate-spin" />
                  ) : (
                    <Search className="size-5 text-stone-400 shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tìm theo tên, tên khác, năm sinh..."
                    className="flex-1 text-stone-900 placeholder-stone-400 bg-transparent outline-none text-base"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={closeSearch}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {results.length === 0 && !loading ? (
                    <div className="py-10 text-center text-stone-400 text-sm">
                      Không tìm thấy kết quả cho &quot;{query}&quot;
                    </div>
                  ) : (
                    <ul className="py-2">
                      {!query && (
                        <li className="px-4 py-1.5">
                          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                            Thành viên gần đây
                          </span>
                        </li>
                      )}
                      {results.map((person, i) => (
                        <li key={person.id}>
                          <button
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              i === activeIndex
                                ? "bg-amber-50 text-amber-900"
                                : "hover:bg-stone-50 text-stone-700"
                            }`}
                            onClick={() => handleSelect(person)}
                            onMouseEnter={() => setActiveIndex(i)}
                          >
                            {/* Avatar */}
                            <div className="shrink-0 size-9 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center">
                              {person.avatar_url ? (
                                <Image
                                  src={person.avatar_url}
                                  alt={person.full_name}
                                  width={36}
                                  height={36}
                                  className="object-cover size-full"
                                />
                              ) : (
                                <User className="size-4 text-stone-400" />
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {highlightMatch(person.full_name, query)}
                              </p>
                              <p className="text-xs text-stone-400 truncate flex items-center gap-2">
                                {person.other_names && (
                                  <span>
                                    {highlightMatch(person.other_names, query)}
                                  </span>
                                )}
                                {person.birth_year && (
                                  <span>
                                    {person.other_names && "·"}{" "}
                                    {person.birth_year}
                                    {person.is_deceased ? " (đã mất)" : ""}
                                  </span>
                                )}
                              </p>
                            </div>
                            {/* Generation badge */}
                            {person.generation && (
                              <span className="shrink-0 text-[10px] font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded-md px-1.5 py-0.5">
                                Đời {person.generation}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-stone-100 flex items-center gap-4 text-[11px] text-stone-400">
                  <span>
                    <kbd className="font-mono bg-stone-100 border border-stone-200 rounded px-1">↑↓</kbd>{" "}
                    di chuyển
                  </span>
                  <span>
                    <kbd className="font-mono bg-stone-100 border border-stone-200 rounded px-1">↵</kbd>{" "}
                    chọn
                  </span>
                  <span>
                    <kbd className="font-mono bg-stone-100 border border-stone-200 rounded px-1">Esc</kbd>{" "}
                    đóng
                  </span>
                  <span className="ml-auto">{results.length} kết quả</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
