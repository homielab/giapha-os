"use client";

import { computeEvents, FamilyEvent, CustomEventRecord } from "@/utils/eventHelpers";
import { getZodiacSign } from "@/utils/dateHelpers";
import { motion } from "framer-motion";
import { Solar } from "lunar-javascript";
import { Cake, CalendarDays, Clock, Flower, Star, MapPin, AlignLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboard } from "./DashboardContext";
import CustomEventModal from "./CustomEventModal";
import { useRouter } from "next/navigation";

interface EventsListProps {
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    is_deceased: boolean;
  }[];
  customEvents?: CustomEventRecord[];
}

const DAY_LABELS: Record<number, string> = {
  0: "Hôm nay",
  1: "Ngày mai",
};

function daysUntilLabel(days: number): string {
  if (days in DAY_LABELS) return DAY_LABELS[days];
  if (days <= 30) return `${days} ngày nữa`;
  if (days <= 60) return `${Math.ceil(days / 7)} tuần nữa`;
  return `${Math.ceil(days / 30)} tháng nữa`;
}

function EventCard({ event, index, onEditCustomEvent }: { event: FamilyEvent; index: number; onEditCustomEvent: (e: FamilyEvent) => void }) {
  const isBirthday = event.type === "birthday";
  const isCustom = event.type === "custom_event";
  const isToday = event.daysUntil === 0;
  const isSoon = event.daysUntil <= 7;

  const { setMemberModalId } = useDashboard();

  const handleClick = () => {
    if (isCustom) {
      onEditCustomEvent(event);
    } else if (event.personId) {
      setMemberModalId(event.personId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md group ${
        isToday
          ? "bg-amber-50 border-amber-300 shadow-sm"
          : isBirthday
            ? "bg-white/80 border-stone-200/60 hover:border-blue-200"
            : isCustom
              ? "bg-white/80 border-stone-200/60 hover:border-purple-200"
              : "bg-white/80 border-stone-200/60 hover:border-rose-200"
      }`}
    >
      {/* Icon */}
      <div
        className={`shrink-0 size-11 flex items-center justify-center rounded-xl mt-0.5 ${
          isToday
            ? "bg-amber-100 text-amber-600"
            : isBirthday
              ? "bg-blue-50 text-blue-500"
              : isCustom
                ? "bg-purple-50 text-purple-500"
                : "bg-rose-50 text-rose-500"
        }`}
      >
        {isBirthday ? (
          <Cake className="size-5" />
        ) : isCustom ? (
          <Star className="size-5" />
        ) : (
          <Flower className="size-5" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-stone-800 truncate transition-colors group-hover:text-amber-700`}>
            {event.personName}
          </p>
          {isBirthday && event.originDay && event.originMonth && getZodiacSign(event.originDay, event.originMonth) && (
            <span className="shrink-0 text-[10px] font-sans font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-xs tracking-wider">
              {getZodiacSign(event.originDay, event.originMonth)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-sm text-stone-500 flex items-center gap-1.5 leading-tight">
            <CalendarDays className="size-3.5 shrink-0" />
            {isBirthday ? "Sinh nhật" : isCustom ? "Sự kiện" : "Ngày giỗ"} —{" "}
            <span className="font-medium text-stone-600">
              {event.eventDateLabel}
            </span>
            {event.originYear && (
              <span className="text-stone-400">({event.originYear})</span>
            )}
          </p>
          {event.location && (
            <p className="text-sm text-stone-500 flex items-center gap-1.5 leading-tight">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          {event.content && (
            <p className="text-sm text-stone-500 flex items-start gap-1.5 leading-tight mt-0.5">
              <AlignLeft className="size-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{event.content}</span>
            </p>
          )}
        </div>
      </div>

      {/* Days badge */}
      <div
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
          isToday
            ? "bg-amber-400 text-white"
            : isSoon
              ? "bg-red-100 text-red-600"
              : "bg-stone-100 text-stone-500"
        }`}
      >
        <Clock className="size-3" />
        {daysUntilLabel(event.daysUntil)}
      </div>
    </motion.div>
  );
}

export default function EventsList({ persons, customEvents = [] }: EventsListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<
    "all" | "birthday" | "death_anniversary" | "custom_event"
  >("all");
  const [showCount, setShowCount] = useState(20);
  const [showDeceasedBirthdays, setShowDeceasedBirthdays] = useState(false);

  // Custom Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomEvent, setEditingCustomEvent] = useState<CustomEventRecord | null>(null);

  const handleOpenEditModal = (event: FamilyEvent) => {
    const rawEvent = customEvents.find(ce => ce.id === event.personId);
    if (rawEvent) {
      setEditingCustomEvent(rawEvent);
      setIsModalOpen(true);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCustomEvent(null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  const [todayDate] = useState(() => {
    const today = new Date();
    const solarStr = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    let lunarStr = "";
    try {
      const solar = Solar.fromYmd(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      );
      const lunar = solar.getLunar();
      const lMonthRaw = lunar.getMonth();
      const isLeap = lMonthRaw < 0;
      const lMonth = Math.abs(lMonthRaw).toString().padStart(2, "0");
      const lDay = lunar.getDay().toString().padStart(2, "0");
      lunarStr = `${lDay}/${lMonth}${isLeap ? " nhuận" : ""} ÂL`;
    } catch (e) {
      console.error(e);
    }
    return { solar: solarStr, lunar: lunarStr };
  });

  const allEvents = useMemo(() => computeEvents(persons, customEvents), [persons, customEvents]);

  const filtered = useMemo(() => {
    let result = allEvents;
    if (filter !== "all") {
      result = result.filter((e) => e.type === filter);
    }
    if (!showDeceasedBirthdays) {
      result = result.filter((e) => !(e.type === "birthday" && e.isDeceased));
    }
    return result;
  }, [allEvents, filter, showDeceasedBirthdays]);

  // Split into upcoming (within 365 days) and far away
  const upcoming = filtered.filter((e) => e.daysUntil <= 365);
  const visible = upcoming.slice(0, showCount);

  const todayCount = allEvents.filter((e) => e.daysUntil === 0).length;
  const soonCount = allEvents.filter(
    (e) => e.daysUntil > 0 && e.daysUntil <= 7,
  ).length;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-900 leading-tight">
              Hôm nay: {todayDate.solar}
              {todayDate.lunar && (
                <span className="font-normal text-amber-700 ml-1">
                  ({todayDate.lunar})
                </span>
              )}
            </p>
          </div>
          {(todayCount > 0 || soonCount > 0) && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xl shrink-0 leading-none">🎊</span>
              <p className="text-sm font-medium text-amber-800 leading-tight">
                {todayCount > 0 && (
                  <span className="font-bold">{todayCount} sự kiện hôm nay</span>
                )}
                {todayCount > 0 && soonCount > 0 && " · "}
                {soonCount > 0 && (
                  <span>{soonCount} sự kiện trong 7 ngày tới</span>
                )}
              </p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleOpenCreateModal}
          className="shrink-0 self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold text-sm shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
        >
          <Plus className="size-4" />
          <span>Thêm sự kiện</span>
        </button>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "birthday", label: "Sinh nhật" },
              { key: "death_anniversary", label: "Ngày giỗ" },
              { key: "custom_event", label: "Tuỳ chỉnh" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-white/80 text-stone-600 border border-stone-200/60 hover:border-amber-200 hover:text-amber-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-stone-400 self-center">
            {filtered.length} sự kiện trong năm
          </span>
        </div>

        {/* Toggle options */}
        <div className="flex px-1">
          <label className="flex items-center gap-2.5 text-sm font-medium text-stone-600 cursor-pointer hover:text-stone-900 transition-colors select-none">
            <input
              type="checkbox"
              checked={showDeceasedBirthdays}
              onChange={(e) => setShowDeceasedBirthdays(e.target.checked)}
              className="rounded-md border-stone-300 text-amber-500 focus:ring-amber-500 size-4 transition-all"
            />
            Hiển thị sinh nhật của người đã mất
          </label>
        </div>
      </div>

      {/* Event list */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <CalendarDays className="size-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Không có sự kiện nào</p>
          <p className="text-sm mt-1">
            Hãy bổ sung ngày sinh hoặc ngày mất cho thành viên
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((event, i) => (
            <EventCard
              key={`${event.personId}-${event.type}-${event.eventDateLabel}`}
              event={event}
              index={i}
              onEditCustomEvent={handleOpenEditModal}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {upcoming.length > showCount && (
        <button
          onClick={() => setShowCount((n) => n + 20)}
          className="w-full py-3 text-sm font-semibold text-stone-500 hover:text-amber-600 transition-colors"
        >
          Xem thêm {upcoming.length - showCount} sự kiện…
        </button>
      )}

      <CustomEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        eventToEdit={editingCustomEvent}
      />
    </div>
  );
}
