import AdminUserList from "@/components/AdminUserList";
import { AdminUserData } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  // Fetch users via RPC
  const { data: users, error } = await supabase.rpc("get_admin_users");

  if (error) {
    console.error("Error fetching users:", error);
  }

  const typedUsers = (users as AdminUserData[]) || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="title">Quản lý Người dùng</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Danh sách các tài khoản đang tham gia vào hệ thống.
            </p>
          </div>
        </div>
        <AdminUserList initialUsers={typedUsers} currentUserId={profile.id} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
