"use client";

import {
  upsertGraveRecord,
  deleteGraveRecord,
  getGraveEvents,
  deleteGraveEvent,
} from "@/app/dashboard/members/[id]/grave/actions";
import GraveEventForm from "@/components/GraveEventForm";
import GravePhotoGallery from "@/components/GravePhotoGallery";
import GraveTimeline from "@/components/GraveTimeline";
import {
  GraveStatusBadge,
  BurialTypeBadge,
  RemainsStatusBadge,
} from "@/components/GraveStatusBadge";
import type {
  GraveRecord,
  GraveEvent,
  BurialType,
  GraveStatus,
  RemainsStatus,
  Person,
} from "@/types";
import { MapPin, Edit3, Trash2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BURIAL_OPTIONS: Array<{ value: BurialType; label: string }> = [
  { value: "burial",        label: "Địa táng" },
  { value: "cremation",     label: "Hỏa táng" },
  { value: "cremation_urn", label: "Hỏa táng (bình)" },
  { value: "sea_burial",    label: "Thủy táng" },
  { value: "other",         label: "Khác" },
];

const STATUS_OPTIONS: Array<{ value: GraveStatus; label: string }> = [
  { value: "unknown",      label: "Chưa rõ" },
  { value: "no_grave",     label: "Chưa có mộ" },
  { value: "has_grave",    label: "Đã xây mộ" },
  { value: "grave_moved",  label: "Đã cải táng" },
  { value: "cremated_urn", label: "Tro cốt" },
];

const REMAINS_OPTIONS: Array<{ value: RemainsStatus; label: string }> = [
  { value: "unknown",         label: "Chưa rõ" },
  { value: "in_ground",       label: "Còn trong đất" },
  { value: "exhumed",         label: "Đã bốc mộ" },
  { value: "cremated_ashes",  label: "Tro cốt" },
  { value: "urn_home",        label: "Bình tại nhà" },
];

interface GraveSectionProps {
  personId: string;
  initialRecord: GraveRecord | null;
  canEdit: boolean;
  persons: Array<{ id: string; full_name: string }>;
}

type FormData = {
  burial_type: BurialType | "";
  grave_status: GraveStatus;
  remains_status: RemainsStatus;
  grave_type: string;
  cemetery_name: string;
  cemetery_address: string;
  gps_lat: string;
  gps_lng: string;
  cause_of_death: string;
  epitaph: string;
  caretaker_person_id: string;
  branch_head_person_id: string;
  public_memorial: boolean;
};

function recordToForm(r: GraveRecord | null): FormData {
  return {
    burial_type: r?.burial_type ?? "",
    grave_status: r?.grave_status ?? "unknown",
    remains_status: r?.remains_status ?? "unknown",
    grave_type: r?.grave_type ?? "",
    cemetery_name: r?.cemetery_name ?? "",
    cemetery_address: r?.cemetery_address ?? "",
    gps_lat: r?.gps_lat != null ? String(r.gps_lat) : "",
    gps_lng: r?.gps_lng != null ? String(r.gps_lng) : "",
    cause_of_death: r?.cause_of_death ?? "",
    epitaph: r?.epitaph ?? "",
    caretaker_person_id: r?.caretaker_person_id ?? "",
    branch_head_person_id: r?.branch_head_person_id ?? "",
    public_memorial: r?.public_memorial ?? false,
  };
}

export default function GraveSection({
  personId,
  initialRecord,
  canEdit,
  persons,
}: GraveSectionProps) {
  const [record, setRecord] = useState<GraveRecord | null>(initialRecord);
  const [events, setEvents] = useState<GraveEvent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [form, setForm] = useState<FormData>(recordToForm(initialRecord));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!record?.id) return;
    try {
      const data = await getGraveEvents(record.id);
      setEvents(data as GraveEvent[]);
    } catch {
      // non-critical
    }
  }, [record?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await upsertGraveRecord(personId, {
        burial_type: form.burial_type || null,
        grave_status: form.grave_status,
        remains_status: form.remains_status,
        grave_type: form.grave_type || null,
        cemetery_name: form.cemetery_name || null,
        cemetery_address: form.cemetery_address || null,
        gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
        gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
        cause_of_death: form.cause_of_death || null,
        epitaph: form.epitaph || null,
        caretaker_person_id: form.caretaker_person_id || null,
        branch_head_person_id: form.branch_head_person_id || null,
        public_memorial: form.public_memorial,
      });
      // Reload record from what we saved (optimistic update)
      setRecord((prev) => ({
        id: prev?.id ?? "",
        person_id: personId,
        burial_type: form.burial_type || null,
        grave_status: form.grave_status,
        remains_status: form.remains_status,
        grave_type: form.grave_type || null,
        cemetery_name: form.cemetery_name || null,
        cemetery_address: form.cemetery_address || null,
        gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
        gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
        cause_of_death: form.cause_of_death || null,
        epitaph: form.epitaph || null,
        caretaker_person_id: form.caretaker_person_id || null,
        branch_head_person_id: form.branch_head_person_id || null,
        panorama_url: prev?.panorama_url ?? null,
        public_memorial: form.public_memorial,
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Xóa toàn bộ thông tin mộ phần? Thao tác không thể hoàn tác.")) return;
    await deleteGraveRecord(personId);
    setRecord(null);
    setEvents([]);
    setIsEditing(false);
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Xóa sự kiện này?")) return;
    await deleteGraveEvent(eventId, personId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors";
  const labelCls = "block text-xs font-medium text-stone-500 mb-1";

  // ─── NO RECORD + cannot edit ────────────────────────────────────────────────
  if (!record && !canEdit) {
    return (
      <p className="text-sm text-stone-400 italic">
        Chưa có thông tin mộ phần.
      </p>
    );
  }

  // ─── NO RECORD + can edit ────────────────────────────────────────────────────
  if (!record && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
      >
        <Plus className="size-4" />
        Thêm thông tin mộ phần
      </button>
    );
  }

  // ─── FORM (create or edit) ────────────────────────────────────────────────
  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Loại an táng</label>
            <select value={form.burial_type} onChange={(e) => set("burial_type", e.target.value)} className={inputCls}>
              <option value="">— Chọn —</option>
              {BURIAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Trạng thái mộ</label>
            <select value={form.grave_status} onChange={(e) => set("grave_status", e.target.value as GraveStatus)} className={inputCls}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tình trạng hài cốt</label>
            <select value={form.remains_status} onChange={(e) => set("remains_status", e.target.value as RemainsStatus)} className={inputCls}>
              {REMAINS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Loại mộ (vật liệu)</label>
            <input type="text" value={form.grave_type} onChange={(e) => set("grave_type", e.target.value)} placeholder="Đá hoa cương, gạch, đất..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tên nghĩa trang</label>
            <input type="text" value={form.cemetery_name} onChange={(e) => set("cemetery_name", e.target.value)} placeholder="Nghĩa trang Văn Điển" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Địa chỉ nghĩa trang</label>
            <input type="text" value={form.cemetery_address} onChange={(e) => set("cemetery_address", e.target.value)} placeholder="Khu A, lô 15, Hà Nội" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>GPS — Vĩ độ (Latitude)</label>
            <input type="number" step="any" value={form.gps_lat} onChange={(e) => set("gps_lat", e.target.value)} placeholder="21.0285" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>GPS — Kinh độ (Longitude)</label>
            <input type="number" step="any" value={form.gps_lng} onChange={(e) => set("gps_lng", e.target.value)} placeholder="105.8542" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Người chăm mộ</label>
            <select value={form.caretaker_person_id} onChange={(e) => set("caretaker_person_id", e.target.value)} className={inputCls}>
              <option value="">— Chọn —</option>
              {persons.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Trưởng họ / Trưởng ngành</label>
            <select value={form.branch_head_person_id} onChange={(e) => set("branch_head_person_id", e.target.value)} className={inputCls}>
              <option value="">— Chọn —</option>
              {persons.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Nguyên nhân mất</label>
          <input type="text" value={form.cause_of_death} onChange={(e) => set("cause_of_death", e.target.value)} placeholder="Bệnh, tuổi già..." className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Bia ký / Câu thơ tưởng nhớ</label>
          <textarea value={form.epitaph} onChange={(e) => set("epitaph", e.target.value)} rows={3} placeholder="Nhập câu thơ hoặc lời tưởng nhớ..." className={`${inputCls} resize-none`} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.public_memorial} onChange={(e) => set("public_memorial", e.target.checked)} className="rounded border-stone-300 text-amber-500 focus:ring-amber-400" />
          <span className="text-sm text-stone-700">Bật trang tưởng nhớ công khai (<code className="text-xs">/memorial/{personId.slice(0, 8)}...</code>)</span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => { setIsEditing(false); setForm(recordToForm(record)); }} className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {isSaving ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </form>
    );
  }

  // ─── VIEW MODE ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Status badges + actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {record!.grave_status && <GraveStatusBadge status={record!.grave_status} />}
          {record!.burial_type && <BurialTypeBadge type={record!.burial_type} />}
          {record!.remains_status && <RemainsStatusBadge status={record!.remains_status} />}
          {record!.public_memorial && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-100 text-violet-700 border-violet-200">
              🌐 Công khai
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1.5">
            <button onClick={() => { setForm(recordToForm(record)); setIsEditing(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Chỉnh sửa">
              <Edit3 className="size-3.5" />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Xóa thông tin mộ">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {record!.grave_type && (
          <div>
            <span className="text-xs text-stone-400">Loại mộ</span>
            <p className="font-medium text-stone-700">{record!.grave_type}</p>
          </div>
        )}
        {record!.cemetery_name && (
          <div>
            <span className="text-xs text-stone-400">Nghĩa trang</span>
            <p className="font-medium text-stone-700">{record!.cemetery_name}</p>
          </div>
        )}
        {record!.cemetery_address && (
          <div className="sm:col-span-2">
            <span className="text-xs text-stone-400">Địa chỉ</span>
            <p className="font-medium text-stone-700">{record!.cemetery_address}</p>
          </div>
        )}
        {(record!.gps_lat != null && record!.gps_lng != null) && (
          <div className="sm:col-span-2">
            <span className="text-xs text-stone-400">Toạ độ GPS</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${record!.gps_lat}&mlon=${record!.gps_lng}#map=17/${record!.gps_lat}/${record!.gps_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-amber-600 hover:text-amber-800 transition-colors"
            >
              <MapPin className="size-3.5" />
              {record!.gps_lat}, {record!.gps_lng} (xem bản đồ)
            </a>
          </div>
        )}
        {record!.cause_of_death && (
          <div className="sm:col-span-2">
            <span className="text-xs text-stone-400">Nguyên nhân mất</span>
            <p className="font-medium text-stone-700">{record!.cause_of_death}</p>
          </div>
        )}
      </div>

      {/* Epitaph */}
      {record!.epitaph && (
        <blockquote className="border-l-2 border-amber-300 pl-4 italic text-stone-600 text-sm">
          {record!.epitaph}
        </blockquote>
      )}

      {/* Timeline */}
      <div>
        <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Lịch sử an táng</h4>
        <GraveTimeline
          events={events}
          canEdit={canEdit}
          onAddEvent={() => setShowEventForm(true)}
          onDeleteEvent={handleDeleteEvent}
        />
      </div>

      {showEventForm && record && (
        <GraveEventForm
          graveId={record.id}
          personId={personId}
          onClose={() => setShowEventForm(false)}
          onSaved={() => {
            setShowEventForm(false);
            loadEvents();
          }}
        />
      )}

      {/* Photos & 360° Panorama */}
      {record && (
        <div>
          <hr className="border-stone-100 mb-4" />
          <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Ảnh mộ phần</h4>
          <GravePhotoGallery
            graveId={record.id}
            canEdit={canEdit}
            panoramaUrl={record.panorama_url}
            onPanoramaChange={(url) => {
              setRecord((prev) => prev ? { ...prev, panorama_url: url } : prev);
            }}
          />
        </div>
      )}
    </div>
  );
}
