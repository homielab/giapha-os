import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Bell, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import ReminderLogsTable from "@/components/ReminderLogsTable";

export const metadata = { title: "Reminder Logs — Super Admin" };

export default async function AdminReminderLogsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await getSupabase();

  const { data: logs } = await supabase
    .from("reminder_logs")
    .select(`
      id,
      reminder_type,
      subject_id,
      days_before,
      scheduled_date,
      sent_at,
      status,
      error_message,
      branch_bot_id,
      branch_bots (
        platform,
        branch_id
      )
    `)
    .order("sent_at", { ascending: false })
    .limit(200);

  const { count: totalSent } = await supabase
    .from("reminder_logs")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: totalFailed } = await supabase
    .from("reminder_logs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");

  const { count: totalPending } = await supabase
    .from("reminder_logs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3">
        <Bell className="size-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Reminder Logs</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Lịch sử gửi nhắc nhở — giỗ, sự kiện, sinh nhật
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="size-5 text-green-600 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-green-700">{totalSent ?? 0}</p>
            <p className="text-xs text-green-600">Đã gửi</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="size-5 text-red-600 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-red-700">{totalFailed ?? 0}</p>
            <p className="text-xs text-red-600">Thất bại</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="size-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{totalPending ?? 0}</p>
            <p className="text-xs text-amber-600">Đang chờ</p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-700">
            200 bản ghi gần nhất
          </p>
          {(totalFailed ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
              <RefreshCw className="size-3" />
              <span>{totalFailed} lần gửi thất bại — chờ cron tiếp theo retry</span>
            </div>
          )}
        </div>
        <ReminderLogsTable logs={logs ?? []} />
      </div>
    </div>
  );
}
