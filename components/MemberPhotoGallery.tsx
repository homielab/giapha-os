"use client";

import { createClient } from "@/utils/supabase/client";
import { ImageIcon, X, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface PersonPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  publicUrl: string;
}

interface MemberPhotoGalleryProps {
  personId: string;
  canEdit: boolean;
}

export default function MemberPhotoGallery({ personId, canEdit }: MemberPhotoGalleryProps) {
  const supabase = createClient();

  const [photos, setPhotos] = useState<PersonPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("person_photos")
      .select("id, storage_path, caption, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: true });

    if (error) {
      setError("Không thể tải ảnh.");
      setLoading(false);
      return;
    }

    const withUrls: PersonPhoto[] = (data ?? []).map((photo) => ({
      ...photo,
      publicUrl: supabase.storage
        .from("person-photos")
        .getPublicUrl(photo.storage_path).data.publicUrl,
    }));

    setPhotos(withUrls);
    setLoading(false);
  }, [personId, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
      if (e.key === "Escape") setLightboxIndex(null);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, photos.length]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversized = Array.from(files).find((f) => f.size > MAX_SIZE);
    if (oversized) {
      setError(`Ảnh "${oversized.name}" vượt quá 5MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `${personId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("person-photos")
        .upload(storagePath, file);

      if (uploadError) {
        setError(`Lỗi tải ảnh "${file.name}": ${uploadError.message}`);
        continue;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("person_photos")
        .insert({
          person_id: personId,
          storage_path: storagePath,
          uploaded_by: user?.id ?? null,
        });

      if (insertError) {
        setError(`Lỗi lưu thông tin ảnh: ${insertError.message}`);
        // Attempt to clean up orphaned upload
        await supabase.storage.from("person-photos").remove([storagePath]);
      }
    }

    setUploading(false);
    await fetchPhotos();
  };

  const handleDelete = async (photo: PersonPhoto) => {
    const { error: storageError } = await supabase.storage
      .from("person-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      setError(`Lỗi xóa ảnh: ${storageError.message}`);
      return;
    }

    const { error: dbError } = await supabase
      .from("person_photos")
      .delete()
      .eq("id", photo.id);

    if (dbError) {
      setError(`Lỗi xóa dữ liệu ảnh: ${dbError.message}`);
      return;
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (lightboxIndex !== null && lightboxIndex >= photos.length - 1) {
      setLightboxIndex(photos.length > 1 ? photos.length - 2 : null);
    }
  };

  return (
    <div>
      {/* Error toast */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Upload button */}
      {canEdit && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {uploading ? "Đang tải lên..." : "Thêm ảnh"}
          </button>
        </div>
      )}

      {/* Gallery grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-stone-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-stone-400 gap-2">
          <ImageIcon className="size-8 opacity-40" />
          <p className="text-sm italic">Chưa có ảnh nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-stone-200/60 shadow-sm bg-stone-100 cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            >
              <Image
                src={photo.publicUrl}
                alt={photo.caption ?? `Ảnh ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {/* Caption overlay */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
              {/* Delete button */}
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo);
                  }}
                  className="absolute top-1.5 right-1.5 size-6 flex items-center justify-center bg-black/50 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  title="Xóa ảnh"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? i - 1 : i)); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors z-10"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].publicUrl}
              alt={photos[lightboxIndex].caption ?? `Ảnh ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
            {photos[lightboxIndex].caption && (
              <p className="absolute bottom-0 left-0 right-0 text-center text-white text-sm py-2 px-4 bg-black/40 rounded-b-xl">
                {photos[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? i + 1 : i)); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors z-10"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 size-9 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
