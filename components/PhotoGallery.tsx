"use client";

import { createClient } from "@/utils/supabase/client";
import { compressImageIfNeeded } from "@/utils/imageCompressor";
import { ChevronLeft, ChevronRight, Images, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Photo {
  name: string;
  url: string;
  size?: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  canUpload: boolean;
  canDelete: boolean;
  usedBytes: number;
  maxBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function PhotoGallery({
  photos,
  canUpload,
  canDelete,
  usedBytes,
  maxBytes,
}: PhotoGalleryProps) {
  const usedPercent = Math.min((usedBytes / maxBytes) * 100, 100);
  const isWarning = usedPercent >= 70;
  const isDanger = usedPercent >= 90;
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const selectedIndex = selectedPhoto
    ? photos.findIndex((p) => p.name === selectedPhoto.name)
    : -1;

  const handlePrev = () => {
    if (selectedIndex > 0) setSelectedPhoto(photos[selectedIndex - 1]);
  };
  const handleNext = () => {
    if (selectedIndex < photos.length - 1) setSelectedPhoto(photos[selectedIndex + 1]);
  };

  useEffect(() => {
    if (!selectedPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPhoto, selectedIndex]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress({ done: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = await compressImageIfNeeded(files[i]);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("shared-photos")
        .upload(fileName, file);

      if (uploadError) {
        setError(`Lỗi khi tải "${file.name}": ${uploadError.message}`);
        break;
      }

      setUploadProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    setUploadProgress(null);
    router.refresh();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (photo: Photo) => {
    const { error: deleteError } = await supabase.storage
      .from("shared-photos")
      .remove([photo.name]);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (selectedPhoto?.name === photo.name) setSelectedPhoto(null);
    router.refresh();
  };

  return (
    <div>
      {/* Storage usage bar */}
      <div className="mb-6 p-4 rounded-2xl bg-white border border-stone-200/60 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-stone-600">Dung lượng hiện tại</span>
          <span className={`text-sm font-bold ${isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-stone-500"}`}>
            {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isDanger ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-500"}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {isDanger && (
          <p className="text-xs text-red-600 font-medium mt-2">⚠ Dung lượng gần đầy! Hãy xóa bớt ảnh hoặc nâng cấp gói Supabase.</p>
        )}
        {isWarning && !isDanger && (
          <p className="text-xs text-amber-600 font-medium mt-2">Đã dùng hơn 70% dung lượng. Cân nhắc dọn dẹp ảnh cũ.</p>
        )}
      </div>

      {canUpload && (
        <div className="mb-6 flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-800 text-white font-semibold hover:bg-stone-900 disabled:opacity-60 transition-all shadow-md"
          >
            <Upload className="size-4" />
            {uploading && uploadProgress
              ? `Đang tải lên... (${uploadProgress.done}/${uploadProgress.total})`
              : "Tải ảnh lên"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <Images className="size-12 mb-3 opacity-40" />
          <p className="font-medium">Chưa có ảnh nào</p>
          {canUpload && (
            <p className="text-sm mt-1">
              Nhấn &quot;Tải ảnh lên&quot; để thêm ảnh đầu tiên
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {photos.map((photo) => (
            <div
              key={photo.name}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <Image
                src={photo.url}
                alt={photo.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {photo.size ? (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatBytes(photo.size)}
                </span>
              ) : null}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo);
                  }}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="size-8" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={selectedIndex <= 0}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="size-6" />
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={selectedIndex >= photos.length - 1}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="size-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Counter */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {selectedIndex + 1} / {photos.length}
          </p>
          {canDelete && (
            <button
              onClick={() => handleDelete(selectedPhoto)}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
            >
              <Trash2 className="size-4" />
              Xóa ảnh
            </button>
          )}
        </div>
      )}
    </div>
  );
}
