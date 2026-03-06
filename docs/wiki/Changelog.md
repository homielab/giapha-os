# 📝 Changelog

Tất cả thay đổi đáng kể của Giapha-OS được ghi lại tại đây.

Format theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.3] — 2026-03-06

> **Security & Reliability**: Atomic rate limiter, Zalo HMAC verification, import validation, reminder logs admin UI.

### 🔒 Security

- **Atomic AI Rate Limiter** ([#101](https://github.com/minhtuancn/giapha-os/pull/101) — closes [#95](https://github.com/minhtuancn/giapha-os/issues/95), [#99](https://github.com/minhtuancn/giapha-os/issues/99))
  - PostgreSQL function `check_and_increment_ai_quota()` dùng `SELECT FOR UPDATE` — atomic, thread-safe
  - Loại bỏ race condition SELECT→UPDATE tách rời trong code cũ
  - Fallback về non-atomic path nếu RPC chưa deploy (backward compatible)
  - `docs/schema.sql` bổ sung function + `GRANT EXECUTE TO authenticated`

- **Zalo Webhook HMAC-SHA256** ([#101](https://github.com/minhtuancn/giapha-os/pull/101) — closes [#96](https://github.com/minhtuancn/giapha-os/issues/96))
  - `verifyZaloSignature()` kiểm tra header `X-Zalo-Signature` bằng HMAC-SHA256
  - Constant-time comparison ngăn timing attacks
  - Cấu hình qua env `ZALO_OA_SECRET`; bỏ qua nếu chưa set (backward compatible)

### ✨ Added

- **Reminder Logs Admin Page** ([#101](https://github.com/minhtuancn/giapha-os/pull/101) — closes [#98](https://github.com/minhtuancn/giapha-os/issues/98))
  - Trang `/admin/reminder-logs` với stats (sent/failed/pending counts)
  - Bảng log 200 bản ghi gần nhất: loại nhắc, platform, ngày, trạng thái, chi tiết lỗi
  - `logReminder()` nay lưu `error_message` khi status = failed
  - `reminder_logs` thêm cột `error_message TEXT`
  - Link từ `/admin` dashboard

- **Import Data Validation** ([#101](https://github.com/minhtuancn/giapha-os/pull/101) — closes [#97](https://github.com/minhtuancn/giapha-os/issues/97))
  - Validation toàn diện trước khi xoá/ghi DB: UUID format, kiểu dữ liệu, range năm
  - Kiểm tra referential integrity (person_a/b phải tồn tại trong persons list)
  - Phát hiện trùng ID, giới hạn 50,000 persons / 200,000 relationships
  - Cross-validation: death_year không được nhỏ hơn birth_year

### 🗄️ Database Migration

```sql
-- Chạy trong Supabase SQL Editor:
ALTER TABLE public.reminder_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Tạo atomic quota function:
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_quota()
-- (xem docs/schema.sql phần "v1.5.3" để có full SQL)
```

---

## [1.5.2] — 2026-03-06

> **Security Patch**: Sửa thông tin đăng nhập demo, bảo vệ server actions, cải thiện xử lý lỗi reminder.

### 🔒 Security

- **Auth Guards cho Server Actions** ([#100](https://github.com/minhtuancn/giapha-os/pull/100))
  - Thêm `requireAdmin()` vào tất cả 7 user management server actions
  - Bao gồm: `changeUserRole`, `deleteUser`, `adminCreateUser`, `toggleUserStatus`, `approveUser`, `rejectUser`, `batchApproveUsers`
  - Password validation tối thiểu 8 ký tự trong `adminCreateUser`

- **Demo Credentials** ([#100](https://github.com/minhtuancn/giapha-os/pull/100))
  - Xoá hardcoded password `"giaphaos"` khỏi source code
  - Dùng `config.exampleEmail || "demo@example.com"` và `config.examplePassword || "demo@123"`
  - Hỗ trợ env vars `EXAMPLE_EMAIL` và `EXAMPLE_PASSWORD` để override

### 🐛 Fixed

- **Reminder Cron Error Handling** ([#100](https://github.com/minhtuancn/giapha-os/pull/100))
  - Toàn bộ 3 loại nhắc nhở (giỗ, sự kiện, sinh nhật) được bọc try/catch
  - Ghi log status `"failed"` vào `reminder_logs` khi gửi thất bại
  - Cron không bị crash giữa chừng khi một reminder fail

---

## [1.5.1] — 2026-03-05

> **Demo & UI Improvements**: Cập nhật URL demo, thông tin nhà phát triển, cải thiện navigation.

### ✨ Added

- **Developer Contact** ([#94](https://github.com/minhtuancn/giapha-os/pull/94) — closes [#92](https://github.com/minhtuancn/giapha-os/issues/92))
  - Trang `/about`: developer card với tên, email, WhatsApp, địa điểm (Ninh Bình, Việt Nam), GitHub
  - Footer: tên tác giả "Minh Tuấn", link email `vietkeynet@gmail.com`
  - README, wiki Home: thông tin liên hệ đầy đủ

- **UI Improvements** ([#94](https://github.com/minhtuancn/giapha-os/pull/94) — closes [#93](https://github.com/minhtuancn/giapha-os/issues/93))
  - HeaderMenu: link `/admin` (Shield icon) hiển thị với admin users
  - LandingHero: nút "Xem Demo" → `giapha-os-rose.vercel.app`
  - Dashboard: +Timeline, Bản đồ địa lý, Bản đồ mộ phần trong publicFeatures
  - Dashboard: +Settings, Bot, Super Admin trong adminFeatures

### 🔄 Changed

- Demo URL: `giapha-os.homielab.com` → `giapha-os-rose.vercel.app`
- `app/config.ts`: `demoDomain` default cập nhật

---

## [1.5.0] — 2026

> **Phase 11 — i18n + AI Bot Module**: Chuẩn hoá đa ngôn ngữ, bot Telegram/Zalo AI per-nhánh, nhắc nhở tự động, quản lý subscription.

### ✨ Added — Phase 11

- **🌐 i18n Foundation** ([#87](https://github.com/minhtuancn/giapha-os/pull/87) — closes [#81](https://github.com/minhtuancn/giapha-os/issues/81))
  - 12 namespaces: `nav`, `actions`, `common`, `auth`, `members`, `stats`, `events`, `settings`, `dashboard`, `graves`, `errors`, `privacy`
  - 211 translation keys, 3 locales: 🇻🇳 Tiếng Việt / 🇬🇧 English / 🇨🇳 中文
  - Foundation cho progressive component migration

- **🤖 Per-branch Telegram Bot Setup** ([#88](https://github.com/minhtuancn/giapha-os/pull/88) — closes [#82](https://github.com/minhtuancn/giapha-os/issues/82))
  - Bảng `branch_bots` — mỗi nhánh cấu hình bot riêng
  - Tự động đăng ký webhook với Telegram API (`setWebhook`)
  - Webhook handler: lệnh `/start` `/help` `/lichgio` `/sukien` `/giapha [tên]`
  - Admin UI tại `/dashboard/settings/branches/[id]/bot` với hướng dẫn chi tiết

- **🧠 AI Chat Integration** ([#89](https://github.com/minhtuancn/giapha-os/pull/89) — closes [#83](https://github.com/minhtuancn/giapha-os/issues/83))
  - OpenAI-compatible interface: OpenAI / Anthropic / OpenRouter / LiteLLM / Custom
  - BYOK (Bring Your Own Key) — API key mã hoá tại cấp nhánh
  - Platform key — super admin cấu hình key dùng chung
  - Branch context system prompt với thông tin dòng họ realtime
  - Lịch sử hội thoại (10 lượt gần nhất) trong `bot_conversations`
  - Super admin panel `/admin` — quản lý platform AI key

- **⏰ Scheduled Reminders** ([#90](https://github.com/minhtuancn/giapha-os/pull/90) — closes [#84](https://github.com/minhtuancn/giapha-os/issues/84))
  - Cron job `/api/cron/reminders` (7:00 AM Vietnam = 0:00 UTC)
  - Lịch giỗ: nhắc 3 lần (7 ngày / 3 ngày / 1 ngày trước) + thông báo ngày giỗ
  - Sự kiện họ tộc: 3 ngày trước + ngày sự kiện
  - Sinh nhật: thông báo ngày sinh nhật người còn sống
  - Idempotent via `reminder_logs` unique constraint
  - `vercel.json` cron config + `CRON_SECRET` bảo mật

- **🔑 Subscription & Rate Limiting** ([#91](https://github.com/minhtuancn/giapha-os/pull/91) — closes [#85](https://github.com/minhtuancn/giapha-os/issues/85))
  - Bảng `subscriptions` — Free/Basic/Pro/Enterprise plans
  - `checkRateLimit()` — BYOK bypass, platform key theo quota tháng
  - `/admin/subscriptions` — quản lý plan, progress bar usage, reset quota
  - Tự động thông báo bot khi hết quota

- **🌐 Zalo OA & Multi-platform Architecture** ([#91](https://github.com/minhtuancn/giapha-os/pull/91) — closes [#86](https://github.com/minhtuancn/giapha-os/issues/86))
  - `BotPlatform` interface + `createPlatform()` factory (Telegram/Zalo)
  - `/api/zalo/webhook` — xử lý events Zalo OA, lệnh, AI chat
  - `ZaloBotSettings` component — cấu hình Zalo OA
  - `refreshZaloToken` — tự động refresh Zalo access token
  - Dễ mở rộng thêm platform mới (implement interface là xong)

---

## [1.4.0] — 2025

> **Phase 8–10 — Authentication, Invitations & Notifications**: Phê duyệt tài khoản, CCCD, mời tham gia, thông báo Telegram/Zalo, sự kiện họ tộc, timeline hoạt động.

### ✨ Added — Phase 8-10

- **✅ Phê Duyệt Tài Khoản** ([#77](https://github.com/minhtuancn/giapha-os/pull/77) — closes [#65](https://github.com/minhtuancn/giapha-os/issues/65))
  - `components/PendingApprovalQueue.tsx`: danh sách chờ duyệt với chọn hàng loạt + duyệt/từ chối từng người
  - Server actions: `approveUser`, `rejectUser`, `batchApproveUsers`
  - Dashboard badge hiển thị số tài khoản chờ duyệt (link trực tiếp `/dashboard/users`)
  - Tự động set `is_active=true` và `account_status='active'` khi duyệt

- **🪪 CCCD / Số Căn Cước Công Dân** ([#76](https://github.com/minhtuancn/giapha-os/pull/76) — closes [#66](https://github.com/minhtuancn/giapha-os/issues/66))
  - Schema: cột `national_id` (unique) và `national_id_verified` trên bảng `persons`
  - `MemberForm`: ô nhập CCCD (chỉ cho admin, chỉ người còn sống, tối đa 12 ký tự số)
  - `MemberDetailContent`: hiển thị CCCD trong sidebar admin

- **📅 Sự Kiện Họ Tộc & Ảnh** ([#78](https://github.com/minhtuancn/giapha-os/pull/78) — closes [#61](https://github.com/minhtuancn/giapha-os/issues/61), [#62](https://github.com/minhtuancn/giapha-os/issues/62))
  - `app/dashboard/family-events/`: CRUD đầy đủ — loại sự kiện (giỗ họ, đám cưới, đám tang, họp mặt, lễ nghi, khác), lọc theo chi, toggle công khai
  - `utils/activityLogger.ts`: `logActivity()` fire-and-forget, ghi vào `activity_feed`
  - `components/ActivityFeed.tsx`: hiển thị feed hoạt động với icon theo loại
  - Trang `/dashboard/timeline`: tích hợp activity feed bên dưới timeline chính
  - Dashboard: card điều hướng "Sự kiện họ tộc"

- **🔗 Hệ Thống Mời Tham Gia** ([#79](https://github.com/minhtuancn/giapha-os/pull/79) — closes [#64](https://github.com/minhtuancn/giapha-os/issues/64))
  - `app/dashboard/settings/invitations/`: admin tạo/xoá link mời (nhánh, vai trò, email, số lần dùng, hết hạn)
  - `app/join/[token]/`: trang đăng ký công khai — xác thực token, hiển thị lỗi expired/full/invalid, form nhập SĐT + tên
  - `useInvitationToken`: kích hoạt tài khoản + ghi nhận SĐT + tăng `uses_count`
  - Settings: card liên kết "Quản lý Lời mời"

- **📱 Thông Báo Telegram & Zalo** ([#80](https://github.com/minhtuancn/giapha-os/pull/80) — closes [#63](https://github.com/minhtuancn/giapha-os/issues/63))
  - `utils/notifyTelegram.ts`: gửi tin Telegram bot (fire-and-forget, parse_mode HTML)
  - `utils/notifyZalo.ts`: gửi webhook Zalo (fire-and-forget, HTTPS only)
  - `components/TelegramSettings.tsx`: UI cài đặt bot token, chat ID, SĐT liên kết, Zalo webhook, nút test
  - Cấu hình trigger: thêm thành viên / sự kiện họ tộc / sinh nhật & giỗ sắp tới
  - Tích hợp: gửi thông báo tự động khi tạo sự kiện họ tộc mới
  - Lưu config trong `family_settings` (key-value) — không cần bảng mới

---

## [1.3.0] — 2025

> **Phase 7 — Public Dashboard & Announcements**: Trang chủ công khai cho khách, dashboard nâng cao cho thành viên.

### ✨ Added — Phase 7 (Public Dashboard)

- **🏠 Trang Chủ Công Khai** ([#75](https://github.com/minhtuancn/giapha-os/pull/75) — closes [#74](https://github.com/minhtuancn/giapha-os/issues/74))
  - `components/PublicDashboard.tsx`: trang chủ public với stats, sự kiện sắp tới, thành viên mới, thông báo
  - `app/page.tsx`: tự động chuyển sang PublicDashboard khi admin bật `public_dashboard_enabled`
  - Tên người còn sống tự động được che (`maskName`) trên trang công khai
  - Thống kê: tổng thành viên, thế hệ, chi nhánh, còn sống, đã mất
  - Nút đăng nhập nổi bật, footer link mã nguồn mở

- **📢 Hệ Thống Thông Báo Công Khai**
  - Schema: bảng `announcements` (title, content, is_pinned, expires_at, created_by)
  - RLS: anon READ thông báo còn hiệu lực, chỉ admin INSERT/UPDATE/DELETE
  - `components/AnnouncementManager.tsx`: CRUD thông báo với ghim + ngày hết hạn
  - `components/PublicDashboardSettings.tsx`: card cài đặt trong trang Admin Settings
  - Server actions: `togglePublicDashboard`, `createAnnouncement`, `deleteAnnouncement`
  - Thông báo được ghim hiển thị nổi bật với nền vàng

- **📊 Dashboard Nâng Cao (Đã Đăng Nhập)**
  - Quick stats row: tổng thành viên, còn sống, đã mất, số thế hệ
  - Badge phê duyệt tài khoản cho admin (hiển thị số chờ duyệt, link trực tiếp)
  - Recent members grid: 4 thành viên mới nhất với avatar/ký tự đầu

---

## [1.2.0] — Chưa phát hành

> **Phase 6 — Extended Profiles & Privacy**: Hồ sơ mở rộng, bảo mật thông tin, quản lý chi/nhánh, tùy chọn cá nhân.

### ✨ Added — Phase 6 (Extended Profiles & Privacy)

- **📊 Thống Kê Nâng Cao** ([#68](https://github.com/minhtuancn/giapha-os/pull/68) — closes [#57](https://github.com/minhtuancn/giapha-os/issues/57))
  - Biểu đồ phân bố độ tuổi theo 6 nhóm (<18, 18-30, 31-50, 51-70, 71-90, >90)
  - Thẻ thống kê tình trạng hôn nhân (độc thân / đã kết hôn / góa / ly hôn)
  - Thẻ số người đa thê/đa phu (marriage_order > 1)
  - Biểu đồ tôn giáo phân bổ trong gia đình
  - `RelationshipManager`: trường `marriage_order` (cả/hai/ba/tư/năm), `marriage_start_year`, `marriage_end_year`
  - Schema: `marital_status` ENUM, `marriage_order` trên `relationships`

- **🧑‍💼 Hồ Sơ Cá Nhân Mở Rộng** ([#69](https://github.com/minhtuancn/giapha-os/pull/69) — closes [#59](https://github.com/minhtuancn/giapha-os/issues/59))
  - Trường mới trong `MemberForm`: tên khai sinh, tên gọi thường, tôn giáo, tên thánh (conditional Công giáo), chức sắc tôn giáo, chức danh dân sự, mô tả sự nghiệp (rich text)
  - `MemberDetailContent`: section "Hồ sơ mở rộng" hiển thị tôn giáo, chức danh, tiểu sử có expand/collapse
  - Badge chức danh và chức sắc hiển thị ngay dưới tên
  - Hỗ trợ tôn giáo: Phật giáo, Công giáo, Tin lành, Hồi giáo, Cao Đài, Hòa Hảo
  - Schema: `birth_name`, `common_name`, `saint_name`, `religion`, `religious_title`, `civil_title`, `career_description` trên `persons`

- **🔒 Bảo Mật Thông Tin Cá Nhân** ([#70](https://github.com/minhtuancn/giapha-os/pull/70) — closes [#58](https://github.com/minhtuancn/giapha-os/issues/58))
  - `utils/privacy.ts`: `maskName()` che phần cuối tên (e.g. "Đoàn Minh T\*\*n"), `maskPhone()` ẩn 4 số đuôi, `shouldMask()` logic quyết định
  - Trang `/public/[token]`: áp dụng maskName cho người còn sống
  - Người đã mất luôn hiển thị đầy đủ (privacy_level tự động = public)
  - `MemberForm`: selector chế độ hiển thị `privacy_level` (công khai / ẩn một phần / riêng tư) trong admin section
  - Schema: `privacy_level` ENUM trên `persons`

- **🌿 Quản Lý Chi / Nhánh** ([#71](https://github.com/minhtuancn/giapha-os/pull/71) — closes [#60](https://github.com/minhtuancn/giapha-os/issues/60))
  - `components/BranchManager.tsx`: CRUD chi/nhánh với người gốc chi và mô tả
  - Trang `/dashboard/settings/branches`: admin quản lý danh sách chi
  - Settings page: card quick-link đến quản lý chi
  - `MemberForm`: selector gán thành viên vào chi (hiển thị khi có chi)
  - Schema: bảng `branches` (id, name, description, root_person_id), `persons.branch_id` FK

- **⚙️ Tùy Chọn Cá Nhân** ([#72](https://github.com/minhtuancn/giapha-os/pull/72) — closes [#67](https://github.com/minhtuancn/giapha-os/issues/67))
  - Trang `/dashboard/preferences`: cho phép mọi người dùng lưu tùy chọn xem
  - Cài đặt: người gốc mặc định khi xem cây, chi/nhánh mặc định, hiển thị từ đời thứ
  - Members page: ưu tiên `user_preferences.default_root_person_id` khi không có `?rootId=` trong URL
  - `HeaderMenu`: link "Tùy chọn cá nhân" hiển thị cho mọi người dùng
  - Schema: bảng `user_preferences` (user_id, default_root_person_id, default_branch_id, default_generation_from)

---

## [1.1.0] — 2026-03-06

> **Phase 5 — Grave Module**: Quản lý mộ phần toàn diện.

### ✨ Added — Phase 5 (Grave Module)

- **🪦 Quản lý Mộ Phần** ([#50](https://github.com/minhtuancn/giapha-os/pull/50), [#51](https://github.com/minhtuancn/giapha-os/pull/51))
  - Schema DB: bảng `grave_records`, `grave_events`, `grave_photos` với 4 ENUM types
  - RLS policy: anon chỉ đọc mộ `public_memorial=true`; editor/admin full CRUD
  - TypeScript types: `GraveRecord`, `GraveEvent`, `GravePhoto`, `GraveRecordWithDetails`
  - Server actions: upsert/delete grave record, events, photos
  - UI component `GraveSection`: form đầy đủ (loại táng, trạng thái mộ, hài cốt, GPS, nghĩa trang, liên lạc)
  - Badges trạng thái: `GraveStatusBadge`, `BurialTypeBadge`, `RemainsStatusBadge`
  - Dòng thời gian `GraveTimeline`: chôn → xây mộ → bốc cốt → cải táng với emoji và ngày
  - Chỉ hiển thị với thành viên đã mất (`is_deceased` hoặc có `death_year`)

- **🗺️ Bản Đồ Mộ Phần** ([#52](https://github.com/minhtuancn/giapha-os/pull/52))
  - Trang `/dashboard/cemetery-map` với Leaflet markers màu theo trạng thái mộ
  - Sidebar nhóm danh sách mộ theo nghĩa trang
  - Marker popup: tên người, năm mất, nghĩa trang, link hồ sơ
  - SSR-safe: `CemeteryMapWrapper` dùng `dynamic()` + `ssr: false`
  - Link "Bản đồ mộ phần" trên HeaderMenu (icon Landmark)

- **📸 Ảnh Mộ & 360° Panorama** ([#55](https://github.com/minhtuancn/giapha-os/pull/55))
  - Upload nhiều ảnh mộ lên Supabase Storage bucket `grave-photos`
  - Lightbox full-screen với điều hướng bàn phím (← → Esc)
  - Tag ảnh: mặt trước, mặt bên, toàn cảnh, chi tiết, bản đồ vị trí
  - Ảnh 360° equirectangular với `@photo-sphere-viewer/core`
  - Viewer in-page: zoom + fullscreen, touch-enabled
  - SSR-safe: `PanoramaViewer` wrapper dùng `dynamic()` + `ssr: false`

- **🕯️ Trang Tưởng Niệm Công Khai** ([#53](https://github.com/minhtuancn/giapha-os/pull/53))
  - Trang `/memorial/[id]` công khai (không cần đăng nhập)
  - 404 nếu `public_memorial = false` — bảo vệ quyền riêng tư
  - Hero section: ảnh đại diện, tên, năm sinh–mất, tiểu sử
  - Thông tin mộ phần, dòng thời gian, thư viện ảnh
  - QR code canvas (download PNG) để in dán lên bia mộ
  - Open Graph meta tags cho chia sẻ mạng xã hội (`og:image`, `og:description`)

- **🔔 Nhắc Tết Thanh Minh** ([#54](https://github.com/minhtuancn/giapha-os/pull/54))
  - Tự động tính ngày 3/3 âm lịch → dương lịch via `lunar-javascript`
  - Gửi email nhắc nhở 7 ngày trước và đúng ngày Thanh Minh
  - Email liệt kê tất cả mộ có địa chỉ, toạ độ GPS, link tưởng niệm
  - Deduplication qua `notification_log` (event_type `thanh_minh`)
  - Toggle `thanh_minh_enabled` trong Settings UI
  - Schema: `ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS thanh_minh_enabled`

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
