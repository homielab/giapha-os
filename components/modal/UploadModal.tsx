"use client";

import { uploadGalleryImage } from "@/utils/supabase/storage";
import { createClient } from "@/utils/supabase/client";
import { X, UploadCloud, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { GalleryItem } from "@/types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: GalleryItem | null;
}

export default function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setEventDate(initialData.event_date || "");
      setPreview(initialData.image_url);
    }
  }, [isOpen, initialData]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData && !file) {
      setError("Vui lòng chọn ảnh.");
      return;
    }
    if (!title) {
      setError("Vui lòng nhập tiêu đề.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let finalUrl = initialData?.image_url || "";

      // 1. Upload to storage (only if new file selected)
      if (file) {
        const { url, error: uploadError } = await uploadGalleryImage(file);
        if (uploadError || !url) {
          throw new Error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
        }
        finalUrl = url;
      }

      // 2. Save to database
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      const itemData = {
        title,
        description: description || null,
        image_url: finalUrl,
        event_date: eventDate || null,
      };

      if (initialData) {
        // Update
        const { error: dbError } = await supabase
          .from("gallery_items")
          .update(itemData)
          .eq("id", initialData.id);
        if (dbError) throw dbError;
      } else {
        // Insert
        const { error: dbError } = await supabase
          .from("gallery_items")
          .insert([
            {
              ...itemData,
              created_by: userData?.user?.id || null,
            },
          ]);
        if (dbError) throw dbError;
      }

      // Success
      resetForm();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setEventDate("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const inputClasses =
    "bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-all outline-none!";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm"
        >
          {/* Click-away backdrop */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={!isUploading ? handleClose : undefined}
          />

          <motion.div
            layout
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Sticky Header Actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
              <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                {initialData ? "Chỉnh sửa hình ảnh" : "Thêm vào Phòng trưng bày"}
              </h2>

              <form id="upload-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer
                    ${preview ? 'border-stone-200 bg-stone-50' : 'border-stone-300 hover:border-pink-400 hover:bg-pink-50/50'}`}
                  onClick={() => !preview && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {preview ? (
                    <div className="relative inline-block w-full">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 object-contain mx-auto rounded-lg shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 text-stone-700 hover:text-rose-600 rounded-full shadow-md backdrop-blur-sm"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-stone-100 rounded-full text-stone-400">
                        <UploadCloud className="size-8" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-700">Kéo thả ảnh vào đây, hoặc click để chọn</p>
                        <p className="text-xs text-stone-500 mt-1">Hỗ trợ JPG, PNG, WEBP (Max 10MB)</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                    {error}
                  </div>
                )}

                {/* Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Tiêu đề ảnh / Sự kiện <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputClasses}
                      placeholder="Ví dụ: Lễ mừng thọ ông nội"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Ngày diễn ra
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Nội dung kỷ niệm
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className={`${inputClasses} resize-none`}
                      placeholder="Kể lại câu chuyện đằng sau bức ảnh..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isUploading}
                    className="btn"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    form="upload-form"
                    disabled={isUploading || (!initialData && !file) || !title}
                    className="btn-primary flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      initialData ? "Lưu thay đổi" : "Lưu hình ảnh"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

