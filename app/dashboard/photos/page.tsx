import PhotoGallery from "@/components/PhotoGallery";
import { getIsAdmin, getProfile, getSupabase } from "@/utils/supabase/queries";

export default async function PhotosPage() {
  const supabase = await getSupabase();

  const [[profile, isAdmin], [{ data: files }, { data: avatarFiles }]] =
    await Promise.all([
      Promise.all([getProfile(), getIsAdmin()]),
      Promise.all([
        supabase.storage
          .from("shared-photos")
          .list("", { sortBy: { column: "created_at", order: "desc" } }),
        supabase.storage.from("avatars").list(""),
      ]),
    ]);

  const validFiles = (files ?? []).filter(
    (f) => f.name !== ".emptyFolderPlaceholder",
  );

  const photos = validFiles.map((f) => ({
    name: f.name,
    url: supabase.storage.from("shared-photos").getPublicUrl(f.name).data
      .publicUrl,
  }));

  const photosBytes = validFiles.reduce(
    (sum, f) => sum + (f.metadata?.size ?? 0),
    0,
  );
  const avatarsBytes = (avatarFiles ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
  const usedBytes = photosBytes + avatarsBytes;
  // Supabase free tier: 1 GB total storage
  const maxBytes = 1 * 1024 * 1024 * 1024;

  const canUpload = !!profile;

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
          Ảnh gia đình
        </h1>
        <p className="text-stone-500 mt-1">
          Lưu giữ và chia sẻ những khoảnh khắc của dòng tộc
        </p>
      </div>
      <PhotoGallery
        photos={photos}
        canUpload={canUpload}
        canDelete={isAdmin}
        usedBytes={usedBytes}
        maxBytes={maxBytes}
      />
    </main>
  );
}
