"use client";

import { adminCreateSetting, deleteSetting } from "@/app/actions/setting";
import { Setting } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Edit, Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";

interface SettingListProps {
  initialSettings: Setting[];
}

interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

// ── Modal state ────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit";

interface ModalState {
  mode: ModalMode;
  setting: Setting | null; // null when mode === "create"
}
// ──────────────────────────────────────────────────────────────────────────────

export default function SettingList({ initialSettings }: SettingListProps) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const openCreate = () => setModal({ mode: "create", setting: null });
  const openEdit = (setting: Setting) => setModal({ mode: "edit", setting });
  const closeModal = () => setModal(null);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleDelete = async (settingId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cài đặt này khỏi hệ thống vĩnh viễn không?"))
      return;
    try {
      const result = await deleteSetting(settingId);
      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }
      setSettings((prev) => prev.filter((s) => s.id !== settingId));
      showNotification("Đã xóa cài đặt thành công.", "success");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi không xác định khi xoá cài đặt";
      showNotification(msg, "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!modal) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (modal.mode === "create") {
        const result = await adminCreateSetting(formData);
        if (result?.error) {
          showNotification(result.error, "error");
          return;
        }
        showNotification("Tạo cài đặt thành công.", "success");
        closeModal();
        setTimeout(() => window.location.reload(), 1500);
      } else {
        // mode === "edit"
        const updatedKey = formData.get("key") as string;
        const updatedValue = formData.get("value") as string;

        const { data, error } = await supabase
          .from("settings")
          .update({ key: updatedKey, value: updatedValue })
          .eq("key", updatedKey)
          .select()
          .single();

        if (error) {
          showNotification(error.message, "error");
          return;
        }

        setSettings((prev) =>
          prev.map((s) =>
            s.id === modal.setting!.id
              ? { ...s, key: updatedKey, value: updatedValue }
              : s,
          ),
        );
        showNotification("Cập nhật cài đặt thành công.", "success");
        closeModal();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi không xác định";
      showNotification(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived labels ────────────────────────────────────────────────────────────

  const modalTitle = modal?.mode === "edit" ? "Sửa Cài Đặt" : "Thêm Cài Đặt";
  const submitLabel = modal?.mode === "edit"
    ? isSubmitting ? "Đang lưu..." : "Lưu thay đổi"
    : isSubmitting ? "Đang tạo..." : "Tạo cài đặt";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : notification.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <Plus className="size-4" />
          Thêm cài đặt
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-stone-200/60 bg-stone-50/50">
              <tr>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Tên</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Giá trị</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Ngày tạo</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {settings.map((setting) => (
                <tr key={setting.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-stone-900">{setting.key}</td>
                  <td className="px-6 py-4 font-medium text-stone-900">{setting.value}</td>
                  <td className="px-6 py-4 text-stone-500">
                    {new Date(setting.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        title="Xoá cài đặt"
                        onClick={() => handleDelete(setting.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash className="size-4" />
                      </button>
                      <button
                        title="Sửa cài đặt"
                        onClick={() => openEdit(setting)}
                        className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {settings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                    Chưa có cài đặt nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Modal */}
      {modal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200/60 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-stone-100/80 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-xl font-serif font-bold text-stone-800">
                {modalTitle}
              </h3>
              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-stone-600 transition-colors size-8 flex items-center justify-center hover:bg-stone-100 rounded-full"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="key"
                    required
                    defaultValue={modal.setting?.key ?? ""}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Giá trị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="value"
                    defaultValue={modal.setting?.value ?? ""}
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
