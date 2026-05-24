"use client";

import { GalleryItem } from "@/types";
import { useState } from "react";
import { X, CalendarDays, Maximize2 } from "lucide-react";
import dayjs from "dayjs";

import { createClient } from "@/utils/supabase/client";

interface GalleryGridProps {
  items: GalleryItem[];
  isAdmin?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onDeleteSuccess?: (id: string) => void;
}

export default function GalleryGrid({ items, isAdmin, onEdit, onDeleteSuccess }: GalleryGridProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hình ảnh này?")) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();

      // Delete from storage if possible
      const fileName = item.image_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("gallery").remove([fileName]);
      }

      // Delete from db
      const { error } = await supabase.from("gallery_items").delete().eq("id", item.id);
      if (error) throw error;

      setSelectedItem(null);
      if (onDeleteSuccess) onDeleteSuccess(item.id);
    } catch (err) {
      console.error("Error deleting gallery item", err);
      alert("Đã xảy ra lỗi khi xóa hình ảnh.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-stone-100 shadow-sm">
        <div className="size-20 bg-stone-50 rounded-full flex items-center justify-center mb-4 border border-stone-100">
          <Maximize2 className="size-8 text-stone-300" />
        </div>
        <h3 className="text-xl font-bold text-stone-700 mb-2">Chưa có hình ảnh nào</h3>
        <p className="text-stone-500 max-w-sm">
          Hãy là người đầu tiên thêm hình ảnh để lưu giữ những kỷ niệm đẹp của dòng họ.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-stone-100 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
            onClick={() => setSelectedItem(item)}
          >
            {/* Image */}
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">
                  {item.title}
                </h3>
                {item.event_date && (
                  <p className="text-stone-300 text-sm flex items-center gap-1.5 font-medium">
                    <CalendarDays className="size-3.5" />
                    {dayjs(item.event_date).format("DD/MM/YYYY")}
                  </p>
                )}
              </div>
            </div>

            {/* Top Right Icon */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                <Maximize2 className="size-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="size-6" />
          </button>

          <div className="flex flex-col lg:flex-row w-full max-w-6xl max-h-[90vh] bg-stone-950 rounded-2xl overflow-hidden shadow-2xl">
            {/* Image Section */}
            <div className="flex-1 relative flex items-center justify-center bg-black/50 p-4 min-h-[50vh] lg:min-h-0">
              <img
                src={selectedItem.image_url}
                alt={selectedItem.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            {/* Content Section */}
            <div className="w-full lg:w-96 bg-white flex flex-col max-h-[40vh] lg:max-h-none overflow-y-auto">
              <div className="p-6 sm:p-8 flex-1">
                <h2 className="text-2xl font-bold text-stone-800 mb-4 leading-tight">
                  {selectedItem.title}
                </h2>

                {selectedItem.event_date && (
                  <div className="flex items-center gap-2 text-stone-500 font-medium mb-6 pb-6 border-b border-stone-100">
                    <CalendarDays className="size-4" />
                    <span>{dayjs(selectedItem.event_date).format("DD/MM/YYYY")}</span>
                  </div>
                )}

                {selectedItem.description ? (
                  <div className="prose prose-stone text-stone-600">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-stone-400 italic">Không có nội dung mô tả.</p>
                )}
              </div>

              <div className="p-6 bg-stone-50 border-t border-stone-100 text-xs text-stone-400 font-medium flex justify-between items-center">
                <span>Đã thêm vào {dayjs(selectedItem.created_at).format("DD/MM/YYYY")}</span>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        if (onEdit) onEdit(selectedItem);
                      }}
                      className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(selectedItem)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeleting ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
