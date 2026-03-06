# Tổng Hợp Dự Án — Gia Phả OS

> Phiên bản fork: [minhtuancn/giapha-os](https://github.com/minhtuancn/giapha-os)  
> Upstream gốc: [homielab/giapha-os](https://github.com/homielab/giapha-os)  
> Stack: **Next.js · Supabase · TypeScript · Tailwind CSS**

---

## Mục tiêu dự án

Ứng dụng web quản lý **gia phả** cho gia đình người Việt:
- Lưu trữ hồ sơ thành viên qua nhiều thế hệ
- Trực quan hóa sơ đồ cây gia phả
- Tính toán **danh xưng tiếng Việt** tự động (chú, bác, cô, cháu...)
- Nhắc nhở sinh nhật & ngày giỗ theo âm lịch / dương lịch
- Xuất/nhập dữ liệu nhiều định dạng

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────┐
│           Next.js App Router            │
│  pages / server actions / middleware    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│              Supabase                   │
│  PostgreSQL · Auth · Storage (avatars)  │
│  RLS policies · RPC functions           │
└─────────────────────────────────────────┘
```

---

## Tính Năng Hiện Tại

### 👥 Quản lý thành viên
| Tính năng | Mô tả |
|-----------|-------|
| Hồ sơ thành viên | Tên, giới tính, ngày sinh/mất, ảnh đại diện, ghi chú, biệt danh |
| Thông tin riêng tư | Số điện thoại, nghề nghiệp, nơi ở (chỉ admin xem) |
| Thêm / Sửa / Xóa | Kiểm tra ràng buộc quan hệ trước khi xóa |
| Upload ảnh | Lưu trên Supabase Storage, hỗ trợ PNG/JPG/GIF |
| Phân thế hệ | Tracking `generation`, `birth_order` |
| Con nuôi / Con đẻ | Phân biệt loại quan hệ `biological_child` / `adopted_child` |

### 🌳 Sơ đồ gia phả
| Tính năng | Mô tả |
|-----------|-------|
| Cây phả hệ | Interactive tree với zoom/pan bằng chuột & touchpad |
| Mindmap | Hiển thị dạng mind-map, trực quan hơn với gia đình nhỏ |
| Danh sách | List view với tìm kiếm nhanh |
| Lọc | Theo giới tính, ẩn/hiện vợ-chồng ngoài dòng họ |
| Chọn gốc cây | Hiển thị từ bất kỳ thành viên nào |

### 💑 Quan hệ gia đình
| Tính năng | Mô tả |
|-----------|-------|
| Hôn nhân | Ghi nhận cặp vợ chồng |
| Quan hệ cha-con | Cha/mẹ — con đẻ / con nuôi |
| Danh xưng tự động | Tính toán "Chú gọi Cháu", "Em gọi Anh"... theo luật seniority VN |

### 📅 Sự kiện & lịch
| Tính năng | Mô tả |
|-----------|-------|
| Sinh nhật | Hiển thị sắp tới, hỗ trợ dương & âm lịch |
| Ngày giỗ | Tính ngày mất theo âm lịch, hiển thị năm tiếp theo |
| Sự kiện tùy chỉnh | Thêm sự kiện gia đình (họp mặt, lễ...) |
| Dashboard nhắc nhở | Danh sách sự kiện sắp diễn ra trên trang chủ |

### 📊 Thống kê
| Tính năng | Mô tả |
|-----------|-------|
| Tổng số thành viên | Đếm theo giới tính |
| Thống kê thế hệ | Số người mỗi thế hệ |
| Số cặp hôn nhân | Thống kê quan hệ |
| Biểu đồ | Trực quan hóa dữ liệu gia phả |

### 💾 Dữ liệu
| Tính năng | Mô tả |
|-----------|-------|
| Export JSON | Backup toàn bộ / theo nhánh cây |
| Import JSON | Khôi phục từ backup (chunk 200 items) |
| Export GEDCOM | Tương thích phần mềm gia phả quốc tế (GEDCOM 7.0) |
| Import GEDCOM | Nhập từ Family Tree Maker, Ancestry... |
| Export CSV/ZIP | Xuất file bảng tính |

### 👤 Quản lý người dùng
| Tính năng | Mô tả |
|-----------|-------|
| 3 vai trò | `admin` · `editor` · `member` |
| Phê duyệt tài khoản | Admin bật/tắt `is_active` |
| Tạo tài khoản | Admin tạo user với email + mật khẩu |
| Đổi vai trò | Admin gán lại role |
| Xóa tài khoản | Admin xóa user |

---

## Vấn Đề Cần Fix (Trước Khi Production)

### 🔴 Critical
**RLS Policy không khớp với Application Logic** (`docs/schema.sql`)  
Schema chỉ cho phép `admin` INSERT/UPDATE/DELETE nhưng app logic cho phép cả `editor`. Editor sẽ luôn nhận lỗi "permission denied" dù UI cho phép thao tác.

**Fix cần làm:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_editor() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER;
```
Sau đó cập nhật các policy INSERT/UPDATE/DELETE trên `persons`, `relationships`, `custom_events`.

### 🟠 High
**Thiếu validation file upload** (`components/MemberForm.tsx`)  
UI hiển thị "tối đa 2MB" nhưng không có code kiểm tra — user có thể upload file 100MB.

```typescript
if (file.size > 2 * 1024 * 1024) {
  setError("File quá lớn, vui lòng chọn ảnh dưới 2MB");
  return;
}
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!ALLOWED.includes(file.type)) {
  setError("Chỉ chấp nhận ảnh PNG, JPG, GIF");
  return;
}
```

---

## Đề Xuất Phát Triển

Các tính năng được sắp xếp theo mức độ ưu tiên và giá trị thực tế:

### 🔥 Ưu tiên cao — Ảnh hưởng trực tiếp người dùng

#### 1. Thông báo sinh nhật & ngày giỗ qua Email
**Vấn đề giải quyết:** Gia đình đông người dễ bỏ sót ngày quan trọng  
**Cách làm:** Cron job hàng ngày → query events sắp tới → gửi email qua Resend/SendGrid  
**Bảng cần thêm:** `notification_settings (user_id, days_before, channels)`  
**Effort:** Medium

#### 2. Tính năng "Đề xuất duyệt" cho Editor
**Vấn đề giải quyết:** Editor hiện không làm được gì do lỗi RLS (xem phần fix)  
**Sau khi fix RLS:** Có thể mở rộng thêm luồng duyệt: Editor tạo → Admin approve  
**Cách làm:** Thêm trạng thái `draft` / `published` cho persons  
**Effort:** Medium

#### 3. Tìm kiếm nâng cao
**Vấn đề giải quyết:** Gia phả 500+ người, tìm theo tên không đủ  
**Tính năng:** Lọc theo năm sinh, thế hệ, địa danh, nghề nghiệp, còn sống/đã mất  
**Cách làm:** Full-text search Supabase + filter UI  
**Effort:** Low-Medium

#### 4. Export PDF sơ đồ gia phả
**Vấn đề giải quyết:** In ra để dùng trong lễ giỗ, họp mặt gia đình  
**Note:** `jspdf` đã có trong dependencies nhưng chưa được dùng  
**Cách làm:** Capture SVG tree → jsPDF → download  
**Effort:** Low

---

### ⭐ Ưu tiên trung bình — Nâng cao trải nghiệm

#### 5. Audit Log — Lịch sử thay đổi
**Vấn đề giải quyết:** Ai sửa thông tin gì, khi nào? Tránh tranh chấp dữ liệu  
**Cách làm:** PostgreSQL trigger ghi vào bảng `audit_logs`  
**Bảng:** `audit_logs (id, table_name, record_id, action, old_data, new_data, user_id, created_at)`  
**Effort:** Low

#### 6. Chia sẻ công khai (Public Share)
**Vấn đề giải quyết:** Khách mời (không có tài khoản) vẫn xem được gia phả  
**Cách làm:** Generate shareable link với token → trang public read-only  
**Bảng:** `share_tokens (token, expires_at, permissions)`  
**Effort:** Medium

#### 7. Lịch sử ảnh thành viên
**Vấn đề giải quyết:** Thay ảnh mới thì mất ảnh cũ  
**Cách làm:** Lưu nhiều ảnh, 1 ảnh `is_primary`  
**Bảng:** `person_photos (id, person_id, url, is_primary, uploaded_at)`  
**Effort:** Low

#### 8. Thêm nhiều loại sự kiện
**Vấn đề giải quyết:** Hiện chỉ có sinh nhật / ngày giỗ  
**Tính năng:** Ngày cưới, ngày xuất gia, ngày khai hoa, tốt nghiệp...  
**Effort:** Low

#### 9. Import GEDCOM nâng cao
**Vấn đề giải quyết:** Tương thích tốt hơn với Ancestry.com, FamilySearch  
**Cách làm:** Hỗ trợ đầy đủ GEDCOM 5.5.1 spec, map thêm fields  
**Effort:** Medium

---

### 💡 Ưu tiên thấp — Tính năng premium

#### 10. Phân quyền chi tiết (Permission-based)
**Vấn đề giải quyết:** 3 roles hiện tại quá đơn giản với gia đình lớn nhiều nhánh  
**Tính năng:** "Chỉ sửa được nhánh của mình", "Xem nhưng không xem thông tin riêng tư"  
**Effort:** High

#### 11. Mobile App (PWA)
**Vấn đề giải quyết:** Người lớn tuổi dùng điện thoại nhiều hơn desktop  
**Cách làm:** Next.js đã hỗ trợ PWA — thêm manifest + service worker  
**Effort:** Low-Medium

#### 12. AI nhận diện quan hệ từ ảnh chứng minh
**Vấn đề giải quyết:** Nhập liệu thủ công mất thời gian  
**Tính năng:** OCR thông tin từ ảnh CMND/hộ khẩu → tự điền form  
**Effort:** High

#### 13. Bản đồ địa danh
**Vấn đề giải quyết:** Trực quan hóa gia đình phân bố ở đâu  
**Tính năng:** Map hiển thị nơi sinh, nơi ở hiện tại của từng thành viên  
**Effort:** Medium

#### 14. Đa ngôn ngữ (i18n)
**Vấn đề giải quyết:** Thành viên gia đình ở nước ngoài  
**Cách làm:** next-intl, hỗ trợ EN/VI  
**Effort:** Medium

---

## Roadmap Đề Xuất

```
Phase 1 — Ổn định (Fix bugs)
├── Fix RLS policy cho editor role         [Critical]
├── Validation file upload                 [High]
└── Viết unit test kinshipHelpers          [Medium]

Phase 2 — Tính năng cốt lõi
├── Thông báo email sinh nhật/giỗ
├── Audit log
├── Tìm kiếm nâng cao
└── Export PDF sơ đồ

Phase 3 — Mở rộng
├── Public share link
├── Luồng duyệt cho Editor
├── Lịch sử ảnh
└── PWA mobile

Phase 4 — Premium
├── Phân quyền chi tiết
├── Bản đồ địa danh
└── AI OCR nhập liệu
```

---

## Thống Kê Codebase

| Hạng mục | Số lượng |
|----------|----------|
| Pages / Routes | 14 |
| Server Actions | 8 |
| UI Components | 35+ |
| Utility modules | 8 |
| Custom Hooks | 1 |
| Database Tables | 6 |
| RLS Policies | 20+ |
| RPC Functions | 6 |
