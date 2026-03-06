"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Info, Mail, MapPin, MessageCircle, ShieldAlert, User } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>

      <Link href="/dashboard" className="btn absolute top-6 left-6 z-20">
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20 relative z-10 w-full mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200 mb-8 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100/50 text-amber-700 rounded-2xl">
                <Info className="size-6" />
              </div>
              <h1 className="title">Giới thiệu dự án</h1>
            </div>

            <div className="max-w-none">
              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                <strong className="text-stone-800">Gia Phả OS</strong> là một
                giải pháp mã nguồn mở được thiết kế giúp các dòng họ, gia đình
                tự xây dựng và quản lý cây phả hệ của riêng mình. Dự án giúp bảo
                tồn và truyền đạt lại thông tin cội nguồn một cách trực quan,
                hiện đại, và đặc biệt là an toàn.
              </p>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Tuyên bố từ chối trách nhiệm & Quyền riêng tư
                </h2>
              </div>

              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-[14.5px] leading-relaxed">
                <p className="font-bold text-stone-800 mb-4 bg-white py-2 px-3 rounded-lg border border-stone-200 shadow-sm inline-block">
                  Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ
                  dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.
                </p>

                <ul className="space-y-4 text-stone-600 list-disc pl-5">
                  <li>
                    <strong className="text-stone-800">
                      Tự lưu trữ hoàn toàn (Self-hosted):
                    </strong>{" "}
                    Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên,
                    ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ{" "}
                    <strong className="text-stone-800">
                      trong tài khoản Supabase của chính bạn
                    </strong>
                    . Tác giả dự án không có quyền truy cập vào database đó.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Không thu thập dữ liệu:
                    </strong>{" "}
                    Không có analytics, không có tracking, không có telemetry,
                    không có bất kỳ hình thức thu thập thông tin người dùng nào
                    được tích hợp trong mã nguồn.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Bạn kiểm soát dữ liệu của bạn:
                    </strong>{" "}
                    Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn
                    trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có
                    thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.
                  </li>
                  <li>
                    <strong className="text-stone-800">Demo công khai:</strong>{" "}
                    Trang demo tại{" "}
                    <code className="bg-white border border-stone-200 px-1 py-0.5 rounded text-[13px] text-amber-700">
                      giapha-os-rose.vercel.app
                    </code>{" "}
                    sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người
                    thật. Không nên nhập thông tin cá nhân thật vào trang demo.
                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Liên hệ & Góp ý
                </h2>
              </div>

              <p className="text-stone-600 leading-relaxed text-[15px] mb-6">
                Nếu bạn có bất kỳ thắc mắc, đề xuất tính năng, báo lỗi khi sử
                dụng phần mềm, hoặc muốn thảo luận thì xin vui lòng liên hệ:
              </p>

              {/* Developer card */}
              <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200/60 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <User className="size-5" />
                  </div>
                  <h3 className="font-bold text-stone-800 text-base">Nhà phát triển</h3>
                </div>
                <div className="space-y-3 text-[14.5px]">
                  <div className="flex items-center gap-3 text-stone-700">
                    <span className="font-semibold text-stone-900 w-20">Tên:</span>
                    <span>Minh Tuấn</span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-700">
                    <span className="font-semibold text-stone-900 w-20">Email:</span>
                    <a
                      href="mailto:vietkeynet@gmail.com"
                      className="font-medium text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Mail className="size-3.5" />
                      vietkeynet@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-stone-700">
                    <span className="font-semibold text-stone-900 w-20">WhatsApp:</span>
                    <a
                      href="https://wa.me/84912537003"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-700 hover:text-green-600 transition-colors inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="size-3.5" />
                      0912 537 003
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-stone-700">
                    <span className="font-semibold text-stone-900 w-20">Địa chỉ:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-rose-500" />
                      Ninh Bình, Việt Nam
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-stone-700">
                    <span className="font-semibold text-stone-900 w-20">GitHub:</span>
                    <a
                      href="https://github.com/minhtuancn/giapha-os"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-stone-700 hover:text-amber-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      minhtuancn/giapha-os
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
