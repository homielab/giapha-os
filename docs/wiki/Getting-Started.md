# 🚀 Bắt Đầu Nhanh

> Hướng dẫn từng bước để chạy Giapha-OS lần đầu tiên.

---

## 1. Tạo Project Supabase

1. Đăng ký tại [supabase.com](https://supabase.com) (miễn phí)
2. Tạo **New Project** — chọn region Singapore hoặc Tokyo
3. Ghi lại **Project URL** và **anon key** từ **Settings → API**

## 2. Khởi Tạo Database

1. Vào **Supabase → SQL Editor → New query**
2. Copy toàn bộ nội dung file [`docs/schema.sql`](../schema.sql)
3. Paste vào editor → nhấn **Run**

Schema tạo ra các bảng: `profiles`, `persons`, `relationships`, `custom_events`, `audit_log`, `family_settings`, `person_photos`, `notification_settings`, `notification_log`

## 3. Tạo Tài Khoản Admin

### Cách A — Qua Supabase Dashboard
1. **Authentication → Users → Invite user** → nhập email
2. Sau khi xác nhận email, chạy SQL:
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com';
```

### Cách B — Đăng ký trực tiếp trên app
1. Vào `/login` → đăng ký tài khoản mới
2. Trong Supabase SQL Editor, chạy câu SQL trên để cấp quyền admin

## 4. Cấu Hình Environment

Tạo file `.env.local` từ template:

```bash
cp .env.example .env.local
```

Điền các giá trị:

```env
# Bắt buộc
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_NAME=Gia Phả Họ Nguyễn

# Tuỳ chọn — email notifications
RESEND_API_KEY=re_xxxx
CRON_SECRET=your-random-secret-here
```

## 5. Chạy Ứng Dụng

```bash
# Development
npm run dev

# Production build
npm run build && npm run start
```

## 6. Cài Đặt Ban Đầu Trong App

Sau khi đăng nhập với tài khoản admin:

1. **Dashboard → Cài đặt** → nhập tên gia đình
2. **Dashboard → Thành viên → Thêm mới** → tạo thành viên đầu tiên (tổ tiên gốc)
3. **Dashboard → Thành viên → [tên] → Thêm quan hệ** → kết nối các thành viên

## 7. Bước Tiếp Theo

- 📋 [Hướng dẫn sử dụng chi tiết](User-Guide.md) — tất cả tính năng
- ⚙️ [Hướng dẫn Admin](Admin-Guide.md) — phân quyền, backup
- 🚀 [Deploy lên Coolify](../DEPLOY_COOLIFY.md) — production deployment

---

### Biến Môi Trường Bot & AI (Tuỳ Chọn)

```env
# Cần thiết cho Telegram/Zalo Bot và Cron jobs
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SITE_URL=https://your-domain.com

# Bảo vệ cron endpoint (khuyến khích đặt trong production)
CRON_SECRET=your-random-secret-min-32-chars

# AI platform key (tuỳ chọn — người dùng có thể nhập key riêng)
PLATFORM_AI_API_KEY=sk-...
```

---

## 8. Thiết Lập Bot Telegram (Tuỳ Chọn)

1. Mở Telegram → tìm **@BotFather** → gõ `/newbot`
2. Đặt tên và username cho bot → nhận **Bot Token**
3. **Dashboard → Cài đặt → Nhánh họ → [tên nhánh] → Bot**
4. Dán **Bot Token** vào ô tương ứng → nhấn **Đăng ký Webhook**
5. Thêm bot vào nhóm Telegram của gia đình → cấp quyền gửi tin
6. (Tuỳ chọn) Cấu hình AI: chọn nhà cung cấp, nhập API key hoặc dùng key platform
