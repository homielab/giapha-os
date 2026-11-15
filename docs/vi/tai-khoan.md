# Tài khoản và đăng nhập

[Tiếng Việt](tai-khoan.md) | [English](../en/accounts.md) · [← README](../../README.md)

- Đăng ký tài khoản mới khi vào web lần đầu.
- Người đăng ký đầu tiên sẽ tự động có quyền **admin**.
- Các tài khoản đăng ký sau sẽ mặc định là **member** và ở trạng thái **chờ admin duyệt**.

## Thông báo và duyệt tài khoản mới

Tài khoản mới giữ trạng thái **chờ duyệt** cho tới khi admin duyệt. Hệ thống gửi email cho admin kèm liên kết duyệt một lần, có hiệu lực 7 ngày, ngay khi tài khoản đăng nhập lần đầu:

- **Supabase bật "Confirm email"** (mặc định): sau khi người dùng bấm liên kết xác nhận trong email.
- **Supabase tắt "Confirm email"**: ngay khi đăng ký xong, vì người dùng được đăng nhập luôn.
- **SSO**: khi quay về từ Google/Facebook.

Mỗi tài khoản chỉ gửi một email khi liên kết còn hiệu lực; tài khoản còn chờ duyệt đăng nhập lại sau khi liên kết hết hạn thì admin nhận email mới. Email luôn viết bằng tiếng Việt (ngôn ngữ mặc định của ứng dụng), không theo ngôn ngữ người đăng ký đang chọn. Admin cũng có thể đăng nhập ứng dụng và duyệt tại **Quản lý người dùng**.

Khoá một tài khoản ở **Quản lý người dùng** cũng thu hồi liên kết duyệt còn hiệu lực của tài khoản đó: bấm liên kết trong email cũ (hoặc bản được chuyển tiếp) chỉ hiện "Yêu cầu đã bị thu hồi" và không mở lại tài khoản. Muốn mở lại, admin mở khoá ngay trong ứng dụng. Cần migration `20261031120000_revoke_approval_link_on_lock.sql`; khi chưa chạy, liên kết còn hạn vẫn kích hoạt lại được tài khoản đã khoá.

Tài khoản bị khoá không còn ở trạng thái chờ duyệt: đăng nhập lại không tạo yêu cầu duyệt mới và admin không nhận thêm email. Liên kết duyệt kiểm tra và kích hoạt tài khoản trong một giao dịch của database, nên khoá tài khoản trong lúc trang duyệt đang mở (kể cả đúng lúc bấm "Xác nhận duyệt") thì tài khoản vẫn bị khoá. Cần migration `20261031180000_lock_blocks_approval.sql`; khi chưa chạy, liên kết duyệt báo "Cần nâng cấp database" (admin vẫn duyệt được ở **Quản lý người dùng**) và tài khoản bị khoá đăng nhập lại vẫn gửi email như trước.

Để bật email thông báo trên Vercel, khai báo `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` và `RESEND_FROM_EMAIL`. `ADMIN_NOTIFICATION_EMAIL` là tuỳ chọn; nếu không khai báo, hệ thống sẽ tự lấy email từ các tài khoản admin đang hoạt động. Secret key/service role key có thể bỏ qua Row Level Security (RLS), vì vậy chỉ được lưu ở server và không được đưa vào source code, trình duyệt hoặc Git. Xem thêm [hướng dẫn API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Đăng nhập bằng Google và Facebook

Màn hình đăng nhập đã hỗ trợ Google và Facebook thông qua Supabase Auth. Để bật hai nút này:

1. Vào Supabase Dashboard → **Authentication → Sign In / Providers** và bật Google hoặc Facebook.
2. Tạo OAuth app tương ứng trên Google Cloud Console/Facebook Developers.
3. Trong cấu hình OAuth app, đặt callback URL do Supabase cung cấp, có dạng:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Trong Supabase → **Authentication → URL Configuration**, đặt **Site URL** là `https://<domain-cua-ban>`. Nếu ứng dụng chạy ở domain khác Site URL (bản preview, `localhost`…), thêm domain đó vào **Redirect URLs** dạng:
   `https://<domain-khac>/**`
   Callback mang theo trang cần mở (`/auth/callback?next=…`, khi người dùng đăng nhập từ link thành viên được chia sẻ), nên mục chính xác `https://<domain>/auth/callback` không khớp; khi không khớp, Supabase đưa người dùng về Site URL thay vì trang đó.

Tài khoản đăng ký bằng SSO cũng được tạo ở trạng thái **chờ admin duyệt**, giống đăng ký bằng email. Xem thêm hướng dẫn chính thức cho [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) và [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

Nếu chưa cấu hình SSO, đặt `NEXT_PUBLIC_DISABLE_SSO=true` trong biến môi trường của Vercel rồi deploy lại. Nếu không khai báo biến này, ứng dụng cũng mặc định ẩn SSO để tránh hiển thị chức năng chưa sẵn sàng. Khi đó người dùng sẽ thấy thông báo kèm link tới phần hướng dẫn này. Vì đây là biến `NEXT_PUBLIC_*`, cần build/deploy lại sau khi thay đổi.
