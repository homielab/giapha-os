"use client";

import { computeKinship } from "@/utils/kinshipHelpers";
import { getAvatarBg } from "@/utils/styleHelprs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BookOpen,
  GitMerge,
  Info,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import DefaultAvatar from "./DefaultAvatar";
import { FemaleIcon, MaleIcon } from "./GenderIcons";

interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
  avatar_url?: string | null;
}

interface RelEdge {
  type: string;
  person_a: string;
  person_b: string;
}

interface Props {
  persons: PersonNode[];
  relationships: RelEdge[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const getGenderStyle = (gender: string) => {
  if (gender === "male") return "bg-sky-100 text-sky-600";
  if (gender === "female") return "bg-rose-100 text-rose-600";
  return "bg-stone-100 text-stone-600";
};

// ── Person selector dropdown ──────────────────────────────────────────────────
function PersonSelector({
  label,
  selected,
  onSelect,
  persons,
  disabledId,
}: {
  label: string;
  selected: PersonNode | null;
  onSelect: (p: PersonNode) => void;
  persons: PersonNode[];
  disabledId?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      persons
        .filter(
          (p) =>
            p.id !== disabledId &&
            p.full_name.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 20),
    [persons, disabledId, search],
  );

  return (
    <div className="w-full flex-1 min-w-0 relative">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
          selected
            ? "bg-amber-50 border-amber-300 text-stone-800"
            : "bg-white/80 border-stone-200 text-stone-400 hover:border-amber-200"
        }`}
      >
        <div className="relative shrink-0">
          <div
            className={`size-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden ring-2 ring-white shadow-sm
            ${selected ? getAvatarBg(selected.gender) : "bg-stone-100 text-stone-400"}`}
          >
            {selected ? (
              selected.avatar_url ? (
                <Image
                  unoptimized
                  src={selected.avatar_url}
                  alt={selected.full_name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <DefaultAvatar gender={selected.gender} size={40} />
              )
            ) : (
              "?"
            )}
          </div>
          {selected && (
            <div
              className={`absolute -bottom-1 -right-1 size-4 rounded-full ring-2 ring-white shadow-xs flex items-center justify-center ${getGenderStyle(selected.gender)}`}
            >
              {selected.gender === "male" ? (
                <MaleIcon className="size-3" />
              ) : selected.gender === "female" ? (
                <FemaleIcon className="size-3" />
              ) : null}
            </div>
          )}
        </div>

        <span className="font-semibold truncate">
          {selected ? selected.full_name : "Chọn thành viên..."}
        </span>
        {selected?.birth_year && (
          <span className="text-xs text-stone-400 shrink-0">
            ({selected.birth_year})
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-xl border border-stone-200/60 overflow-hidden"
          >
            <div className="p-3 border-b border-stone-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <input
                  autoFocus
                  placeholder="Tìm tên..."
                  className="w-full pl-9 pr-4 py-2 text-base sm:text-sm rounded-xl border border-stone-200 focus:outline-none focus:border-amber-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center py-6 text-sm text-stone-400">
                  Không tìm thấy
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`size-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-1 ring-white shadow-xs
                        ${getAvatarBg(p.gender)}`}
                      >
                        {p.avatar_url ? (
                          <Image
                            unoptimized
                            src={p.avatar_url}
                            alt={p.full_name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <DefaultAvatar gender={p.gender} size={32} />
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-1 ring-white shadow-xs flex items-center justify-center ${getGenderStyle(p.gender)}`}
                      >
                        {p.gender === "male" ? (
                          <MaleIcon className="size-2.5" />
                        ) : p.gender === "female" ? (
                          <FemaleIcon className="size-2.5" />
                        ) : null}
                      </div>
                    </div>

                    <span className="text-sm font-medium text-stone-700 truncate">
                      {p.full_name}
                    </span>
                    {p.birth_year && (
                      <span className="text-xs text-stone-400 ml-auto shrink-0">
                        {p.birth_year}
                      </span>
                    )}
                    {p.generation != null && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                        Đ.{p.generation}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Kinship reference table data ──────────────────────────────────────────────
const KINSHIP_TERMS = [
  {
    relation: "Bố / Mẹ",
    desc: "1 bậc trên (dòng trực hệ)",
    example: "Bố, ba, má...",
  },
  {
    relation: "Ông / Bà",
    desc: "2 bậc trên (dòng trực hệ)",
    example: "Ông nội, bà ngoại...",
  },
  {
    relation: "Cụ / Kỵ / Sơ...",
    desc: "3 bậc trên trở lên",
    example: "Cụ cố, cụ kỵ...",
  },
  {
    relation: "Con / Cháu / Chắt...",
    desc: "Các bậc dưới trực hệ",
    example: "Con, cháu, chắt, chít...",
  },
  {
    relation: "Anh / Chị / Em họ",
    desc: "Cùng thế hệ, khác nhánh",
    example: "Dựa vào thứ bậc của nhánh bố/mẹ",
  },
  {
    relation: "Bác / Chú / Cô",
    desc: "Anh/chị/em của bố (Bên Nội)",
    example: "Bác (anh), Chú (em trai), Cô (chị em gái)",
  },
  {
    relation: "Cậu / Dì",
    desc: "Anh/chị/em của mẹ (Bên Ngoại)",
    example: "Cậu (anh em trai), Dì (chị em gái)",
  },
  {
    relation: "Thím / Mợ / Dượng",
    desc: "Vợ/chồng của chú, cậu, cô, dì",
    example: "Thím (vợ chú), Mợ (vợ cậu), Dượng (chồng cô/dì)",
  },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function KinshipFinder({ persons, relationships }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const p1Id = searchParams.get("p1");
  const p2Id = searchParams.get("p2");

  const personA = useMemo(
    () => persons.find((p) => p.id === p1Id) || null,
    [persons, p1Id],
  );
  const personB = useMemo(
    () => persons.find((p) => p.id === p2Id) || null,
    [persons, p2Id],
  );

  const [showGuide, setShowGuide] = useState(false);

  const updateUrl = (p1Id: string | null, p2Id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p1Id) params.set("p1", p1Id);
    else params.delete("p1");
    if (p2Id) params.set("p2", p2Id);
    else params.delete("p2");

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  const result = useMemo(() => {
    if (!personA || !personB) return null;
    return computeKinship(personA, personB, persons, relationships);
  }, [personA, personB, persons, relationships]);

  const swap = () => {
    updateUrl(p2Id, p1Id);
  };

  return (
    <div className="space-y-6">
      {/* ── Selector row ── */}
      <div className="bg-white/80 border border-stone-200/60 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
          <PersonSelector
            label="Thành viên A"
            selected={personA}
            onSelect={(p) => updateUrl(p.id, p2Id)}
            persons={persons}
            disabledId={personB?.id}
          />
          <button
            onClick={swap}
            title="Đổi chỗ"
            className="size-10 shrink-0 sm:mb-0.5 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-600 text-stone-500 transition-all border border-stone-200"
          >
            <ArrowLeftRight className="size-4 rotate-90 sm:rotate-0" />
          </button>
          <PersonSelector
            label="Thành viên B"
            selected={personB}
            onSelect={(p) => updateUrl(p1Id, p.id)}
            persons={persons}
            disabledId={personA?.id}
          />
        </div>
      </div>

      {/* ── Result ── */}
      <AnimatePresence mode="wait">
        {!personA || !personB ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 text-stone-400"
          >
            <Users className="size-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chọn hai thành viên để tính quan hệ</p>
          </motion.div>
        ) : result === null ? (
          <motion.div key="same" className="text-center py-8 text-stone-400">
            Hãy chọn hai người khác nhau.
          </motion.div>
        ) : (
          <motion.div
            key={`${personA.id}-${personB.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Description badge */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
              <Sparkles className="size-5 text-amber-500 shrink-0" />
              <p className="text-amber-800 font-semibold">
                {result.description}
              </p>
            </div>

            {/* Main kinship cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/90 border border-stone-200/60 rounded-2xl p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  {personA.full_name} gọi {personB.full_name} là
                </p>
                <p className="text-4xl font-serif font-bold text-amber-600 capitalize">
                  {result.aCallsB}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white/90 border border-stone-200/60 rounded-2xl p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  {personB.full_name} gọi {personA.full_name} là
                </p>
                <p className="text-4xl font-serif font-bold text-amber-600 capitalize">
                  {result.bCallsA}
                </p>
              </motion.div>
            </div>

            {/* Path info */}
            {result.pathLabels.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-stone-50 border border-stone-200/60 rounded-2xl px-6 py-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <GitMerge className="size-4 text-stone-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Phân tích con đường quan hệ
                  </p>
                </div>
                <div className="space-y-4">
                  {result.pathLabels.map((label, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="size-6 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-[10px] font-bold text-stone-400">
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed pt-1">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Disclaimer for ambiguous terms */}
            {(result.aCallsB.includes("/") ||
              result.aCallsB.includes("họ hàng")) && (
              <p className="text-xs text-stone-400 italic px-1">
                * Danh xưng chính xác dựa trên giới tính, thứ tự sinh của các
                nhánh và vế Nội/Ngoại.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guide & reference section ── */}
      <div className="border-t border-stone-200/60 pt-6 space-y-4">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-amber-600 transition-colors"
        >
          <BookOpen className="size-4" />
          {showGuide ? "Ẩn hướng dẫn" : "Hướng dẫn sử dụng & Bảng danh xưng"}
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-5">
                {/* How it works */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5">
                  <p className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-3">
                    <Info className="size-4" />
                    Cách hoạt động
                  </p>
                  <ol className="space-y-2 text-sm text-blue-800">
                    <li className="flex gap-2">
                      <span className="font-bold shrink-0">1.</span>
                      Hệ thống xây dựng đồ thị gia phả từ toàn bộ quan hệ huyết
                      thống và hôn nhân.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold shrink-0">2.</span>
                      Tìm <strong>Tổ tiên chung gần nhất (LCA)</strong> để xác
                      định khoảng cách thế hệ.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold shrink-0">3.</span>
                      Xác định <strong>vế Nội/Ngoại</strong> dựa trên giới tính
                      của tổ tiên tại điểm rẽ nhánh.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold shrink-0">4.</span>
                      So sánh <strong>thứ bậc (seniority)</strong> giữa các
                      nhanh từ tổ tiên chung để quyết định quan hệ
                      &quot;Anh/Em&quot; hoặc &quot;Bác/Chú&quot;.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold shrink-0">5.</span>
                      Tra bảng danh xưng tiếng Việt chuyên sâu bao gồm cả các
                      mối quan hệ thông qua hôn nhân.
                    </li>
                  </ol>
                </div>

                {/* Data requirements */}
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5">
                  <p className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-2">
                    <Info className="size-4" />
                    Yêu cầu dữ liệu để kết quả chính xác
                  </p>
                  <ul className="space-y-1.5 text-sm text-amber-800">
                    <li className="flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      Nhập đầy đủ quan hệ <strong>Bố/Mẹ - Con</strong> và{" "}
                      <strong>Kết hôn</strong>.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      <strong>Giới tính</strong> chính xác để phân biệt Cô/Dì,
                      Chú/Cậu.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      <strong>Thứ tự sinh (Birth Order)</strong> là yếu tố then
                      chốt để phân định thứ bậc Anh/Em trong dòng họ.
                    </li>
                  </ul>
                </div>

                {/* Reference table */}
                <div className="bg-white/80 border border-stone-200/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50">
                    <p className="text-sm font-bold text-stone-600">
                      Bảng danh xưng tham khảo
                    </p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {KINSHIP_TERMS.map((row) => (
                      <div
                        key={row.relation}
                        className="flex items-start gap-4 px-5 py-3"
                      >
                        <span className="text-sm font-bold text-amber-700 w-48 shrink-0">
                          {row.relation}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-stone-600">{row.desc}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {row.example}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
