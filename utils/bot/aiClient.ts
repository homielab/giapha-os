"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/utils/bot/telegram";
import type { TelegramMessage } from "@/utils/bot/telegram";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function getPlatformAIKey(supabase: SupabaseClient): Promise<{
  apiKey: string;
  model: string;
  baseUrl: string;
} | null> {
  const { data } = await supabase
    .from("family_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["platform_ai_api_key", "platform_ai_model", "platform_ai_base_url"]);

  const map = Object.fromEntries(
    (data ?? []).map((r: { setting_key: string; setting_value: string | null }) => [
      r.setting_key,
      r.setting_value,
    ]),
  );

  if (!map["platform_ai_api_key"]) return null;
  return {
    apiKey: map["platform_ai_api_key"],
    model: map["platform_ai_model"] ?? "gpt-4o-mini",
    baseUrl: map["platform_ai_base_url"] ?? "https://api.openai.com/v1",
  };
}

async function buildBranchContext(
  supabase: SupabaseClient,
  branchId: string,
  botSystemPrompt: string | null,
): Promise<string> {
  const { data: branch } = await supabase
    .from("branches")
    .select("name, description")
    .eq("id", branchId)
    .single();

  const { count: totalCount } = await supabase
    .from("persons")
    .select("*", { count: "exact", head: true });

  const { count: livingCount } = await supabase
    .from("persons")
    .select("*", { count: "exact", head: true })
    .is("death_year", null);

  const { data: ancestors } = await supabase
    .from("persons")
    .select("full_name, birth_year, death_year, generation")
    .order("generation", { ascending: true })
    .limit(10);

  const ancestorList = (ancestors ?? [])
    .map(
      (p) =>
        `${p.full_name} (sinh ${p.birth_year ?? "?"}, thế hệ ${p.generation ?? "?"})`,
    )
    .join(", ");

  const branchInfo = branch
    ? `Chi/Nhánh: ${branch.name}${branch.description ? ` — ${branch.description}` : ""}`
    : "Dòng họ";

  const customPrompt = botSystemPrompt?.trim()
    ? `\n\nHướng dẫn đặc biệt cho bot này:\n${botSystemPrompt}`
    : "";

  return `Bạn là trợ lý AI của dòng họ được tạo bởi Gia Phả OS.

${branchInfo}
Tổng thành viên: ${totalCount ?? "?"} người (còn sống: ${livingCount ?? "?"})
Tổ tiên đầu tiên: ${ancestorList || "Chưa có thông tin"}

Bạn có thể giúp người dùng:
- Tìm kiếm thông tin về thành viên trong gia phả
- Trả lời câu hỏi về lịch sử dòng họ
- Nhắc nhở về lịch giỗ, sự kiện
- Tư vấn về truyền thống gia đình Việt Nam

Khi không có thông tin, hãy nói rõ là bạn không có dữ liệu đó.
Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.${customPrompt}`;
}

async function callAI(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: AIMessage[],
): Promise<{ content: string; tokensUsed: number }> {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(baseUrl.includes("anthropic") ? { "anthropic-version": "2023-06-01" } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { total_tokens?: number };
  };

  const content =
    data.choices?.[0]?.message?.content ?? "Xin lỗi, tôi không thể trả lời lúc này.";
  const tokensUsed = data.usage?.total_tokens ?? 0;
  return { content, tokensUsed };
}

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "openai":
    default:
      return "https://api.openai.com/v1";
  }
}

export interface BranchBot {
  id: string;
  branch_id: string;
  bot_token: string;
  ai_enabled?: boolean;
  ai_provider?: string;
  ai_model?: string;
  ai_api_key?: string;
  ai_base_url?: string;
  ai_system_prompt?: string;
}

export async function handleAIChat(
  bot: BranchBot,
  chatId: number | string,
  message: TelegramMessage,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    let apiKey: string;
    let model: string;
    let baseUrl: string;

    if (bot.ai_api_key) {
      apiKey = bot.ai_api_key;
      model = bot.ai_model ?? "gpt-4o-mini";
      baseUrl = bot.ai_base_url ?? getDefaultBaseUrl(bot.ai_provider ?? "openai");
    } else {
      const platformConfig = await getPlatformAIKey(supabase);
      if (!platformConfig) {
        await sendTelegramMessage(
          bot.bot_token,
          chatId,
          "⚠️ AI chưa được cấu hình. Admin vui lòng thiết lập API key trong phần cài đặt bot.",
        );
        return;
      }
      apiKey = platformConfig.apiKey;
      model = platformConfig.model;
      baseUrl = platformConfig.baseUrl;
    }

    const { data: history } = await supabase
      .from("bot_conversations")
      .select("role, content")
      .eq("branch_bot_id", bot.id)
      .eq("telegram_chat_id", String(chatId))
      .order("created_at", { ascending: false })
      .limit(10);

    const recentHistory: AIMessage[] = (history ?? [])
      .reverse()
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    const systemContent = await buildBranchContext(
      supabase,
      bot.branch_id,
      bot.ai_system_prompt ?? null,
    );

    const messages: AIMessage[] = [
      { role: "system", content: systemContent },
      ...recentHistory,
      { role: "user", content: message.text ?? "" },
    ];

    const { content: reply, tokensUsed } = await callAI(apiKey, baseUrl, model, messages);

    await sendTelegramMessage(bot.bot_token, chatId, reply);

    await supabase.from("bot_conversations").insert([
      {
        branch_bot_id: bot.id,
        telegram_chat_id: String(chatId),
        telegram_user_id: String(message.from?.id ?? ""),
        telegram_username: message.from?.username ?? message.from?.first_name ?? "",
        role: "user",
        content: message.text ?? "",
        tokens_used: 0,
      },
      {
        branch_bot_id: bot.id,
        telegram_chat_id: String(chatId),
        role: "assistant",
        content: reply,
        tokens_used: tokensUsed,
      },
    ]);
  } catch (e) {
    console.error("AI chat error:", e);
    try {
      await sendTelegramMessage(
        bot.bot_token,
        chatId,
        "⚠️ Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.",
      );
    } catch {
      // Ignore
    }
  }
}
