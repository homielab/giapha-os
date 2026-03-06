# Gia Phả OS (Gia Phả Open Source)

Đây là mã nguồn mở cho ứng dụng quản lý gia phả dòng họ, cung cấp giao diện trực quan để xem sơ đồ phả hệ, quản lý thành viên và tìm kiếm danh xưng.

Dự án ra đời từ nhu cầu thực tế: cần một hệ thống Cloud để con cháu ở nhiều nơi có thể cùng cập nhật thông tin (kết hôn, sinh con...), thay vì phụ thuộc vào một máy cục bộ. Việc tự triển khai mã nguồn mở giúp gia đình bạn nắm trọn quyền kiểm soát dữ liệu nhạy cảm, thay vì phó mặc cho các dịch vụ bên thứ ba. Ban đầu mình chỉ làm cho gia đình sử dụng, nhưng vì được nhiều người quan tâm nên mình quyết định chia sẻ công khai.

Phù hợp với người Việt Nam.

## Mục lục

- [Các tính năng chính](#các-tính-năng-chính)
- [Demo](#demo)
- [Hình ảnh Giao diện](#hình-ảnh-giao-diện)
- [Cài đặt và Chạy dự án](#cài-đặt-và-chạy-dự-án)
  - [Cách 1: Deploy nhanh lên Vercel](#cách-1-deploy-nhanh-lên-vercel)
  - [Cách 2: Chạy trên máy cá nhân](#cách-2-chạy-trên-máy-cá-nhân)
- [Tài khoản đầu tiên](#tài-khoản-đầu-tiên)
- [Xử lý lỗi khi đăng ký](#xử-lý-lỗi-khi-đăng-ký)
- [Phân quyền người dùng (User Roles)](#phân-quyền-người-dùng-user-roles)
- [Đóng góp (Contributing)](#đóng-góp-contributing)
- [Tuyên bố từ chối trách nhiệm & Quyền riêng tư](#tuyên-bố-từ-chối-trách-nhiệm--quyền-riêng-tư)
- [Giấy phép (License)](#giấy-phép-license)

## Các tính năng chính

- **Sơ đồ trực quan**: Xem gia phả dạng Cây (Tree) và Sơ đồ tư duy (Mindmap).
- **Tìm danh xưng**: Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...) chính xác.
- **Quản lý thành viên**: Lưu trữ thông tin, avatar và sắp xếp thứ tự nhánh dòng họ.
- **Quản lý quan hệ**: Quản lý các mối quan hệ trong gia phả (hỗ trợ các trường hợp đặc biệt như đa thê, đa phu,...).
- **Thống kê & Sự kiện**: Theo dõi ngày giỗ và các chỉ số nhân khẩu học của dòng họ.
- **Quản lý mộ phần** *(v1.1)*: Lưu thông tin mộ, toạ độ GPS, ảnh mộ 360°, dòng thời gian an táng, nhắc Tết Thanh Minh.
- **Bản đồ mộ phần** *(v1.1)*: Xem vị trí toàn bộ mộ trên bản đồ, nhóm theo nghĩa trang.
- **Trang tưởng niệm công khai** *(v1.1)*: Trang web công khai cho người đã mất, chia sẻ qua QR code.
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng.
- **Bảo mật**: Phân quyền (Admin, Editor, Member) và bảo vệ dữ liệu bằng Supabase.
- **Đa thiết bị**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại.
- **Đa ngôn ngữ** *(v1.5)*: Giao diện hỗ trợ Tiếng Việt, English, 中文 (next-intl)
- **Bot Telegram / Zalo** *(v1.5)*: Mỗi nhánh họ có bot riêng — nhắc giỗ tự động, chat AI, tìm kiếm thành viên
- **Nhắc Nhở Tự Động** *(v1.5)*: Cron job hàng ngày — nhắc lịch giỗ 3 lần (7 ngày/3 ngày/1 ngày trước), sinh nhật, sự kiện họ tộc
- **Tích Hợp AI** *(v1.5)*: Bot chat AI dùng OpenAI, Anthropic, OpenRouter hoặc LiteLLM. Hỗ trợ BYOK (tự nhập key riêng)
- **Quản Lý Thuê Bao** *(v1.5)*: Super Admin quản lý plan Free/Pro/Enterprise cho từng gia đình

## Demo

- Demo: [giapha-os-rose.vercel.app](https://giapha-os-rose.vercel.app)
- Tài khoản: `demo@example.com`
- Mật khẩu: `demo@123`

## Hình ảnh Giao diện

![Dashboard](docs/screenshots/dashboard.png)

![Danh sách](docs/screenshots/list.png)

![Sơ đồ cây](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Mindmap](docs/screenshots/stats.png)

![Mindmap](docs/screenshots/kinship.png)

![Mindmap](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Cài đặt và Chạy dự án

Chỉ cần khoảng 10 -> 15 phút là bạn có thể tự dựng hệ thống gia phả cho gia đình mình.

---

## 1. Tạo Database (Miễn phí với Supabase)

1. Tạo tài khoản miễn phí tại https://github.com nếu chưa có.
2. Tạo tài khoản miễn phí tại https://supabase.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
3. Tạo **New Project**. Đợi khoảng 1 -> 2 phút để hệ thống khởi tạo xong.
4. Vào **Project Settings → API**, giữ lại 2 giá trị này để dùng ở bước tiếp theo:
   - `Project URL`
   - `Project API Keys`

---

## Cách 1: Deploy nhanh lên Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fminhtuancn%2Fgiapha-os&env=SITE_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Project API Keys`
4. Nhấn **Deploy** và chờ 2 -> 3 phút.

Bạn sẽ có một đường link website để sử dụng ngay.

---

## Cách 2: Chạy trên máy cá nhân

Yêu cầu: máy đã cài [Node.js](https://nodejs.org/en) và [Bun](https://bun.sh/)

1. Clone hoặc tải project về máy.
2. Đổi tên file `.env.example` thành `.env.local`.
3. Mở file `.env.local` và điền các giá trị đã lưu ở **bước 1**.

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"

# Dành cho cron job nhắc nhở (tuỳ chọn, khuyến khích đặt trong môi trường production)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
CRON_SECRET="your-random-secret"

# AI Bot (tuỳ chọn)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
CRON_SECRET="your-random-secret-here"
SITE_URL="https://your-domain.com"
```

4. Cài thư viện

```bash
bun install
```

5. Chạy dự án

```bash
bun run dev
```

Mở trình duyệt và truy cập: `http://localhost:3000`

---

## Tài khoản đầu tiên

- Đăng ký tài khoản mới khi vào web lần đầu.
- Người đăng ký đầu tiên sẽ tự động có quyền **admin**.
- Các tài khoản đăng ký sau sẽ mặc định là **member**.

## Xử lý lỗi khi đăng ký

Sau khi cài đặt xong, nếu bạn gặp lỗi `Failed to fetch` khi đăng ký:

**Nguyên nhân:** Supabase chặn các request từ domain chưa được thêm vào danh sách cho phép.

**Cách khắc phục:**

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn Project của bạn.
2. Vào **Authentication → URL Configuration**.
3. Ở mục **Site URL**, điền URL chính của ứng dụng, ví dụ:
   - Vercel: `https://giapha-os.vercel.app`
   - Máy cá nhân: `http://localhost:3000`
4. Ở mục **Redirect URLs**, nhấn **Add URL** và thêm:
   - `https://giapha-os.vercel.app/**`
   - `http://localhost:3000/**` (nếu chạy local)
5. Nhấn **Save** và thử lại.

> **Lưu ý:** Thay `giapha-os.vercel.app` bằng domain thực tế của bạn. Nếu dùng domain tùy chỉnh, hãy thêm cả domain đó vào danh sách.

---

## Phân quyền người dùng (User Roles)

Hệ thống có 3 cấp độ phân quyền để dễ dàng quản lý ai được phép cập nhật gia phả:

1. **Admin (Quản trị viên):** Có toàn quyền đối với hệ thống.
2. **Editor (Biên soạn):** Cho phép thêm, sửa, xóa thông tin hồ sơ và các mối quan hệ.
3. **Member (Thành viên):** Chỉ có thể xem sơ đồ gia phả và các thống kê trực quan.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn.

**Nhà phát triển:** Minh Tuấn — Ninh Bình, Việt Nam  
**Email:** [vietkeynet@gmail.com](mailto:vietkeynet@gmail.com)  
**WhatsApp:** [0912 537 003](https://wa.me/84912537003)  
**GitHub:** [minhtuancn/giapha-os](https://github.com/minhtuancn/giapha-os)

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong tài khoản Supabase của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.

- **Demo công khai:** Trang demo tại `giapha-os-rose.vercel.app` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới giấy phép MIT.
