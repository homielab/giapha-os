<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Phả OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Phả OS (Gia Phả Open Source)

[Tiếng Việt](README.md) | [English](README.en.md)

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
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng.
- **Bảo mật**: Phân quyền (Admin, Editor, Member) và bảo vệ dữ liệu bằng Supabase.
- **Đa thiết bị**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại.

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Tài khoản: `giaphaos@homielab.com`
- Mật khẩu: `giaphaos`

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
4. Vào **Project → Connect** hoặc **Project Settings → API Keys** để lấy:
   - `Project URL`
   - `Publishable key` (bắt đầu bằng `sb_publishable_`; project cũ có thể hiển thị key `anon`)
   - `Secret key` cho server (bắt đầu bằng `sb_secret_`) nếu cần gửi email thông báo và quản trị server. Project cũ có thể dùng key `service_role` trong tab **Legacy API Keys**.

---

## Cách 1: Deploy nhanh lên Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (hoặc key `anon` trong **Legacy API Keys**)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` để bật SSO; đặt `true` để ẩn SSO khi chưa cấu hình
   - `APP_URL` = URL public của ứng dụng, ví dụ `https://giapha-os.vercel.app`
   - `SUPABASE_SERVICE_ROLE_KEY` = **Secret key** trong **Project Settings → API Keys → Secret keys**. Nếu project dùng giao diện cũ, vào tab **Legacy API Keys** và copy key `service_role`. Đây là key có quyền cao, chỉ lưu ở Vercel server environment; tuyệt đối không dùng publishable/anon key cho biến này và không đặt tên biến với tiền tố `NEXT_PUBLIC_`.
   - `SUPABASE_DB_URL` = PostgreSQL connection string trong **Project Settings → Database → Connection Pooling** (Session mode, chỉ lưu ở Vercel server environment). Biến này cho phép admin kiểm tra/chạy migration ngay trong Dashboard.
   - `RESEND_API_KEY` = API key của [Resend](https://resend.com)
   - `RESEND_FROM_EMAIL` = địa chỉ gửi đã xác minh domain trên Resend, ví dụ `Gia Phả OS <no-reply@your-domain.com>`
   - `ADMIN_NOTIFICATION_EMAIL` = tuỳ chọn; email nhận thông báo. Nếu bỏ trống, hệ thống tự gửi tới email của các admin đang hoạt động
4. Nhấn **Deploy** và chờ 2 -> 3 phút.

Bạn sẽ có một đường link website để sử dụng ngay.

> **Nếu đang nâng cấp hệ thống đã có dữ liệu:** chỉ cần mở Supabase Dashboard → SQL Editor, bấm **Copy toàn bộ SQL** ở trang `/setup`, dán và chạy một lần. Bundle này bao gồm schema và tất cả migration theo đúng thứ tự, đồng thời có thể chạy lặp lại an toàn. Không cần copy hoặc chạy từng file riêng lẻ. Các tài khoản đang hoạt động được giữ nguyên; chỉ tài khoản đăng ký mới ở trạng thái chờ duyệt.

---

## Cách 2: Chạy trên máy cá nhân

Yêu cầu: máy đã cài [Node.js](https://nodejs.org/en) và [Bun](https://bun.sh/)

1. Clone hoặc tải project về máy.
2. Đổi tên file `.env.example` thành `.env.local`.
3. Mở file `.env.local` và điền các giá trị đã lưu ở **bước 1**.

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
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
- Các tài khoản đăng ký sau sẽ mặc định là **member** và ở trạng thái **chờ admin duyệt**.

### Thông báo và duyệt tài khoản mới

Sau khi người dùng xác nhận email, tài khoản vẫn giữ trạng thái **chờ duyệt**. Hệ thống gửi email cho admin kèm liên kết duyệt một lần, có hiệu lực 7 ngày. Admin cũng có thể đăng nhập ứng dụng và duyệt tại **Quản lý người dùng**.

Để bật email thông báo trên Vercel, khai báo `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` và `RESEND_FROM_EMAIL`. `ADMIN_NOTIFICATION_EMAIL` là tuỳ chọn; nếu không khai báo, hệ thống sẽ tự lấy email từ các tài khoản admin đang hoạt động. Secret key/service role key có thể bỏ qua Row Level Security (RLS), vì vậy chỉ được lưu ở server và không được đưa vào source code, trình duyệt hoặc Git. Xem thêm [hướng dẫn API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

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
   - Hoặc tối thiểu: `https://giapha-os.vercel.app/auth/callback` và `http://localhost:3000/auth/callback`
5. Nhấn **Save** và thử lại.

> **Lưu ý:** Thay `giapha-os.vercel.app` bằng domain thực tế của bạn. Nếu dùng domain tùy chỉnh, hãy thêm cả domain đó vào danh sách.

### Đăng nhập bằng Google và Facebook

Màn hình đăng nhập đã hỗ trợ Google và Facebook thông qua Supabase Auth. Để bật hai nút này:

1. Vào Supabase Dashboard → **Authentication → Sign In / Providers** và bật Google hoặc Facebook.
2. Tạo OAuth app tương ứng trên Google Cloud Console/Facebook Developers.
3. Trong cấu hình OAuth app, đặt callback URL do Supabase cung cấp, có dạng:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Trong Supabase → **Authentication → URL Configuration**, thêm callback của ứng dụng:
   `https://<domain-cua-ban>/auth/callback`

Tài khoản đăng ký bằng SSO cũng được tạo ở trạng thái **chờ admin duyệt**, giống đăng ký bằng email. Xem thêm hướng dẫn chính thức cho [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) và [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

Nếu chưa cấu hình SSO, đặt `NEXT_PUBLIC_DISABLE_SSO=true` trong biến môi trường của Vercel rồi deploy lại. Nếu không khai báo biến này, ứng dụng cũng mặc định ẩn SSO để tránh hiển thị chức năng chưa sẵn sàng. Khi đó người dùng sẽ thấy thông báo kèm link tới phần hướng dẫn này. Vì đây là biến `NEXT_PUBLIC_*`, cần build/deploy lại sau khi thay đổi.

### Nâng cấp hệ thống trong Dashboard

Admin có thể mở mục **Nâng cấp hệ thống** trong menu quản trị để kiểm tra version source code trên GitHub và version database, sau đó chạy các migration còn thiếu. Nếu source code hiện tại cũ hơn version mới nhất trên GitHub, hệ thống sẽ yêu cầu cập nhật source code trước khi cho phép chạy migration. Tính năng migration trực tiếp chỉ hoạt động khi đã cấu hình `SUPABASE_DB_URL` ở server. Nếu chưa cấu hình, trang `/dashboard/upgrade` vẫn cho phép copy SQL bundle tại `/setup` để chạy thủ công.

### Hướng dẫn cập nhật source code

Khi trang `/dashboard/upgrade` thông báo source code đang cũ, hãy cập nhật **toàn bộ source code** lên version mới nhất. Không chỉ sửa số `version` trong `package.json` để bỏ qua cảnh báo, vì migration có thể yêu cầu các thay đổi tương ứng trong code.

**Nếu deploy trên Vercel:**

1. Kiểm tra project Vercel đang liên kết đúng repository `homielab/giapha-os` và branch cần deploy.
2. Đồng bộ branch đó với code mới nhất trên GitHub. Nếu cập nhật bằng Git local:

   ```bash
   git fetch origin
   git pull --ff-only origin main
   git push origin main
   ```

3. Chờ Vercel build/deploy hoàn tất. Nếu Vercel không tự deploy, vào **Deployments** và chọn **Redeploy** deployment mới nhất.
4. Mở lại `/dashboard/upgrade`, bấm **Kiểm tra lại** và xác nhận version hiện tại không thấp hơn version trên GitHub.

**Nếu chạy local hoặc self-host:**

```bash
git fetch origin
git pull --ff-only origin main
bun install
bun run build
```

Sau đó khởi động lại ứng dụng bằng lệnh đang dùng, ví dụ `bun run start`. Khi source code đã cập nhật, admin có thể quay lại `/dashboard/upgrade` để chạy migration database. Nên sao lưu database trước khi nâng cấp; nếu chưa cấu hình `SUPABASE_DB_URL`, dùng SQL bundle tại `/setup` theo hướng dẫn ở trên.

---

## Phân quyền người dùng (User Roles)

Hệ thống có 3 cấp độ phân quyền để dễ dàng quản lý ai được phép cập nhật gia phả:

1. **Admin (Quản trị viên):** Có toàn quyền đối với hệ thống.
2. **Editor (Biên soạn):** Cho phép thêm, sửa, xóa thông tin hồ sơ và các mối quan hệ.
3. **Member (Thành viên):** Chỉ có thể xem sơ đồ gia phả và các thống kê trực quan.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn.

Trước khi gửi pull request, hãy chạy:

```bash
bun run test          # unit test (bun test) cho các hàm trong utils/
bun run lint
bun run format:check
```

Test đặt cạnh file được kiểm tra (`utils/gedcom.ts` → `utils/gedcom.test.ts`). Thay đổi đáng chú ý ghi vào [CHANGELOG.md](CHANGELOG.md), mục `## [Unreleased]`.

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong tài khoản Supabase của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.

- **Demo công khai:** Trang demo tại `giapha-os.homielab.com` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới [giấy phép MIT](LICENSE). Copyright (c) 2026 HomieLab.
