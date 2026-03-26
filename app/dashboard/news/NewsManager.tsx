"use client";

import { News } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, Edit2, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewsManager({
  initialNews,
  canEdit,
}: {
  initialNews: any[];
  canEdit: boolean;
}) {
  const [news, setNews] = useState(initialNews);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const handleOpenModal = (newsItem?: News) => {
    if (newsItem) {
      setEditingNews(newsItem);
      setTitle(newsItem.title);
      setContent(newsItem.content);
      setThumbnailUrl(newsItem.thumbnail_url || "");
      setIsPublished(newsItem.is_published);
    } else {
      setEditingNews(null);
      setTitle("");
      setContent("");
      setThumbnailUrl("");
      setIsPublished(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const payload = {
      title,
      content,
      thumbnail_url: thumbnailUrl || null,
      is_published: isPublished,
    };

    const supabase = createClient();

    // get user ID
    const { data: { user } } = await supabase.auth.getUser();

    if (editingNews) {
      const { data, error } = await supabase
        .from("news")
        .update(payload)
        .eq("id", editingNews.id)
        .select()
        .single();

      if (!error && data) {
        setNews((prev) =>
          prev.map((n) => (n.id === data.id ? data : n))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("news")
        .insert([{ ...payload, created_by: user?.id }])
        .select()
        .single();

      if (!error && data) {
        setNews([data, ...news]);
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá bài viết này?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (!error) {
      setNews((prev) => prev.filter((n) => n.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Viết bài mới
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((n) => (
          <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
            <div className="relative h-48 bg-stone-100 flex items-center justify-center">
              {n.thumbnail_url ? (
                <img src={n.thumbnail_url} alt={n.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-stone-300" />
              )}
              {!n.is_published && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm">
                  <EyeOff className="w-3 h-3" /> Bản nháp
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-stone-800 line-clamp-2 mb-2">{n.title}</h3>
              <div
                className="text-stone-500 text-sm line-clamp-3 mb-4 prose prose-stone prose-sm"
                dangerouslySetInnerHTML={{ __html: n.content }}
              />

              <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {new Date(n.created_at).toLocaleDateString('vi-VN')}
                </span>

                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(n)}
                      className="p-1.5 text-stone-400 hover:text-amber-600 transition-colors bg-stone-50 rounded-md hover:bg-amber-50"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors bg-stone-50 rounded-md hover:bg-rose-50"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {news.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-stone-200 border-dashed">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="text-stone-800 font-medium mb-1">Chưa có bài viết nào</h3>
            <p className="text-stone-500 text-sm">
              {canEdit ? "Hãy viết tin tức đầu tiên cho dòng họ của bạn." : "Quay lại sau nhé."}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-0 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-xl font-bold text-stone-800">
                {editingNews ? "Sửa Bài Viết" : "Viết Bài Mới"}
              </h3>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <form id="news-form" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tiêu đề</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2.5 border font-medium text-stone-800"
                    placeholder="VD: Lễ Tảo Mộ Kỷ Tỵ..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Đường dẫn ảnh thu nhỏ (Thumbnail URL)</label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2.5 border"
                    placeholder="https://example.com/image.jpg"
                  />
                  {thumbnailUrl && (
                    <div className="mt-2 relative h-32 w-48 rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                      <img src={thumbnailUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-stone-700">Nội dung bài viết</label>
                  </div>
                  <div className="bg-white">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      className="h-[300px] mb-12"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{'list': 'ordered'}, {'list': 'bullet'}],
                          ['link', 'image'],
                          ['clean']
                        ]
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="publish-check"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="size-5 border-2 border-stone-300 rounded peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                      <svg
                        className={`size-3 text-white pointer-events-none transition-opacity ${isPublished ? 'opacity-100' : 'opacity-0'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <label htmlFor="publish-check" className="text-sm font-medium text-stone-700 cursor-pointer select-none flex items-center gap-1.5">
                    {isPublished ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-stone-400" />}
                    Xuất bản (Hiển thị công khai)
                  </label>
                </div>
              </form>
            </div>

            <div className="p-5 sm:p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50/50 mt-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn"
              >
                Hủy
              </button>
              <button form="news-form" type="submit" className="btn-primary">
                Lưu bài viết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
