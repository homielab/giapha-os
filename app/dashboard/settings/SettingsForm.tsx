"use client";

import { SiteSettings } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsForm({
  initialSettings,
}: {
  initialSettings: SiteSettings | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    site_name: initialSettings?.site_name || "Gia phả Việt",
    logo_url: initialSettings?.logo_url || "",
    footer_address: initialSettings?.footer_address || "",
    footer_email: initialSettings?.footer_email || "",
    footer_phone: initialSettings?.footer_phone || "",
    footer_custom_text: initialSettings?.footer_custom_text || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert({
          id: 1,
          ...formData,
        });

      if (updateError) throw updateError;

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      setError(err.message || "Đã xảy ra lỗi khi lưu cấu hình.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-start gap-2">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 flex items-start gap-2">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Lưu cấu hình thành công!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-stone-900 border-b pb-2">
            Thông tin chung
          </h3>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Tên website (Gia phả)
            </label>
            <input
              type="text"
              name="site_name"
              value={formData.site_name}
              onChange={handleChange}
              className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
              placeholder="VD: Gia phả họ Phạm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Logo URL (Đường dẫn ảnh logo)
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-stone-900 border-b pb-2">
            Thông tin chân trang (Footer)
          </h3>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Địa chỉ nhà thờ / Từ đường
            </label>
            <input
              type="text"
              name="footer_address"
              value={formData.footer_address}
              onChange={handleChange}
              className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
              placeholder="Thôn Ngọc Trì, xã Bình Chương, tỉnh Quảng Ngãi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Điện thoại liên hệ
              </label>
              <input
                type="text"
                name="footer_phone"
                value={formData.footer_phone}
                onChange={handleChange}
                className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                placeholder="0901 959 997"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="footer_email"
                value={formData.footer_email}
                onChange={handleChange}
                className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                placeholder="lienhe@giapha.vn"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Lời nhắn/Thông báo ở Footer
            </label>
            <textarea
              name="footer_custom_text"
              value={formData.footer_custom_text}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
              placeholder="Con cháu họ Phạm muôn đời ghi nhớ công ơn Tổ tiên..."
            />
          </div>
        </div>
      </div>

      <div className="pt-6 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
