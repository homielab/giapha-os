# Giapha-OS — Lộ Trình Phát Triển (Roadmap)

> Cập nhật lần cuối: 2025 — Phản ánh trạng thái hiện tại sau khi hoàn thành các Phase 1–4.

---

## ✅ Đã Hoàn Thành

### Phase 0 — Nền Tảng (Stable)

| Tính Năng | Mô Tả |
|-----------|--------|
| **Quản Lý Thành Viên** | CRUD đầy đủ: tạo, xem, sửa, xoá; hỗ trợ avatar, ngày âm lịch, ghi chú, is_deceased, is_in_law, birth_order, generation |
| **Cây Gia Phả (Tree View)** | Hiển thị dạng cây phân cấp, hỗ trợ pan/zoom, filter (ẩn vợ/chồng, ẩn nam/nữ), toggle avatar |
| **Mindmap View** | Hiển thị dạng radial từ gốc |
| **List View** | Danh sách thành viên dạng bảng với tìm kiếm & lọc |
| **Quản Lý Quan Hệ** | Hôn nhân, con ruột, con nuôi, cha dượng/mẹ kế, anh chị em, anh chị em cùng cha/mẹ khác, cha đỡ đầu |
| **Tính Danh Xưng (Kinship)** | Tự động tính xưng hô tiếng Việt, hỗ trợ 9 cấp tổ tiên & 8 cấp con cháu |
| **Thống Kê Gia Đình** | Biểu đồ phân bố giới tính, thế hệ, độ tuổi |
| **Sự Kiện & Lịch** | Sinh nhật (dương lịch), giỗ (âm lịch), sự kiện tùy chỉnh; hiển thị 30 ngày tới trên Dashboard |
| **Xuất / Nhập Dữ Liệu** | JSON (full backup), GEDCOM (chuẩn quốc tế), CSV+ZIP |
| **Xác Thực & Phân Quyền** | Supabase Auth (email/password), 3 vai trò: Admin / Editor / Member; RLS policies |
| **Âm Lịch** | Chuyển đổi dương↔âm lịch cho ngày sinh nhật, ngày giỗ |

### Phase 1 — Hoàn Thiện Tính Năng (✅ Xong)

| Issue | Tính Năng | PR |
|-------|-----------|-----|
| #1 | Hoàn thiện Quản lý Sự kiện (sửa/xoá, lịch sử, phân loại) | #23 |
| #2 | Hoàn thiện Chi tiết Cá nhân Riêng tư (SĐT, nghề nghiệp, nơi ở) | #23 |
| #3 | Xuất ảnh cây gia phả PNG/PDF | #23 |
| #4 | Tìm kiếm & Lọc trong List View (tên, thế hệ, giới tính, trạng thái) | #23 |

### Phase 2 — Tính Năng Mới Quan Trọng (✅ Xong)

| Issue | Tính Năng | PR |
|-------|-----------|-----|
| #5 | 🔍 Global Search (Ctrl+K) — tìm theo tên, năm sinh, nơi sinh | #24 |
| #6 | 📋 Audit Log — lịch sử chỉnh sửa, trang `/dashboard/history` | #25 |
| #7 | ⚠️ Duplicate Detection — cảnh báo khi tạo/sửa trùng tên+năm sinh | #26 |
| #8 | 🔗 Extended Relationship Types — 6 loại quan hệ mới | #27 |

### Phase 3 — Trải Nghiệm Người Dùng (✅ Xong)

| Issue | Tính Năng | PR |
|-------|-----------|-----|
| #10 | 📅 Family Timeline — dòng thời gian sự kiện gia đình | #28 |
| #14 | 🗂️ Bulk Operations — chọn nhiều, xoá hàng loạt (Admin only) | #29 |
| #16 | 🌙 Dark Mode — toggle sáng/tối, lưu preference | #30 |
| #19 | 🖨️ Print Mode — layout tối ưu cho in ấn | #31 |
| #12 | 📝 Rich Text Notes — markdown editor với toolbar | #32 |
| #13 | 👁️ Public/Anonymous View — chia sẻ cây gia phả công khai | #33 |

### Phase 4 — Platform Expansion (✅ Xong)

| Issue | Tính Năng | PR |
|-------|-----------|-----|
| #15 | 📱 PWA — cài đặt như app, offline fallback | #34 |
| #18 | 🔄 Auto DB Migration — migration status dashboard tại `/setup` | #35 |
| #11 | 🖼️ Photo Gallery — nhiều ảnh/thành viên, lightbox, upload | #36 |
| #21 | 🔌 Public REST API — API key management, 5 endpoints | #37 |

---

## 🚧 Đang Lên Kế Hoạch / Chưa Triển Khai

### Issue #9 — Email Notifications (Priority: MEDIUM 🟡)

Gửi email nhắc nhở sinh nhật / giỗ qua Supabase Edge Functions.

**Yêu cầu:**
- Supabase Edge Function (Deno) + cron trigger
- Settings: bao nhiêu ngày trước, ai nhận thông báo
- Email provider (Resend/SendGrid) cần cấu hình bên ngoài
- Opt-in per user

**Ước lượng độ phức tạp:** Cao (cần Edge Functions, email provider, cron)

---

### Issue #17 — Đa Ngôn Ngữ (Priority: MEDIUM 🟡)

Hỗ trợ tiếng Anh và Hán-Nôm cho cộng đồng hải ngoại.

**Yêu cầu:**
- `next-intl` library
- Dịch toàn bộ UI (~200+ chuỗi)
- Hỗ trợ Hán-Nôm (phức tạp — font và keyboard input)
- Language switcher trong header

**Ước lượng độ phức tạp:** Cao (nhiều file cần cập nhật)

---

### Issue #20 — Map View (Priority: LOW 🟢)

Hiển thị gốc địa lý (quê quán, nơi sinh) trên bản đồ.

**Yêu cầu:**
- OpenStreetMap + Leaflet.js (hoặc react-leaflet)
- Geocoding quê quán → tọa độ
- Trang `/dashboard/map` với markers cho từng thành viên
- Lọc theo thế hệ/nhánh

**Ước lượng độ phức tạp:** Trung bình

---

## Ghi Chú Kỹ Thuật

- **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase
- **RLS:** Mọi bảng mới cần RLS policies phù hợp với hệ thống vai trò (Admin/Editor/Member/anon)
- **Service Role Key:** `SUPABASE_SERVICE_ROLE_KEY` cần được cấu hình khi sử dụng REST API
- **PWA:** Service worker tại `public/sw.js`, manifest tại `public/manifest.json`
- **Dark Mode:** `@custom-variant dark` trong Tailwind CSS 4, anti-FOUC script trong `app/layout.tsx`
- **Audit Log:** Index trên `changed_at` và `person_id` để tránh chậm khi dữ liệu lớn
- **Photo Gallery:** Cần bật Supabase Storage bucket `person-photos`
- **Edge Functions:** Cần triển khai Supabase Edge Functions cho email notifications (#9)
