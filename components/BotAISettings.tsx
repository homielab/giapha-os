"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  FlaskConical,
} from "lucide-react";

type AIProvider = "openai" | "anthropic" | "openrouter" | "litellm" | "custom";

interface BotAIConfig {
  id?: string;
  ai_enabled?: boolean;
  ai_provider?: string | null;
  ai_model?: string | null;
  ai_api_key?: string | null;
  ai_base_url?: string | null;
  ai_system_prompt?: string | null;
}

interface BotAISettingsProps {
  branchId: string;
  branchName: string;
  initialBot: BotAIConfig | null;
}

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI (GPT-4, GPT-4o…)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "litellm", label: "LiteLLM (self-hosted)" },
  { value: "custom", label: "Custom / Other" },
];

const MODEL_EXAMPLES: Record<AIProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  openrouter: "openai/gpt-4o-mini",
  litellm: "gpt-4o-mini",
  custom: "your-model-name",
};

const API_KEY_LINKS: Partial<Record<AIProvider, { label: string; url: string }>> = {
  openai: { label: "OpenAI API Keys", url: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic Console", url: "https://console.anthropic.com/" },
  openrouter: { label: "OpenRouter Keys", url: "https://openrouter.ai/settings/keys" },
};

export default function BotAISettings({ branchId, branchName, initialBot }: BotAISettingsProps) {
  const [aiEnabled, setAiEnabled] = useState(initialBot?.ai_enabled ?? false);
  const [provider, setProvider] = useState<AIProvider>(
    (initialBot?.ai_provider as AIProvider) ?? "openai",
  );
  const [model, setModel] = useState(initialBot?.ai_model ?? "");
  const [apiKey, setApiKey] = useState(initialBot?.ai_api_key ?? "");
  const [baseUrl, setBaseUrl] = useState(initialBot?.ai_base_url ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initialBot?.ai_system_prompt ?? "");
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showBaseUrl = provider === "litellm" || provider === "custom";

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/bots/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          ai_enabled: aiEnabled,
          ai_provider: provider,
          ai_model: model || MODEL_EXAMPLES[provider],
          ai_api_key: apiKey || undefined,
          ai_base_url: baseUrl || undefined,
          ai_system_prompt: systemPrompt || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Lưu thất bại.");
      } else {
        setSuccess("✅ Đã lưu cài đặt AI.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      // First save current settings, then send a test ping via a simple fetch
      await handleSave();
      // Quick validation: attempt a direct completion call
      const testApiKey = apiKey;
      const testBaseUrl = (showBaseUrl ? baseUrl : undefined) ?? getDefaultBaseUrl(provider);
      const testModel = model || MODEL_EXAMPLES[provider];

      if (!testApiKey) {
        setSuccess("⚠️ Không có BYOK API key — sẽ dùng platform key khi nhận tin nhắn thực.");
        setTesting(false);
        return;
      }

      const cleanBase = testBaseUrl.replace(/\/$/, "");
      const res = await fetch(`${cleanBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testApiKey}`,
          ...(testBaseUrl.includes("anthropic") ? { "anthropic-version": "2023-06-01" } : {}),
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: "user", content: "Xin chào! Trả lời ngắn gọn bằng tiếng Việt." }],
          max_tokens: 50,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        setError(`❌ AI trả lỗi ${res.status}: ${txt.slice(0, 150)}`);
      } else {
        const data = (await res.json()) as {
          choices?: Array<{ message: { content: string } }>;
        };
        const reply = data.choices?.[0]?.message?.content ?? "(không có phản hồi)";
        setSuccess(`✅ Test thành công! AI trả lời: "${reply.slice(0, 100)}"`);
      }
    } catch (e) {
      setError(`❌ Lỗi kết nối: ${String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800 flex items-center gap-2">
          <Sparkles className="size-4 text-amber-600" />
          Cài đặt AI Chat — {branchName}
        </h2>

        {/* Enable toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-stone-600">Bật AI Chat</span>
          <button
            type="button"
            role="switch"
            aria-checked={aiEnabled}
            onClick={() => setAiEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
              aiEnabled ? "bg-amber-500" : "bg-stone-300"
            }`}
          >
            <span
              className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                aiEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {aiEnabled && (
        <div className="space-y-5">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setModel("");
              }}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={MODEL_EXAMPLES[provider]}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <p className="mt-1 text-xs text-stone-500">
              Ví dụ: <code className="rounded bg-stone-100 px-1">{MODEL_EXAMPLES[provider]}</code>
            </p>
          </div>

          {/* Custom base URL */}
          {showBaseUrl && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Base URL
              </label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:4000/v1"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <p className="mt-1 text-xs text-stone-500">
                URL gốc của LiteLLM/proxy (không cần đường dẫn{" "}
                <code className="rounded bg-stone-100 px-1">/chat/completions</code>)
              </p>
            </div>
          )}

          {/* BYOK API Key */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              API Key (BYOK — tuỳ chọn)
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 pr-10 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                aria-label={showKey ? "Ẩn key" : "Hiện key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Nếu để trống, bot sẽ dùng platform key do super admin cấu hình.
              {API_KEY_LINKS[provider] && (
                <>
                  {" "}
                  Lấy key tại{" "}
                  <a
                    href={API_KEY_LINKS[provider]!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    {API_KEY_LINKS[provider]!.label} <ExternalLink className="size-3" />
                  </a>
                </>
              )}
            </p>
          </div>

          {/* System prompt */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              System Prompt tuỳ chỉnh (tuỳ chọn)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Bạn là trợ lý thân thiện của dòng họ Nguyễn tại Hà Nội. Luôn xưng hô trang trọng với người dùng…"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
            <p className="mt-1 text-xs text-stone-500">
              Thêm hướng dẫn đặc biệt cho bot. Hệ thống sẽ tự động bổ sung thông tin dòng họ.
            </p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <XCircle className="size-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || testing}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          Lưu cài đặt AI
        </button>

        {aiEnabled && (
          <button
            onClick={handleTest}
            disabled={saving || testing}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            Test AI
          </button>
        )}
      </div>
    </div>
  );
}

function getDefaultBaseUrl(provider: AIProvider): string {
  switch (provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    default:
      return "https://api.openai.com/v1";
  }
}
