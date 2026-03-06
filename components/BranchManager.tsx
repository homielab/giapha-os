"use client";

import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { GitBranch, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

interface Branch {
  id: string;
  name: string;
  description: string | null;
  root_person_id: string | null;
  created_at: string;
}

interface Person {
  id: string;
  full_name: string;
  birth_year: number | null;
}

interface BranchManagerProps {
  initialBranches: Branch[];
  persons: Person[];
}

export default function BranchManager({ initialBranches, persons }: BranchManagerProps) {
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRootPersonId, setNewRootPersonId] = useState("");

  const inputClasses =
    "bg-white text-stone-900 placeholder-stone-400 block w-full rounded-xl border border-stone-300 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm px-4 py-2.5 transition-all outline-none!";

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("branches")
        .insert({
          name: newName.trim(),
          description: newDescription.trim() || null,
          root_person_id: newRootPersonId || null,
        })
        .select("id, name, description, root_person_id, created_at")
        .single();
      if (insertError) throw insertError;
      setBranches((prev) => [...prev, data]);
      setNewName("");
      setNewDescription("");
      setNewRootPersonId("");
      setIsAdding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xoá chi "${name}"? Hành động này không thể hoàn tác.`)) return;
    setLoading(true);
    setError(null);
    try {
      const { error: delError } = await supabase.from("branches").delete().eq("id", id);
      if (delError) throw delError;
      setBranches((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const rootPersonMap = Object.fromEntries(persons.map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 p-3 rounded-xl">
          {error}
        </div>
      )}

      {branches.length === 0 && !isAdding && (
        <div className="text-center py-12 text-stone-400 bg-white/60 rounded-2xl border border-stone-200 border-dashed">
          <GitBranch className="size-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có chi/nhánh nào</p>
          <p className="text-sm mt-1">Tạo chi đầu tiên để phân chia dòng họ</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {branches.map((branch) => (
          <motion.div
            key={branch.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 flex items-start gap-4"
          >
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 shrink-0">
              <GitBranch className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-stone-900">{branch.name}</h3>
              {branch.description && (
                <p className="text-sm text-stone-500 mt-0.5">{branch.description}</p>
              )}
              {branch.root_person_id && (
                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                  <Users className="size-3" />
                  Gốc chi: {rootPersonMap[branch.root_person_id] ?? branch.root_person_id}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(branch.id, branch.name)}
              disabled={loading}
              className="text-stone-300 hover:text-rose-500 transition-colors shrink-0"
              title="Xoá chi"
            >
              <Trash2 className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding ? (
          <motion.form
            key="add-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            onSubmit={handleAdd}
            className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-5 space-y-4"
          >
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <Plus className="size-4" /> Thêm chi mới
            </h4>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Tên chi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ví dụ: Chi trưởng, Chi hai, Chi Bắc..."
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Mô tả
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Mô tả ngắn về chi này..."
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Người gốc chi (tùy chọn)
              </label>
              <select
                value={newRootPersonId}
                onChange={(e) => setNewRootPersonId(e.target.value)}
                className={`${inputClasses} appearance-none`}
              >
                <option value="">— Chọn người gốc chi —</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}{p.birth_year ? ` (${p.birth_year})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setNewName(""); setNewDescription(""); setNewRootPersonId(""); setError(null); }}
                className="btn"
              >
                Hủy
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Thêm chi
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsAdding(true)}
            className="w-full py-3 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="size-4" />
            Thêm chi mới
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
