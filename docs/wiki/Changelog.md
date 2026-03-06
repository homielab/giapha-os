# 📝 Changelog

Tất cả thay đổi đáng kể của Giapha-OS được ghi lại tại đây.

Format theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-03-06

> **Release đầu tiên** — Toàn bộ roadmap Phase 0–4 hoàn thành.

### ✨ Added — Phase 4 (Platform Expansion)

- **🌐 i18n đa ngôn ngữ** ([#40](https://github.com/minhtuancn/giapha-os/pull/40))
  - Hỗ trợ 3 ngôn ngữ: Tiếng Việt, English, Hán-Nôm (漢字)
  - Language switcher trên header, lưu preference qua cookie
  - Typed translation keys với TypeScript (next-intl)
  - Dynamic `<html lang>` attribute

- **🗺️ Map View** ([#39](https://github.com/minhtuancn/giapha-os/pull/39))
  - Bản đồ OpenStreetMap tại `/dashboard/map`
  - Geocoding địa điểm từ `place_of_birth` qua Nominatim API
  - Rate limiting 1 req/sec theo ToS Nominatim
  - Sidebar thành viên có/chưa có địa điểm

- **🔌 Public REST API** ([#37](https://github.com/minhtuancn/giapha-os/pull/37))
  - 5 endpoints: `GET /api/v1/members`, `/members/:id`, `/members/:id/relationships`, `/stats`, `/docs`
  - API key authentication với SHA-256 hashing
  - Service role client để bypass RLS an toàn
  - Admin UI quản lý API key tại Settings

- **📧 Email Notifications** ([#41](https://github.com/minhtuancn/giapha-os/pull/41))
  - Cron endpoint `/api/notifications/send` bảo vệ bởi `CRON_SECRET`
  - Tích hợp Resend API (native fetch, không cần thư viện)
  - Deduplication qua bảng `notification_log`
  - Settings UI: bật/tắt, ngày nhắc trước, danh sách email

- **📱 PWA** ([#34](https://github.com/minhtuancn/giapha-os/pull/34))
  - Service worker, manifest, offline fallback (`/offline`)
  - Cài như app trên desktop và mobile

- **🔄 Auto DB Migration Checker** ([#35](https://github.com/minhtuancn/giapha-os/pull/35))
  - Dashboard tại `/setup` hiển thị trạng thái từng migration
  - Hướng dẫn áp dụng migration còn thiếu

- **🖼️ Photo Gallery** ([#36](https://github.com/minhtuancn/giapha-os/pull/36))
  - Upload nhiều ảnh/thành viên lên Supabase Storage
  - Lightbox xem ảnh full-screen, điều hướng bằng phím
  - Chú thích ảnh, xoá ảnh

### ✨ Added — Phase 3 (Trải Nghiệm Người Dùng)

- **👁️ Public Anonymous View** ([#33](https://github.com/minhtuancn/giapha-os/pull/33))
  - Chia sẻ cây gia phả công khai qua link token
  - `timingSafeEqual` chống timing attack
  - Token tạo bằng `crypto.randomUUID()` (~122 bits entropy)

- **📝 Rich Text Notes** ([#32](https://github.com/minhtuancn/giapha-os/pull/32))
  - Markdown editor với toolbar (B/I/H/List)
  - XSS-safe renderer: strip tags → escape entities → apply markdown

- **🖨️ Print Mode** ([#31](https://github.com/minhtuancn/giapha-os/pull/31))
  - Layout tối ưu cho in ấn, ẩn UI elements không cần thiết

- **🌙 Dark Mode** ([#30](https://github.com/minhtuancn/giapha-os/pull/30))
  - Toggle sáng/tối, lưu vào localStorage
  - Anti-FOUC script trong `<head>`
  - Tailwind CSS 4 `@custom-variant dark`

- **🗂️ Bulk Operations** ([#29](https://github.com/minhtuancn/giapha-os/pull/29))
  - Chọn nhiều thành viên, Shift+Click để chọn range
  - Xoá hàng loạt (Admin only — enforced bởi RLS)

- **📅 Family Timeline** ([#28](https://github.com/minhtuancn/giapha-os/pull/28))
  - Dòng thời gian tất cả sự kiện tại `/dashboard/timeline`
  - Lọc theo loại sự kiện và thế hệ

### ✨ Added — Phase 2 (Tính Năng Mới)

- **🔌 Extended Relationship Types** ([#27](https://github.com/minhtuancn/giapha-os/pull/27))
  - 6 loại mới: step_parent, sibling, half_sibling, godparent, adopted_child
  - ALTER TYPE migration an toàn với `IF NOT EXISTS`

- **⚠️ Duplicate Detection** ([#26](https://github.com/minhtuancn/giapha-os/pull/26))
  - Cảnh báo khi tên + năm sinh trùng (±2 năm)
  - Debounced onBlur, không chặn submit

- **📋 Audit Log** ([#25](https://github.com/minhtuancn/giapha-os/pull/25))
  - Ghi lại mọi thay đổi tạo/sửa/xoá thành viên
  - Trang xem lịch sử tại `/dashboard/history`

- **🔍 Global Search** ([#24](https://github.com/minhtuancn/giapha-os/pull/24))
  - Ctrl+K mở modal tìm kiếm toàn cục
  - Tìm theo tên, năm sinh, nơi sinh

### ✨ Added — Phase 1 (Hoàn Thiện)

- **Tìm kiếm & lọc** danh sách thành viên ([#23](https://github.com/minhtuancn/giapha-os/pull/23))
- **Xuất ảnh PNG/PDF** cây gia phả
- **Chi tiết riêng tư**: số điện thoại, địa chỉ, nghề nghiệp
- **Quản lý sự kiện**: sửa, xoá, phân loại

### 🔒 Security Fixes

- HTML escaping trong email template (XSS prevention)
- `timingSafeEqual` cho cron token và public share token comparison
- RLS policy tách biệt: anon không đọc được `api_key_value` và `public_share_token`
- Email validation chống header injection (regex + newline check)
- Service role client yêu cầu `SUPABASE_SERVICE_ROLE_KEY` (không fallback về anon)

### 🔧 Infrastructure

- GitHub Actions CI: lint + build trên mọi push/PR
- npm lockfile sync fix (`@swc/helpers@0.5.19`)
- Docs: `ROADMAP.md`, `DEPLOY_COOLIFY.md`, Wiki

---

## [0.1.0] — 2025 (Baseline)

### ✨ Phase 0 — Nền Tảng

- CRUD thành viên (tạo, xem, sửa, xoá)
- Cây gia phả Tree View và Mindmap với pan/zoom
- Tính danh xưng tiếng Việt tự động (9 cấp tổ tiên, 8 cấp con cháu)
- Quản lý quan hệ (hôn nhân, con ruột)
- Sự kiện sinh nhật & ngày giỗ (âm lịch ↔ dương lịch)
- Xuất/nhập JSON, GEDCOM, CSV
- Supabase Auth + 3 vai trò (Admin/Editor/Member) + RLS
- Thống kê gia đình (biểu đồ thế hệ, tuổi, giới tính)
