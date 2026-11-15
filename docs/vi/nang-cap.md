# Nâng cấp

[Tiếng Việt](nang-cap.md) | [English](../en/upgrade.md) · [← README](../../README.md)

## Nâng cấp hệ thống trong Dashboard

Admin có thể mở mục **Nâng cấp hệ thống** trong menu quản trị để kiểm tra version source code trên GitHub và version database, sau đó chạy các migration còn thiếu. Nếu source code hiện tại cũ hơn version mới nhất trên GitHub, hệ thống sẽ yêu cầu cập nhật source code trước khi cho phép chạy migration. Tính năng migration trực tiếp chỉ hoạt động khi đã cấu hình `SUPABASE_DB_URL` ở server. Nếu chưa cấu hình, trang `/dashboard/upgrade` vẫn cho phép copy SQL bundle tại `/setup` để chạy thủ công.

**Phục hồi dữ liệu cần migration `20261026000000_add_restore_backup.sql`.** Từ bản này, chức năng phục hồi (Dashboard → Dữ liệu) chạy trong một transaction của database qua hàm `restore_backup`: nếu có lỗi giữa chừng, dữ liệu hiện tại được giữ nguyên. Bản tự host đã cài từ trước cần chạy migration này (bấm chạy migration ở `/dashboard/upgrade`, hoặc chạy file trong `docs/migrations/` bằng Supabase SQL Editor). Khi chưa chạy, phục hồi vẫn hoạt động theo cách cũ (xoá rồi chèn từng phần, không có transaction) và hiển thị nhắc nâng cấp database. File phục hồi tối đa 25 MB; trên Vercel, request gửi lên server bị giới hạn khoảng 4,5 MB, nên gia phả rất lớn (vài nghìn thành viên trở lên) nên phục hồi trên bản self-host.

**Cập nhật thế hệ cần migration `20261026120000_add_update_generations.sql`.** Nút "Áp dụng" ở trang Phả hệ và tuỳ chọn cập nhật thế hệ con cháu khi sửa thành viên lưu tất cả thành viên bằng một lần gọi hàm `update_generations` của database, trong một transaction: một dòng lỗi (thành viên vừa bị xoá, không có quyền sửa) thì không dòng nào bị đổi và ứng dụng báo lỗi. Hàm chạy với quyền của người gọi (SECURITY INVOKER) nên RLS của bảng `persons` vẫn áp dụng. Khi chưa chạy migration, ứng dụng cập nhật từng người như trước và nhắc nâng cấp database.

**Gộp hồ sơ trùng cần migration `20261027120000_add_merge_persons.sql`.** Công cụ "Người có thể trùng" (Dashboard → Sao lưu & phục hồi) có nút gộp hai hồ sơ thành một qua hàm `merge_persons` của database, trong một transaction: quan hệ của hồ sơ bị gộp được chuyển sang hồ sơ giữ (quan hệ trùng và quan hệ giữa hai hồ sơ bị bỏ), chi tiết riêng tư điền vào trường trống của hồ sơ giữ, các trường trống (ngày sinh/mất, đời, thứ tự con, ảnh đại diện) lấy giá trị của hồ sơ bị gộp, tên khác được nhớ lại và ghi chú được nối thêm, rồi hồ sơ bị gộp bị xoá. Ứng dụng bắt buộc xem trước nội dung sẽ chuyển, khuyến nghị tải bản sao lưu trước và phải gõ đúng tên hồ sơ bị xoá mới cho chạy. Nếu sau khi gộp hồ sơ giữ sẽ có hơn 2 cha mẹ ruột, 2 cha mẹ ruột cùng giới, hoặc một hồ sơ là tổ tiên của hồ sơ kia (cây thành vòng lặp), phần xem trước hiện cảnh báo và phải tick "Tôi hiểu" mới gõ tên xác nhận được. Gộp không thể hoàn tác; một lỗi giữa chừng thì không gì bị đổi. Chỉ admin dùng được. Khi chưa chạy migration, nút gộp nhắc nâng cấp database.

**Sự kiện lặp hằng năm cần migration `20261027180000_custom_events_recurrence.sql`.** Migration thêm cột `recurrence` vào bảng `custom_events` (`none` = một lần, `yearly_solar` = hằng năm theo ngày/tháng dương lịch, `yearly_lunar` = hằng năm theo ngày/tháng âm lịch của ngày diễn ra, giữ tháng nhuận như ngày giỗ) với mặc định `none`: sự kiện cũ giữ nguyên, không mất dữ liệu, và cập nhật hàm `restore_backup` để phục hồi giữ kiểu lặp. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy migration, sự kiện một lần vẫn thêm/sửa bình thường; chọn kiểu lặp hằng năm sẽ báo lỗi database cho tới khi nâng cấp.

**Thêm file vào cây hiện tại cần migration `20261030180000_add_append_import.sql`.** Migration chỉ thêm hàm `append_import` (chỉ chèn, không xoá/sửa dòng nào), không đổi bảng. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy, chế độ "Thêm vào cây hiện tại" báo cần nâng cấp và không thêm gì; phục hồi (thay toàn bộ cây) vẫn như cũ.

**Nơi an táng cần migration `20261028120000_add_burial_place.sql`.** Migration thêm cột `burial_place` (văn bản, có thể để trống) vào bảng `persons` để ghi nơi an táng của thành viên. Cột công khai như ngày mất: mọi thành viên đã được duyệt đều xem được, quyền (RLS) không đổi. Migration cũng cập nhật hàm `restore_backup` (phục hồi giữ nơi an táng; bản sao lưu cũ không có trường này thì để trống) và `merge_persons` (gộp hồ sơ điền nơi an táng còn trống của hồ sơ giữ từ hồ sơ bị gộp). Sao lưu JSON (định dạng v5) và CSV có thêm cột `burial_place`. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy migration, ứng dụng vẫn hoạt động như cũ, chỉ chưa lưu được nơi an táng.

**Khoá tài khoản thu hồi liên kết duyệt cần migration `20261031120000_revoke_approval_link_on_lock.sql`.** Migration chỉ định nghĩa lại hàm khoá/mở khoá tài khoản (`set_user_active_status`): khi khoá, yêu cầu duyệt chưa dùng của tài khoản đó được đánh dấu đã dùng. Không đổi bảng, không xoá dữ liệu; sao lưu/phục hồi không đổi. Trang **Nâng cấp hệ thống** tự liệt kê migration này.

**Tài khoản bị khoá không xin duyệt lại và duyệt an toàn khi đang khoá cần migration `20261031180000_lock_blocks_approval.sql`.** Migration thêm cột `locked_at` (có thể trống) vào bảng `profiles`: được ghi khi admin khoá tài khoản, xoá khi mở khoá. Tài khoản đang khoá có liên kết duyệt đã dùng hoặc đã thu hồi được điền sẵn; tài khoản chưa kích hoạt khác vẫn là "chờ duyệt". Migration cũng định nghĩa lại `set_user_active_status` (ghi/xoá `locked_at`) và thêm hàm `approve_user_request` (chỉ server gọi được bằng service role) để duyệt trong một giao dịch. Không xoá dữ liệu; sao lưu/phục hồi không đổi. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Tài khoản bị khoá trước migration này mà không có liên kết duyệt đã dùng hoặc đã thu hồi (ví dụ khoá trước migration `20261031120000`) vẫn được coi là chờ duyệt: khoá lại một lần ở **Quản lý người dùng** để ngừng email.

**Gắn thẻ thành viên trên ảnh cần migration `20261112120000_add_gallery_item_persons.sql`.** Migration thêm bảng `gallery_item_persons` (ảnh – thành viên, xoá ảnh hay xoá người thì thẻ tự xoá; quyền xem như `gallery_items`, chỉ admin/biên tập viên ghi) và cập nhật hàm `restore_backup` và `merge_persons`. Chỉ thêm, chạy lại nhiều lần không lỗi, không xoá dữ liệu. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy, thư viện hoạt động như cũ, chỉ chưa gắn thẻ được.

## Hướng dẫn cập nhật source code

Khi trang `/dashboard/upgrade` thông báo source code đang cũ, hãy cập nhật **toàn bộ source code** lên version mới nhất. Không chỉ sửa số `version` trong `package.json` để bỏ qua cảnh báo, vì migration có thể yêu cầu các thay đổi tương ứng trong code.

**Nếu deploy trên Vercel:**

1. Kiểm tra project Vercel đang liên kết đúng repository `homielab/giapha-os` và branch cần deploy.
2. Đồng bộ branch đó với code mới nhất trên GitHub. Nếu cập nhật bằng Git local:

   ```bash
   git fetch origin
   git pull --ff-only origin main
   git push origin main
   ```

3. Chờ Vercel build/deploy hoàn tất. Nếu Vercel không tự deploy, vào **Deployments** và chọn **Redeploy** deployment mới nhất.
4. Mở lại `/dashboard/upgrade`, bấm **Kiểm tra lại** và xác nhận version hiện tại không thấp hơn version trên GitHub.

**Nếu chạy local hoặc self-host:**

```bash
git fetch origin
git pull --ff-only origin main
bun install
bun run build
```

Sau đó khởi động lại ứng dụng bằng lệnh đang dùng, ví dụ `bun run start`. Khi source code đã cập nhật, admin có thể quay lại `/dashboard/upgrade` để chạy migration database. Nên sao lưu database trước khi nâng cấp; nếu chưa cấu hình `SUPABASE_DB_URL`, dùng SQL bundle tại `/setup` theo hướng dẫn ở trên.
