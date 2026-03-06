import { getTodayLunar } from "@/utils/dateHelpers";
import { computeEvents } from "@/utils/eventHelpers";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import {
  ArrowRight,
  BarChart2,
  Bot,
  Cake,
  CalendarDays,
  Database,
  Flower2,
  GitCommitVertical,
  GitMerge,
  Heart,
  Landmark,
  Layers,
  Map,
  Network,
  Settings,
  Shield,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

/* ── Event type helpers ───────────────────────────────────────────── */
const eventTypeConfig = {
  birthday: {
    icon: Cake,
    label: "Sinh nhật",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  death_anniversary: {
    icon: Flower2,
    label: "Ngày giỗ",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  custom_event: {
    icon: Star,
    label: "Sự kiện",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
};

export default async function DashboardLaunchpad() {
  const isAdmin = await getIsAdmin();
  const supabase = await getSupabase();

  /* ── Fetch members + events data ─────────────────────────────── */
  const { data: persons } = await supabase
    .from("persons")
    .select(
      "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased, gender, created_at",
    );

  const { data: customEvents } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by");

  /* ── Quick stats ──────────────────────────────────────────────── */
  const totalMembers = persons?.length ?? 0;
  const totalLiving = persons?.filter((p) => !p.is_deceased).length ?? 0;
  const totalDeceased = persons?.filter((p) => p.is_deceased).length ?? 0;
  const generations = new Set(
    (persons ?? [])
      .map((p) => (p as { generation?: number }).generation)
      .filter(Boolean),
  );

  /* ── Pending approvals (admin only) ──────────────────────────── */
  let pendingCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "pending");
    pendingCount = count ?? 0;
  }

  /* ── Recent members ───────────────────────────────────────────── */
  const recentMembers = (persons ?? [])
    .sort(
      (a, b) =>
        new Date(
          (b as { created_at?: string }).created_at ?? 0,
        ).getTime() -
        new Date(
          (a as { created_at?: string }).created_at ?? 0,
        ).getTime(),
    )
    .slice(0, 4);

  const allEvents = computeEvents(persons ?? [], customEvents ?? []);
  const upcomingEvents = allEvents.filter(
    (e) => e.daysUntil >= 0 && e.daysUntil <= 30,
  );

  const lunar = getTodayLunar();
  const publicFeatures = [
    {
      title: "Cây gia phả",
      description: "Xem và tương tác với sơ đồ dòng họ",
      icon: <Network className="size-8 text-amber-600" />,
      href: "/dashboard/members",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200/60",
      hoverColor: "hover:border-amber-400 hover:shadow-amber-100",
    },
    // {
    //   title: "Sự kiện",
    //   description: "Quản lý ngày giỗ, họp họ và các dịp quan trọng",
    //   icon: <CalendarClock className="size-8 text-emerald-600" />,
    //   href: "/dashboard/events",
    //   bgColor: "bg-emerald-50",
    //   borderColor: "border-emerald-200/60",
    //   hoverColor: "hover:border-emerald-400 hover:shadow-emerald-100",
    // },
    {
      title: "Sự kiện họ tộc",
      description: "Giỗ họ, họp họ, đám cưới và các sự kiện gia tộc",
      icon: <CalendarDays className="size-8 text-emerald-600" />,
      href: "/dashboard/family-events",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200/60",
      hoverColor: "hover:border-emerald-400 hover:shadow-emerald-100",
    },
    {
      title: "Tra cứu danh xưng",
      description: "Hệ thống gọi tên họ hàng chuẩn xác",
      icon: <GitMerge className="size-8 text-blue-600" />,
      href: "/dashboard/kinship",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200/60",
      hoverColor: "hover:border-blue-400 hover:shadow-blue-100",
    },
    {
      title: "Thống kê gia phả",
      description: "Tổng quan dữ liệu và biểu đồ phân tích",
      icon: <BarChart2 className="size-8 text-purple-600" />,
      href: "/dashboard/stats",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200/60",
      hoverColor: "hover:border-purple-400 hover:shadow-purple-100",
    },
    {
      title: "Dòng thời gian",
      description: "Lịch sử gia tộc theo trình tự thời gian",
      icon: <GitCommitVertical className="size-8 text-sky-600" />,
      href: "/dashboard/timeline",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200/60",
      hoverColor: "hover:border-sky-400 hover:shadow-sky-100",
    },
    {
      title: "Bản đồ địa lý",
      description: "Vị trí quê quán và nơi định cư của thành viên",
      icon: <Map className="size-8 text-teal-600" />,
      href: "/dashboard/map",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200/60",
      hoverColor: "hover:border-teal-400 hover:shadow-teal-100",
    },
    {
      title: "Bản đồ mộ phần",
      description: "Vị trí GPS và thông tin mộ phần dòng họ",
      icon: <Landmark className="size-8 text-stone-600" />,
      href: "/dashboard/cemetery-map",
      bgColor: "bg-stone-50",
      borderColor: "border-stone-200/60",
      hoverColor: "hover:border-stone-400 hover:shadow-stone-100",
    },
    // {
    //   title: "Giới thiệu & Liên hệ",
    //   description: "Thông tin về ứng dụng và đội ngũ phát triển",
    //   icon: <Info className="size-8 text-stone-600" />,
    //   href: "/about",
    //   bgColor: "bg-stone-50",
    //   borderColor: "border-stone-200/60",
    //   hoverColor: "hover:border-stone-400 hover:shadow-stone-100",
    // },
  ];

  const adminFeatures = [
    {
      title: "Quản lý Người dùng",
      description: "Phê duyệt tài khoản và phân quyền",
      icon: <Users className="size-8 text-rose-600" />,
      href: "/dashboard/users",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200/60",
      hoverColor: "hover:border-rose-400 hover:shadow-rose-100",
    },
    {
      title: "Thứ tự gia phả",
      description: "Sắp xếp và xem cấu trúc hệ thống",
      icon: <Network className="size-8 text-indigo-600" />,
      href: "/dashboard/lineage",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200/60",
      hoverColor: "hover:border-indigo-400 hover:shadow-indigo-100",
    },
    {
      title: "Sao lưu & Phục hồi",
      description: "Xuất/Nhập dữ liệu toàn hệ thống",
      icon: <Database className="size-8 text-teal-600" />,
      href: "/dashboard/data",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200/60",
      hoverColor: "hover:border-teal-400 hover:shadow-teal-100",
    },
    {
      title: "Cài đặt hệ thống",
      description: "Phân quyền, API key, chia sẻ công khai",
      icon: <Settings className="size-8 text-emerald-600" />,
      href: "/dashboard/settings",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200/60",
      hoverColor: "hover:border-emerald-400 hover:shadow-emerald-100",
    },
    {
      title: "Bot Gia Phả",
      description: "Cài đặt Telegram / Zalo bot và AI chat",
      icon: <Bot className="size-8 text-violet-600" />,
      href: "/dashboard/settings/branches",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200/60",
      hoverColor: "hover:border-violet-400 hover:shadow-violet-100",
    },
    {
      title: "Super Admin",
      description: "Quản lý AI platform, thuê bao, giới hạn",
      icon: <Shield className="size-8 text-rose-600" />,
      href: "/admin",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200/60",
      hoverColor: "hover:border-rose-400 hover:shadow-rose-100",
    },
  ];

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* ── Quick Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Thành viên", value: totalMembers, icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
          { label: "Còn sống", value: totalLiving, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { label: "Đã mất", value: totalDeceased, icon: Flower2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
          { label: "Thế hệ", value: generations.size, icon: Layers, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border ${s.border} shadow-sm`}
          >
            <div className={`p-2 rounded-xl ${s.bg}`}>
              <s.icon className={`size-4 ${s.color}`} />
            </div>
            <span className="text-2xl font-bold text-stone-800">{s.value}</span>
            <span className="text-xs text-stone-500 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Admin: Pending Approvals Badge ─────────────────── */}
      {isAdmin && pendingCount > 0 && (
        <Link
          href="/dashboard/users"
          className="flex items-center gap-4 p-4 mb-6 rounded-2xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition-all group"
        >
          <div className="relative">
            <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <UserCheck className="size-5" />
            </div>
            <span className="absolute -top-1 -right-1 size-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">
              {pendingCount} tài khoản chờ phê duyệt
            </p>
            <p className="text-xs text-amber-700/70">
              Nhấp để xem và phê duyệt thành viên mới
            </p>
          </div>
          <ArrowRight className="size-4 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </Link>
      )}

      {/* ── Today's Date & Upcoming Events ─────────────────── */}
      <Link
        href="/dashboard/events"
        className="group relative block overflow-hidden rounded-3xl bg-white border border-stone-200/60 shadow-sm hover:shadow-stone-100 hover:border-stone-400 mb-10 transition-all duration-300 hover:-translate-y-1"
      >
        {/* Subtle background flair */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"></div>

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
          {/* Date section */}
          <div className="md:w-[35%] w-full flex flex-col items-center md:items-start text-center md:text-left gap-4 md:border-r border-stone-100 md:pr-8">
            <div className="size-16 rounded-2xl bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100 shadow-sm text-stone-600 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-md group-hover:border-stone-200">
              <CalendarDays className="size-7" />
            </div>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
                {lunar.solarStr}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-50 border border-stone-100">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Âm lịch:
                </span>
                <span className="text-sm font-semibold text-stone-700">
                  {lunar.lunarDayStr}
                </span>
              </div>
              <p className="text-sm pl-1 flex items-center justify-center md:justify-start gap-1 text-stone-500 mt-2 font-medium">
                Năm {lunar.lunarYear}
              </p>
            </div>
          </div>

          {/* Events summary */}
          <div className="md:w-[65%] w-full flex-1">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-500 uppercase tracking-widest flex items-center gap-2.5">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                    </span>
                    Sự kiện 30 ngày tới ({upcomingEvents.length})
                  </p>
                  <ArrowRight className="size-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {upcomingEvents.slice(0, 4).map((evt, i) => {
                    const cfg = eventTypeConfig[evt.type];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3.5 p-3 rounded-2xl bg-stone-50/50 hover:bg-stone-50 border border-transparent hover:border-stone-100 transition-all duration-300 cursor-pointer"
                      >
                        <div
                          className={`size-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 shadow-sm border border-white`}
                        >
                          <Icon className={`size-4 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-stone-700 truncate block">
                            {evt.personName}
                          </span>
                          <span className="text-xs text-stone-500 font-medium pt-0.5 block">
                            {evt.daysUntil === 0
                              ? "Hôm nay"
                              : evt.daysUntil === 1
                                ? "Ngày mai"
                                : `${evt.daysUntil} ngày nữa`}{" "}
                            · {evt.eventDateLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {upcomingEvents.length > 4 && (
                  <p className="text-xs text-stone-400 mt-2 text-center sm:text-left font-medium">
                    + {upcomingEvents.length - 4} sự kiện khác đang chờ...
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-80 py-6">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-stone-400 transition-transform duration-500 group-hover:scale-105 group-hover:text-stone-500">
                  <CalendarDays className="size-6" />
                </div>
                <p className="text-stone-500 text-center font-medium px-4">
                  Không có sự kiện nào trong 30 ngày tới.
                </p>
                <div className="flex items-center gap-2 text-sm text-stone-400 mt-1 font-medium group-hover:text-stone-600 transition-colors">
                  <span>Xem sự kiện trong năm</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ── Recent Members ────────────────────────────────── */}
      {recentMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden mb-10">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <Users className="size-4 text-stone-400" />
              Thành viên mới nhất
            </h2>
            <Link href="/dashboard/members" className="text-xs text-amber-600 hover:underline font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-50">
            {recentMembers.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/members/${m.id}`}
                className="flex flex-col items-center gap-2 p-4 hover:bg-stone-50/50 transition-colors"
              >
                <div className="size-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 text-sm font-bold shrink-0">
                  {m.is_deceased ? "✝" : m.full_name?.[0] ?? "?"}
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-xs font-semibold text-stone-700 truncate">{m.full_name}</p>
                  {m.birth_year && <p className="text-xs text-stone-400">{m.birth_year}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature Grid ──────────────────────────────────── */}
      <div className="space-y-12">
        <section>
          {/* <h3 className="text-xl font-serif font-bold text-stone-700 mb-6 flex items-center gap-2">
            <span className="w-8 h-px bg-stone-300 rounded-full"></span>
            Chức năng chung
          </h3> */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {publicFeatures.map((feat) => (
              <Link
                key={feat.href}
                href={feat.href}
                className={`group flex flex-col p-6 rounded-2xl bg-white border ${feat.borderColor} ${feat.hoverColor} transition-all duration-300 hover:-translate-y-1 shadow-sm`}
              >
                <div
                  className={`size-14 rounded-xl flex items-center justify-center mb-5 ${feat.bgColor} transition-colors duration-300 group-hover:bg-white border border-transparent group-hover:${feat.borderColor}`}
                >
                  {feat.icon}
                </div>
                <h4 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-sm text-stone-500 line-clamp-2">
                  {feat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <h3 className="text-xl font-serif font-bold text-rose-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-px bg-rose-200 rounded-full"></span>
              Quản trị viên
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {adminFeatures.map((feat) => (
                <Link
                  key={feat.href}
                  href={feat.href}
                  className={`group flex flex-col p-6 rounded-2xl bg-white border ${feat.borderColor} ${feat.hoverColor} transition-all duration-300 hover:-translate-y-1 shadow-sm`}
                >
                  <div
                    className={`size-14 rounded-xl flex items-center justify-center mb-5 ${feat.bgColor} transition-colors duration-300 group-hover:bg-white border border-transparent group-hover:${feat.borderColor}`}
                  >
                    {feat.icon}
                  </div>
                  <h4 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-rose-700 transition-colors">
                    {feat.title}
                  </h4>
                  <p className="text-sm text-stone-500 line-clamp-2">
                    {feat.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
