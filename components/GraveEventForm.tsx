"use client";

import { addGraveEvent } from "@/app/dashboard/members/[id]/grave/actions";
import type { GraveEventType } from "@/types";
import { X } from "lucide-react";
import { useState } from "react";

const EVENT_TYPE_OPTIONS: Array<{ value: GraveEventType; label: string }> = [
  { value: "burial",             label: "⚰️ Chôn cất" },
  { value: "exhumation",         label: "🏚️ Bốc mộ" },
  { value: "grave_construction", label: "🏗️ Xây mộ" },
  { value: "grave_renovation",   label: "🔨 Tu sửa mộ" },
  { value: "cremation",          label: "🔥 Hỏa táng" },
  { value: "urn_placement",      label: "🏺 Đặt bình tro cốt" },
  { value: "cleaning",           label: "🧹 Vệ sinh mộ" },
  { value: "other",              label: "📌 Khác" },
];

interface GraveEventFormProps {
  graveId: string;
  personId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function GraveEventForm({
  graveId,
  personId: _personId,
  onClose,
  onSaved,
}: GraveEventFormProps) {
  const [eventType, setEventType] = useState<GraveEventType>("burial");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [conductedBy, setConductedBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await addGraveEvent(graveId, {
        event_type: eventType,
        event_date: eventDate || null,
        notes: notes || null,
        conducted_by: conductedBy || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors";
  const labelCls = "block text-xs font-medium text-stone-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Thêm Sự Kiện Mộ Phần</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Loại sự kiện *</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as GraveEventType)}
              className={inputCls}
              required
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Ngày (dương lịch)</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Mô tả thêm về sự kiện..."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className={labelCls}>Người thực hiện</label>
            <input
              type="text"
              value={conductedBy}
              onChange={(e) => setConductedBy(e.target.value)}
              placeholder="Tên người/đơn vị thực hiện"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
