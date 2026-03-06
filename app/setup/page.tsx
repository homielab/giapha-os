import Footer from "@/components/Footer";
import { checkMigrationStatus } from "@/utils/checkMigrations";
import { promises as fs } from "fs";
import { ArrowLeft, CheckCircle2, Database, Play, XCircle } from "lucide-react";
import Link from "next/link";
import path from "path";
import CollapsibleSection from "./CollapsibleSection";
import CopyButton from "./CopyButton";

export default async function SetupPage() {
  let schemaContent = "";
  try {
    const schemaPath = path.join(process.cwd(), "docs", "schema.sql");
    schemaContent = await fs.readFile(schemaPath, "utf-8");
  } catch (error) {
    console.error("Error reading schema.sql:", error);
    schemaContent =
      "-- Lỗi: Không thể đọc file docs/schema.sql. Vui lòng kiểm tra lại mã nguồn.";
  }

  const migrations = await checkMigrationStatus();
  const installedCount = migrations.filter((m) => m.exists).length;
  const missingMigrations = migrations.filter((m) => !m.exists);
  const missingSql = missingMigrations.map((m) => `-- ${m.name}\n${m.sql}`).join("\n\n");
  const allInstalled = missingMigrations.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] select-none selection:bg-amber-200 selection:text-amber-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none flex justify-center">
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-300/20 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[0%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-teal-200/20 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-12 relative z-10 w-full max-w-5xl mx-auto">
        {/* Header card */}
        <div className="w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-stone-200 relative overflow-hidden mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
              <Database className="size-8" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Thiết lập cơ sở dữ liệu
              </h2>
              <p className="text-stone-500 font-medium mt-1">
                Kiểm tra trạng thái schema Supabase của bạn
              </p>
            </div>
          </div>

          {/* Summary banner */}
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border font-semibold text-sm mb-8 ${
              allInstalled
                ? "bg-teal-50 border-teal-200 text-teal-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {allInstalled ? (
              <CheckCircle2 className="size-5 text-teal-600 shrink-0" />
            ) : (
              <XCircle className="size-5 text-amber-500 shrink-0" />
            )}
            <span>
              {installedCount}/{migrations.length} bảng đã được tạo
              {allInstalled
                ? " — Database đã sẵn sàng! 🎉"
                : ` — Còn ${missingMigrations.length} bảng chưa được tạo`}
            </span>
          </div>

          {/* Migration status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {migrations.map((m) => (
              <div
                key={m.table}
                className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${
                  m.exists
                    ? "bg-teal-50/60 border-teal-200"
                    : "bg-amber-50/60 border-amber-200"
                }`}
              >
                {m.exists ? (
                  <CheckCircle2 className="size-5 text-teal-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800 text-sm leading-tight">
                    {m.name}
                  </p>
                  <p className="text-stone-500 text-xs mt-0.5 leading-snug">
                    {m.description}
                  </p>
                  <span
                    className={`inline-block mt-1.5 text-xs font-mono px-2 py-0.5 rounded-md ${
                      m.exists
                        ? "bg-teal-100 text-teal-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.exists ? "✅ Đã cài đặt" : "⚠️ Chưa cài đặt"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Missing SQL section */}
          {!allInstalled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                  <Play className="size-4 text-amber-500" />
                  SQL còn thiếu — chạy trong Supabase SQL Editor
                </h3>
                <CopyButton content={missingSql} />
              </div>
              <div className="border border-stone-200 rounded-2xl overflow-hidden bg-[#1e1e1e]">
                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-stone-700">
                  <span className="size-3 rounded-full bg-red-500/70 inline-block" />
                  <span className="size-3 rounded-full bg-yellow-500/70 inline-block" />
                  <span className="size-3 rounded-full bg-green-500/70 inline-block" />
                  <span className="text-stone-400 text-xs font-mono ml-2">
                    missing-tables.sql
                  </span>
                </div>
                <div className="p-4 overflow-y-auto max-h-[400px] custom-scrollbar">
                  <pre className="text-xs sm:text-sm font-mono text-stone-300 leading-relaxed whitespace-pre">
                    <code>{missingSql}</code>
                  </pre>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-stone-600 text-sm bg-stone-50 border border-stone-200 rounded-2xl p-5">
                <li className="leading-relaxed">
                  Bấm nút <strong className="text-indigo-600">Copy Mã SQL</strong> ở trên để sao chép SQL còn thiếu.
                </li>
                <li className="leading-relaxed">
                  Mở{" "}
                  <a
                    href="https://supabase.com/dashboard/project/_/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 font-semibold hover:underline"
                  >
                    Supabase SQL Editor
                  </a>{" "}
                  trong dự án của bạn.
                </li>
                <li className="leading-relaxed">
                  <strong>Dán (Paste)</strong> mã vừa copy và bấm <strong>RUN</strong>.
                </li>
                <li className="leading-relaxed">
                  Quay lại đây và <strong>tải lại trang</strong> để kiểm tra lại trạng thái.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Collapsible full schema */}
        <div className="w-full">
          <CollapsibleSection title="📄 Xem toàn bộ schema (docs/schema.sql)">
            <div className="bg-[#1e1e1e] flex flex-col max-h-[500px]">
              <div className="p-4 overflow-y-auto flex-grow custom-scrollbar">
                <pre className="text-xs sm:text-sm font-mono text-stone-300 leading-relaxed whitespace-pre">
                  <code>{schemaContent}</code>
                </pre>
              </div>
              <div className="bg-[#2d2d2d] px-4 py-3 border-t border-stone-700 flex items-center justify-between">
                <span className="text-stone-400 text-xs font-mono">
                  docs/schema.sql
                </span>
                <CopyButton content={schemaContent} />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-stone-500 hover:text-stone-900 font-semibold text-sm transition-all duration-300 bg-white/60 px-5 py-2.5 rounded-full shadow-sm border border-stone-200 hover:border-stone-300 hover:shadow-md"
      >
        <ArrowLeft className="size-4" />
        Quay lại Đăng nhập
      </Link>

      <Footer className="bg-transparent border-none mt-auto relative z-10" />
    </div>
  );
}
