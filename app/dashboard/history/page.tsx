import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
};

const ACTION_BADGE: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
};

interface AuditLogEntry {
  id: string;
  person_id: string | null;
  person_name: string | null;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    person?: string;
  }>;
}

export default async function AuditHistoryPage({ searchParams }: PageProps) {
  const profile = await getProfile();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const actionFilter = params.action ?? "";
  const personFilter = params.person ?? "";

  const supabase = await getSupabase();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }

  if (personFilter) {
    query = query.ilike("person_name", `%${personFilter}%`);
  }

  const { data: logs, count, error } = await query;

  if (error) {
    console.error("Error fetching audit logs:", error);
  }

  const entries = (logs ?? []) as AuditLogEntry[];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (actionFilter) p.set("action", actionFilter);
    if (personFilter) p.set("person", personFilter);
    p.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === "") p.delete(k);
      else p.set(k, String(v));
    });
    return `/dashboard/history?${p.toString()}`;
  };

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="title flex items-center gap-2">
              <History className="size-6 text-stone-600" />
              Lịch sử chỉnh sửa
            </h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Nhật ký tất cả các thao tác thêm, sửa, xoá thành viên trong hệ thống.
            </p>
          </div>
        </div>

        {/* Filters */}
        <form
          method="GET"
          action="/dashboard/history"
          className="mb-6 flex flex-wrap gap-3 items-end"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="person" className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Tìm thành viên
            </label>
            <input
              id="person"
              name="person"
              type="text"
              defaultValue={personFilter}
              placeholder="Tên thành viên..."
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent min-w-[180px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="action" className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Loại hành động
            </label>
            <select
              id="action"
              name="action"
              defaultValue={actionFilter}
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
            >
              <option value="">Tất cả</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="delete">Xoá</option>
            </select>
          </div>
          <input type="hidden" name="page" value="1" />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Lọc
          </button>
          {(actionFilter || personFilter) && (
            <Link
              href="/dashboard/history"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition-colors"
            >
              Xóa bộ lọc
            </Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <div className="py-20 text-center text-stone-400">
              <History className="size-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">Chưa có lịch sử chỉnh sửa nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Thành viên</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Hành động</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Trường</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Giá trị cũ → Mới</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Người thực hiện</th>
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {entry.person_name ? (
                          entry.person_id ? (
                            <Link
                              href={`/dashboard/members/${entry.person_id}`}
                              className="text-amber-700 hover:underline"
                            >
                              {entry.person_name}
                            </Link>
                          ) : (
                            <span>{entry.person_name}</span>
                          )
                        ) : (
                          <span className="text-stone-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_BADGE[entry.action] ?? "bg-stone-100 text-stone-700"}`}
                        >
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {entry.field_changed ?? <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-600 max-w-xs">
                        {entry.old_value || entry.new_value ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            {entry.old_value && (
                              <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs font-mono truncate max-w-[120px]">
                                {entry.old_value}
                              </span>
                            )}
                            {entry.old_value && entry.new_value && (
                              <span className="text-stone-400">→</span>
                            )}
                            {entry.new_value && (
                              <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono truncate max-w-[120px]">
                                {entry.new_value}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs">
                        {entry.changed_by_email ?? <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                        {new Date(entry.changed_at).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-stone-500">
              Trang {page} / {totalPages} &middot; {count} bản ghi
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: page - 1 })}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  ← Trước
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: page + 1 })}
                  className="px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Tiếp →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
