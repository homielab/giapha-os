# 🚀 Hướng Dẫn Triển Khai Giapha-OS trên Coolify

## Yêu Cầu

- Coolify v4+ đã cài trên VPS của bạn
- Tài khoản [Supabase](https://supabase.com) (free tier đủ dùng)
- Domain hoặc subdomain trỏ về VPS (ví dụ: `giapha.example.com`)
- Tài khoản [Resend](https://resend.com) *(tuỳ chọn, chỉ cần nếu dùng email notifications)*

---

## Bước 1 — Chuẩn Bị Supabase

### 1.1 Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → **New project**
2. Đặt tên, chọn region gần nhất (Singapore hoặc Tokyo cho Việt Nam)
3. Lưu lại **Database Password**

### 1.2 Chạy Schema SQL

1. Trong Supabase Dashboard → **SQL Editor** → **New query**
2. Mở file [`docs/schema.sql`](../docs/schema.sql) trong repo, copy toàn bộ nội dung và paste vào SQL Editor
3. Nhấn **Run** — tất cả bảng và RLS policies sẽ được tạo

### 1.3 Lấy API Keys

Vào **Settings → API**, ghi lại 3 giá trị:

| Tên | Vị trí |
|-----|--------|
| `Project URL` | Settings → API → Project URL |
| `anon / public` key | Settings → API → Project API keys → anon |
| `service_role` key | Settings → API → Project API keys → service_role |

> ⚠️ **service_role key** có quyền bypass RLS — không bao giờ expose ra client.

### 1.4 Bật Supabase Storage (cho ảnh thành viên)

1. **Storage** → **New bucket** → tên: `person-photos`
2. Chọn **Public bucket**: ✅ (để ảnh có thể load trong trình duyệt)
3. **Policies** → thêm policy cho bucket:
   - SELECT: `true` (public read)
   - INSERT/DELETE: `auth.role() = 'authenticated'`

### 1.5 Tạo tài khoản Admin đầu tiên

1. **Authentication → Users → Invite user** → nhập email admin
2. Sau khi user đăng ký xong, vào **SQL Editor** chạy:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'your-admin@email.com';
   ```

---

## Bước 2 — Tạo Application trên Coolify

### 2.1 Thêm Source (Git)

1. Coolify Dashboard → **Sources** → **Add** → **GitHub** (hoặc Public Git)
2. Nếu dùng repo private: kết nối GitHub App
3. Nếu fork public `minhtuancn/giapha-os`: chọn **Public repository**, paste URL

### 2.2 Tạo Application

1. **Projects** → chọn project → **+ New Resource** → **Application**
2. Chọn source vừa thêm, chọn repo `giapha-os`, branch: `dev` (hoặc `main`)
3. **Build Pack**: chọn **Nixpacks** *(Coolify tự nhận Next.js)*

### 2.3 Cấu hình Build

Trong tab **Configuration**:

```
Build Command:   npm run build
Start Command:   npm run start
Port:            3000
```

> Coolify/Nixpacks tự phát hiện Node.js và chạy `npm ci` → `npm run build`.

---

## Bước 3 — Cấu Hình Biến Môi Trường

Trong Coolify → Application → tab **Environment Variables**, thêm từng biến:

### 🔴 Bắt buộc

| Tên biến | Giá trị | Mô tả |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `eyJhbG...` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | service_role key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | `https://giapha.example.com` | Domain của bạn (không có slash cuối) |
| `SITE_NAME` | `Gia Phả Họ Nguyễn` | Tên hiển thị trên tab trình duyệt |

### 🟡 Tuỳ chọn — Email Notifications

| Tên biến | Giá trị | Mô tả |
|----------|---------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | API key từ [resend.com](https://resend.com) |
| `CRON_SECRET` | chuỗi ngẫu nhiên | Bảo vệ endpoint `/api/notifications/send` |

Tạo `CRON_SECRET` ngẫu nhiên bằng lệnh:
```bash
openssl rand -hex 32
```

### 🟢 Tuỳ chọn — Hiển thị

| Tên biến | Giá trị mặc định | Mô tả |
|----------|-----------------|-------|
| `NODE_ENV` | `production` | Môi trường (Coolify tự set) |

> **Lưu ý:** Các biến bắt đầu bằng `NEXT_PUBLIC_` sẽ được nhúng vào client-side bundle khi build. Phải thêm trước khi **Deploy** lần đầu.

---

## Bước 4 — Cấu Hình Domain & SSL

1. Coolify → Application → tab **Domains**
2. **Add Domain**: `giapha.example.com`
3. Bật **Generate SSL Certificate** (Let's Encrypt) ✅
4. Đảm bảo DNS đã trỏ: `giapha.example.com` → IP VPS của bạn

---

## Bước 5 — Deploy

1. Nhấn **Deploy** trong Coolify
2. Xem logs trong **Deployments** → build thường mất 2–3 phút
3. Sau khi deploy xong, truy cập `https://giapha.example.com`

**Kiểm tra:**
- Trang chủ load → ✅
- `/login` hiển thị form đăng nhập → ✅
- `/setup` hiển thị migration status → ✅

---

## Bước 6 — Cấu Hình Cron Job (Email Notifications)

Nếu bạn muốn nhận email nhắc sinh nhật / giỗ hằng ngày:

### Dùng Coolify Scheduled Task

1. Coolify → **Scheduled Tasks** → **Add**
2. Cấu hình:
   ```
   Command:  curl -s "https://giapha.example.com/api/notifications/send?token=YOUR_CRON_SECRET"
   Schedule: 0 7 * * *   (chạy lúc 7:00 sáng mỗi ngày)
   ```

### Hoặc dùng Vercel Cron (nếu deploy trên Vercel)

Thêm file `vercel.json` vào root:
```json
{
  "crons": [{
    "path": "/api/notifications/send?token=YOUR_CRON_SECRET",
    "schedule": "0 0 * * *"
  }]
}
```

---

## Bước 7 — Cài Đặt Ban Đầu Trong App

Sau khi đăng nhập với tài khoản admin:

1. **Dashboard → Cài đặt** (`/dashboard/settings`)
   - Nhập tên gia đình, ngôn ngữ mặc định
   - Bật Public Share nếu muốn chia sẻ cây gia phả
   - Cấu hình email notifications (nếu có Resend)

2. **Dashboard → Thêm thành viên đầu tiên** → bắt đầu xây dựng gia phả

---

## Cập Nhật Phiên Bản Mới

Coolify hỗ trợ auto-deploy khi có commit mới:

1. Application → tab **Configuration** → **Git Webhooks**
2. Copy webhook URL → paste vào GitHub repo:
   - **Settings → Webhooks → Add webhook**
   - Payload URL: URL từ Coolify
   - Content type: `application/json`
   - Events: **Just the push event**

Từ giờ mỗi lần push vào branch `dev`, Coolify tự động rebuild và deploy.

---

## Troubleshooting

### Build thất bại — "Missing env variable"

Kiểm tra tất cả biến `NEXT_PUBLIC_*` đã được thêm **trước khi** build. Các biến này được bake vào bundle lúc build time.

### Đăng nhập không được

- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` đúng chưa
- Supabase → Authentication → URL Configuration → **Site URL** phải khớp với `NEXT_PUBLIC_SITE_URL`
- Thêm domain vào **Redirect URLs**: `https://giapha.example.com/**`

### Ảnh thành viên không upload được

- Kiểm tra bucket `person-photos` đã tạo trong Supabase Storage
- Kiểm tra Storage Policy đã cho phép authenticated users INSERT

### Email không gửi được

- Kiểm tra `RESEND_API_KEY` hợp lệ
- Resend → **Domains** → verify domain gửi mail (hoặc dùng `onboarding@resend.dev` để test)
- Kiểm tra `CRON_SECRET` khớp trong env và URL cron job

---

## Tóm Tắt Nhanh

```
Supabase:
  ✅ Tạo project
  ✅ Chạy docs/schema.sql
  ✅ Tạo bucket person-photos
  ✅ Thêm admin user vào user_roles

Coolify:
  ✅ Add source (GitHub repo)
  ✅ New Application → Nixpacks → port 3000
  ✅ Thêm 5 env vars bắt buộc
  ✅ Add domain + SSL
  ✅ Deploy
  ✅ (tuỳ chọn) Cron job cho email
```
