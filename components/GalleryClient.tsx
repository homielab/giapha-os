"use client";

import { GalleryItem } from "@/types";
import { useState, useEffect } from "react";
import GalleryGrid from "./GalleryGrid";
import UploadModal from "./modal/UploadModal";
import { Plus, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GalleryClient({ initialItems, isAdmin }: { initialItems: GalleryItem[], isAdmin: boolean }) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const router = useRouter();

  // Sync with server items when they change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleUploadSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    // Refresh the server component to get new data
    router.refresh();
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    router.refresh();
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingItem(null), 300); // clear after animation
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-12">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="title">
              Phòng trưng bày
            </h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base ">
              Lưu giữ những kỷ niệm và khoảnh khắc đáng nhớ
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="size-5" />
          Thêm hình ảnh
        </button>
      </div>

      <GalleryGrid
        items={items}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDeleteSuccess={handleDeleteSuccess}
      />

      <UploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleUploadSuccess}
        initialData={editingItem}
      />
    </>
  );
}
