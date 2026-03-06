# 🗺️ Roadmap — Kế Hoạch Phát Triển Tương Lai

> Trạng thái: **v1.5.3 Released** — Security & Reliability. 0 open issues. v1.6.0 đang lên kế hoạch.

---

## ✅ Đã Hoàn Thành

### v1.0 (Phase 0–4)

| Phase | Tính năng | PR |
|-------|-----------|-----|
| 0 | Core: CRUD, Tree View, Kinship, Events, Auth | baseline |
| 1 | Global Search, Audit Log, Duplicate Detection, Extended Relations | #23–#27 |
| 2 | Timeline, Bulk Ops, Dark Mode, Print, Rich Notes, Public View | #28–#33 |
| 3 | PWA, DB Migration, Photo Gallery, REST API | #34–#37 |
| 4 | Map View, i18n (VI/EN/漢字), Email Notifications | #38–#41 |

### v1.1 (Phase 5 — Grave Module)

| Tính năng | PR | Issue |
|-----------|-----|-------|
| 🪦 Grave Records Schema & Actions | #50 | #44 |
| 🪦 Grave Detail UI (badges, timeline, form) | #51 | #45 |
| 🗺️ Cemetery Map với GPS markers | #52 | #46 |
| 🕯️ Public Memorial Page + QR Code | #53 | #48 |
| 🔔 Tết Thanh Minh Reminders | #54 | #49 |
| 📸 Grave Photos & 360° Panorama Viewer | #55 | #47 |

### v1.2 (Phase 6 — Extended Profiles & Privacy) ✅ Hoàn Thành

| Tính năng | PR | Issue |
|-----------|-----|-------|
| ✅ 📊 Enhanced Statistics (age, marital, polygamy, religion) | #68 | #57 |
| ✅ 🧑‍💼 Extended Personal Profile (religion, titles, career) | #69 | #59 |
| ✅ 🔒 Privacy Controls (name masking, privacy_level) | #70 | #58 |
| ✅ 🌿 Branch/Chi Management | #71 | #60 |
| ✅ ⚙️ User View Preferences (default root, branch, generation) | #72 | #67 |

### v1.3 (Phase 7 — Public Dashboard) — Đang triển khai

| Tính năng | PR | Issue |
|-----------|-----|-------|
| ✅ 🏠 Public Homepage Dashboard + Announcements | #75 | #74 |
| 🔄 🛡️ Admin Approval Workflow | — | #65 |
| 🔄 🔑 Invitation + Onboarding + Verification | — | #64 |
| 🔄 🆔 CCCD Unique ID | — | #66 |
| 🔄 📅 Family Events & Photos | — | #61 |
| 🔄 📋 Activity Auto-Timeline | — | #62 |
| 🔄 💬 Telegram & Zalo Notifications | — | #63 |

### ✅ v1.5.0 — i18n + AI Bot Module (Đã hoàn thành)

| # | Tính năng | Status |
|---|-----------|--------|
| #81 | 🌐 i18n 211 keys, 12 namespaces, vi/en/zh | ✅ |
| #82 | 🤖 Per-branch Telegram Bot + webhook | ✅ |
| #83 | 🧠 AI Chat BYOK/OpenAI/Anthropic/OpenRouter | ✅ |
| #84 | ⏰ Scheduled Reminders — giỗ 3x, sự kiện | ✅ |
| #85 | 🔑 Subscription & Rate Limiting, /admin | ✅ |
| #86 | 🌐 Zalo OA + BotPlatform multi-platform | ✅ |

### ✅ v1.5.1 — Demo & UI Improvements (Đã hoàn thành)

- Demo URL cập nhật → `giapha-os-rose.vercel.app`
- Thông tin liên hệ nhà phát triển (Minh Tuấn, Ninh Bình)
- Trang `/about` bổ sung developer card
- HeaderMenu: link `/admin` cho admin users
- LandingHero: nút "Xem Demo"

### ✅ v1.5.2 — Security Patch (Đã hoàn thành)

- Demo credentials: `demo@example.com` / `demo@123`
- `requireAdmin()` guard trên tất cả 7 server actions quản lý user
- Password validation tối thiểu 8 ký tự
- Reminder cron: try/catch toàn diện cho cả 3 loại nhắc nhở

### ✅ v1.5.3 — Security & Reliability (Đã hoàn thành)

| Issue | Fix |
|-------|-----|
| #95/#99 | ⚡ Atomic rate limiter: PostgreSQL RPC `check_and_increment_ai_quota()` với `SELECT FOR UPDATE` |
| #96 | 🔒 Zalo webhook HMAC-SHA256 signature verification (`ZALO_OA_SECRET`) |
| #97 | ✅ Import data: validation toàn diện (UUID, types, referential integrity, limits) |
| #98 | 📊 Reminder Logs admin page `/admin/reminder-logs` + `error_message` column |

---

## 🚀 Phase 7+ — Tiếp Theo

### 🔔 Notifications Nâng Cao
- [ ] Push notifications (Web Push API) — nhận thông báo ngay trên trình duyệt
- [ ] Webhook tùy chỉnh — gửi HTTP POST khi có sự kiện
- [ ] Telegram Bot integration

### 🌳 Cây Gia Phả Nâng Cao
- [ ] Highlight nhánh gia đình khi hover
- [ ] Tìm kiếm và focus vào node trên tree
- [ ] Thu gọn/mở rộng nhánh (collapse/expand subtree)
- [ ] Chế độ xem theo nhánh riêng (filter by branch)

### 👤 Hồ Sơ Thành Viên
- [ ] Nhiều ảnh đại diện theo thời kỳ (trẻ em, thanh niên, già)
- [ ] Video ngắn đính kèm
- [ ] Link liên kết với hồ sơ mạng xã hội
- [ ] QR code danh thiếp điện tử

### 🪦 Grave Module Nâng Cao
- [ ] So sánh / hiển thị nhiều mộ trên cùng bản đồ
- [ ] Xem mộ 3D (Three.js / model upload)
- [ ] Chia sẻ link tưởng niệm qua mạng xã hội (đã có OG tags)
- [ ] Nhắc ngày giỗ + chăm mộ định kỳ (ngoài Thanh Minh)
- [ ] Upload nhiều ảnh 360° (gallery panorama)

---

## 🚀 v1.3 — Cộng Tác & Chia Sẻ

### 👨‍👩‍👧‍👦 Multi-Family Support
- [ ] Nhiều gia đình trong một instance
- [ ] Workspace isolation — mỗi gia đình có data riêng
- [ ] Billing per workspace (SaaS model)

### 🤝 Collaborative Editing
- [ ] Invite link cho editor/member cụ thể
- [ ] Real-time presence (xem ai đang online)
- [ ] Conflict resolution khi edit đồng thời
- [ ] Comment thread trên từng thành viên

### 📱 Mobile App
- [ ] React Native app (dùng lại logic từ web)
- [ ] Offline-first với sync khi có mạng
- [ ] Camera trực tiếp để chụp ảnh thành viên

---

## 🚀 v2.0 — AI & Intelligence

### 🤖 AI Features
- [ ] **OCR ảnh tài liệu cũ** — tự động đọc thông tin từ ảnh chụp sổ hộ khẩu, giấy khai sinh
- [ ] **Auto-suggest quan hệ** — dựa trên tuổi và tên gợi ý quan hệ cha/mẹ/con
- [ ] **AI chatbot** — hỏi "Ông nội tôi có mấy anh em?" và nhận câu trả lời tự nhiên
- [ ] **Duplicate detection nâng cao** — fuzzy matching tên, xử lý biến thể (Nguyễn/Nguyên)

### 📊 Advanced Analytics
- [ ] Bản đồ di trú — trace hành trình di chuyển qua các thế hệ
- [ ] DNA/gene trait tracking (nhóm máu, đặc điểm di truyền)
- [ ] Phân tích tuổi thọ theo thế hệ
- [ ] Xuất báo cáo PDF đẹp (gia phả truyền thống)

### 🌏 Internationalization Nâng Cao
- [ ] Thêm ngôn ngữ: Khmer, Lào, Thái (Southeast Asia)
- [ ] Hỗ trợ lịch Khmer, lịch Thái
- [ ] RTL layout cho tiếng Ả Rập (cộng đồng Hồi giáo VN)

---

## 🚀 v2.1 — Ecosystem

### 🔌 Integrations
- [ ] Ancestry.com / FamilySearch import
- [ ] Google Photos album sync
- [ ] iCloud/Google Contacts sync
- [ ] Facebook Groups import danh sách thành viên

### 📖 Xuất Bản
- [ ] Xuất sách gia phả PDF đẹp (LaTeX template)
- [ ] In ấn chuyên nghiệp — xuất file cho nhà in
- [ ] Website tĩnh — xuất toàn bộ gia phả thành HTML tĩnh để host miễn phí

### 🏛️ Heritage Preservation
- [ ] Tích hợp bản đồ lịch sử (đất nước thay đổi theo thời kỳ)
- [ ] Gắn sự kiện lịch sử (chiến tranh, thiên tai) vào timeline gia đình
- [ ] Lưu trữ tài liệu số hoá (bằng khoán, di chúc, ảnh tư liệu)

---

## 🐛 Known Issues & Technical Debt

| Issue | Priority | Mô tả |
|-------|----------|-------|
| Nominatim geocoding chậm | Medium | Cache kết quả vào DB thay vì chỉ memory |
| Tree view performance | Medium | Virtualization cho cây >500 nodes |
| i18n coverage | Low | Chỉ dịch navigation, cần dịch full UI |
| Mobile responsiveness | Medium | Một số trang chưa tối ưu màn hình nhỏ |

---

## 📣 Đề Xuất Tính Năng

Có ý tưởng? Tạo [GitHub Issue](https://github.com/minhtuancn/giapha-os/issues/new) với label `enhancement`!

Checklist tốt cho một feature request:
- [ ] Mô tả vấn đề hiện tại
- [ ] Đề xuất giải pháp
- [ ] Mockup / wireframe (nếu có)
- [ ] Mức độ ưu tiên (must-have / nice-to-have)

---

## 🔮 v1.6.0 — Phase 12 (Kế Hoạch)

| Tính năng | Mô tả |
|-----------|-------|
| 📱 PWA | Cài đặt như app trên điện thoại, offline cache |
| 🌙 Dark Mode | Chế độ tối / sáng |
| 🖨️ Print Mode | Xuất cây gia phả PDF A3/A2 |
| 🗺️ Map View | Bản đồ gốc địa lý (quê quán, nơi sinh) |
| 🔌 Public API | REST API + API key management |
| 🤖 Bot Enhancement | Hỗ trợ nhóm Telegram native, WhatsApp |
