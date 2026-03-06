import { createPublicClient } from "@/utils/supabase/public";
import JoinForm from "./JoinForm";
import { redirect } from "next/navigation";
import config from "@/app/config";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  const supabase = createPublicClient();

  // Verify token is valid
  const { data: inv } = await supabase
    .from("invitations")
    .select("id, branch_id, role, email, max_uses, uses_count, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!inv) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-stone-800 mb-2">Link không hợp lệ</h1>
          <p className="text-stone-500 text-sm mb-6">
            Link mời này không tồn tại hoặc đã bị xóa.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            Đến trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
  const isFull = inv.uses_count >= inv.max_uses;

  if (isExpired || isFull) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-stone-800 mb-2">
            {isExpired ? "Link đã hết hạn" : "Link đã hết lượt sử dụng"}
          </h1>
          <p className="text-stone-500 text-sm mb-6">
            Vui lòng liên hệ quản trị viên để nhận link mời mới.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#fef3c7,transparent)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-stone-800">{config.siteName}</h1>
          <p className="text-stone-500 mt-2 text-sm">Bạn được mời tham gia dòng họ</p>
        </div>
        <JoinForm token={token} invitedRole={inv.role} />
      </div>
    </div>
  );
}
