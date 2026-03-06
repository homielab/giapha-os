"use client";

import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface ReminderLog {
  id: string;
  reminder_type: string | null;
  subject_id: string | null;
  days_before: number | null;
  scheduled_date: string | null;
  sent_at: string | null;
  status: string | null;
  error_message: string | null;
  branch_bot_id: string | null;
  branch_bots?: { platform: string | null; branch_id: string | null } | { platform: string | null; branch_id: string | null }[] | null;
}

interface Props {
  logs: ReminderLog[];
}

const STATUS_ICON = {
  sent: <CheckCircle className="size-4 text-green-600" />,
  failed: <XCircle className="size-4 text-red-600" />,
  pending: <Clock className="size-4 text-amber-500" />,
};

const TYPE_LABEL: Record<string, string> = {
  anniversary_7: "Giỗ 7 ngày trước",
  anniversary_3: "Giỗ 3 ngày trước",
  anniversary_1: "Giỗ ngày mai",
  anniversary_0: "Giỗ hôm nay",
  event: "Sự kiện",
  birthday: "Sinh nhật",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReminderLogsTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="size-8 text-stone-300 mx-auto mb-2" />
        <p className="text-stone-500 text-sm">Chưa có log nhắc nhở nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500 uppercase tracking-wide">
            <th className="px-4 py-2.5 text-left">Trạng thái</th>
            <th className="px-4 py-2.5 text-left">Loại</th>
            <th className="px-4 py-2.5 text-left">Nền tảng</th>
            <th className="px-4 py-2.5 text-left">Ngày lên lịch</th>
            <th className="px-4 py-2.5 text-left">Gửi lúc</th>
            <th className="px-4 py-2.5 text-left">Lỗi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON[log.status as keyof typeof STATUS_ICON] ?? (
                    <Clock className="size-4 text-stone-400" />
                  )}
                  <span
                    className={
                      log.status === "sent"
                        ? "text-green-700"
                        : log.status === "failed"
                          ? "text-red-700"
                          : "text-amber-700"
                    }
                  >
                    {log.status ?? "—"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-stone-700">
                {TYPE_LABEL[log.reminder_type ?? ""] ?? log.reminder_type ?? "—"}
                {log.days_before !== null && (
                  <span className="ml-1.5 text-xs text-stone-400">
                    ({log.days_before}d trước)
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                  {(Array.isArray(log.branch_bots) ? log.branch_bots[0] : log.branch_bots)?.platform ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-stone-600">
                {log.scheduled_date ?? "—"}
              </td>
              <td className="px-4 py-3 text-stone-500 text-xs">
                {formatDate(log.sent_at)}
              </td>
              <td className="px-4 py-3 max-w-xs">
                {log.error_message ? (
                  <span className="text-xs text-red-600 truncate block" title={log.error_message}>
                    {log.error_message}
                  </span>
                ) : (
                  <span className="text-stone-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
