<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Phả OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Phả OS (Gia Phả Open Source)

[Tiếng Việt](README.md) | [English](README.en.md)

Đây là mã nguồn mở cho ứng dụng quản lý gia phả dòng họ, cung cấp giao diện trực quan để xem sơ đồ phả hệ, quản lý thành viên và tìm kiếm danh xưng.

Dự án ra đời từ nhu cầu thực tế: cần một hệ thống Cloud để con cháu ở nhiều nơi có thể cùng cập nhật thông tin (kết hôn, sinh con...), thay vì phụ thuộc vào một máy cục bộ. Việc tự triển khai mã nguồn mở giúp gia đình bạn nắm trọn quyền kiểm soát dữ liệu nhạy cảm, thay vì phó mặc cho các dịch vụ bên thứ ba. Ban đầu mình chỉ làm cho gia đình sử dụng, nhưng vì được nhiều người quan tâm nên mình quyết định chia sẻ công khai.

Phù hợp với người Việt Nam.

## Tài liệu

| Tài liệu                                       | Nội dung                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| [Cài đặt](docs/vi/cai-dat.md)                  | Tạo database Supabase, deploy Vercel, chạy local, Docker, lỗi khi đăng ký |
| [Tài khoản và đăng nhập](docs/vi/tai-khoan.md) | Tài khoản đầu tiên, duyệt tài khoản mới, email thông báo, Google/Facebook |
| [Nâng cấp](docs/vi/nang-cap.md)                | Nâng cấp trong Dashboard, migration database, cập nhật source code        |
| [Tính năng chi tiết](docs/vi/tinh-nang.md)     | Âm lịch và ngày giỗ, file .ics, kiểm tra dữ liệu, sao lưu, ảnh            |
| [GEDCOM](docs/vi/gedcom.md)                    | Xuất/nhập GEDCOM với Gramps, MyHeritage và các chương trình khác          |

## Các tính năng chính

- **Sơ đồ trực quan**: xem gia phả dạng Cây, Sơ đồ tư duy (Mindmap) và Bong bóng; kéo, phóng to/thu nhỏ bằng chuột, cảm ứng hoặc bàn phím.
- **Xuất ảnh và PDF**: xuất cây ra ảnh, PDF một trang hoặc PDF nhiều trang A4/A3 để in và dán ghép.
- **Tìm danh xưng**: tự động xác định cách xưng hô (Bác, Chú, Cô, Dì...) giữa hai thành viên.
- **Quản lý thành viên và quan hệ**: thông tin, ảnh đại diện, nơi an táng, thứ tự nhánh; hỗ trợ đa thê, đa phu, con nuôi. Bấm ⌘/Ctrl + K để tìm nhanh một thành viên.
- **Kiểm tra dữ liệu**: cảnh báo quan hệ vô lý, ngày tháng sai và người có thể trùng; gộp hai hồ sơ trùng.
- **Thống kê và sự kiện**: sinh nhật, ngày giỗ theo âm lịch Việt Nam, sự kiện tuỳ chỉnh, thống kê dòng họ; thêm tất cả vào Google/Apple Calendar bằng file .ics.
- **In hồ sơ và Phả ký**: in hồ sơ một thành viên, hoặc in cả gia phả thành sách theo từng đời.
- **Phòng trưng bày ảnh**: lưu ảnh gia đình, gắn thẻ thành viên có trong ảnh.
- **Sao lưu và phục hồi**: xuất/nhập JSON, CSV, GEDCOM; thay toàn bộ cây hoặc thêm một nhánh vào cây hiện có.
- **Bảo mật**: phân quyền Admin, Editor, Member; dữ liệu được bảo vệ bằng Supabase.
- **Đa thiết bị, hai ngôn ngữ**: dùng tốt trên máy tính và điện thoại, chuyển giữa tiếng Việt và tiếng Anh, thêm được vào màn hình chính.

Mô tả đầy đủ từng tính năng: [docs/vi/tinh-nang.md](docs/vi/tinh-nang.md).

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Tài khoản: `giaphaos@homielab.com`
- Mật khẩu: `giaphaos`

## Hình ảnh giao diện

![Sơ đồ cây](docs/screenshots/tree.png)

![Tìm danh xưng](docs/screenshots/kinship.png)

Xem thêm ảnh khác: [docs/screenshots/](docs/screenshots/)

## Cài đặt

Cách dễ nhất, khoảng 5 phút, không cần chép key hay chạy lệnh:

1. Bấm [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&project-name=giapha-os&repository-name=giapha-os&env=SITE_NAME&envDescription=T%C3%AAn+gia+ph%E1%BA%A3+hi%E1%BB%87n+tr%C3%AAn+trang+web%2C+v%C3%AD+d%E1%BB%A5%3A+Gia+ph%E1%BA%A3+h%E1%BB%8D+Nguy%E1%BB%85n&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D), đăng nhập Vercel (nên dùng tài khoản GitHub) và nhập tên gia phả.
2. Ở bước **Supabase**, bấm tạo database mới. Vercel tự tạo database miễn phí và tự điền mọi cấu hình.
3. Chờ deploy xong, mở trang web: trang **Khởi tạo cơ sở dữ liệu** hiện ra, bấm **Cài database**.
4. Đăng ký tài khoản: người đăng ký đầu tiên tự động là **admin**.

Muốn người khác tự đăng ký được, làm thêm bước "Cho người khác đăng ký" trong hướng dẫn. Dùng project Supabase có sẵn, chạy trên máy cá nhân hoặc Docker: xem [docs/vi/cai-dat.md](docs/vi/cai-dat.md).

### Đăng nhập bằng Google và Facebook

Bật Google hoặc Facebook trong Supabase (**Authentication → Sign In / Providers**), rồi thêm domain của bạn vào **Authentication → URL Configuration**. Chưa cấu hình thì đặt `NEXT_PUBLIC_DISABLE_SSO=true` và deploy lại. Hướng dẫn đầy đủ: [docs/vi/tai-khoan.md](docs/vi/tai-khoan.md#đăng-nhập-bằng-google-và-facebook).

### Hướng dẫn cập nhật source code

Khi trang `/dashboard/upgrade` báo source code đang cũ, hãy cập nhật **toàn bộ source code** lên bản mới nhất (không chỉ sửa số `version` trong `package.json`):

- **Vercel**: đồng bộ branch đang deploy với `main` của `homielab/giapha-os` và chờ Vercel deploy xong.
- **Máy cá nhân hoặc tự host**: `git pull --ff-only origin main`, `bun install`, `bun run build`, rồi khởi động lại ứng dụng. Với Docker, chạy lại `docker compose --env-file .env.local up -d --build`.

Sau đó vào `/dashboard/upgrade` để chạy các migration database còn thiếu. Nên sao lưu dữ liệu trước. Chi tiết từng migration: [docs/vi/nang-cap.md](docs/vi/nang-cap.md).

## Phân quyền người dùng

1. **Admin (Quản trị viên):** có toàn quyền đối với hệ thống.
2. **Editor (Biên soạn):** thêm, sửa, xoá hồ sơ thành viên và các mối quan hệ.
3. **Member (Thành viên):** xem sơ đồ gia phả và thống kê; thêm, sửa, xoá sự kiện do chính mình tạo.

Tài khoản đăng ký sau người đầu tiên là **Member** và phải chờ admin duyệt. Xem [docs/vi/tai-khoan.md](docs/vi/tai-khoan.md).

## Đóng góp

Dự án hoan nghênh mọi báo lỗi (issues) và pull request. Xem hướng dẫn ở [CONTRIBUTING.md](CONTRIBUTING.md). Phát hiện lỗi bảo mật? Báo riêng theo [SECURITY.md](SECURITY.md), không mở issue công khai.

## Tuyên bố từ chối trách nhiệm và quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn. Tác giả không thu thập hay lưu trữ bất kỳ dữ liệu cá nhân nào.**

- **Tự lưu trữ hoàn toàn:** toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) nằm **trong tài khoản Supabase của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.
- **Không thu thập dữ liệu:** mã nguồn không có analytics, tracking hay telemetry.
- **Bạn kiểm soát dữ liệu của bạn:** bạn có thể xoá, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.
- **Demo công khai:** trang demo `giapha-os.homielab.com` dùng dữ liệu mẫu hư cấu. Không nhập thông tin cá nhân thật vào trang demo.

## Giấy phép

Dự án được phân phối dưới [giấy phép MIT](LICENSE). Copyright (c) 2026 HomieLab.
