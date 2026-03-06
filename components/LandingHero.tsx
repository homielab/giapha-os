"use client";

import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

interface LandingHeroProps {
  siteName: string;
}

export default function LandingHero({ siteName }: LandingHeroProps) {
  return (
    <>
      <motion.div
        className="max-w-5xl text-center space-y-12 w-full relative z-10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div
          className="space-y-6 sm:space-y-8 flex flex-col items-center"
          variants={fadeIn}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-amber-800 bg-white/60 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-amber-200/50 relative overflow-hidden group"
          >
            <Sparkles className="size-4 text-amber-500" />
            Nền tảng gia phả hiện đại & bảo mật
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-serif font-bold text-stone-900 tracking-tight leading-[1.1] max-w-4xl">
            <span className="block">{siteName}</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-light">
            Gìn giữ và lưu truyền những giá trị, cội nguồn và truyền thống tốt
            đẹp của dòng họ cho các thế hệ mai sau.
          </p>
        </motion.div>

        <motion.div
          className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center w-full px-4 sm:px-0 relative"
          variants={fadeIn}
        >
          {/* Subtle glow behind the button */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-16 bg-amber-500/30 blur-2xl rounded-full z-0 hidden sm:block"></div>

          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-white bg-stone-900 border border-stone-800 hover:bg-stone-800 hover:border-stone-700 rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:shadow-stone-900/20 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center gap-3">
              Đăng nhập để xem thông tin
              <ArrowRight className="size-5 group-hover:translate-x-1.5 transition-transform" />
            </span>
          </Link>

          <a
            href="https://giapha-os-rose.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-semibold text-stone-700 bg-white border border-stone-200 hover:border-amber-300 hover:text-amber-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto"
          >
            Xem Demo
            <ArrowRight className="size-5 group-hover:translate-x-1.5 transition-transform opacity-60" />
          </a>
        </motion.div>

        <motion.div
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left  border-t border-stone-200/50 relative"
          variants={staggerContainer}
        >
          {[
            {
              icon: <Users className="size-6 text-amber-700" />,
              title: "Quản lý Thành viên",
              desc: "Cập nhật thông tin chi tiết, tiểu sử và hình ảnh của từng thành viên trong dòng họ một cách nhanh chóng và bảo mật.",
            },
            {
              icon: <Network className="size-6 text-amber-700" />,
              title: "Sơ đồ Sáng tạo",
              desc: "Xem trực quan sơ đồ phả hệ, thế hệ và mối quan hệ gia đình với giao diện cây hiện đại, dễ thao tác.",
            },
            {
              icon: <ShieldCheck className="size-6 text-amber-700" />,
              title: "Bảo mật Tối đa",
              desc: "Dữ liệu riêng tư như số điện thoại, quê quán được phân quyền chặt chẽ, bảo vệ an toàn trên hệ thống đám mây.",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className="bg-white/70 backdrop-blur-xl p-8 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:bg-white transition-all duration-500 flex flex-col items-start group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-amber-100/50 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="p-3.5 bg-white rounded-2xl mb-6 shadow-sm ring-1 ring-stone-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 relative z-10">
                {feature.icon}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-stone-800 mb-3 font-serif relative z-10 group-hover:text-amber-900 transition-colors">
                {feature.title}
              </h3>
              <p className="text-stone-600 text-base leading-relaxed relative z-10">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </>
  );
}
