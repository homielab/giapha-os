"use client";

import { Person, Relationship } from "@/types";
import { motion } from "framer-motion";
import {
  Crown,
  Flower2,
  Heart,
  HeartOff,
  Mars,
  Skull,
  Users,
  Venus,
  BookHeart,
  BarChart2,
} from "lucide-react";
import { useMemo } from "react";

interface FamilyStatsProps {
  persons: Person[];
  relationships: Relationship[];
}

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
  delay = 0,
}: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white/80 border border-stone-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
    >
      {/* Background glow */}
      <div
        className={`absolute -top-6 -right-6 size-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${color}`}
      />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>{icon}</div>
        <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
          {pct}%
        </span>
      </div>

      <p className="text-3xl font-bold text-stone-800 relative z-10">{value}</p>
      <p className="text-sm font-medium text-stone-500 mt-0.5 relative z-10">
        {label}
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </motion.div>
  );
}

// Generation breakdown row
function GenerationRow({
  gen,
  count,
  max,
  delay,
}: {
  gen: number;
  count: number;
  max: number;
  delay: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-stone-500 w-14 shrink-0">
        Đời {gen}
      </span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay, ease: "easeOut" }}
          className="h-full bg-amber-400 rounded-full"
        />
      </div>
      <span className="text-sm font-bold text-stone-700 w-8 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}

export default function FamilyStats({
  persons,
  relationships,
}: FamilyStatsProps) {
  const stats = useMemo(() => {
    const total = persons.length;
    const now = new Date().getFullYear();

    // Gender
    const male = persons.filter((p) => p.gender === "male").length;
    const female = persons.filter((p) => p.gender === "female").length;

    // In-laws
    const daughtersInLaw = persons.filter(
      (p) => p.is_in_law && p.gender === "female",
    ).length;
    const sonsInLaw = persons.filter(
      (p) => p.is_in_law && p.gender === "male",
    ).length;

    // Deceased
    const deceased = persons.filter((p) => p.is_deceased).length;

    // First-born (con trưởng)
    const firstBorn = persons.filter((p) => p.birth_order === 1).length;

    // Married / unmarried (based on marriage relationships)
    const marriedIds = new Set<string>();
    const spouseCountMap = new Map<string, number>();
    relationships
      .filter((r) => r.type === "marriage")
      .forEach((r) => {
        marriedIds.add(r.person_a);
        marriedIds.add(r.person_b);
        spouseCountMap.set(r.person_a, (spouseCountMap.get(r.person_a) ?? 0) + 1);
        spouseCountMap.set(r.person_b, (spouseCountMap.get(r.person_b) ?? 0) + 1);
      });
    const married = persons.filter((p) => marriedIds.has(p.id)).length;
    const unmarried = total - married;

    // Polygamy: people with 2+ spouses
    const polygamyCount = Array.from(spouseCountMap.values()).filter((c) => c >= 2).length;

    // Generation breakdown
    const genMap = new Map<number, number>();
    persons.forEach((p) => {
      if (p.generation != null) {
        genMap.set(p.generation, (genMap.get(p.generation) ?? 0) + 1);
      }
    });
    const generationBreakdown = Array.from(genMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, count]) => ({ gen, count }));

    // Age bracket distribution (living persons with birth_year)
    const ageBrackets = [
      { label: "< 18", min: 0, max: 17, count: 0, color: "bg-emerald-400" },
      { label: "18–30", min: 18, max: 30, count: 0, color: "bg-sky-400" },
      { label: "31–50", min: 31, max: 50, count: 0, color: "bg-violet-400" },
      { label: "51–70", min: 51, max: 70, count: 0, color: "bg-amber-400" },
      { label: "71–90", min: 71, max: 90, count: 0, color: "bg-rose-400" },
      { label: "> 90", min: 91, max: 999, count: 0, color: "bg-red-500" },
    ];
    persons
      .filter((p) => !p.is_deceased && p.birth_year)
      .forEach((p) => {
        const age = now - p.birth_year!;
        const bracket = ageBrackets.find((b) => age >= b.min && age <= b.max);
        if (bracket) bracket.count++;
      });
    const maxAgeBracket = Math.max(...ageBrackets.map((b) => b.count), 1);

    // Religion breakdown
    const religionMap = new Map<string, number>();
    persons.forEach((p) => {
      if (p.religion) {
        religionMap.set(p.religion, (religionMap.get(p.religion) ?? 0) + 1);
      }
    });
    const religionLabels: Record<string, string> = {
      buddhist: "Phật giáo 🪷",
      catholic: "Thiên Chúa ✝️",
      protestant: "Tin Lành",
      islam: "Hồi giáo ☪️",
      none: "Không tôn giáo",
      other: "Khác",
    };
    const religionBreakdown = Array.from(religionMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ label: religionLabels[key] ?? key, count }));

    return {
      total,
      male,
      female,
      daughtersInLaw,
      sonsInLaw,
      deceased,
      firstBorn,
      married,
      unmarried,
      polygamyCount,
      generationBreakdown,
      ageBrackets,
      maxAgeBracket,
      religionBreakdown,
    };
  }, [persons, relationships]);

  const cards = [
    {
      label: "Tổng thành viên",
      value: stats.total,
      icon: <Users className="size-5 text-stone-600" />,
      color: "bg-stone-400",
    },
    {
      label: "Nam",
      value: stats.male,
      icon: <Mars className="size-5 text-blue-600" />,
      color: "bg-blue-400",
    },
    {
      label: "Nữ",
      value: stats.female,
      icon: <Venus className="size-5 text-pink-500" />,
      color: "bg-pink-400",
    },
    {
      label: "Con dâu",
      value: stats.daughtersInLaw,
      icon: <Flower2 className="size-5 text-rose-500" />,
      color: "bg-rose-400",
    },
    {
      label: "Con rể",
      value: stats.sonsInLaw,
      icon: <Users className="size-5 text-indigo-500" />,
      color: "bg-indigo-400",
    },
    {
      label: "Đã kết hôn",
      value: stats.married,
      icon: <Heart className="size-5 text-red-500" />,
      color: "bg-red-400",
    },
    {
      label: "Chưa kết hôn",
      value: stats.unmarried,
      icon: <HeartOff className="size-5 text-stone-400" />,
      color: "bg-stone-300",
    },
    {
      label: "Đã mất",
      value: stats.deceased,
      icon: <Skull className="size-5 text-stone-500" />,
      color: "bg-stone-400",
    },
    {
      label: "Con trưởng",
      value: stats.firstBorn,
      icon: <Crown className="size-5 text-amber-500" />,
      color: "bg-amber-400",
    },
    ...(stats.polygamyCount > 0 ? [{
      label: "Đa thê/đa phu",
      value: stats.polygamyCount,
      icon: <BookHeart className="size-5 text-violet-500" />,
      color: "bg-violet-400",
    }] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            total={stats.total}
            icon={card.icon}
            color={card.color}
            delay={i * 0.06}
          />
        ))}
      </div>

      {/* Age Bracket Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
          <BarChart2 className="size-4 text-sky-500" />
          Phân bố độ tuổi (người còn sống)
        </h2>
        <div className="space-y-3">
          {stats.ageBrackets.map((bracket, i) => (
            <div key={bracket.label} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-14 shrink-0">{bracket.label}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.maxAgeBracket > 0 ? (bracket.count / stats.maxAgeBracket) * 100 : 0}%` }}
                  transition={{ duration: 0.6, delay: 0.45 + i * 0.07 }}
                  className={`h-full ${bracket.color} rounded-full`}
                />
              </div>
              <span className="text-sm font-bold text-stone-700 w-8 text-right">{bracket.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-4 italic">* Chỉ tính người còn sống có năm sinh</p>
      </motion.div>

      {/* Generation Breakdown */}
      {stats.generationBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            Phân bố theo thế hệ
          </h2>
          <div className="space-y-3">
            {stats.generationBreakdown.map(({ gen, count }, i) => (
              <GenerationRow
                key={gen}
                gen={gen}
                count={count}
                max={stats.total}
                delay={0.55 + i * 0.07}
              />
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-4 italic">
            * Chỉ tính các thành viên đã được gán số thế hệ
          </p>
        </motion.div>
      )}

      {/* Gender ratio visual */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
          <Users className="size-4 text-stone-500" />
          Tỉ lệ giới tính
        </h2>
        <div className="flex h-5 rounded-full overflow-hidden gap-px">
          {stats.total > 0 && (
            <>
              <motion.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.male }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="bg-blue-400 flex items-center justify-center"
                title={`Nam: ${stats.male}`}
              />
              <motion.div
                initial={{ flex: 0 }}
                animate={{ flex: stats.female }}
                transition={{ duration: 0.7, delay: 0.7 }}
                className="bg-pink-400 flex items-center justify-center"
                title={`Nữ: ${stats.female}`}
              />
            </>
          )}
        </div>
        <div className="flex gap-6 mt-3 text-sm">
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-blue-400 inline-block" />
            Nam — {stats.male} người (
            {stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}
            %)
          </span>
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-pink-400 inline-block" />
            Nữ — {stats.female} người (
            {stats.total > 0
              ? Math.round((stats.female / stats.total) * 100)
              : 0}
            %)
          </span>
        </div>
      </motion.div>

      {/* Marital status breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
        className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
          <Heart className="size-4 text-red-400" />
          Tình trạng hôn nhân
        </h2>
        <div className="flex h-5 rounded-full overflow-hidden gap-px mb-3">
          {stats.total > 0 && (
            <>
              <motion.div initial={{ flex: 0 }} animate={{ flex: stats.married }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="bg-red-400" title={`Đã kết hôn: ${stats.married}`} />
              <motion.div initial={{ flex: 0 }} animate={{ flex: stats.unmarried }}
                transition={{ duration: 0.7, delay: 0.8 }}
                className="bg-stone-300" title={`Chưa kết hôn: ${stats.unmarried}`} />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-red-400 inline-block" />
            Đã kết hôn — {stats.married} ({stats.total > 0 ? Math.round(stats.married / stats.total * 100) : 0}%)
          </span>
          <span className="flex items-center gap-2 text-stone-600">
            <span className="size-3 rounded-full bg-stone-300 inline-block" />
            Chưa kết hôn — {stats.unmarried} ({stats.total > 0 ? Math.round(stats.unmarried / stats.total * 100) : 0}%)
          </span>
          {stats.polygamyCount > 0 && (
            <span className="flex items-center gap-2 text-violet-600 font-medium">
              <BookHeart className="size-3.5" />
              Đa thê/đa phu — {stats.polygamyCount} người
            </span>
          )}
        </div>
      </motion.div>

      {/* Religion breakdown */}
      {stats.religionBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.85 }}
          className="bg-white/80 border border-stone-200/60 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-base font-bold text-stone-700 mb-5 flex items-center gap-2">
            <span className="text-base">🙏</span>
            Tôn giáo
          </h2>
          <div className="space-y-3">
            {stats.religionBreakdown.map(({ label, count }, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-32 shrink-0 truncate">{label}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / stats.total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.9 + i * 0.06 }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
                <span className="text-sm font-bold text-stone-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
