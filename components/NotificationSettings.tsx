"use client";

import {
  saveNotificationSettings,
  sendTestNotificationEmail,
} from "@/app/dashboard/settings/actions";
import { Bell, Loader2, Mail, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

interface NotificationSettingsProps {
  initialEnabled: boolean;
  initialDaysBefore: number[];
  initialEmailRecipients: string[];
}

const DAYS_OPTIONS = [1, 3, 7] as const;

export default function NotificationSettings({
  initialEnabled,
  initialDaysBefore,
  initialEmailRecipients,
}: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [daysBefore, setDaysBefore] = useState<number[]>(
    initialDaysBefore.length > 0 ? initialDaysBefore : [7],
  );
  const [emailRecipients, setEmailRecipients] = useState<string[]>(
    initialEmailRecipients,
  );
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleDay = useCallback((day: number) => {
    setDaysBefore((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const addEmail = useCallback(() => {
    const trimmed = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed) || /[\r\n]/.test(trimmed)) return;
    if (emailRecipients.includes(trimmed)) {
      setNewEmail("");
      return;
    }
    setEmailRecipients((prev) => [...prev, trimmed]);
    setNewEmail("");
  }, [newEmail, emailRecipients]);

  const removeEmail = useCallback((email: string) => {
    setEmailRecipients((prev) => prev.filter((e) => e !== email));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveNotificationSettings(enabled, daysBefore, emailRecipients);
      setSuccess("Đã lưu cài đặt thông báo.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  }, [enabled, daysBefore, emailRecipients]);

  const handleTestEmail = useCallback(async () => {
    if (emailRecipients.length === 0) {
      setError("Vui lòng thêm ít nhất một địa chỉ email trước khi gửi thử.");
      return;
    }
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      await sendTestNotificationEmail(emailRecipients);
      setSuccess(`Email thử nghiệm đã được gửi tới ${emailRecipients.join(", ")}.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi khi gửi email");
    } finally {
      setTesting(false);
    }
  }, [emailRecipients]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-stone-500" />
            <h2 className="text-base font-semibold text-stone-900">
              Thông báo qua Email
            </h2>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            Nhận email nhắc nhở về sinh nhật và ngày giỗ sắp tới.
          </p>
        </div>

        <button
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            enabled ? "bg-amber-500" : "bg-stone-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      {enabled && (
        <>
          {/* Days Before */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">
              Nhắc nhở trước sự kiện
            </p>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OPTIONS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    daysBefore.includes(day)
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {day} ngày
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400">
              Chọn một hoặc nhiều mốc thời gian để nhận thông báo.
            </p>
          </div>

          {/* Email Recipients */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-700">
              Địa chỉ email nhận thông báo
            </p>

            {emailRecipients.length > 0 && (
              <ul className="space-y-2">
                {emailRecipients.map((email) => (
                  <li
                    key={email}
                    className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-xl border border-stone-200"
                  >
                    <Mail className="size-4 text-stone-400 shrink-0" />
                    <span className="flex-1 text-sm text-stone-700 font-mono truncate">
                      {email}
                    </span>
                    <button
                      onClick={() => removeEmail(email)}
                      className="shrink-0 p-1 rounded hover:bg-stone-200 transition-colors text-stone-400 hover:text-red-500"
                      title="Xoá email"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                placeholder="example@email.com"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-stone-400"
              />
              <button
                onClick={addEmail}
                disabled={!newEmail.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 transition-colors disabled:opacity-40"
              >
                <Plus className="size-4" />
                Thêm
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Lưu cài đặt
            </button>

            <button
              onClick={handleTestEmail}
              disabled={testing || emailRecipients.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Gửi email thử
            </button>
          </div>

          {/* Cron info */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2 text-xs text-stone-500">
            <p className="font-medium text-stone-600">Thiết lập cron job</p>
            <p>
              Để tự động gửi email mỗi ngày, hãy cấu hình cron gọi endpoint sau:
            </p>
            <code className="block bg-white border border-stone-200 rounded-lg px-3 py-2 font-mono text-stone-700 break-all">
              GET /api/notifications/send?token=CRON_SECRET
            </code>
            <p>
              Với Vercel Cron: thêm vào{" "}
              <code className="bg-white border border-stone-200 rounded px-1">
                vercel.json
              </code>
              :
            </p>
            <code className="block bg-white border border-stone-200 rounded-lg px-3 py-2 font-mono text-stone-700 whitespace-pre">
              {`{\n  "crons": [{\n    "path": "/api/notifications/send?token=CRON_SECRET",\n    "schedule": "0 7 * * *"\n  }]\n}`}
            </code>
          </div>
        </>
      )}

      {!enabled && (
        <p className="text-sm text-stone-400 italic">
          Bật thông báo để cấu hình email nhắc nhở sự kiện gia đình.
        </p>
      )}
    </div>
  );
}
