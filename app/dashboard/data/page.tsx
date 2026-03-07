import DataImportExport from "@/components/DataImportExport";
import ResetDataCard from "@/components/ResetDataCard";
import { getProfile } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function DataManagementPage() {
  const profile = await getProfile();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="title">Sao lưu & Phục hồi</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
              Quản lý dữ liệu an toàn. Bạn có thể tải xuống bản sao lưu để lưu
              trữ hoặc phục hồi lại dữ liệu từ file đã lưu. Tính năng này chỉ
              dành cho Quản trị viên.
            </p>
          </div>
        </div>

        <DataImportExport />

        <div className="mt-8">
          <ResetDataCard />
        </div>
      </div>
    </main>
  );
}
