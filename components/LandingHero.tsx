"use client";

import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Bell,
  Globe,
  Bot,
  MapPin,
  TreeDeciduous,
  CheckCircle,
  Github,
} from "lucide-react";
import Link from "next/link";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

interface LandingHeroProps {
  siteName: string;
  demoUrl?: string;
  showDemo?: boolean;
}

const FEATURES = [
  {
    icon: Network,
    title: "Cây gia phả trực quan",
    desc: "Sơ đồ phả hệ hiện đại, tìm kiếm nhanh, xem theo nhánh, tra cứu quan hệ họ hàng.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Users,
    title: "Hồ sơ thành viên đầy đủ",
    desc: "Tiểu sử, hình ảnh, danh hiệu, nghề nghiệp, thông tin mộ phần và trang tưởng niệm.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Bell,
    title: "Nhắc nhở tự động",
    desc: "Bot Telegram/Zalo nhắc lịch giỗ 3 lần (7/3/1 ngày trước), sinh nhật, sự kiện họ tộc.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Bot,
    title: "AI Chat gia phả",
    desc: "Hỏi bot về dòng họ. Hỗ trợ OpenAI, Anthropic, OpenRouter, LiteLLM hoặc BYOK.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: MapPin,
    title: "Bản đồ mộ phần & GPS",
    desc: "Tọa độ mộ, ảnh 360°, bản đồ nghĩa trang. QR code trang tưởng niệm.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: ShieldCheck,
    title: "Bảo mật & tự lưu trữ",
    desc: "Dữ liệu 100% trong Supabase của bạn. Không tracking. Phân quyền Admin/Editor/Member.",
    color: "text-stone-600",
    bg: "bg-stone-50",
  },
  {
    icon: Globe,
    title: "Đa ngôn ngữ",
    desc: "Giao diện Tiếng Việt, English, 中文. Tự động theo ngôn ngữ trình duyệt.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: TreeDeciduous,
    title: "Mã nguồn mở",
    desc: "100% open source, MIT license. Tự deploy, tuỳ chỉnh theo nhu cầu gia đình.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

const STEPS = [
  { step: "1", title: "Tạo Supabase miễn phí", desc: "Project trên supabase.com, chạy schema.sql." },
  { step: "2", title: "Deploy lên Vercel", desc: "Nhấn Deploy, điền 2 biến env. Xong trong 5 phút." },
  { step: "3", title: "Thêm thành viên", desc: "Thêm tổ tiên đầu tiên, kết nối các quan hệ." },
  { step: "4", title: "Chia sẻ dòng họ", desc: "Mời con cháu, bật trang công khai, cài bot." },
];

export default function LandingHero({ siteName, demoUrl, showDemo }: LandingHeroProps) {
  return (
    <div className="w-full space-y-24 pb-12">
      {/* ── Hero ── */}
      <motion.section
        className="max-w-5xl mx-auto text-center space-y-8 pt-4"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="space-y-6 flex flex-col items-center">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-800 bg-white/70 rounded-full shadow-sm border border-amber-200/60"
          >
            <Sparkles className="size-4 text-amber-500" />
            Nền tảng gia phả hiện đại · Mã nguồn mở · Tự lưu trữ
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold text-stone-900 tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Gìn giữ <span className="text-amber-600">ký ức</span>
            <br />
            truyền lại <span className="text-amber-600">cội nguồn</span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed font-light">
            {siteName} — ứng dụng quản lý gia phả cho người Việt. Cây gia phả, bot nhắc giỗ tự động, AI chat, bản đồ mộ phần. Dữ liệu 100% trong tay bạn.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={fadeUp}
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto justify-center"
          >
            Đăng nhập
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {showDemo && demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-stone-700 bg-white border border-stone-200 hover:border-amber-300 hover:text-amber-700 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto justify-center"
            >
              Xem Demo
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform opacity-60" />
            </a>
          )}

          <a
            href="https://github.com/minhtuancn/giapha-os"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-4 text-base font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Github className="size-5" />
            GitHub
          </a>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-500"
          variants={fadeUp}
        >
          {["✅ MIT License", "🆓 Miễn phí tự host", "🔒 Dữ liệu riêng tư", "🤖 AI Bot", "🌐 Vi/En/中文"].map((item) => (
            <span key={item} className="font-medium">{item}</span>
          ))}
        </motion.div>
      </motion.section>

      {/* ── Features Grid ── */}
      <motion.section
        className="max-w-6xl mx-auto px-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div className="text-center mb-12" variants={fadeUp}>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-3">
            Tất cả tính năng bạn cần
          </h2>
          <p className="text-stone-500 max-w-xl mx-auto">
            Từ cây gia phả, hồ sơ thành viên đến bot tự động và AI — mọi thứ trong một hệ thống.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:bg-white transition-all duration-300 flex flex-col gap-3"
            >
              <div className={`size-10 rounded-xl ${f.bg} flex items-center justify-center`}>
                <f.icon className={`size-5 ${f.color}`} />
              </div>
              <h3 className="font-bold text-stone-800 font-serif leading-snug">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── How It Works ── */}
      <motion.section
        className="max-w-5xl mx-auto px-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.div className="text-center mb-12" variants={fadeUp}>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-3">
            Triển khai trong 15 phút
          </h2>
          <p className="text-stone-500">Chỉ cần Supabase miễn phí + Vercel là đủ.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="flex flex-col gap-3">
              <div className="size-12 rounded-2xl bg-amber-500 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-amber-200">
                {s.step}
              </div>
              <h3 className="font-bold text-stone-800">{s.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Open Source CTA ── */}
      <motion.section
        className="max-w-3xl mx-auto px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <div className="bg-stone-900 rounded-3xl p-8 sm:p-12 text-center text-white space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_400px_at_50%_-30%,#f59e0b33,transparent)] pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <Github className="size-10 mx-auto text-stone-400" />
            <h2 className="text-2xl sm:text-3xl font-serif font-bold">
              Mã nguồn mở — hoàn toàn miễn phí
            </h2>
            <p className="text-stone-400 max-w-lg mx-auto leading-relaxed">
              Tự triển khai, dữ liệu gia đình không qua tay bên thứ ba. MIT License.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href="https://github.com/minhtuancn/giapha-os"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-stone-900 font-bold hover:bg-amber-50 transition-colors"
              >
                <Github className="size-5" />
                Xem trên GitHub
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
              >
                Bắt đầu ngay
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-4 pt-2 text-sm text-stone-500">
              {["Next.js 15", "Supabase", "TypeScript", "Tailwind CSS"].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <CheckCircle className="size-3.5 text-amber-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
