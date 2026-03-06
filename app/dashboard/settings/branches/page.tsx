import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { GitBranch } from "lucide-react";
import { redirect } from "next/navigation";
import BranchManager from "@/components/BranchManager";

export default async function BranchesSettingsPage() {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await getSupabase();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, description, root_person_id, created_at")
    .order("created_at", { ascending: true });

  const { data: persons } = await supabase
    .from("persons")
    .select("id, full_name, birth_year")
    .order("full_name", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3">
        <GitBranch className="size-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Quản lý Chi / Nhánh</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Phân chia dòng họ theo các chi, nhánh để dễ quản lý
          </p>
        </div>
      </div>

      <BranchManager
        initialBranches={branches ?? []}
        persons={persons ?? []}
      />
    </div>
  );
}
