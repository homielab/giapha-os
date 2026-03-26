import { getProfile, getSettings, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export const metadata = {
  title: "Cấu hình chung | Gia phả Việt",
};

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const settings = await getSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-stone-800">
          Cấu hình chung website
        </h1>
        <p className="mt-2 text-stone-600">
          Thay đổi tên, logo, địa chỉ, và thông tin liên hệ hiển thị ở chân
          trang (Footer) của hệ thống gia phả.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6">
          <SettingsForm initialSettings={settings} />
        </div>
      </div>
    </div>
  );
}
