"use client";

import { maskName } from "@/utils/privacy";
import { Announcement, Person, PublicFamilyStats } from "@/types";
import {
  ArrowRight,
  Bell,
  Cake,
  Flower2,
  LogIn,
  Users,
  GitBranch,
  Layers,
  Heart,
  Pin,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface UpcomingEvent {
  personName: string;
  type: "birthday" | "death_anniversary";
  daysUntil: number;
  dateLabel: string;
  isDeceased: boolean;
}

interface PublicDashboardProps {
  siteName: string;
  stats: PublicFamilyStats;
  announcements: Announcement[];
  upcomingEvents: UpcomingEvent[];
  recentMembers: Pick<Person, "id" | "full_name" | "is_deceased" | "gender" | "birth_year">[];
}

export default function PublicDashboard({
  siteName,
  stats,
  announcements,
  upcomingEvents,
  recentMembers,
}: PublicDashboardProps) {
  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned);
  const regularAnnouncements = announcements.filter((a) => !a.is_pinned);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 space-y-10">

      {/* ── Page Header ── */}
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
          <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          Trang gia phả công khai
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-stone-800 leading-tight">
          {siteName}
        </h1>
        <p className="text-stone-500 max-w-md mx-auto text-sm">
          Lưu giữ và truyền lại ký ức gia tộc qua nhiều thế hệ
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all shadow-sm hover:shadow-amber-200 hover:-translate-y-0.5"
          >
            <LogIn className="size-4" />
            Đăng nhập để xem đầy đủ
          </Link>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Thống kê dòng họ</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Thành viên", value: stats.totalMembers, icon: Users, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200/60" },
            { label: "Thế hệ", value: stats.totalGenerations, icon: Layers, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200/60" },
            { label: "Chi nhánh", value: stats.totalBranches, icon: GitBranch, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200/60" },
            { label: "Còn sống", value: stats.totalLiving, icon: Heart, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200/60" },
            { label: "Đã mất", value: stats.totalDeceased, icon: Flower2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200/60" },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border ${s.border} shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <span className="text-2xl font-bold text-stone-800">{s.value.toLocaleString("vi-VN")}</span>
              <span className="text-xs text-stone-500 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pinned Announcements ── */}
      {pinnedAnnouncements.length > 0 && (
        <section className="space-y-3">
          {pinnedAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm"
            >
              <div className="p-2 rounded-xl bg-amber-100 shrink-0">
                <Pin className="size-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">{ann.title}</h3>
                {ann.content && (
                  <p className="text-amber-800/80 text-sm mt-0.5 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Two column grid: Events + Members ── */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 ? (
          <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
                <Bell className="size-4 text-amber-500" />
                Sự kiện sắp tới
              </h2>
              <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-100">
                30 ngày
              </span>
            </div>
            <ul className="divide-y divide-stone-50">
              {upcomingEvents.slice(0, 6).map((evt, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors">
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                      evt.type === "birthday" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    {evt.type === "birthday" ? <Cake className="size-4" /> : <Flower2 className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {evt.isDeceased ? evt.personName : maskName(evt.personName)}
                    </p>
                    <p className="text-xs text-stone-400">
                      {evt.dateLabel}
                      {evt.daysUntil === 0 ? " · Hôm nay ��" : evt.daysUntil === 1 ? " · Ngày mai" : ` · ${evt.daysUntil} ngày nữa`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-8 flex flex-col items-center justify-center text-center gap-2">
            <Bell className="size-8 text-stone-200" />
            <p className="text-sm text-stone-400 font-medium">Không có sự kiện trong 30 ngày tới</p>
          </section>
        )}

        {/* Recent Members */}
        {recentMembers.length > 0 ? (
          <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2 text-sm">
                <Users className="size-4 text-blue-500" />
                Thành viên mới thêm
              </h2>
              <Link href="/login" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="size-3" />
              </Link>
            </div>
            <ul className="divide-y divide-stone-50">
              {recentMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors">
                  <div className="size-8 rounded-full bg-gradient-to-br from-amber-100 to-stone-100 flex items-center justify-center shrink-0 text-stone-500 text-xs font-bold border border-stone-200">
                    {member.is_deceased ? "✝" : member.gender === "female" ? "♀" : "♂"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">
                      {member.is_deceased ? member.full_name : maskName(member.full_name)}
                    </p>
                    {member.birth_year && (
                      <p className="text-xs text-stone-400">Sinh {member.birth_year}</p>
                    )}
                  </div>
                  {member.is_deceased && (
                    <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full shrink-0">Đã mất</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* ── Regular Announcements ── */}
      {regularAnnouncements.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Bell className="size-4 text-stone-400" />
            Thông báo
          </h2>
          {regularAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-2 rounded-xl bg-stone-50 shrink-0">
                <Bell className="size-4 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800 text-sm">{ann.title}</h3>
                {ann.content && (
                  <p className="text-stone-600 text-sm mt-0.5 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-1">
                  {new Date(ann.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Login CTA ── */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
        <h3 className="font-bold font-serif text-stone-800 text-lg">Bạn là thành viên dòng họ?</h3>
        <p className="text-stone-500 text-sm">Đăng nhập để xem cây gia phả đầy đủ, thêm thành viên và kết nối với họ hàng.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all shadow-sm hover:-translate-y-0.5"
        >
          <LogIn className="size-4" />
          Đăng nhập ngay
        </Link>
      </section>
    </div>
  );
}
