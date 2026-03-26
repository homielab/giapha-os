import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import FinanceManager from "./FinanceManager";

export const metadata = {
  title: "Sổ công đức & Thu chi | Gia phả Việt",
};

export default async function FinancePage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const canEdit = profile.role === "admin" || profile.role === "editor";

  const supabase = await getSupabase();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      *,
      persons:person_id (full_name)
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
  }

  // Calculate summaries
  const summaries = (transactions || []).reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      if (t.type === "income") {
        acc.totalIncome += amount;
        if (t.category === "cong_duc") acc.congDuc += amount;
        if (t.category === "khuyen_hoc") acc.khuyenHoc += amount;
        if (t.category === "thu_chi_chung") acc.thuChiChungIncome += amount;
      } else {
        acc.totalExpense += amount;
        if (t.category === "cong_duc") acc.congDucExpense += amount;
        if (t.category === "khuyen_hoc") acc.khuyenHocExpense += amount;
        if (t.category === "thu_chi_chung") acc.thuChiChungExpense += amount;
      }
      return acc;
    },
    {
      totalIncome: 0,
      totalExpense: 0,
      congDuc: 0,
      congDucExpense: 0,
      khuyenHoc: 0,
      khuyenHocExpense: 0,
      thuChiChungIncome: 0,
      thuChiChungExpense: 0,
    }
  );

  const balance = summaries.totalIncome - summaries.totalExpense;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#8b0000]">
          Sổ công đức & Thu chi
        </h1>
        <p className="mt-2 text-stone-600">
          Quản lý các khoản đóng góp, công đức, khuyến học và thu chi chung của dòng họ.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Tổng quỹ hiện tại</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {balance.toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Quỹ Công đức (Còn lại)</p>
          <p className="text-2xl font-bold text-amber-600">
            {(summaries.congDuc - summaries.congDucExpense).toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Quỹ Khuyến học (Còn lại)</p>
          <p className="text-2xl font-bold text-blue-600">
            {(summaries.khuyenHoc - summaries.khuyenHocExpense).toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-sm font-medium text-stone-500 mb-1">Quỹ Chung (Còn lại)</p>
          <p className="text-2xl font-bold text-stone-700">
            {(summaries.thuChiChungIncome - summaries.thuChiChungExpense).toLocaleString("vi-VN")} ₫
          </p>
        </div>
      </div>

      <FinanceManager initialTransactions={transactions || []} canEdit={canEdit} />
    </div>
  );
}
