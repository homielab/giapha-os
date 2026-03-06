"use client";

import { Check, Copy, Eye, EyeOff, ExternalLink, Key, RefreshCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { regenerateApiKey, toggleApiKey } from "./actions";

interface ApiKeySettingsProps {
  initialEnabled: boolean;
  initialApiKey: string | null;
}

export default function ApiKeySettings({
  initialEnabled,
  initialApiKey,
}: ApiKeySettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [revealed, setRevealed] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 12)}${"•".repeat(Math.max(0, apiKey.length - 16))}${apiKey.slice(-4)}`
    : null;

  const handleToggle = useCallback(async () => {
    setToggling(true);
    setError(null);
    try {
      const next = !enabled;
      const newKey = await toggleApiKey(next);
      setEnabled(next);
      if (newKey) setApiKey(newKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setToggling(false);
    }
  }, [enabled]);

  const handleRegenerate = useCallback(async () => {
    if (
      !confirm(
        "Tạo API key mới sẽ vô hiệu hoá key cũ. Các ứng dụng đang dùng key cũ sẽ bị lỗi. Bạn có chắc không?",
      )
    )
      return;
    setRegenerating(true);
    setError(null);
    try {
      const newKey = await regenerateApiKey();
      setApiKey(newKey);
      setRevealed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setRegenerating(false);
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [apiKey]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Key className="size-4 text-stone-500" />
            <h2 className="text-base font-semibold text-stone-900">
              API Key (Tích hợp bên ngoài)
            </h2>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            Cho phép ứng dụng bên ngoài đọc dữ liệu gia phả qua REST API.
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-pressed={enabled}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 ${
            enabled ? "bg-amber-500" : "bg-stone-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {enabled && apiKey && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <Key className="size-4 text-stone-400 shrink-0" />
            <span className="flex-1 text-sm text-stone-700 font-mono truncate">
              {revealed ? apiKey : maskedKey}
            </span>
            <button
              onClick={() => setRevealed((v) => !v)}
              className="shrink-0 p-1 rounded hover:bg-stone-200 transition-colors"
              title={revealed ? "Ẩn key" : "Hiện key"}
            >
              {revealed ? (
                <EyeOff className="size-4 text-stone-500" />
              ) : (
                <Eye className="size-4 text-stone-500" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Đã sao chép!" : "Sao chép key"}
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${regenerating ? "animate-spin" : ""}`}
              />
              Tạo API key mới
            </button>

            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors"
            >
              <ExternalLink className="size-4" />
              Xem tài liệu API
            </a>
          </div>

          <div className="text-xs text-stone-400 space-y-1">
            <p>
              Sử dụng header:{" "}
              <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">
                Authorization: Bearer {revealed ? apiKey : "<api-key>"}
              </code>
            </p>
            <p>
              Base URL:{" "}
              <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">
                /api/v1
              </code>
            </p>
          </div>
        </div>
      )}

      {enabled && !apiKey && (
        <p className="text-sm text-stone-400 italic">
          Đang tạo API key...
        </p>
      )}

      {!enabled && (
        <p className="text-sm text-stone-400 italic">
          Bật API để tạo và quản lý API key.
        </p>
      )}
    </div>
  );
}
