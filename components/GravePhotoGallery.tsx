"use client";

import { addGravePhoto, deleteGravePhoto, getGravePhotos } from "@/app/dashboard/members/[id]/grave/actions";
import type { GravePhoto } from "@/types";
import { Camera, ImageIcon, Loader2, Plus, Scan, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PanoramaViewer from "@/components/PanoramaViewer";

const PHOTO_TAGS = [
  { value: "front",    label: "Mặt trước" },
  { value: "side",     label: "Mặt bên" },
  { value: "aerial",   label: "Toàn cảnh" },
  { value: "detail",   label: "Chi tiết" },
  { value: "map",      label: "Bản đồ vị trí" },
  { value: "other",    label: "Khác" },
] as const;

interface GravePhotoWithUrl extends GravePhoto {
  publicUrl: string;
}

interface GravePhotoGalleryProps {
  graveId: string;
  canEdit: boolean;
  panoramaUrl?: string | null;
  onPanoramaChange?: (url: string | null) => void;
}

export default function GravePhotoGallery({
  graveId,
  canEdit,
  panoramaUrl,
  onPanoramaChange,
}: GravePhotoGalleryProps) {
  const supabase = createClient();

  const [photos, setPhotos] = useState<GravePhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingPano, setUploadingPano] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showPanorama, setShowPanorama] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panoInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGravePhotos(graveId);
      const withUrls: GravePhotoWithUrl[] = data.map((p) => ({
        ...p,
        publicUrl: supabase.storage
          .from("grave-photos")
          .getPublicUrl(p.storage_path).data.publicUrl,
      }));
      setPhotos(withUrls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải ảnh mộ.");
    } finally {
      setLoading(false);
    }
  }, [graveId, supabase]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

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

  async function uploadToStorage(file: File, folder: string): Promise<string> {
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error(`Ảnh "${file.name}" vượt quá 20MB.`);

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${folder}/${filename}`;

    const { error: uploadErr } = await supabase.storage
      .from("grave-photos")
      .upload(storagePath, file);

    if (uploadErr) throw new Error(`Lỗi tải lên: ${uploadErr.message}`);
    return storagePath;
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const storagePath = await uploadToStorage(file, graveId);
        await addGravePhoto(graveId, {
          storage_path: storagePath,
          caption: null,
          photo_tag: null,
          is_panorama: false,
        });
      }
      await loadPhotos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ảnh.");
    } finally {
      setUploading(false);
    }
  };

  const handlePanoramaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPano(true);
    setError(null);
    try {
      const file = files[0];
      const storagePath = await uploadToStorage(file, `${graveId}/panorama`);
      const publicUrl = supabase.storage
        .from("grave-photos")
        .getPublicUrl(storagePath).data.publicUrl;

      await addGravePhoto(graveId, {
        storage_path: storagePath,
        caption: "Ảnh 360° toàn cảnh mộ",
        photo_tag: "panorama",
        is_panorama: true,
      });
      await loadPhotos();
      onPanoramaChange?.(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ảnh 360°.");
    } finally {
      setUploadingPano(false);
    }
  };

  const handleDelete = async (photo: GravePhotoWithUrl, index: number) => {
    try {
      await deleteGravePhoto(photo.id);
      if (photo.is_panorama) onPanoramaChange?.(null);
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      if (lightboxIndex !== null && lightboxIndex >= photos.length - 1) {
        setLightboxIndex(photos.length > 1 ? photos.length - 2 : null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi xóa ảnh.");
    }
  };

  const normalPhotos = photos.filter((p) => !p.is_panorama);
  const panoramaPhoto = photos.find((p) => p.is_panorama);
  const activePanoUrl = panoramaPhoto?.publicUrl ?? panoramaUrl ?? null;

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── 360° Panorama section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Scan className="size-4 text-amber-500" />
            Ảnh toàn cảnh 360°
          </h4>
          <div className="flex items-center gap-2">
            {activePanoUrl && (
              <button
                onClick={() => setShowPanorama((v) => !v)}
                className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium rounded-lg transition-colors"
              >
                {showPanorama ? "Ẩn" : "Xem 360°"}
              </button>
            )}
            {canEdit && (
              <>
                <input
                  ref={panoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePanoramaUpload(e.target.files)}
                />
                <button
                  onClick={() => panoInputRef.current?.click()}
                  disabled={uploadingPano}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-stone-700 hover:bg-stone-800 disabled:bg-stone-400 text-white font-medium rounded-lg transition-colors"
                >
                  {uploadingPano ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Scan className="size-3.5" />
                  )}
                  {uploadingPano ? "Đang tải..." : panoramaPhoto ? "Thay thế" : "Tải 360°"}
                </button>
              </>
            )}
          </div>
        </div>

        {activePanoUrl && showPanorama ? (
          <PanoramaViewer imageUrl={activePanoUrl} height={420} />
        ) : activePanoUrl ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl text-sm text-amber-800">
            <Scan className="size-4 shrink-0" />
            <span>Đã có ảnh 360°. Nhấn <strong>Xem 360°</strong> để hiển thị.</span>
            {canEdit && panoramaPhoto && (
              <button
                onClick={() => handleDelete(panoramaPhoto, photos.indexOf(panoramaPhoto))}
                className="ml-auto text-red-500 hover:text-red-700"
                title="Xóa ảnh 360°"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-stone-50 border border-dashed border-stone-300 px-4 py-4 rounded-xl text-sm text-stone-400 text-center justify-center">
            <Scan className="size-5 opacity-40" />
            <span>Chưa có ảnh 360°. {canEdit ? "Tải lên ảnh panorama equirectangular." : ""}</span>
          </div>
        )}
      </div>

      {/* ── Normal photos ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Camera className="size-4 text-amber-500" />
            Ảnh mộ phần ({normalPhotos.length})
          </h4>
          {canEdit && (
            <>
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
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {uploading ? "Đang tải..." : "Thêm ảnh"}
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-stone-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : normalPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2">
            <ImageIcon className="size-7 opacity-40" />
            <p className="text-sm italic">Chưa có ảnh mộ nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {normalPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-xl overflow-hidden border border-stone-200/60 shadow-sm bg-stone-100 cursor-pointer"
                onClick={() => setLightboxIndex(idx)}
              >
                <Image
                  src={photo.publicUrl}
                  alt={photo.caption ?? `Ảnh ${idx + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  unoptimized
                />
                {/* Tag badge */}
                {photo.photo_tag && photo.photo_tag !== "other" && (
                  <div className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                    {PHOTO_TAGS.find((t) => t.value === photo.photo_tag)?.label ?? photo.photo_tag}
                  </div>
                )}
                {/* Caption */}
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
                {/* Delete */}
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo, idx);
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
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && normalPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? i - 1 : i)); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors z-10"
            >‹</button>
          )}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={normalPhotos[lightboxIndex].publicUrl}
              alt={normalPhotos[lightboxIndex].caption ?? `Ảnh ${lightboxIndex + 1}`}
              width={1200}
              height={900}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
              unoptimized
            />
            {normalPhotos[lightboxIndex].caption && (
              <p className="absolute bottom-0 left-0 right-0 text-center text-white text-sm py-2 px-4 bg-black/40 rounded-b-xl">
                {normalPhotos[lightboxIndex].caption}
              </p>
            )}
          </div>
          {lightboxIndex < normalPhotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i !== null ? i + 1 : i)); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors z-10"
            >›</button>
          )}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 size-9 flex items-center justify-center bg-white/10 hover:bg-white/25 text-white rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {normalPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
