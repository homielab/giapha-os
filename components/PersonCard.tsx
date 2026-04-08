"use client";

import { Person } from "@/types";
import { getAvatarBg } from "@/utils/styleHelprs";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";
import { FemaleIcon, MaleIcon } from "./GenderIcons";

interface PersonCardProps {
  person: Person;
}

export default function PersonCard({ person }: PersonCardProps) {
  const { setMemberModalId } = useDashboard();

  const isDeceased = person.is_deceased;

  const getGenderStyle = (gender: string) => {
    if (gender === "male") return "bg-sky-100 text-sky-600";
    if (gender === "female") return "bg-rose-100 text-rose-600";
    return "bg-stone-100 text-stone-600";
  };

  return (
    <button
      onClick={() => setMemberModalId(person.id)}
      className={`group block relative bg-white/60 p-2 sm:p-4 rounded-2xl shadow-sm border border-stone-200/60 hover:border-amber-300 hover:shadow-md hover:bg-white/90 transition-all duration-300 overflow-hidden
        ${isDeceased ? "opacity-80 grayscalePer-[0.3]" : ""}`}
    >
      {/* Decorative gradient blob */}
      {/* <div
        className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-125 ${person.gender === "male" ? "bg-sky-400" : person.gender === "female" ? "bg-rose-400" : "bg-stone-400"}`}
      /> */}

      <div className="flex items-center space-x-4 relative z-10">
        <div className="relative">
          <div
            className={`size-14 sm:size-16 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105
            ${getAvatarBg(person.gender)}`}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={32} />
            )}
          </div>
          {/* Gender Indicator Icon */}
          <div
            className={`absolute bottom-0 right-0 size-5 rounded-full ring-2 ring-white shadow-sm flex items-center justify-center ${getGenderStyle(person.gender)}`}
          >
            {person.gender === "male" ? (
              <MaleIcon className="size-5" />
            ) : person.gender === "female" ? (
              <FemaleIcon className="size-5" />
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base text-left sm:text-lg font-bold text-stone-900 group-hover:text-amber-700 transition-colors truncate mb-1.5">
            {person.full_name}
          </h3>
          <p className="text-sm font-medium text-stone-500 truncate flex items-center gap-1.5">
            <svg
              className="size-4 shrink-0 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">
              {person.birth_year || "..."}
              {isDeceased &&
                ` → ${person.death_lunar_year || person.death_year || "..."}`}
            </span>
          </p>
          {(isDeceased ||
            person.is_in_law ||
            person.birth_order != null ||
            person.generation != null) && (
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 mt-2">
              {person.is_in_law && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-xs border ${
                    person.gender === "male"
                      ? "bg-sky-50 text-sky-700 border-sky-200/60"
                      : person.gender === "female"
                        ? "bg-rose-50 text-rose-700 border-rose-200/60"
                        : "bg-stone-50 text-stone-700 border-stone-200/60"
                  }`}
                >
                  {person.gender === "male"
                    ? "Rể"
                    : person.gender === "female"
                      ? "Dâu"
                      : "Khách"}
                </span>
              )}
              {person.birth_order != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 uppercase tracking-widest shadow-xs">
                  {person.birth_order === 1
                    ? "Con trưởng"
                    : `Con thứ ${person.birth_order}`}
                </span>
              )}
              {person.generation != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-widest shadow-xs">
                  Đời thứ {person.generation}
                </span>
              )}
              {isDeceased && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-stone-100 text-stone-500 uppercase tracking-widest border border-stone-200/60 shadow-xs">
                  Đã mất
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
