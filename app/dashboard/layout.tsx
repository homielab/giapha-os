import config from "@/app/config";
import DashboardHeader from "@/components/DashboardHeader";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import { UserProvider } from "@/components/UserProvider";
import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Call without args so React cache() key matches getIsAdmin() → getProfile()
  // in child pages — avoids a duplicate profile DB query.
  const profile = await getProfile();

  // Track visit (once per user per day) + fetch total count in parallel
  const supabase = await getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const [, countRes] = await Promise.all([
    supabase.from("page_views").insert({ user_id: user.id, visited_date: today }),
    supabase.from("page_views").select("*", { count: "exact", head: true }),
  ]);
  const pageViewCount = countRes.count ?? 0;

  if (!profile?.is_active) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm transition-all duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="group flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                  {config.siteName}
                </h1>
              </Link>
            </div>
            <div className="w-32">
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full text-center bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-stone-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="size-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">
              Tài khoản chờ duyệt
            </h2>
            <p className="text-stone-600">
              Tài khoản của bạn đã được đăng ký thành công. Tuy nhiên, hệ thống
              yêu cầu Quản trị viên kích hoạt tài khoản của bạn trước khi bạn có
              thể xem các thông tin gia đình.
            </p>
            <p className="text-stone-500 text-sm mt-4 italic">
              Vui lòng liên hệ lại với người quản trị dòng họ để được cấp quyền
              sớm nhất.
            </p>
          </div>
        </main>
        <Footer className="mt-auto bg-white border-t border-stone-200" />
      </div>
    );
  }

  return (
    <UserProvider user={user} profile={profile}>
      <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
        <DashboardHeader />
        {children}
        <Footer
          className="mt-auto bg-white border-t border-stone-200"
          showDisclaimer={true}
          pageViewCount={pageViewCount}
        />
      </div>
    </UserProvider>
  );
}
