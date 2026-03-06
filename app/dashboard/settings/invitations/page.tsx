import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Invitation, Branch } from "@/types";
import InvitationManager from "./InvitationManager";
import { redirect } from "next/navigation";

export const metadata = { title: "Quản lý Lời mời — Gia Phả OS" };

export default async function InvitationsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await getSupabase();

  const [invRes, branchRes] = await Promise.all([
    supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("branches").select("id, name").order("name"),
  ]);

  const invitations = (invRes.data ?? []) as Invitation[];
  const branches = (branchRes.data ?? []) as Pick<Branch, "id" | "name">[];

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", "") ||
    "http://localhost:3000";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="title">Quản lý Lời mời</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tạo link mời để thành viên mới tham gia đúng nhánh dòng họ
        </p>
      </div>
      <InvitationManager
        invitations={invitations}
        branches={branches}
        baseUrl={baseUrl}
      />
    </main>
  );
}
