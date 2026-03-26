"use client";

import { Transaction, TransactionCategory, TransactionType } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, Edit2, Download } from "lucide-react";
import { useState } from "react";

export default function FinanceManager({
  initialTransactions,
  canEdit,
}: {
  initialTransactions: any[];
  canEdit: boolean;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("income");
  const [category, setCategory] = useState<TransactionCategory>("cong_duc");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [contributorName, setContributorName] = useState("");

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setAmount(transaction.amount.toString());
      setType(transaction.type);
      setCategory(transaction.category);
      setDescription(transaction.description);
      setDate(transaction.date);
      setContributorName(transaction.contributor_name || "");
    } else {
      setEditingTransaction(null);
      setAmount("");
      setType("income");
      setCategory("cong_duc");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setContributorName("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !date) return;

    const payload = {
      amount: parseFloat(amount),
      type,
      category,
      description,
      date,
      contributor_name: contributorName || null,
    };

    const supabase = createClient();

    if (editingTransaction) {
      const { data, error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", editingTransaction.id)
        .select()
        .single();

      if (!error && data) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === data.id ? data : t))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("transactions")
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        setTransactions([data, ...transactions]);
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá bản ghi này?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100">
        <h2 className="text-lg font-bold text-stone-800">Danh sách Giao dịch</h2>
        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Thêm giao dịch mới
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-medium">
            <tr>
              <th className="px-6 py-4">Ngày</th>
              <th className="px-6 py-4">Loại</th>
              <th className="px-6 py-4">Quỹ</th>
              <th className="px-6 py-4">Nội dung</th>
              <th className="px-6 py-4">Người đóng góp/nhận</th>
              <th className="px-6 py-4 text-right">Số tiền (VNĐ)</th>
              {canEdit && <th className="px-6 py-4 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {t.type === 'income' ? 'Thu' : 'Chi'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {t.category === 'cong_duc' ? 'Công đức' : t.category === 'khuyen_hoc' ? 'Khuyến học' : 'Quỹ Chung'}
                </td>
                <td className="px-6 py-4">{t.description}</td>
                <td className="px-6 py-4">{t.contributor_name || '-'}</td>
                <td className={`px-6 py-4 text-right font-medium ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')}
                </td>
                {canEdit && (
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(t)}
                      className="text-stone-400 hover:text-amber-600 mr-3"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-stone-400 hover:text-rose-600"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-6 py-8 text-center text-stone-500">
                  Chưa có giao dịch nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-bold text-stone-800 mb-4">
              {editingTransaction ? "Sửa Giao Dịch" : "Thêm Giao Dịch"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Loại</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  >
                    <option value="income">Thu</option>
                    <option value="expense">Chi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Quỹ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  >
                    <option value="cong_duc">Công đức</option>
                    <option value="khuyen_hoc">Khuyến học</option>
                    <option value="thu_chi_chung">Thu chi chung</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nội dung</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  placeholder="VD: Chú B ủng hộ xây từ đường"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Người đóng góp / nhận</label>
                <input
                  type="text"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  placeholder="VD: Phạm Ngọc A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Ngày giao dịch</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border-stone-200 focus:border-amber-500 focus:ring-amber-500 bg-stone-50 p-2 border"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn flex-1"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
