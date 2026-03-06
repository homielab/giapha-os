import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { Bot } from "lucide-react";
import { redirect } from "next/navigation";
import BotSettings from "@/components/BotSettings";
import BotAISettings from "@/components/BotAISettings";

export default async function BotSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfile();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await getSupabase();

  const { data: branch } = await supabase
    .from("branches")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (!branch) redirect("/dashboard/settings/branches");

  const { data: botConfig } = await supabase
    .from("branch_bots")
    .select("*")
    .eq("branch_id", id)
    .eq("platform", "telegram")
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3">
        <Bot className="size-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Bot Telegram — {branch.name}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Cấu hình bot Telegram cho chi/nhánh này
          </p>
        </div>
      </div>

      <BotSettings branchId={id} branchName={branch.name} initialBot={botConfig} />

      <BotAISettings branchId={id} branchName={branch.name} initialBot={botConfig} />
    </div>
  );
}
