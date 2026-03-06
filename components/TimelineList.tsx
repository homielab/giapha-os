"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Baby, Calendar, Heart, Search, Skull, X } from "lucide-react";

export interface TimelineEvent {
  year: number;
  month?: number;
  day?: number;
  type: "birth" | "death" | "event" | "marriage";
  personId?: string;
  personName?: string;
  title?: string;
  detail?: string;
  generation?: number;
}

interface TimelineListProps {
  events: TimelineEvent[];
  generations: number[];
}

const TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  birth: "Sinh",
  death: "Mất",
  event: "Sự kiện",
  marriage: "Hôn nhân",
};

const TYPE_BORDER: Record<TimelineEvent["type"], string> = {
  birth: "border-emerald-400",
  death: "border-rose-400",
  event: "border-sky-400",
  marriage: "border-purple-400",
};

const TYPE_BG: Record<TimelineEvent["type"], string> = {
  birth: "bg-emerald-50",
  death: "bg-rose-50",
  event: "bg-sky-50",
  marriage: "bg-purple-50",
};

const TYPE_TEXT: Record<TimelineEvent["type"], string> = {
  birth: "text-emerald-700",
  death: "text-rose-700",
  event: "text-sky-700",
  marriage: "text-purple-700",
};

const TYPE_BADGE: Record<TimelineEvent["type"], string> = {
  birth: "bg-emerald-100 text-emerald-700",
  death: "bg-rose-100 text-rose-700",
  event: "bg-sky-100 text-sky-700",
  marriage: "bg-purple-100 text-purple-700",
};

const TYPE_DOT: Record<TimelineEvent["type"], string> = {
  birth: "bg-emerald-400",
  death: "bg-rose-400",
  event: "bg-sky-400",
  marriage: "bg-purple-400",
};

function EventIcon({ type }: { type: TimelineEvent["type"] }) {
  const cls = `size-3.5 ${TYPE_TEXT[type]}`;
  switch (type) {
    case "birth":
      return <Baby className={cls} />;
    case "death":
      return <Skull className={cls} />;
    case "marriage":
      return <Heart className={cls} />;
    default:
      return <Calendar className={cls} />;
  }
}

export default function TimelineList({ events, generations }: TimelineListProps) {
  const [typeFilter, setTypeFilter] = useState<TimelineEvent["type"] | "all">("all");
  const [generationFilter, setGenerationFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (generationFilter !== null && e.generation !== generationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (e.personName ?? e.title ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [events, typeFilter, generationFilter, searchQuery]);

  // Group by decade
  const grouped = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const e of filtered) {
      const decade = Math.floor(e.year / 10) * 10;
      if (!map.has(decade)) map.set(decade, []);
      map.get(decade)!.push(e);
    }
    // Sort decades descending (most recent first)
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([decade, items]) => ({
        decade,
        items: [...items].sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0)),
      }));
  }, [filtered]);

  const hasActiveFilters = typeFilter !== "all" || generationFilter !== null || searchQuery.trim() !== "";

  function clearFilters() {
    setTypeFilter("all");
    setGenerationFilter(null);
    setSearchQuery("");
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Tìm kiếm
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tên thành viên..."
              className="pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent min-w-[180px]"
            />
          </div>
        </div>

        {/* Type filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Loại sự kiện
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TimelineEvent["type"] | "all")}
            className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
          >
            <option value="all">Tất cả</option>
            <option value="birth">Sinh</option>
            <option value="death">Mất</option>
            <option value="event">Sự kiện</option>
            <option value="marriage">Hôn nhân</option>
          </select>
        </div>

        {/* Generation filter */}
        {generations.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Thế hệ
            </label>
            <select
              value={generationFilter ?? ""}
              onChange={(e) =>
                setGenerationFilter(e.target.value === "" ? null : Number(e.target.value))
              }
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
            >
              <option value="">Tất cả thế hệ</option>
              {generations.map((g) => (
                <option key={g} value={g}>
                  Thế hệ {g}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
          >
            <X className="size-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-stone-500 mb-6">
        <span className="font-semibold text-stone-700">{filtered.length}</span> sự kiện
      </p>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="py-20 text-center text-stone-400">
          <Calendar className="size-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">Không tìm thấy sự kiện nào.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-amber-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ decade, items }) => (
            <div key={decade}>
              {/* Decade header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-sm font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">
                  Thập niên {decade}
                </span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              {/* Events in this decade */}
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-stone-200" />

                <div className="space-y-3">
                  {items.map((event, idx) => {
                    const label = event.personName ?? event.title ?? "—";
                    const dateStr = [
                      event.day?.toString().padStart(2, "0"),
                      event.month?.toString().padStart(2, "0"),
                      event.year,
                    ]
                      .filter(Boolean)
                      .join("/");

                    return (
                      <div key={idx} className="relative flex items-start gap-3">
                        {/* Dot on the line */}
                        <div
                          className={`absolute -left-5 top-3.5 size-2.5 rounded-full ring-2 ring-white ${TYPE_DOT[event.type]}`}
                        />

                        {/* Card */}
                        <div
                          className={`flex-1 rounded-xl border-l-4 px-4 py-3 ${TYPE_BORDER[event.type]} ${TYPE_BG[event.type]} border border-stone-100`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Year badge */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_BADGE[event.type]}`}
                              >
                                <EventIcon type={event.type} />
                                {event.year}
                              </span>

                              {/* Type badge */}
                              <span className="text-xs text-stone-400">
                                {TYPE_LABELS[event.type]}
                              </span>
                            </div>

                            {/* Date */}
                            {(event.month || event.day) && (
                              <span className="text-xs text-stone-400 whitespace-nowrap">
                                {dateStr}
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5">
                            {event.personId ? (
                              <Link
                                href={`/dashboard/members/${event.personId}`}
                                className={`font-semibold text-sm hover:underline ${TYPE_TEXT[event.type]}`}
                              >
                                {label}
                              </Link>
                            ) : (
                              <span className="font-semibold text-sm text-stone-700">
                                {label}
                              </span>
                            )}

                            {event.detail && (
                              <p className="text-xs text-stone-500 mt-0.5">{event.detail}</p>
                            )}

                            {event.generation != null && (
                              <span className="mt-1 inline-block text-xs text-stone-400">
                                Thế hệ {event.generation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
