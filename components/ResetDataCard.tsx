"use client";

import { resetData, ResetOptions } from "@/app/actions/data";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS: { key: keyof ResetOptions; label: string; desc: string; danger: boolean }[] = [
  { key: "photos", label: "Ảnh gia đình", desc: "Toàn bộ ảnh trong bucket shared-photos", danger: false },
  { key: "events", label: "Sự kiện tùy chỉnh", desc: "Các sự kiện do người dùng tạo", danger: false },
  { key: "relationships", label: "Quan hệ", desc: "Liên kết hôn nhân và cha/con giữa các thành viên", danger: true },
  { key: "persons", label: "Thành viên", desc: "Tất cả thành viên trong gia phả (bao gồm cả quan hệ)", danger: true },
];

export default function ResetDataCard() {
  const router = useRouter();
  const [selected, setSelected] = useState<ResetOptions>({
    photos: false,
    events: false,
    relationships: false,
    persons: false,
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const noneSelected = !Object.values(selected).some(Boolean);

  const toggle = (key: keyof ResetOptions) => {
    setSelected((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Chọn persons → tự chọn relationships (FK cascade)
      if (key === "persons" && next.persons) next.relationships = true;
      // Bỏ relationships → tự bỏ persons
      if (key === "relationships" && !next.relationships) next.persons = false;
      return next;
    });
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    const result = await resetData(selected);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setShowConfirm(false);
      setSelected({ photos: false, events: false, relationships: false, persons: false });
      setTimeout(() => {
        setSuccess(false);
        router.refresh();
      }, 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 className="size-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-stone-800">Xóa dữ liệu</h3>
          <p className="text-sm text-stone-500 mt-0.5">
            Chọn loại dữ liệu cần xóa. Thao tác này <span className="font-semibold text-red-600">không thể hoàn tác</span>.
          </p>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
              selected[opt.key]
                ? opt.danger
                  ? "bg-red-50 border-red-300"
                  : "bg-amber-50 border-amber-300"
                : "bg-white border-stone-200 hover:border-stone-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selected[opt.key]}
              onChange={() => toggle(opt.key)}
              className="mt-0.5 rounded border-stone-300 text-red-500 focus:ring-red-400 size-4"
            />
            <div>
              <p className={`text-sm font-semibold ${opt.danger ? "text-red-700" : "text-stone-700"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
          Đã xóa dữ liệu thành công.
        </p>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        disabled={noneSelected}
        className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Trash2 className="size-4" />
        Xóa dữ liệu đã chọn
      </button>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !loading && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
              <h4 className="text-lg font-bold text-stone-800">Xác nhận xóa dữ liệu</h4>
            </div>
            <p className="text-stone-600 text-sm mb-3">Bạn sắp xóa vĩnh viễn:</p>
            <ul className="text-sm text-red-700 font-medium mb-5 space-y-1">
              {OPTIONS.filter((o) => selected[o.key]).map((o) => (
                <li key={o.key} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                  {o.label}
                </li>
              ))}
            </ul>
            <p className="text-xs text-stone-400 mb-5">
              Thao tác này không thể hoàn tác. Hãy chắc chắn bạn đã sao lưu dữ liệu trước khi tiếp tục.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
