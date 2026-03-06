# Git Workflow — Gia Phả OS

Dự án này là **fork** từ [homielab/giapha-os](https://github.com/homielab/giapha-os).  
Tài liệu này mô tả quy trình làm việc với Git cho toàn bộ team.

---

## Cấu trúc nhánh

```
upstream (homielab/giapha-os)
    │
    ▼
upstream-sync   ← chỉ dùng để nhận update từ upstream gốc
    │
    │ merge / cherry-pick
    ▼
main            ← nhánh ổn định, sản phẩm cuối sau khi merge
    ▲
    │ merge khi hoàn thành
dev             ← phát triển tính năng mới, fix lỗi
```

| Nhánh          | Mục đích                                      | Push trực tiếp |
|----------------|-----------------------------------------------|----------------|
| `upstream-sync`| Theo dõi upstream gốc, chỉ để sync            | ❌ Không        |
| `main`         | Sản phẩm ổn định, luôn deploy được            | ❌ Chỉ qua merge|
| `dev`          | Phát triển hàng ngày                          | ✅ Có           |

---

## 1. Phát triển tính năng mới

```bash
# Luôn bắt đầu từ dev đã được cập nhật
git checkout dev
git pull origin dev

# Code, thêm file, sửa lỗi...

# Commit
git add .
git commit -m "feat: mô tả ngắn gọn tính năng"

# Push lên remote
git push origin dev
```

### Quy tắc commit message

Dùng **Conventional Commits**:

| Prefix     | Khi nào dùng                          |
|------------|---------------------------------------|
| `feat:`    | Thêm tính năng mới                    |
| `fix:`     | Sửa lỗi                               |
| `refactor:`| Tái cấu trúc code, không thêm/xóa tính năng |
| `chore:`   | Cập nhật deps, config, CI             |
| `docs:`    | Thay đổi tài liệu                     |
| `style:`   | Chỉ thay đổi UI/CSS                   |

**Ví dụ:**
```bash
git commit -m "feat: thêm thông báo ngày giỗ qua email"
git commit -m "fix: sửa lỗi RLS policy cho role editor"
git commit -m "docs: cập nhật hướng dẫn cài đặt"
```

---

## 2. Merge dev → main (phát hành)

Khi `dev` đã ổn định và sẵn sàng phát hành:

```bash
# Đảm bảo dev không có thay đổi chưa commit
git checkout dev
git pull origin dev

# Chuyển sang main và merge
git checkout main
git pull origin main
git merge dev --no-ff -m "chore: merge dev vào main - [mô tả release]"

# Push main
git push origin main

# Quay lại dev để tiếp tục phát triển
git checkout dev
```

> **`--no-ff`** (no fast-forward): Luôn tạo merge commit rõ ràng để dễ theo dõi lịch sử.

---

## 3. Nhận update từ upstream gốc

Khi [homielab/giapha-os](https://github.com/homielab/giapha-os) có commit mới:

### Bước 1: Sync nhánh upstream-sync

```bash
git checkout upstream-sync
git pull upstream main
git push origin upstream-sync
```

### Bước 2: Kiểm tra những gì thay đổi

```bash
# Xem danh sách commit mới từ upstream
git log main..upstream-sync --oneline

# Xem diff chi tiết
git diff main..upstream-sync
```

### Bước 3a: Merge toàn bộ update vào main

Dùng khi muốn lấy tất cả thay đổi từ upstream:

```bash
git checkout main
git merge upstream-sync --no-ff -m "chore: sync từ upstream homielab/giapha-os"
git push origin main
```

### Bước 3b: Cherry-pick commit cụ thể (khuyến nghị)

Dùng khi chỉ muốn lấy một số fix/feature cụ thể từ upstream, tránh conflict:

```bash
# Lấy SHA của commit cần cherry-pick
git log upstream-sync --oneline

# Cherry-pick vào main
git checkout main
git cherry-pick <commit-sha>
git push origin main
```

### Bước 4: Đồng bộ dev sau khi main được cập nhật

```bash
git checkout dev
git merge main --no-ff -m "chore: cập nhật dev từ main sau sync upstream"
git push origin dev
```

---

## 4. Xử lý conflict

Khi merge gặp conflict:

```bash
# Git sẽ báo file nào bị conflict
git status

# Mở file và giải quyết thủ công (tìm <<<<<<, =======, >>>>>>>)
# Sau khi sửa xong:
git add <file-đã-sửa>
git commit -m "fix: resolve merge conflict từ upstream"
```

**Nguyên tắc ưu tiên khi conflict:**
- Giữ code của `dev`/`main` (code tùy chỉnh của dự án) trừ khi upstream fix bug quan trọng
- Không bao giờ xóa logic tính danh xưng tiếng Việt trong `kinshipHelpers.ts`

---

## 5. Kiểm tra trạng thái nhanh

```bash
# Xem các nhánh và commit hiện tại
git --no-pager branch -av

# So sánh dev với main
git log main..dev --oneline

# So sánh upstream-sync với main (update chưa lấy)
git log main..upstream-sync --oneline

# Xem remote
git remote -v
```

---

## Sơ đồ tổng quan

```
[upstream/main] ──pull──▶ [upstream-sync] ──merge/cherry-pick──▶ [main] ◀──merge── [dev]
                                                                     │                 │
                                                                  deploy             develop
```

---

## Remote đã cấu hình

| Remote     | URL                                           |
|------------|-----------------------------------------------|
| `origin`   | https://github.com/minhtuancn/giapha-os.git   |
| `upstream` | https://github.com/homielab/giapha-os.git     |
