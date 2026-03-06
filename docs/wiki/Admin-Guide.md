# ⚙️ Hướng Dẫn Admin

> Dành cho tài khoản có vai trò **Admin**.

---

## Phân Quyền

Giapha-OS có 3 vai trò:

| Vai trò | Xem | Thêm/Sửa | Xoá | Cài đặt |
|---------|-----|-----------|-----|---------|
| **Member** | ✅ | ❌ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |

### Gán Quyền Người Dùng

**Dashboard → Người dùng** (`/dashboard/users`):
1. Xem danh sách tất cả tài khoản
2. Thay đổi vai trò: click dropdown bên cạnh tên → chọn role mới

Hoặc trực tiếp trong Supabase SQL Editor:
```sql
-- Gán Editor
UPDATE public.user_roles SET role = 'editor'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Gán Admin
UPDATE public.user_roles SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```

---

## Cài Đặt Hệ Thống

**Dashboard → Cài đặt** (`/dashboard/settings`)

### Chia Sẻ Công Khai

Cho phép bất kỳ ai xem cây gia phả mà không cần đăng nhập:

1. Bật **"Chia sẻ công khai"**
2. Copy **link chia sẻ** (dạng `/public/[token]`)
3. Share link — người xem thấy danh sách thành viên (không thể chỉnh sửa)
4. Nhấn **"Tạo link mới"** để vô hiệu link cũ

### API Key

Dùng để tích hợp với các ứng dụng bên ngoài qua [REST API](API-Reference.md):

1. Bật **"REST API"**
2. Copy **API Key** (dạng `giapha_xxxx`)
3. Dùng trong header: `X-API-Key: giapha_xxxx`
4. Nhấn **"Tạo key mới"** để invalidate key cũ

### Email Thông Báo

Gửi email nhắc nhở sinh nhật / ngày giỗ:

1. Bật **"Thông báo email"**
2. Chọn **"Nhắc trước"**: 1 ngày / 3 ngày / 7 ngày
3. Thêm **địa chỉ email** nhận thông báo
4. Nhấn **"Gửi test email"** để kiểm tra
5. Cần cấu hình `RESEND_API_KEY` và `CRON_SECRET` trong env

---

## Lịch Sử Chỉnh Sửa (Audit Log)

**Dashboard → Lịch sử** (`/dashboard/history`) — chỉ Admin:

- Xem toàn bộ hành động: tạo, sửa, xoá thành viên
- Thông tin: thời gian, người thực hiện, loại thay đổi, nội dung trước/sau
- Lọc theo loại hành động hoặc thành viên

---

## Quản Lý Database Migration

**Dashboard → `/setup`**:

- Hiển thị trạng thái từng migration
- ✅ Đã áp dụng / ❌ Chưa áp dụng
- Hướng dẫn chạy migration còn thiếu

---

## Backup & Restore

### Backup Toàn Bộ (JSON)

1. **Dashboard → Dữ liệu → Export → JSON**
2. Lưu file `giapha-backup-[date].json`
3. Backup định kỳ (khuyến nghị: mỗi tuần)

### Restore Từ Backup

1. **Dashboard → Dữ liệu → Import → JSON**
2. Chọn file backup
3. ⚠️ Import sẽ **ghi đè** dữ liệu hiện tại

### Backup Tự Động (Supabase)

Supabase Pro plan hỗ trợ Point-in-Time Recovery. Free plan có daily backup giữ 7 ngày.

Vào **Supabase → Database → Backups** để restore.

---

## Bảo Mật

### Recommendations

- Chỉ cấp quyền **Admin** cho người thực sự cần
- Xoay **API Key** định kỳ (3–6 tháng)
- Bật **2FA** cho tài khoản Supabase
- Không share `SUPABASE_SERVICE_ROLE_KEY` — chỉ dùng phía server
- Đặt `CRON_SECRET` ngẫu nhiên đủ dài (≥32 ký tự)

### RLS (Row Level Security)

Tất cả bảng đều bật RLS. Chính sách:
- **Anon** (chưa đăng nhập): chỉ đọc dữ liệu khi public share được bật
- **Member**: chỉ đọc
- **Editor**: đọc + tạo mới + sửa (không xoá)
- **Admin**: toàn quyền

---

## Troubleshooting

### Người dùng không thể đăng nhập

```sql
-- Kiểm tra user_roles
SELECT u.email, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id;

-- Thêm role nếu thiếu
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member' FROM auth.users WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;
```

### Cây gia phả không hiển thị đúng

- Kiểm tra mỗi thành viên có ít nhất 1 quan hệ
- Thành viên không có quan hệ sẽ hiện ở gốc cây

### Email không gửi được

1. Kiểm tra `RESEND_API_KEY` đúng
2. Resend → Domains → verify domain gửi mail
3. Test thủ công: `GET /api/notifications/send?token=YOUR_CRON_SECRET`
4. Xem logs Coolify/Vercel để tìm lỗi
