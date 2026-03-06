"use client";

import { Invitation, Branch } from "@/types";
import { createInvitation, deleteInvitation } from "./actions";
import {
  Check,
  Copy,
  Link2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface Props {
  invitations: Invitation[];
  branches: Pick<Branch, "id" | "name">[];
  baseUrl: string;
}

const EMPTY_FORM = {
  branch_id: null as string | null,
  role: "member" as "member" | "editor",
  email: "",
  max_uses: 1,
  expires_days: 30 as number | null,
};

export default function InvitationManager({ invitations: init, branches, baseUrl }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>(init);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await createInvitation(form);
      if (token) {
        setInvitations((prev) => [
          {
            id: crypto.randomUUID(),
            token,
            branch_id: form.branch_id,
            invited_by: null,
            role: form.role,
            email: form.email || null,
            max_uses: form.max_uses,
            uses_count: 0,
            expires_at: form.expires_days
              ? new Date(Date.now() + form.expires_days * 86400 * 1000).toISOString()
              : null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/join/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const inputCls =
    "w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white";

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Hủy" : "Tạo link mời"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-stone-800 mb-2">Tạo link mời mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Chi nhánh
                </label>
                <select
                  value={form.branch_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value || null }))}
                  className={inputCls}
                >
                  <option value="">Không gán chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Quyền hạn
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "member" | "editor" }))}
                className={inputCls}
              >
                <option value="member">Thành viên</option>
                <option value="editor">Biên tập viên</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Email (tuỳ chọn)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
                placeholder="Chỉ mời đúng email này"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Số lượt dùng tối đa
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Hết hạn sau (ngày)
              </label>
              <input
                type="number"
                min={1}
                value={form.expires_days ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, expires_days: e.target.value ? Number(e.target.value) : null }))}
                className={inputCls}
                placeholder="Không giới hạn"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? "Đang tạo..." : "Tạo link mời"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {invitations.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <Link2 className="size-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có link mời nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => {
            const isExpired = inv.expires_at
              ? new Date(inv.expires_at) < new Date()
              : false;
            const isFull = inv.uses_count >= inv.max_uses;
            const isActive = !isExpired && !isFull;
            const link = `${baseUrl}/join/${inv.token}`;

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 ${
                  isActive ? "border-stone-200" : "border-stone-100 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-stone-50 text-stone-500 border-stone-200"
                        }`}
                      >
                        {isExpired ? "Hết hạn" : isFull ? "Đầy lượt" : "Đang hoạt động"}
                      </span>
                      <span className="text-xs text-stone-500 capitalize">{inv.role}</span>
                      {inv.email && (
                        <span className="text-xs text-stone-400 truncate max-w-[120px]">
                          {inv.email}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-stone-400 truncate">
                      {link}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {inv.uses_count}/{inv.max_uses} lượt dùng
                      {inv.expires_at &&
                        ` · Hết hạn: ${new Date(inv.expires_at).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 text-stone-500 hover:text-amber-700 text-xs font-medium transition-colors"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedToken === inv.token ? "Đã copy" : "Copy link"}
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      disabled={deletingId === inv.id}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
