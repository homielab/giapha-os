import NotificationSettings from "@/components/NotificationSettings";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { GitBranch, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNotificationSettings } from "./actions";
import ApiKeySettings from "./ApiKeySettings";
import PublicShareSettings from "./PublicShareSettings";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();
  const { data: settings } = await supabase
    .from("family_settings")
    .select("setting_key, setting_value");

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { setting_key: string; setting_value: string | null }) => [
      s.setting_key,
      s.setting_value,
    ]),
  );

  const notificationSettings = await getNotificationSettings().catch(() => ({
    id: null,
    enabled: false,
    days_before: [7],
    email_recipients: [] as string[],
    thanh_minh_enabled: false,
  }));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
          <Settings className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Cài đặt
          </h1>
          <p className="text-sm text-stone-500">Quản lý cài đặt hệ thống</p>
        </div>
      </div>

      <PublicShareSettings
        initialEnabled={settingsMap.public_share_enabled === "true"}
        initialToken={settingsMap.public_share_token ?? null}
      />

      <ApiKeySettings
        initialEnabled={settingsMap.api_key_enabled === "true"}
        initialApiKey={settingsMap.api_key_value ?? null}
      />

      <NotificationSettings
        initialEnabled={notificationSettings.enabled}
        initialDaysBefore={notificationSettings.days_before}
        initialEmailRecipients={notificationSettings.email_recipients}
        initialThanhMinhEnabled={notificationSettings.thanh_minh_enabled ?? false}
      />

      {/* Branch / Chi Management quick link */}
      <Link
        href="/dashboard/settings/branches"
        className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group"
      >
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 group-hover:bg-amber-100 transition-colors">
          <GitBranch className="size-5" />
        </div>
        <div>
          <p className="font-semibold text-stone-800">Quản lý Chi / Nhánh</p>
          <p className="text-sm text-stone-500 mt-0.5">
            Phân chia dòng họ theo các chi, nhánh để dễ quản lý thành viên
          </p>
        </div>
        <span className="ml-auto text-stone-300 group-hover:text-amber-500 transition-colors">→</span>
      </Link>
    </main>
  );
}
