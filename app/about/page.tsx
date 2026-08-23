"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Info, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral selection:bg-amber-200 selection:text-amber-900 relative">
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
                <strong className="text-stone-800">Gia Phả OS (Gia Phả Open Source)</strong> là một
                giải pháp mã nguồn mở được thiết kế giúp các dòng họ, gia đình
                tự xây dựng và quản lý cây phả hệ của riêng mình. Dự án giúp bảo
                tồn và truyền đạt lại thông tin cội nguồn một cách trực quan,
                hiện đại, và đặc biệt là an toàn.
              <li>
              Đây là nơi để mỗi thành viên cùng viết và đóng góp câu chuyện về dòng họ. Bạn có thể chia sẻ những điều mình biết về nguồn gốc và quá trình hình thành của dòng họ: quê quán, thủy tổ, các đời tổ tiên, những nhánh họ, nơi sinh sống, những nhân vật và sự kiện đáng nhớ, truyền thống gia đình, nghề nghiệp, những đóng góp cho quê hương và xã hội, hoặc bất kỳ câu chuyện nào mà bạn cho rằng các thế hệ sau nên biết.
Không cần phải viết thật đầy đủ hay chính xác ngay từ đầu. Mỗi người góp một chút thông tin, một câu chuyện, một bức ảnh hay một ký ức sẽ giúp chúng ta từng bước hoàn thiện bức tranh lịch sử của dòng họ.
Hãy viết bằng những gì bạn biết và những gì gia đình mình còn lưu giữ. Những thông tin chưa chắc chắn có thể được ghi chú để các thành viên khác cùng bổ sung, đối chiếu và xác minh.
Lịch sử dòng họ không chỉ được viết bởi một người. Đó là câu chuyện được góp lại từ ký ức của nhiều thế hệ.
Hãy để mỗi người góp một trang, để mai sau con cháu có cả một cuốn lịch sử để tìm về.
              </li> 
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

              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                Nếu bạn có bất kỳ thắc mắc, đề xuất tính năng, báo lỗi khi sử
                dụng phần mềm, hoặc muốn thảo luận thì xin vui lòng gửi email về
                địa chỉ:{` `}
                <a
                  href="mailto:hangvi97@gmail.com"
                  className="font-semibold text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 mt-2"
                >
                  hangvi97@gmail.com
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
