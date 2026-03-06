# 📖 Giapha-OS Wiki

> **Gia Phả OS** — Phần mềm quản lý gia phả mã nguồn mở cho gia đình Việt Nam.

Chào mừng bạn đến với Wiki chính thức của Giapha-OS. Đây là tài liệu đầy đủ về cách sử dụng, cài đặt và phát triển ứng dụng.

---

## 📚 Mục Lục

### Dành Cho Người Dùng

| Tài liệu | Mô tả |
|----------|-------|
| [🚀 Bắt Đầu Nhanh](Getting-Started.md) | Cài đặt lần đầu, tạo tài khoản, thêm thành viên |
| [📋 Hướng Dẫn Sử Dụng](User-Guide.md) | Chi tiết từng tính năng: cây gia phả, thành viên, sự kiện |
| [⚙️ Hướng Dẫn Admin](Admin-Guide.md) | Quản lý người dùng, cài đặt, backup dữ liệu |
| [🌐 API Reference](API-Reference.md) | REST API công khai, xác thực, endpoints |

### Dành Cho Developer

| Tài liệu | Mô tả |
|----------|-------|
| [🚀 Triển Khai Coolify](../DEPLOY_COOLIFY.md) | Hướng dẫn deploy lên Coolify + Supabase |
| [📝 Changelog](Changelog.md) | Lịch sử phiên bản và thay đổi |
| [🗺️ Roadmap](Roadmap.md) | Kế hoạch phát triển tương lai |

---

## 🎯 Giapha-OS Là Gì?

Giapha-OS là ứng dụng web mã nguồn mở giúp các gia đình Việt Nam:

- **Lưu trữ** thông tin thành viên qua nhiều thế hệ
- **Trực quan hoá** cây gia phả dạng cây phân cấp và mindmap
- **Tính toán** xưng hô tiếng Việt tự động (ông/bà/chú/thím...)
- **Theo dõi** sinh nhật, ngày giỗ theo âm lịch và dương lịch
- **Chia sẻ** gia phả công khai hoặc qua REST API

### Tech Stack

```
Frontend:  Next.js 15 (App Router) + React 19 + TypeScript
UI:        Tailwind CSS 4 + Lucide Icons
Backend:   Supabase (PostgreSQL + Auth + Storage + RLS)
i18n:      next-intl (Tiếng Việt / English / 漢字)
Deploy:    Coolify / Vercel / Docker
```

---

## ⚡ Cài Đặt Nhanh (5 phút)

```bash
# 1. Clone repo
git clone https://github.com/minhtuancn/giapha-os.git
cd giapha-os

# 2. Cài dependencies
npm install

# 3. Cấu hình env
cp .env.example .env.local
# Điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# 4. Chạy DB schema
# Vào Supabase SQL Editor, chạy file docs/schema.sql

# 5. Khởi động dev server
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000)

---

## 📬 Liên Hệ & Đóng Góp

- **GitHub Issues:** [minhtuancn/giapha-os/issues](https://github.com/minhtuancn/giapha-os/issues)
- **Upstream:** [homielab/giapha-os](https://github.com/homielab/giapha-os)
- **License:** MIT
