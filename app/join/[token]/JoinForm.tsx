"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { redeemInvitationToken } from "@/app/dashboard/settings/invitations/actions";
import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";

interface Props {
  token: string;
  invitedRole: string;
}

export default function JoinForm({ token, invitedRole }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "success">("info");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await redeemInvitationToken(token, { full_name: fullName, phone_number: phoneNumber });
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  };

  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-stone-800 mb-2">Chào mừng bạn!</h2>
        <p className="text-stone-500 text-sm">
          Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng...
        </p>
        <div className="mt-4 flex justify-center">
          <Loader2 className="size-5 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-3">
          Lời mời · {invitedRole === "editor" ? "Biên tập viên" : "Thành viên"}
        </div>
        <h2 className="text-xl font-bold text-stone-800">Hoàn tất đăng ký</h2>
        <p className="text-stone-500 text-sm mt-1">
          Vui lòng đăng nhập trước, sau đó điền thông tin để kích hoạt tài khoản
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 Hướng dẫn:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700">
          <li>Đăng nhập hoặc tạo tài khoản tại trang đăng nhập</li>
          <li>Quay lại trang này sau khi đăng nhập</li>
          <li>Điền thông tin và nhấn &ldquo;Kích hoạt tài khoản&rdquo;</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Họ và tên
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-700 mb-1">
            Số điện thoại *
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="0912 345 678"
            required
          />
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !phoneNumber}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          {saving ? "Đang kích hoạt..." : "Kích hoạt tài khoản"}
        </button>
      </form>

      <p className="text-center text-xs text-stone-400">
        Chưa có tài khoản?{" "}
        <Link href="/login" className="text-amber-600 hover:underline font-medium">
          Đăng nhập / Tạo tài khoản
        </Link>
      </p>
    </div>
  );
}
