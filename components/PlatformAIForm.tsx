"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Save, ExternalLink } from "lucide-react";

type PlatformProvider = "openai" | "anthropic" | "openrouter" | "custom";

const PROVIDER_OPTIONS: { value: PlatformProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "custom", label: "Custom / LiteLLM" },
];

const DEFAULT_BASE_URLS: Record<PlatformProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  custom: "",
};

const MODEL_EXAMPLES: Record<PlatformProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  openrouter: "openai/gpt-4o-mini",
  custom: "your-model-name",
};

const API_KEY_LINKS: Record<PlatformProvider, { label: string; url: string } | null> = {
  openai: { label: "OpenAI API Keys", url: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic Console", url: "https://console.anthropic.com/" },
  openrouter: { label: "OpenRouter Keys", url: "https://openrouter.ai/settings/keys" },
  custom: null,
};

interface PlatformAIFormProps {
  initialApiKey: string;
  initialModel: string;
  initialBaseUrl: string;
}

export default function PlatformAIForm({
  initialApiKey,
  initialModel,
  initialBaseUrl,
}: PlatformAIFormProps) {
  function detectProvider(baseUrl: string): PlatformProvider {
    if (baseUrl.includes("anthropic")) return "anthropic";
    if (baseUrl.includes("openrouter")) return "openrouter";
    if (baseUrl.includes("openai") || !baseUrl) return "openai";
    return "custom";
  }

  const [provider, setProvider] = useState<PlatformProvider>(detectProvider(initialBaseUrl));
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [model, setModel] = useState(initialModel);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [showKey, setShowKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showBaseUrl = provider === "custom";

  function handleProviderChange(p: PlatformProvider) {
    setProvider(p);
    if (p !== "custom") {
      setBaseUrl(DEFAULT_BASE_URLS[p]);
    }
    setModel("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");

      // Use the existing Next.js API or call a server action
      // We'll POST to a dedicated route
      const res = await fetch("/api/admin/platform-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_ai_api_key: apiKey,
          platform_ai_model: model || MODEL_EXAMPLES[provider],
          platform_ai_base_url: showBaseUrl ? baseUrl : DEFAULT_BASE_URLS[provider],
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Lưu thất bại.");
      } else {
        setSuccess("✅ Đã lưu cài đặt platform AI.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const keyLink = API_KEY_LINKS[provider];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-5 shadow-sm">
      <h2 className="font-semibold text-stone-800 text-sm">Cấu hình API Key mặc định</h2>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">AI Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as PlatformProvider)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">API Key</label>
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
        {keyLink && (
          <p className="mt-1 text-xs text-stone-500">
            Lấy key tại{" "}
            <a
              href={keyLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
            >
              {keyLink.label} <ExternalLink className="size-3" />
            </a>
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={MODEL_EXAMPLES[provider]}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
      </div>

      {/* Custom base URL */}
      {showBaseUrl && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Base URL</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:4000/v1"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
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

      <button
        onClick={handleSave}
        disabled={saving || !apiKey}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Lưu cài đặt
      </button>
    </div>
  );
}
