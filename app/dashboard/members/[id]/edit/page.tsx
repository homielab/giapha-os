import MemberForm from "@/components/MemberForm";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { id } = await params;

  const profile = await getProfile();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">
            Truy cập bị từ chối
          </h1>
          <p className="text-stone-600 mt-2">
            Bạn không có quyền chỉnh sửa thành viên.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await getSupabase();

  // Fetch Public Data
  const { data: person, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !person) {
    notFound();
  }

  // Fetch Private Data
  const { data: privateData } = await supabase
    .from("person_details_private")
    .select("*")
    .eq("person_id", id)
    .single();

  const initialData = { ...person, ...privateData };

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="flex-1 w-full relative flex flex-col pb-8">
      <div className="w-full relative z-20 py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/members/${id}`}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="title">Chỉnh Sửa Thành Viên</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 w-full flex-1">
        <MemberForm initialData={initialData} isEditing={true} isAdmin={true} branches={branches ?? []} />
      </main>
    </div>
  );
}
