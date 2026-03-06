import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Cpu } from "lucide-react";
import { redirect } from "next/navigation";
import PlatformAIForm from "@/components/PlatformAIForm";

export default async function AdminAISettingsPage() {
  const profile = await getProfile();
  // TODO: restrict to super_admin role once that role is added
  if (profile?.role !== "admin") redirect("/dashboard");

  const supabase = await getSupabase();

  const { data: settings } = await supabase
    .from("family_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["platform_ai_api_key", "platform_ai_model", "platform_ai_base_url"]);

  const map = Object.fromEntries(
    (settings ?? []).map((r: { setting_key: string; setting_value: string | null }) => [
      r.setting_key,
      r.setting_value ?? "",
    ]),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3">
        <Cpu className="size-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Platform AI Settings</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Cấu hình API key AI mặc định cho toàn hệ thống
          </p>
        </div>
      </div>

      <PlatformAIForm
        initialApiKey={map["platform_ai_api_key"] ?? ""}
        initialModel={map["platform_ai_model"] ?? ""}
        initialBaseUrl={map["platform_ai_base_url"] ?? ""}
      />

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
        <p className="font-medium">Lưu ý</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>Platform key được dùng khi branch bot chưa có BYOK key riêng.</li>
          <li>
            API key được lưu trong <code>family_settings</code>. Đảm bảo RLS bảo vệ bảng này.
          </li>
          <li>Branch admin có thể ghi đè bằng BYOK key trong phần cài đặt bot.</li>
        </ul>
      </div>
    </div>
  );
}

