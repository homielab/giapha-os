"use client";

import { Check, Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { regenerateToken, togglePublicShare } from "./actions";

interface PublicShareSettingsProps {
  initialEnabled: boolean;
  initialToken: string | null;
}

export default function PublicShareSettings({
  initialEnabled,
  initialToken,
}: PublicShareSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [token, setToken] = useState(initialToken);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicUrl =
    typeof window !== "undefined" && token
      ? `${window.location.protocol}//${window.location.host}/public/${token}`
      : token
        ? `/public/${token}`
        : null;

  const handleToggle = useCallback(async () => {
    setToggling(true);
    setError(null);
    try {
      const next = !enabled;
      await togglePublicShare(next);
      setEnabled(next);
      if (next && !token) {
        const newToken = await regenerateToken();
        setToken(newToken);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setToggling(false);
    }
  }, [enabled, token]);

  const handleRegenerate = useCallback(async () => {
    if (!confirm("Tạo link mới sẽ vô hiệu hoá link cũ. Bạn có chắc không?"))
      return;
    setRegenerating(true);
    setError(null);
    try {
      const newToken = await regenerateToken();
      setToken(newToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setRegenerating(false);
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [publicUrl]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            Chia sẻ công khai
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Tạo link để người khác xem gia phả mà không cần đăng nhập.
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

      {enabled && token && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <Link2 className="size-4 text-stone-400 shrink-0" />
            <span className="flex-1 text-sm text-stone-700 font-mono truncate">
              {publicUrl}
            </span>
            <a
              href={publicUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 rounded hover:bg-stone-200 transition-colors"
              title="Mở trong tab mới"
            >
              <ExternalLink className="size-4 text-stone-500" />
            </a>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Đã sao chép!" : "Sao chép link"}
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${regenerating ? "animate-spin" : ""}`}
              />
              Tạo link mới
            </button>
          </div>

          <p className="text-xs text-stone-400">
            Người có link này có thể xem danh sách thành viên gia đình. Thông
            tin nhạy cảm (số điện thoại, địa chỉ, nghề nghiệp) sẽ được ẩn.
          </p>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-stone-400 italic">
          Bật chia sẻ để tạo link công khai.
        </p>
      )}
    </div>
  );
}
