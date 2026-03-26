"use client";

import DefaultAvatar from "@/components/DefaultAvatar";
import RelationshipManager from "@/components/RelationshipManager";
import { Person } from "@/types";
import {
  calculateAge,
  formatDisplayDate,
  getDeathAnniversaryDate,
  getLunarDateString,
  getSolarDateString,
  getZodiacAnimal,
  getZodiacSign,
} from "@/utils/dateHelpers";
import { motion, Variants } from "framer-motion";
import {
  Baby,
  Briefcase,
  ChevronDown,
  Info,
  Leaf,
  MapPin,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { FemaleIcon, MaleIcon } from "./GenderIcons";

interface MemberDetailContentProps {
  person: Person;
  privateData: Record<string, unknown> | null;
  isAdmin: boolean;
  canEdit?: boolean;
}

export default function MemberDetailContent({
  person,
  privateData,
  isAdmin,
  canEdit = false,
}: MemberDetailContentProps) {
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [relStats, setRelStats] = useState<{
    biologicalChildren: number;
    maleBiologicalChildren: number;
    femaleBiologicalChildren: number;
    paternalGrandchildren: number;
    maternalGrandchildren: number;
    sonInLaw: number;
    daughterInLaw: number;
  } | null>(null);

  const handleStatsLoaded = useCallback(
    (stats: {
      biologicalChildren: number;
      maleBiologicalChildren: number;
      femaleBiologicalChildren: number;
      paternalGrandchildren: number;
      maternalGrandchildren: number;
      sonInLaw: number;
      daughterInLaw: number;
    }) => {
      setRelStats(stats);
    },
    [],
  );

  const fullPerson = { ...person, ...privateData };
  const note = (fullPerson.note as string) || "";
  const isNoteLong = note.length > 300;

  const isDeceased =
    person.is_deceased ||
    !!person.death_year ||
    !!person.death_month ||
    !!person.death_day ||
    !!person.death_lunar_year ||
    !!person.death_lunar_month ||
    !!person.death_lunar_day;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 },
    },
  };

  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="bg-stone-50/50"
    >
      {/* Header / Cover */}
      <div className="h-28 sm:h-36 bg-linear-to-r from-stone-200 via-stone-100 to-stone-200 relative shrink-0">
        {/* Decorative blur in cover */}
        <div
          className={`absolute right-0 -top-20 w-64 h-64 rounded-full blur-[60px] opacity-40 ${person.gender === "male" ? "bg-sky-300" : person.gender === "female" ? "bg-rose-300" : "bg-stone-300"}`}
        />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-[60px] opacity-20 bg-amber-200" />

        <motion.div
          variants={itemVariants}
          className="absolute -bottom-12 sm:-bottom-16 left-6 sm:left-8 z-10"
        >
          <div
            className={`h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 sm:border-[6px] border-white flex items-center justify-center text-3xl sm:text-4xl font-bold text-white overflow-hidden shadow-xl shrink-0
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
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultAvatar gender={person.gender} size={128} />
            )}
          </div>
          {/* Gender Indicator Icon */}
          <div
            className={`absolute bottom-1 right-1 sm:bottom-2 sm:right-2 size-6 sm:size-8 rounded-full ring-2 sm:ring-4 ring-white shadow-md flex items-center justify-center ${
              person.gender === "male"
                ? "bg-sky-100 text-sky-600"
                : person.gender === "female"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {person.gender === "male" ? (
              <MaleIcon className="size-4 sm:size-5" />
            ) : person.gender === "female" ? (
              <FemaleIcon className="size-4 sm:size-5" />
            ) : null}
          </div>
        </motion.div>
      </div>

      <div className="pt-16 sm:pt-20 px-6 sm:px-8 pb-8 relative z-10">
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 flex items-center gap-2 sm:gap-3 flex-wrap">
              {fullPerson.full_name}
              {isDeceased && (
                <span className="text-[10px] sm:text-xs font-sans font-bold text-stone-500 border border-stone-200/80 bg-stone-100/50 rounded-md px-2 py-0.5 whitespace-nowrap uppercase tracking-wider shadow-xs">
                  Đã mất
                </span>
              )}
              {person.is_in_law && (
                <span
                  className={`text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-xs border uppercase tracking-wider ${
                    person.gender === "female"
                      ? "text-rose-700 bg-rose-50/50 border-rose-200/60"
                      : person.gender === "male"
                        ? "text-sky-700 bg-sky-50/50 border-sky-200/60"
                        : "text-stone-700 bg-stone-50/50 border-stone-200/60"
                  }`}
                >
                  {person.gender === "female"
                    ? "Dâu"
                    : person.gender === "male"
                      ? "Rể"
                      : "Khách"}
                </span>
              )}
              {person.birth_order != null && (
                <span className="text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-xs border text-amber-700 bg-amber-50/60 border-amber-200/60 uppercase tracking-wider">
                  {person.birth_order === 1
                    ? "Con trưởng"
                    : `Con thứ ${person.birth_order}`}
                </span>
              )}
              {person.generation != null && (
                <span className="text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-xs border text-emerald-700 bg-emerald-50/60 border-emerald-200/60 uppercase tracking-wider">
                  Đời thứ {person.generation}
                </span>
              )}
              {person.is_eldest_son && (
                <span className="text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-xs border text-[#d4af37] bg-[#fffdf5] border-[#d4af37]/40 uppercase tracking-wider">
                  Trưởng nam
                </span>
              )}
              {person.is_eldest_grandson && (
                <span className="text-[10px] sm:text-xs font-sans font-bold rounded-md px-2 py-0.5 whitespace-nowrap shadow-xs border text-[#8b0000] bg-rose-50/60 border-[#8b0000]/40 uppercase tracking-wider">
                  Đích tôn
                </span>
              )}
            </h1>
            {person.other_names && (
              <p className="mt-1.5 text-sm sm:text-base text-stone-600 font-medium italic">
                Tên khác:{" "}
                <span className="font-semibold not-italic text-stone-700">
                  {person.other_names}
                </span>
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Birth Card */}
              <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/60 shadow-sm transition-all hover:shadow-md hover:border-amber-200/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                    <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                      Sinh
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {person.birth_year &&
                      getZodiacAnimal(
                        person.birth_year,
                        person.birth_month,
                        person.birth_day,
                      ) && (
                        <span className="text-[10px] font-sans font-bold text-rose-700 bg-rose-50 border border-rose-200/60 rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-xs tracking-wider">
                          Tuổi{" "}
                          {getZodiacAnimal(
                            person.birth_year,
                            person.birth_month,
                            person.birth_day,
                          )}
                        </span>
                      )}
                    {person.birth_day &&
                      person.birth_month &&
                      getZodiacSign(person.birth_day, person.birth_month) && (
                        <span className="text-[10px] font-sans font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-md px-1.5 py-0.5 whitespace-nowrap shadow-xs tracking-wider">
                          {getZodiacSign(person.birth_day, person.birth_month)}
                        </span>
                      )}
                  </div>
                </div>
                <div className="space-y-1.5 pl-4 border-l-2 border-stone-100">
                  <p className="text-stone-800 font-semibold text-sm sm:text-base">
                    {formatDisplayDate(
                      person.birth_year,
                      person.birth_month,
                      person.birth_day,
                    )}
                  </p>
                  {(person.birth_year ||
                    person.birth_month ||
                    person.birth_day) && (
                    <p className="text-sm font-medium text-stone-500 flex items-center gap-1.5">
                      <span className="text-[10px] border border-stone-200/60 bg-stone-50/80 rounded px-1.5 py-0.5">
                        Âm lịch
                      </span>
                      {getLunarDateString(
                        person.birth_year,
                        person.birth_month,
                        person.birth_day,
                      ) || "Chưa rõ"}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Death Card */}
              {isDeceased && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/60 shadow-sm transition-all hover:shadow-md hover:border-amber-200/60"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="size-2 rounded-full bg-stone-400 shadow-[0_0_8px_rgba(156,163,175,0.5)]"></span>
                    <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                      Mất
                    </h3>
                  </div>
                  <div className="space-y-1.5 pl-4 border-l-2 border-stone-100">
                    <p className="text-stone-800 font-semibold text-sm sm:text-base">
                      {person.death_day ||
                      person.death_month ||
                      person.death_year
                        ? formatDisplayDate(
                            person.death_year,
                            person.death_month,
                            person.death_day,
                          )
                        : getSolarDateString(
                            person.death_lunar_year,
                            person.death_lunar_month,
                            person.death_lunar_day,
                          ) || "Chưa rõ"}
                    </p>
                    {(person.death_year ||
                      person.death_month ||
                      person.death_day ||
                      person.death_lunar_year ||
                      person.death_lunar_month ||
                      person.death_lunar_day) && (
                      <p className="text-sm font-medium text-stone-500 flex items-center gap-1.5">
                        <span className="text-[10px] border border-stone-200/60 bg-stone-50/80 rounded px-1.5 py-0.5">
                          Âm lịch
                        </span>
                        {person.death_lunar_day ||
                        person.death_lunar_month ||
                        person.death_lunar_year
                          ? formatDisplayDate(
                              person.death_lunar_year,
                              person.death_lunar_month,
                              person.death_lunar_day,
                            )
                          : getLunarDateString(
                              person.death_year,
                              person.death_month,
                              person.death_day,
                            ) || "Chưa rõ"}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Age Card */}
              {(() => {
                const ageData = calculateAge(
                  person.birth_year,
                  person.birth_month,
                  person.birth_day,
                  person.death_year,
                  person.death_month,
                  person.death_day,
                  isDeceased,
                );
                if (!ageData) return null;
                return (
                  <motion.div
                    variants={itemVariants}
                    className="bg-linear-to-br from-amber-50 to-orange-50/40 rounded-2xl p-4 border border-amber-200/50 shadow-sm transition-all hover:shadow-md flex flex-col justify-center relative overflow-hidden"
                  >
                    <Leaf className="absolute -bottom-4 -right-4 w-20 h-20 text-amber-500/10 rotate-12" />
                    <div className="flex items-center gap-2 mb-1.5 relative z-10">
                      <span
                        className={`size-2 rounded-full ${ageData.isDeceased ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"}`}
                      ></span>
                      <p className="text-[11px] font-bold text-amber-800/60 uppercase tracking-widest">
                        {ageData.isDeceased
                          ? ageData.age >= 60
                            ? "Hưởng thọ"
                            : "Hưởng dương"
                          : "Tuổi"}
                      </p>
                    </div>
                    <div className="pl-4 relative z-10">
                      <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-linear-to-br from-amber-700 to-amber-900 tracking-tight">
                        {ageData.age}
                        <span className="text-xs sm:text-sm font-bold text-amber-700/60 ml-1.5 uppercase tracking-wider">
                          tuổi
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Death Anniversary Card */}
              {isDeceased &&
                (person.death_lunar_day || person.death_lunar_month || person.death_lunar_year) && (
                  <motion.div
                    variants={itemVariants}
                    className="bg-linear-to-br from-rose-50 to-red-50/40 rounded-2xl p-4 border border-rose-200/50 shadow-sm transition-all hover:shadow-md flex flex-col justify-center relative overflow-hidden"
                  >
                    <Leaf className="absolute -bottom-4 -right-4 w-20 h-20 text-rose-500/10 rotate-12" />
                    <div className="flex items-center gap-2 mb-1.5 relative z-10">
                      <span className="size-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]"></span>
                      <p className="text-[11px] font-bold text-rose-800/60 uppercase tracking-widest">
                        Ngày giỗ
                      </p>
                    </div>
                    <div className="pl-4 relative z-10">
                      <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-linear-to-br from-rose-700 to-rose-900 tracking-tight">
                        {getDeathAnniversaryDate(person.death_lunar_year, person.death_lunar_month, person.death_lunar_day) || "Chưa rõ"}
                      </p>
                    </div>
                  </motion.div>
                )}

              {/* Children Stats Card */}
              {relStats &&
                (relStats.biologicalChildren > 0 ||
                  relStats.sonInLaw > 0 ||
                  relStats.daughterInLaw > 0 ||
                  relStats.paternalGrandchildren > 0 ||
                  relStats.maternalGrandchildren > 0) && (
                  <motion.div
                    layout
                    variants={itemVariants}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/60 shadow-sm transition-all hover:shadow-md hover:border-amber-200/60 sm:col-span-2 md:col-span-3"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="size-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></span>
                      <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                        Hậu duệ
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Biological Children */}
                      {relStats.biologicalChildren > 0 && (
                        <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100 flex flex-col justify-between group hover:bg-stone-100/80 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <Users className="size-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-tight">
                                Con ruột
                              </p>
                              <p className="text-xl font-black text-stone-700 leading-none mt-0.5">
                                {relStats.biologicalChildren}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t border-stone-200/50">
                            {relStats.maleBiologicalChildren > 0 && (
                              <span className="text-[11px] font-medium text-sky-700 bg-sky-100/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <MaleIcon className="size-3 shrink-0" />{" "}
                                {relStats.maleBiologicalChildren}
                              </span>
                            )}
                            {relStats.femaleBiologicalChildren > 0 && (
                              <span className="text-[11px] font-medium text-rose-700 bg-rose-100/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <FemaleIcon className="size-3 shrink-0" />{" "}
                                {relStats.femaleBiologicalChildren}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* In-Laws */}
                      {(relStats.sonInLaw > 0 ||
                        relStats.daughterInLaw > 0) && (
                        <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100 flex flex-col group hover:bg-stone-100/80 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-stone-200/50 text-stone-600 rounded-lg group-hover:bg-stone-200 transition-colors">
                              <UserPlus className="size-4" />
                            </div>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Dâu / Rể
                            </p>
                          </div>

                          <div className="space-y-1 mt-auto w-full pt-1 border-t border-stone-200/50">
                            {relStats.daughterInLaw > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500 font-medium">
                                  Con dâu
                                </span>
                                <span className="font-bold text-stone-700">
                                  {relStats.daughterInLaw}
                                </span>
                              </div>
                            )}
                            {relStats.sonInLaw > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500 font-medium">
                                  Con rể
                                </span>
                                <span className="font-bold text-stone-700">
                                  {relStats.sonInLaw}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Grandchildren */}
                      {(relStats.paternalGrandchildren > 0 ||
                        relStats.maternalGrandchildren > 0) && (
                        <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100 flex flex-col group hover:bg-stone-100/80 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                              <Baby className="size-4" />
                            </div>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Cháu
                            </p>
                          </div>

                          <div className="space-y-1 mt-auto w-full pt-1 border-t border-stone-200/50">
                            {relStats.paternalGrandchildren > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500 font-medium">
                                  Cháu nội
                                </span>
                                <span className="font-bold text-stone-700">
                                  {relStats.paternalGrandchildren}
                                </span>
                              </div>
                            )}
                            {relStats.maternalGrandchildren > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500 font-medium">
                                  Cháu ngoại
                                </span>
                                <span className="font-bold text-stone-700">
                                  {relStats.maternalGrandchildren}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <motion.section layout variants={itemVariants}>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Info className="size-5 text-amber-600" />
                Ghi chú
              </h2>
              <div className="bg-white/80 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-stone-200/60 shadow-sm relative overflow-hidden">
                {note ? (
                  <div className="flex flex-col">
                    <motion.div
                      initial={false}
                      animate={{
                        height:
                          !isNoteExpanded && isNoteLong ? "120px" : "auto",
                      }}
                      className="relative overflow-hidden"
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 20,
                        duration: 0.4,
                      }}
                    >
                      <p className="text-stone-600 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                        {note}
                      </p>
                      {/* Gradient fade overlay when collapsed */}
                      {!isNoteExpanded && isNoteLong && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-white/95 via-white/40 to-transparent pointer-events-none" />
                      )}
                    </motion.div>

                    {isNoteLong && (
                      <button
                        onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                        className="mt-4 text-amber-600 hover:text-amber-700 text-[13px] font-bold flex items-center gap-1.5 transition-colors w-fit group relative z-10"
                      >
                        <span className="underline underline-offset-4 decoration-amber-600/30 group-hover:decoration-amber-700">
                          {isNoteExpanded ? "Thu gọn" : "Xem thêm"}
                        </span>
                        <motion.div
                          animate={{ rotate: isNoteExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="size-3.5" />
                        </motion.div>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-stone-400 italic text-sm sm:text-base">
                    Chưa có ghi chú.
                  </p>
                )}
              </div>
            </motion.section>

            <motion.section layout variants={itemVariants}>
              <h2 className="text-base sm:text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Users className="size-5 text-amber-600" />
                Gia đình
              </h2>
              <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-stone-200/60 shadow-sm relative z-0">
                <RelationshipManager
                  person={person}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                  onStatsLoaded={handleStatsLoaded}
                />
              </div>
            </motion.section>
          </div>

          {/* Sidebar / Private Info */}
          <div className="space-y-6">
            <motion.div layout variants={itemVariants}>
              {isAdmin ? (
                <div className="bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm">
                  <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2 text-sm sm:text-base border-b border-stone-200/60 pb-3">
                    <span className="bg-amber-100/80 text-amber-700 p-1.5 rounded-lg border border-amber-200/50">
                      🔒
                    </span>
                    Thông tin liên hệ
                  </h3>
                  <dl className="space-y-4 text-sm sm:text-base">
                    <div>
                      <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5" /> Số điện thoại
                      </dt>
                      <dd className="text-stone-900 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200/60 shadow-xs">
                        {(fullPerson.phone_number as string) || (
                          <span className="text-stone-400 font-normal">
                            Chưa cập nhật
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-3.5 h-3.5" /> Nghề nghiệp
                      </dt>
                      <dd className="text-stone-900 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200/60 shadow-xs">
                        {(fullPerson.occupation as string) || (
                          <span className="text-stone-400 font-normal">
                            Chưa cập nhật
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5" /> Nơi ở hiện tại
                      </dt>
                      <dd className="text-stone-900 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200/60 shadow-xs">
                        {(fullPerson.current_residence as string) || (
                          <span className="text-stone-400 font-normal">
                            Chưa cập nhật
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5" /> Quê quán
                      </dt>
                      <dd className="text-stone-900 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200/60 shadow-xs">
                        {(fullPerson.hometown as string) || (
                          <span className="text-stone-400 font-normal">
                            Chưa cập nhật
                          </span>
                        )}
                      </dd>
                    </div>
                    {isDeceased && (
                      <div>
                        <dt className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5" /> Địa chỉ phần mộ
                        </dt>
                        <dd className="text-stone-900 font-medium bg-white px-3 py-2 rounded-lg border border-stone-200/60 shadow-xs">
                          {(fullPerson.grave_address as string) || (
                            <span className="text-stone-400 font-normal">
                              Chưa cập nhật
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-200 border-dashed flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-2xl opacity-50">🔒</span>
                  <p className="text-sm font-medium text-stone-500">
                    Thông tin liên hệ chỉ hiển thị với Quản trị viên.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
