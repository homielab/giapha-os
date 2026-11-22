# Cài đặt

[Tiếng Việt](cai-dat.md) | [English](../en/install.md) · [← README](../../README.md)

## Cách 1: Cài một chạm trên Vercel (khuyên dùng)

Khoảng 5 phút. Vercel tự tạo database Supabase miễn phí và tự điền mọi cấu hình, bạn không phải chép key nào.

1. Bấm [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&project-name=giapha-os&repository-name=giapha-os&env=SITE_NAME&envDescription=T%C3%AAn+gia+ph%E1%BA%A3+hi%E1%BB%87n+tr%C3%AAn+trang+web%2C+v%C3%AD+d%E1%BB%A5%3A+Gia+ph%E1%BA%A3+h%E1%BB%8D+Nguy%E1%BB%85n&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)
2. Đăng nhập Vercel (nên dùng tài khoản GitHub), chọn nơi lưu source code và nhập `SITE_NAME` = tên gia phả.
3. Ở bước **Supabase**, bấm tạo database mới (gói Free) và chọn vùng gần Việt Nam nhất, ví dụ Singapore.
4. Bấm **Deploy** và chờ 2–3 phút.
5. Mở trang web vừa tạo: trang **Khởi tạo cơ sở dữ liệu** hiện ra. Bấm **Cài database** và chờ vài giây.
6. Đăng ký tài khoản: người đăng ký đầu tiên tự động là **admin** và đăng nhập được ngay, không cần xác nhận email.

### Cho người khác đăng ký

Người đăng ký sau nhận email xác nhận. Để liên kết trong email mở đúng trang của bạn: vào Vercel → project → **Storage** → Supabase → **Open in Supabase**, rồi làm theo [Xử lý lỗi khi đăng ký](#xử-lý-lỗi-khi-đăng-ký) (đặt **Site URL** và **Redirect URLs** là domain Vercel của bạn).

Không cần ai tự đăng ký thì bỏ qua bước này: admin tạo tài khoản cho người nhà trong **Quản lý người dùng**.

### Tuỳ chọn sau khi cài

Thêm trong Vercel → project → **Settings → Environment Variables**, rồi deploy lại:

- `SHORT_NAME`: tên ngắn dưới biểu tượng khi thêm vào màn hình chính (mặc định `Gia Phả`).
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`: email báo admin khi có tài khoản mới chờ duyệt (xem bên dưới).
- `NEXT_PUBLIC_DISABLE_SSO=false`: hiện nút đăng nhập Google/Facebook sau khi cấu hình ([tai-khoan.md](tai-khoan.md#đăng-nhập-bằng-google-và-facebook)).

## Cách 1b: Dùng project Supabase có sẵn

### Bước 1: Tạo Database (miễn phí với Supabase)

1. Tạo tài khoản miễn phí tại https://github.com nếu chưa có.
2. Tạo tài khoản miễn phí tại https://supabase.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
3. Tạo **New Project**. Đợi khoảng 1 -> 2 phút để hệ thống khởi tạo xong.
4. Vào **Project → Connect** hoặc **Project Settings → API Keys** để lấy:
   - `Project URL`
   - `Publishable key` (bắt đầu bằng `sb_publishable_`; project cũ có thể hiển thị key `anon`)
   - `Secret key` cho server (bắt đầu bằng `sb_secret_`) nếu cần gửi email thông báo và quản trị server. Project cũ có thể dùng key `service_role` trong tab **Legacy API Keys**.

### Bước 2: Deploy lên Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,SHORT_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1**:
   - `SITE_NAME` = tên site hiện ở tiêu đề và trang giới thiệu (mặc định `Gia Phả OS`)
   - `SHORT_NAME` = tên ngắn dưới biểu tượng khi thêm vào màn hình chính (mặc định `Gia Phả`)
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (hoặc key `anon` trong **Legacy API Keys**)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` để bật SSO; đặt `true` để ẩn SSO khi chưa cấu hình
   - `APP_URL` = URL public của ứng dụng, ví dụ `https://your-domain.vercel.app` (dùng cho email duyệt tài khoản, link chia sẻ Open Graph, dữ liệu có cấu trúc JSON-LD ở trang chủ và giới thiệu, `sitemap.xml` và `robots.txt`; chỉ lấy phần gốc: thiếu `https://` sẽ tự thêm, đường dẫn phía sau bị bỏ; nếu bỏ trống hoặc không phải địa chỉ http(s), trên Vercel sẽ dùng domain production). Ảnh chia sẻ mạng xã hội là `public/og-image.png` (1200×630), có thể thay bằng ảnh của dòng họ bạn.
   - `SUPABASE_SERVICE_ROLE_KEY` = **Secret key** trong **Project Settings → API Keys → Secret keys**. Nếu project dùng giao diện cũ, vào tab **Legacy API Keys** và copy key `service_role`. Đây là key có quyền cao, chỉ lưu ở Vercel server environment; tuyệt đối không dùng publishable/anon key cho biến này và không đặt tên biến với tiền tố `NEXT_PUBLIC_`.
   - `SUPABASE_DB_URL` = PostgreSQL connection string trong **Project Settings → Database → Connection Pooling** (Session mode, chỉ lưu ở Vercel server environment). Biến này cho phép trang `/setup` tự cài database và admin chạy migration ngay trong Dashboard.
   - `RESEND_API_KEY` = API key của [Resend](https://resend.com)
   - `RESEND_FROM_EMAIL` = địa chỉ gửi đã xác minh domain trên Resend, ví dụ `Gia Phả OS <no-reply@your-domain.com>`
   - `ADMIN_NOTIFICATION_EMAIL` = tuỳ chọn; email nhận thông báo. Nếu bỏ trống, hệ thống tự gửi tới email của các admin đang hoạt động
4. Nhấn **Deploy** và chờ 2 -> 3 phút.

Bạn sẽ có một đường link website để sử dụng ngay.

> **Nếu đang nâng cấp hệ thống đã có dữ liệu:** chỉ cần mở Supabase Dashboard → SQL Editor, bấm **Copy toàn bộ SQL** ở trang `/setup`, dán và chạy một lần. Bundle này bao gồm schema và tất cả migration theo đúng thứ tự, đồng thời có thể chạy lặp lại an toàn. Không cần copy hoặc chạy từng file riêng lẻ. Các tài khoản đang hoạt động được giữ nguyên; chỉ tài khoản đăng ký mới ở trạng thái chờ duyệt.

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

## Cách 3: Chạy bằng Docker

Phù hợp khi tự host trên VPS hoặc máy chủ riêng. Yêu cầu: [Docker](https://docs.docker.com/get-docker/) có Docker Compose.

1. Clone project, đổi tên `.env.example` thành `.env.local` và điền các giá trị ở **bước 1** (giống Cách 1: `NEXT_PUBLIC_*`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_*`...).
2. Build và chạy:

```bash
docker compose --env-file .env.local up -d --build
```

Mở `http://localhost:3000` (hoặc domain của bạn qua reverse proxy, nhớ thêm domain vào Supabase như mục [Xử lý lỗi khi đăng ký](#xử-lý-lỗi-khi-đăng-ký)).

**Lưu ý quan trọng về biến môi trường:**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` và `NEXT_PUBLIC_DISABLE_SSO` được Next.js ghi thẳng vào JavaScript **lúc build**, nên phải truyền dưới dạng build arg. `--env-file .env.local` giúp `docker-compose.yml` đọc chúng từ `.env.local`; thiếu hai biến Supabase thì build dừng với thông báo lỗi. Đổi các biến này thì phải build lại (`--build`), chỉ khởi động lại container là không đủ.
- Tự host cả Supabase/PostgREST: giữ `max_rows` (`PGRST_DB_MAX_ROWS`) ≥ 1000 (mặc định của Supabase). Ứng dụng vẫn đọc đủ dữ liệu với mức nhỏ hơn nhưng tốn nhiều request hơn.
- Các biến bí mật của server (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_API_KEY`...) **không** nằm trong image: container đọc chúng từ `.env.local` lúc chạy (`env_file`). File `.env*` không được copy vào image.

Không dùng Compose (`docker run --env-file` giữ nguyên dấu nháy, nên trong `.env.local` viết giá trị không bọc nháy, kể cả khi có khoảng trắng: `SITE_NAME=Gia Phả OS`):

```bash
docker build -t giapha-os \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key" \
  --build-arg NEXT_PUBLIC_DISABLE_SSO=true \
  .
docker run -d -p 3000:3000 --env-file .env.local --restart always giapha-os
```

Image có sẵn `HEALTHCHECK` gọi trang `/login` mỗi 30 giây: `docker ps` hiện `healthy` hoặc `unhealthy` ở cột STATUS, và `docker inspect --format '{{.State.Health.Status}}' <container>` cho kết quả tương tự. Container báo `unhealthy` nghĩa là ứng dụng không còn trả lời; xem `docker logs <container>`.

Image đã có sẵn `docs/schema.sql` và `docs/migrations/`, nên trang `/setup` và `/dashboard/upgrade` hoạt động như bản Vercel. **Cập nhật:** `git pull`, chạy lại lệnh `docker compose --env-file .env.local up -d --build`, rồi vào `/dashboard/upgrade` để chạy migration mới (nếu có).

## Giữ database không bị tạm dừng

Supabase gói Free tạm dừng (pause) project nếu một tuần không có truy cập database; khi đó trang web không chạy cho tới khi bạn vào Supabase bấm khôi phục.

- **Vercel:** không cần làm gì. Mỗi ngày Vercel tự gọi `/api/health` (cron trong `vercel.json`), trang này chạy một truy vấn nhỏ vào database nên project không bị tạm dừng.
- **Docker, máy chủ riêng:** cho máy gọi trang này mỗi ngày, ví dụ thêm vào `crontab -e`:

  ```bash
  0 3 * * * curl -fsS https://your-domain/api/health > /dev/null
  ```

  Hoặc dùng dịch vụ theo dõi miễn phí (UptimeRobot, cron-job.org) gọi `https://your-domain/api/health`.

`/api/health` trả `{"status":"ok"}` (mã 200) khi ứng dụng kết nối được database, mã 503 khi không; trang không lộ dữ liệu nào.

## Xử lý lỗi khi đăng ký

Sau khi cài đặt xong, nếu bạn gặp lỗi `Failed to fetch` khi đăng ký:

**Nguyên nhân:** Supabase chặn các request từ domain chưa được thêm vào danh sách cho phép.

**Cách khắc phục:**

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn Project của bạn.
2. Vào **Authentication → URL Configuration**.
3. Ở mục **Site URL**, điền URL chính của ứng dụng, ví dụ:
   - Vercel: `https://your-domain.vercel.app`
   - Máy cá nhân: `http://localhost:3000`
4. Ở mục **Redirect URLs**, nhấn **Add URL** và thêm:
   - `https://your-domain.vercel.app/**`
   - `http://localhost:3000/**` (nếu chạy local)
   - Hoặc tối thiểu: `https://your-domain.vercel.app/auth/callback` và `http://localhost:3000/auth/callback`
5. Nhấn **Save** và thử lại.

> **Lưu ý:** Thay `your-domain.vercel.app` bằng domain thực tế của bạn. Nếu dùng domain tùy chỉnh, hãy thêm cả domain đó vào danh sách.
