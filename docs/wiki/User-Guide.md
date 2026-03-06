# 📋 Hướng Dẫn Sử Dụng

> Chi tiết từng tính năng của Giapha-OS.

---

## Tổng Quan Dashboard

Sau khi đăng nhập, bạn thấy Dashboard với các mục chính:

```
Dashboard (/)
├── Tổng quan         — thống kê, sự kiện sắp tới
├── Thành viên        — danh sách, tìm kiếm, lọc
│   ├── [id]          — chi tiết thành viên
│   └── [id]/edit     — chỉnh sửa
├── Cây Gia Phả       — tree view / mindmap
├── Thống Kê          — biểu đồ phân bố
├── Sự kiện           — lịch sinh nhật, giỗ
├── Dòng thời gian    — timeline gia đình
├── Bản đồ            — vị trí địa lý
├── Lịch sử           — audit log (admin)
├── Dữ liệu           — import/export
└── Cài đặt           — admin settings
```

---

## 👥 Quản Lý Thành Viên

### Thêm Thành Viên Mới

1. **Thành viên → Thêm mới** (hoặc nút `+` trên header)
2. Điền thông tin:
   - **Họ tên đầy đủ** *(bắt buộc)*
   - **Giới tính, Năm sinh/mất**
   - **Ngày sinh âm lịch** — tự động tính cho ngày giỗ
   - **Nơi sinh** — hiển thị trên bản đồ
   - **Nghề nghiệp, Học vấn, Tôn giáo**
   - **Ghi chú** — hỗ trợ Markdown (in đậm, in nghiêng, danh sách...)
   - **Ảnh đại diện** — upload từ máy tính
3. Nhấn **Lưu**

### Phát Hiện Trùng Lặp

Khi nhập tên + năm sinh, hệ thống tự động kiểm tra thành viên trùng:
- Cảnh báo xuất hiện nếu tìm thấy người có tên tương tự và năm sinh ±2 năm
- Bạn có thể bỏ qua và tiếp tục thêm mới

### Tìm Kiếm & Lọc

Trong trang **Thành viên**:
- **Thanh tìm kiếm** — lọc theo tên
- **Lọc theo**: thế hệ, giới tính, trạng thái (còn sống / đã mất), nhánh gia đình
- **Ctrl+K** — Global Search tìm nhanh từ bất kỳ trang nào

### Thao Tác Hàng Loạt *(Admin)*

1. Tích vào checkbox bên trái tên thành viên
2. Chọn nhiều bằng Shift+Click
3. Nhấn **Xoá đã chọn** — chỉ Admin mới thấy nút này

---

## 🌳 Cây Gia Phả

### Các Chế Độ Hiển Thị

| Chế độ | Mô tả |
|--------|-------|
| **Tree View** | Cây phân cấp từ trên xuống, có thể pan/zoom |
| **Mindmap** | Toả ra từ trung tâm, phù hợp cây lớn |

### Bộ Lọc Toolbar

- **Ẩn vợ/chồng** — chỉ hiện huyết thống
- **Ẩn nam / Ẩn nữ** — lọc theo giới tính
- **Hiện avatar** — bật/tắt ảnh đại diện trên node
- **Xuất PNG/PDF** — chụp toàn bộ cây thành ảnh

### Tương Tác

- **Click vào node** → xem chi tiết thành viên
- **Kéo để pan**, **Scroll để zoom**
- Node màu **vàng** = nam, **hồng** = nữ, **xám** = đã mất

---

## 🔗 Quản Lý Quan Hệ

### Các Loại Quan Hệ Được Hỗ Trợ

| Loại | Mô tả |
|------|-------|
| `marriage` | Hôn nhân |
| `biological_child` | Con ruột |
| `adopted_child` | Con nuôi |
| `step_parent` | Cha dượng / Mẹ kế |
| `sibling` | Anh chị em ruột |
| `half_sibling` | Anh chị em cùng cha/mẹ khác |
| `godparent` | Cha/Mẹ đỡ đầu |

### Thêm Quan Hệ

1. Vào trang chi tiết thành viên
2. Tab **Quan hệ** → **Thêm quan hệ**
3. Chọn loại quan hệ → tìm kiếm thành viên liên quan → **Lưu**

---

## 🤝 Tính Danh Xưng (Kinship)

Hệ thống tự động tính xưng hô tiếng Việt giữa 2 người bất kỳ:

1. **Dashboard → Danh xưng** (`/dashboard/kinship`)
2. Chọn **Người 1** và **Người 2**
3. Kết quả hiển thị: *"Người 1 gọi Người 2 là ____, Người 2 gọi Người 1 là ____"*

**Phạm vi hỗ trợ:** 9 cấp tổ tiên (cụ kỵ...) và 8 cấp con cháu (chắt chít...)

---

## 📅 Sự Kiện & Lịch

### Các Loại Sự Kiện

- **Sinh nhật** — tính từ ngày sinh dương lịch, hiển thị tuổi
- **Ngày giỗ** — tính từ ngày mất âm lịch (nếu có), tự động chuyển sang dương lịch năm hiện tại
- **Sự kiện tùy chỉnh** — đám cưới, họp mặt, giỗ tổ...

### Trang Sự Kiện

- Hiển thị **30 ngày tới** theo thứ tự
- Badge màu: 🔴 hôm nay, 🟡 trong 7 ngày, ⚪ xa hơn
- Lọc theo loại sự kiện

---

## 📸 Gallery Ảnh

Mỗi thành viên có thể có nhiều ảnh:

1. Trang chi tiết thành viên → tab **Ảnh**
2. **Upload ảnh** — kéo thả hoặc chọn file (JPG/PNG/WebP, tối đa 5MB)
3. Thêm **chú thích** cho từng ảnh
4. Click ảnh để xem **lightbox** toàn màn hình
5. Điều hướng bằng phím ← → hoặc nút

---

## 🗺️ Bản Đồ

Hiển thị quê quán của các thành viên trên OpenStreetMap:

1. **Dashboard → Bản đồ** (`/dashboard/map`)
2. Markers xanh = thành viên có thông tin **Nơi sinh**
3. Click marker → xem tên, năm sinh, nơi sinh
4. Sidebar: danh sách thành viên chưa có nơi sinh

> Geocoding sử dụng Nominatim (OpenStreetMap) — có thể mất vài giây khi có nhiều địa điểm mới.

---

## 📅 Dòng Thời Gian

**Dashboard → Dòng thời gian** (`/dashboard/timeline`)

Hiển thị tất cả sự kiện theo trục thời gian:
- Lọc theo loại: sinh nhật / ngày giỗ / sự kiện tùy chỉnh
- Lọc theo thế hệ
- Cuộn để xem toàn bộ lịch sử gia đình

---

## 📝 Ghi Chú Rich Text

Ô **Ghi chú** trong form thành viên hỗ trợ Markdown:

| Cú pháp | Kết quả |
|---------|---------|
| `**text**` | **in đậm** |
| `*text*` | *in nghiêng* |
| `# Tiêu đề` | Tiêu đề lớn |
| `- item` | Danh sách |
| `[link](url)` | Đường dẫn |

---

## 🖨️ In Ấn

Trong trang **Thành viên**:
1. Nhấn nút **🖨️ In danh sách**
2. Trình duyệt mở hộp thoại in
3. Layout tối ưu: ẩn sidebar, header, buttons — chỉ hiện bảng dữ liệu

---

## 🌙 Dark Mode

Nhấn nút **☀️/🌙** trên header dashboard để chuyển chế độ sáng/tối. Lựa chọn được lưu tự động vào trình duyệt.

---

## 🌐 Đa Ngôn Ngữ

Nhấn nút **🇻🇳/🇬🇧/🀄** trên header để chuyển ngôn ngữ:

| Flag | Ngôn ngữ |
|------|----------|
| 🇻🇳 | Tiếng Việt (mặc định) |
| 🇬🇧 | English |
| 🀄 | 漢字 (Hán-Nôm) |

---

## 📱 PWA — Cài Như App

Trên Chrome/Edge:
1. Nhấn nút **Install** trên thanh địa chỉ (hoặc menu ⋮)
2. Chọn **Install Giapha-OS**
3. App hiện trong màn hình desktop/home screen

Hỗ trợ **chế độ offline** — xem dữ liệu đã cache khi mất mạng.

---

## 📤 Import / Export Dữ Liệu

**Dashboard → Dữ liệu** (`/dashboard/data`):

| Định dạng | Import | Export | Mô tả |
|-----------|--------|--------|-------|
| **JSON** | ✅ | ✅ | Full backup — tất cả dữ liệu |
| **GEDCOM** | ✅ | ✅ | Chuẩn quốc tế, tương thích phần mềm khác |
| **CSV** | ❌ | ✅ | Bảng tính Excel/Sheets |

---

## 📊 Thống Kê

**Dashboard → Thống kê** (`/dashboard/stats`):

- Tổng số thành viên, nam/nữ, còn sống/đã mất
- Biểu đồ phân bố theo **thế hệ**
- Biểu đồ phân bố theo **độ tuổi**
- Số sự kiện sắp tới trong 30 ngày
