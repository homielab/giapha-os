"use client";

import { Person } from "@/types";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useDashboard } from "./DashboardContext";
import DefaultAvatar from "./DefaultAvatar";

interface FamilyNodeCardProps {
  person: Person;
  role?: string; // e.g., "Chồng", "Vợ"
  note?: string | null;
  onClickCard?: () => void;
  onClickName?: (e: React.MouseEvent) => void;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isRingVisible?: boolean;
  isPlusVisible?: boolean;
}

export default function FamilyNodeCard({
  person,
  onClickCard,
  onClickName,
  isExpandable = false,
  isExpanded = false,
  isRingVisible = false,
  isPlusVisible = false,
}: FamilyNodeCardProps) {
  const { showAvatar, setMemberModalId } = useDashboard();

  const isDeceased = person.is_deceased;

  const content = (
    <div
      onClick={onClickCard}
      className={`group py-2 px-1 w-20 sm:w-24 md:w-28 flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative bg-white/70 rounded-2xl
        ${isDeceased ? "grayscale-[0.4] opacity-80" : ""}
        ${showAvatar ? "min-h-22 sm:min-h-28 md:min-h-28 justify-start" : "min-h-10 sm:min-h-10 md:min-h-12 justify-center"}
      `}
    >
      {isRingVisible && (
        <div className="absolute top-[15%] -left-2.5 sm:-left-3 size-5 sm:size-6 rounded-full shadow-sm bg-white z-1 flex items-center justify-center text-[10px] sm:text-sm">
          <span className="leading-none pt-px pl-0.5">💍</span>
        </div>
      )}
      {isPlusVisible && (
        <div className="absolute top-[15%] -left-2.5 sm:-left-3 size-5 sm:size-6 rounded-full shadow-sm bg-white z-1 flex items-center justify-center text-[10px] sm:text-sm font-medium text-stone-500">
          <span className="leading-none mb-px pl-0.5">+</span>
        </div>
      )}
      {/* Decorative gradient blob for the card background hover */}
      {/* <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0 ${person.gender === "male" ? "bg-sky-400" : person.gender === "female" ? "bg-rose-400" : "bg-stone-400"}`}
      /> */}

      {/* Expand/Collapse Indicator */}
      {isExpandable && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-stone-200/80 rounded-full size-6 flex items-center justify-center shadow-md z-100 text-stone-500 hover:text-amber-600 transition-colors">
          {isExpanded ? (
            <Minus className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </div>
      )}

      {/* 1. Avatar */}
      {showAvatar && (
        <div className="relative z-10 mb-1.5 sm:mb-2">
          <div
            className={`h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center text-[10px] sm:text-xs md:text-sm text-white overflow-hidden shrink-0 shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-105
              ${
                person.gender === "male"
                  ? "bg-linear-to-br from-sky-400 to-sky-700"
                  : person.gender === "female"
                    ? "bg-linear-to-br from-rose-400 to-rose-700"
                    : "bg-linear-to-br from-stone-400 to-stone-600"
              }`}
          >
            {person.avatar_url ? (
              <Image
                unoptimized
                src={person.avatar_url}
                alt={person.full_name}
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <DefaultAvatar gender={person.gender} />
            )}
          </div>
        </div>
      )}

      {/* 2. Gender Icon + Name */}
      <div className="flex flex-col items-center justify-center gap-1 w-full px-0.5 sm:px-1 relative z-10">
        <span
          className={`text-[10px] sm:text-[11px] md:text-xs font-bold text-center leading-tight line-clamp-2 transition-colors cursor-pointer
            ${onClickName ? "text-stone-800 group-hover:text-amber-700 hover:underline" : "text-stone-800 group-hover:text-amber-800"}`}
          title={person.full_name}
          onClick={(e) => {
            if (onClickName) {
              e.stopPropagation();
              e.preventDefault();
              onClickName(e);
            }
          }}
        >
          {person.full_name}
        </span>
        {/* {person.birth_order != null && (
          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 leading-none">
            {person.birth_order === 1 ? "Trưởng" : `Thứ ${person.birth_order}`}
          </span>
        )} */}
        {/* {person.generation != null && (
          <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60 leading-none">
            Đ.{person.generation}
          </span>
        )} */}
        {/* {isDeceased && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-stone-100 text-stone-400 uppercase tracking-wider border border-stone-200/50">
            Đã mất
          </span>
        )} */}
      </div>

      {/* 3. Role */}
      {/* {role && (
        <span className="mt-1 px-2.5 py-0.5 bg-stone-100/80 border border-stone-200 text-stone-500 font-medium tracking-wide w-auto text-center leading-tight rounded-full text-[10px] shadow-sm">
          {role} {note && `(${note})`}
        </span>
      )} */}
    </div>
  );

  if (onClickCard || onClickName) {
    return content;
  }

  return (
    <button onClick={() => setMemberModalId(person.id)} className="block w-fit">
      {content}
    </button>
  );
}
