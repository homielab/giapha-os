import { getProfile } from "@/utils/supabase/queries";
import { Cpu, CreditCard, BarChart3, Bell, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_LINKS = [
  {
    href: "/admin/ai-settings",
    icon: Cpu,
    title: "AI Settings",
    description: "Cấu hình platform AI key, model mặc định cho toàn hệ thống",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    href: "/admin/subscriptions",
    icon: CreditCard,
    title: "Subscription Management",
    description: "Quản lý gói dịch vụ, quota AI và rate limiting",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/admin/reminder-logs",
    icon: Bell,
    title: "Reminder Logs",
    description: "Lịch sử gửi nhắc nhở qua bot — giỗ, sự kiện, sinh nhật",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    href: "/admin/analytics",
    icon: BarChart3,
    title: "Usage Analytics",
    description: "Phân tích lượt sử dụng AI, bot và các tính năng (sắp ra mắt)",
    color: "text-purple-600",
    bg: "bg-purple-50",
    disabled: true,
  },
];

export default async function AdminDashboardPage() {
  const profile = await getProfile();
  // TODO: restrict to super_admin role once that role is added
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 py-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Super Admin</h1>
        <p className="text-sm text-stone-500 mt-1">Quản lý hệ thống Gia Phả OS</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        {ADMIN_LINKS.map(({ href, icon: Icon, title, description, color, bg, disabled }) =>
          disabled ? (
            <div
              key={href}
              className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 opacity-50 cursor-not-allowed"
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`size-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800">{title}</p>
                <p className="text-sm text-stone-500 mt-0.5">{description}</p>
              </div>
            </div>
          ) : (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`size-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 group-hover:text-amber-700 transition-colors">
                  {title}
                </p>
                <p className="text-sm text-stone-500 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="size-4 text-stone-400 group-hover:text-amber-500 transition-colors shrink-0" />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
