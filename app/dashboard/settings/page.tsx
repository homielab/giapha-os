import NotificationSettings from "@/components/NotificationSettings";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Settings } from "lucide-react";
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
      />
    </main>
  );
}
