import { getSupabase, getIsAdmin } from "@/utils/supabase/queries";
import GalleryClient from "@/components/GalleryClient";

export const metadata = {
  title: "Phòng trưng bày | Gia Phả OS",
  description: "Lưu giữ và chia sẻ hình ảnh, kỷ niệm dòng họ",
};

export default async function GalleryPage() {
  const supabase = await getSupabase();
  const isAdmin = await getIsAdmin();

  const { data: items } = await supabase
    .from("gallery_items")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false });

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <GalleryClient initialItems={items || []} isAdmin={isAdmin} />
    </main>
  );
}
