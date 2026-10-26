<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Phả OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Phả OS (Gia Phả Open Source)

[Tiếng Việt](README.md) | [English](README.en.md)

Đây là mã nguồn mở cho ứng dụng quản lý gia phả dòng họ, cung cấp giao diện trực quan để xem sơ đồ phả hệ, quản lý thành viên và tìm kiếm danh xưng.

Dự án ra đời từ nhu cầu thực tế: cần một hệ thống Cloud để con cháu ở nhiều nơi có thể cùng cập nhật thông tin (kết hôn, sinh con...), thay vì phụ thuộc vào một máy cục bộ. Việc tự triển khai mã nguồn mở giúp gia đình bạn nắm trọn quyền kiểm soát dữ liệu nhạy cảm, thay vì phó mặc cho các dịch vụ bên thứ ba. Ban đầu mình chỉ làm cho gia đình sử dụng, nhưng vì được nhiều người quan tâm nên mình quyết định chia sẻ công khai.

Phù hợp với người Việt Nam.

## Mục lục

- [Các tính năng chính](#các-tính-năng-chính)
- [Demo](#demo)
- [Hình ảnh Giao diện](#hình-ảnh-giao-diện)
- [Cài đặt và Chạy dự án](#cài-đặt-và-chạy-dự-án)
  - [Cách 1: Deploy nhanh lên Vercel](#cách-1-deploy-nhanh-lên-vercel)
  - [Cách 2: Chạy trên máy cá nhân](#cách-2-chạy-trên-máy-cá-nhân)
  - [Cách 3: Chạy bằng Docker](#cách-3-chạy-bằng-docker)
- [Tài khoản đầu tiên](#tài-khoản-đầu-tiên)
- [Xử lý lỗi khi đăng ký](#xử-lý-lỗi-khi-đăng-ký)
- [Phân quyền người dùng (User Roles)](#phân-quyền-người-dùng-user-roles)
- [Đóng góp (Contributing)](#đóng-góp-contributing)
- [Tuyên bố từ chối trách nhiệm & Quyền riêng tư](#tuyên-bố-từ-chối-trách-nhiệm--quyền-riêng-tư)
- [Giấy phép (License)](#giấy-phép-license)

## Các tính năng chính

- **Sơ đồ trực quan**: Xem gia phả dạng Cây (Tree), Sơ đồ tư duy (Mindmap) và Bong bóng (Bubble). Trên cây: kéo, Ctrl/⌘ + cuộn chuột hoặc chụm hai ngón (pinch) để phóng to/thu nhỏ. Dùng được bằng bàn phím: Tab vào khung cây rồi bấm `+`/`-` để phóng to/thu nhỏ, `0` để về mặc định, phím mũi tên để cuộn; ở Bong bóng, Tab qua từng gia đình và bấm Enter hoặc Space để chọn.
- **Xuất ảnh và PDF**: Xuất cây ra ảnh, PDF một trang hoặc PDF nhiều trang A4/A3 ngang (có lề chồng để dán ghép và nhãn "hàng,cột" trên từng tờ).
- **Tìm danh xưng**: Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...) chính xác.
- **Quản lý thành viên**: Lưu trữ thông tin, avatar và sắp xếp thứ tự nhánh dòng họ; tìm không dấu (cả ô chọn người ở trang Quan hệ), chọn bằng bàn phím (mũi tên, Enter, Esc); ⌘/Ctrl + K ở mọi trang Dashboard để tìm nhanh một thành viên.
- **Quản lý quan hệ**: Quản lý các mối quan hệ trong gia phả (hỗ trợ các trường hợp đặc biệt như đa thê, đa phu,...).
- **Kiểm tra dữ liệu**: Cảnh báo quan hệ vô lý (vòng cha–con, con sinh trước cha mẹ, cha mẹ mất trước khi con sinh) và người trùng tên + năm sinh.
- **Thống kê & Sự kiện**: Theo dõi sinh nhật, ngày giỗ (âm lịch Việt Nam), sự kiện tuỳ chỉnh và các chỉ số nhân khẩu học của dòng họ; công cụ "Tính lại ngày giỗ âm lịch" và "Người có thể trùng" cho quản trị viên.
- **Thêm vào lịch**: Trang Sự kiện có nút "Thêm vào lịch (.ics)" để nhập sinh nhật, ngày giỗ và sự kiện vào Google/Apple Calendar và nhận nhắc nhở trên điện thoại.
- **In hồ sơ**: Trang thành viên có nút "In hồ sơ" — bản in A4 gọn (không thanh đầu/cuối trang, không nút sửa), có ảnh, ghi chú đầy đủ và danh sách gia đình; để biếu, lưu trữ hoặc để ở nhà thờ họ.
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng; xem trước nội dung file trước khi phục hồi. Ô CSV bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` ở đầu khi xuất (để Excel không chạy như công thức; số điện thoại `+84…` hiện `'+84…` trong Excel) và tự bỏ dấu `'` đó khi nhập lại.
- **Bảo mật**: Phân quyền (Admin, Editor, Member) và bảo vệ dữ liệu bằng Supabase.
- **Đa thiết bị, hai ngôn ngữ**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại; chuyển giữa tiếng Việt và tiếng Anh.

### Âm lịch và ngày giỗ

Ứng dụng dùng âm lịch Việt Nam (tính theo múi giờ UTC+7, thuật toán của Hồ Ngọc Đức), không dùng lịch Trung Quốc (UTC+8) — hai lịch có năm lệch nhau một ngày hoặc cả tháng (ví dụ Tết 2007 là 17/02 ở Việt Nam, 18/02 ở Trung Quốc). Ngày giỗ được tính lại mỗi năm theo âm lịch:

- **Ngày 30 ở tháng thiếu**: năm nào tháng đó chỉ có 29 ngày thì giỗ vào ngày 29 (ngày cuối tháng).
- **Mất trong tháng nhuận**: năm nào có đúng tháng nhuận đó thì giỗ trong tháng nhuận, năm khác thì giỗ trong tháng thường cùng số. Ứng dụng biết tháng nhuận từ ngày mất dương lịch; ngày âm lịch nhập tay được hiểu là tháng thường, trừ khi tick ô "Tháng nhuận" (hiện khi năm âm đó có tháng nhuận trùng số tháng; chỉ dùng để quy đổi, không lưu). Sửa ngày âm mà không đổi tháng/năm thì giữ tháng nhuận đã có.
- **Múi giờ và ngày 29/2**: "hôm nay" của sự kiện sắp tới luôn theo giờ Việt Nam (UTC+7), cả trên server lẫn trình duyệt, nên giỗ và sinh nhật không lệch một ngày trong khoảng 0–7 giờ sáng. Sinh nhật 29/2 rơi vào 28/2 ở năm thường.
- **Không rõ năm mất**: nếu chỉ có ngày/tháng mất dương lịch (không có năm và không có ngày âm lịch), ngày giỗ được đổi sang âm lịch theo năm hiện tại và hiện nhãn "(ước tính)"; nhập năm mất hoặc ngày mất âm lịch để có ngày giỗ cố định.
- **Ngày âm lịch lưu từ bản cũ**: trước khi chuyển sang âm lịch Việt Nam, ngày âm lịch được tính theo lịch Trung Quốc và không tự tính lại. Quản trị viên vào **Dashboard → Sao lưu & Phục hồi → Tính lại ngày giỗ âm lịch**, bấm "Kiểm tra ngày giỗ" để xem các thành viên có ngày âm lịch đang lưu khác ngày tính lại từ ngày mất dương lịch (chỉ xét người có đủ ngày/tháng/năm cả hai ngày). Mặc định không dòng nào được chọn; chọn từng dòng hoặc tất cả rồi xác nhận để áp dụng. Nếu ngày âm lịch là ngày nhập tay (ngày dương suy ra từ đó có thể sai) thì đừng chọn dòng đó. Nên xuất bản sao lưu JSON trước. Mỗi dòng được cập nhật riêng và chỉ khi ngày mất chưa bị sửa từ lúc tính; dòng nào lỗi hay bị bỏ qua sẽ hiện lại ở lần kiểm tra sau. Công cụ không bao giờ tự chạy và không cần migration.

- **Người có thể trùng**: **Dashboard → Sao lưu & Phục hồi → Người có thể trùng**, bấm "Quét người có thể trùng" để quét cả cây (kể cả dữ liệu nhập từ GEDCOM/CSV). Hai thành viên được xếp chung nhóm khi cùng tên (không phân biệt dấu, hoa/thường) và cùng năm sinh, hoặc cùng tên và cùng cha/mẹ. Bảng hiện từng nhóm với năm sinh – mất, số quan hệ và liên kết mở hồ sơ (tối đa 200 nhóm đầu, ghi số còn lại). Chỉ để xem: không sửa, không xoá, không gộp; tự sửa hoặc xoá bằng công cụ sẵn có. Không cần migration.
- **Kiểm tra dữ liệu**: **Dashboard → Sao lưu & Phục hồi → Kiểm tra dữ liệu**, bấm "Kiểm tra dữ liệu" để rà cả cây (kể cả dữ liệu nhập từ GEDCOM/CSV) tìm mốc ngày vô lý: mất trước khi sinh, con sinh sau khi mẹ mất, cha/mẹ hơn con dưới 12 hoặc trên 70 tuổi (chỉ khi có đủ năm sinh; bỏ qua con nuôi), ngày sinh/mất chưa tới, quan hệ hôn nhân hoặc cha/mẹ – con bị lặp. Kết quả nhóm theo loại, kèm số lượng và liên kết mở hồ sơ (tối đa 200 điểm đầu mỗi loại). Chỉ để xem: không sửa gì; người không nối được với gốc xem ở trang Dòng dõi. Không cần migration.

### Thêm sự kiện vào lịch (.ics)

Ở **Dashboard → Sự kiện**, nút **Thêm vào lịch (.ics)** tải file `giapha-events.ics` để nhập vào Google Calendar, Apple Calendar, Outlook…:

- **Sinh nhật** của người còn sống: một sự kiện cả ngày lặp hằng năm (sinh nhật 29/2 rơi vào 28/2 ở năm thường).
- **Ngày giỗ**: âm lịch không lặp hằng năm theo dương lịch được, nên mỗi năm là một sự kiện riêng — file có ngày giỗ của năm nay và năm sau (ngày dương đúng như trang Sự kiện, ghi chú "ước tính" nếu thiếu năm mất). Tải lại file khi sang năm.
- **Sự kiện tuỳ chỉnh**: đúng ngày, địa điểm và ghi chú đã nhập.

Mỗi sự kiện có mã (UID) ổn định theo thành viên, nên nhập lại file vào cùng lịch sẽ cập nhật thay vì tạo trùng. File được tạo ngay trên trình duyệt, không cần máy chủ hay email; nhắc nhở do ứng dụng lịch của bạn đảm nhiệm.

### GEDCOM

Xuất/nhập GEDCOM (7.0) để mở gia phả trong Gramps, MyHeritage… hoặc nhập lại:

- **Họ tên**: từ đầu tiên của họ tên là họ: `Nguyễn Văn An` được ghi `1 NAME /Nguyễn/ Văn An` kèm `2 SURN Nguyễn`, `2 GIVN Văn An`. Khi nhập, ứng dụng ưu tiên `SURN`/`GIVN` (giữ thứ tự họ–tên như dòng `NAME`), không có thì đọc `NAME` bỏ dấu `/` — file do bản cũ xuất vẫn đọc như trước.
- **Gia đình (FAM)**: mỗi con nằm trong gia đình của đúng cặp cha mẹ của mình (con vợ hai ở gia đình với vợ hai); con chỉ nối với một người (cha, mẹ hoặc người có giới tính "khác") có gia đình một cha/mẹ riêng. Người giới tính "khác" được ghi ở vị trí `HUSB`.
- **Con nuôi**: ghi `2 PEDI ADOPTED` dưới `1 FAMC`; khi nhập, `PEDI ADOPTED` thành quan hệ con nuôi.
- **Ngày tháng**: GEDCOM không có ngày thiếu tháng hay thiếu năm, nên ngày có ngày + năm mà không có tháng chỉ xuất năm, ngày không có năm thì bỏ.
- **Tên khác**: mỗi tên trong `other_names` (cách nhau dấu phẩy hoặc chấm phẩy) xuất thành một `1 NAME` kèm `2 TYPE aka`; khi nhập, các `NAME` từ thứ hai trở đi nối lại thành tên khác.
- **Ngày giỗ âm lịch**: GEDCOM không có âm lịch nên ngày mất âm lịch ghi bằng tag riêng `2 _LUNAR <ngày> <tháng> <năm> [LEAP]` dưới `1 DEAT`, và được đọc lại khi nhập. Chương trình khác bỏ qua tag này. Cờ `LEAP` chỉ có trong file GEDCOM (CSDL không lưu tháng nhuận).
- **Ghi chú dài và ngày khoảng**: nhập đọc cả `CONC` (nối liền, không xuống dòng) lẫn `CONT`, nên ghi chú dài từ MyHeritage, Ancestry không bị cắt. `BET a AND b`, `FROM a TO b` lấy ngày đầu và ghi nguyên văn vào cuối ghi chú (`BIRT: BET 1850 AND 1855`); `@#DJULIAN@` và các tiền tố ABT/EST/AFT/BEF/CAL bị bỏ qua.
- Không xuất: dâu/rể (`is_in_law`), thứ tự sinh, đời, ảnh đại diện.

### Kiểm tra dữ liệu

- **Quan hệ**: trước khi lưu, ứng dụng từ chối quan hệ của một người với chính mình, cặp vợ chồng đã có (A–B hay B–A đều tính là một), quan hệ cha/mẹ–con tạo vòng (thêm cháu làm cha của ông) và người con sinh trước cha/mẹ. Ngày sinh được so theo phần cả hai người cùng có: năm, rồi tháng, rồi ngày; thiếu năm sinh thì bỏ qua bước này. Form thêm nhiều con kiểm tra năm sinh từng con với cha/mẹ trước khi tạo ai. Khi sửa ngày sinh của một thành viên đã có cha/mẹ hoặc con, ngày mới cũng được so với ngày sinh của họ theo cùng luật; thông báo lỗi nêu tên người bị lệch. Khi phục hồi, file sao lưu có vòng cha/mẹ–con hoặc cặp vợ chồng lưu hai lần (theo cả hai chiều) bị từ chối trước khi đụng tới dữ liệu, kèm danh sách tối đa 10 lỗi đầu.
- **Lỗi khi lưu**: ở form thêm nhiều con, một người con chỉ tính là đã thêm khi đã gắn được với cha/mẹ; gắn lỗi (ví dụ bị chặn quyền) thì người vừa tạo được xoá lại, dòng đó báo lỗi kèm lý do và được giữ trong form để thử lại. Khi quan hệ hoặc thành viên đã lưu nhưng bước cập nhật đời/thế hệ đi kèm bị lỗi, ứng dụng hiện cảnh báo thay vì báo thành công. Danh sách quan hệ tải lỗi thì hiện lỗi và nút thử lại.
- **Ngày mất**: không được trước ngày sinh, so cả tháng và ngày khi cùng năm.
- **Tên**: tên chỉ gồm khoảng trắng bị từ chối; khoảng trắng thừa ở đầu/cuối được cắt khi lưu.
- **Trùng người**: khi tạo thành viên mới, nếu đã có người cùng tên (không phân biệt dấu, hoa/thường) và cùng năm sinh (cả hai chưa có năm sinh thì chỉ xét tên), ứng dụng hỏi lại và liệt kê những người đó; bấm Tiếp tục để vẫn tạo. Sửa thành viên không hỏi.
- **Ngày mất của cha mẹ**: mẹ mất trước ngày sinh của con bị từ chối (cả khi thêm quan hệ lẫn khi sửa ngày sinh/ngày mất); cha mất hơn 10 tháng trước ngày sinh (hơn 1 năm khi thiếu tháng hoặc ngày) thì hỏi lại. Con nuôi không bị kiểm.
- **Phiên bản file sao lưu JSON**: file ghi `version` (hiện là 3). Khi phục hồi, file không có `version` được coi là bản 1 (file cũ); file có `version` lớn hơn bản ứng dụng đọc được bị từ chối với lời nhắc nâng cấp ứng dụng, để không mất dữ liệu của cột mới.

### Phòng trưng bày ảnh

- Nhận ảnh JPG, PNG, GIF, WEBP tối đa 10 MB, qua nút chọn file hay kéo thả đều như nhau. Ứng dụng đọc phần đầu file để biết đúng loại ảnh (file chữ đổi đuôi thành `.jpg` bị từ chối) và đặt phần mở rộng trong bucket `gallery` theo loại đó, không theo tên file.
- Mỗi trang hiện 24 ảnh (`/dashboard/gallery?page=2`…); đường dẫn ký cho cả trang được tạo trong một lần gọi Supabase Storage, hiệu lực 1 giờ. Trang vượt quá trang cuối hiện trang cuối.

### Ảnh đại diện

- Ảnh đại diện nằm trong bucket riêng tư `avatars`, chỉ tài khoản đã kích hoạt mới xem được. Trang thành viên (cây, danh sách, sơ đồ tư duy, bong bóng) và trang Xưng hô ký đường dẫn cho mọi ảnh của trang trong một lần gọi Supabase Storage trên server, hiệu lực 1 giờ; ảnh vừa đổi, trang khác hoặc tab mở quá hạn thì tải qua `/api/avatar`.
- Khi chọn ảnh, ứng dụng đọc phần đầu file để biết đúng loại (JPG, PNG, GIF, WEBP; file chữ đổi đuôi thành `.jpg` bị từ chối) và lưu phần mở rộng theo loại đó, không theo tên file.

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Tài khoản: `giaphaos@homielab.com`
- Mật khẩu: `giaphaos`

## Hình ảnh Giao diện

![Dashboard](docs/screenshots/dashboard.png)

![Danh sách](docs/screenshots/list.png)

![Sơ đồ cây](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Mindmap](docs/screenshots/stats.png)

![Mindmap](docs/screenshots/kinship.png)

![Mindmap](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Cài đặt và Chạy dự án

Chỉ cần khoảng 10 -> 15 phút là bạn có thể tự dựng hệ thống gia phả cho gia đình mình.

---

## 1. Tạo Database (Miễn phí với Supabase)

1. Tạo tài khoản miễn phí tại https://github.com nếu chưa có.
2. Tạo tài khoản miễn phí tại https://supabase.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
3. Tạo **New Project**. Đợi khoảng 1 -> 2 phút để hệ thống khởi tạo xong.
4. Vào **Project → Connect** hoặc **Project Settings → API Keys** để lấy:
   - `Project URL`
   - `Publishable key` (bắt đầu bằng `sb_publishable_`; project cũ có thể hiển thị key `anon`)
   - `Secret key` cho server (bắt đầu bằng `sb_secret_`) nếu cần gửi email thông báo và quản trị server. Project cũ có thể dùng key `service_role` trong tab **Legacy API Keys**.

---

## Cách 1: Deploy nhanh lên Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (hoặc key `anon` trong **Legacy API Keys**)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` để bật SSO; đặt `true` để ẩn SSO khi chưa cấu hình
   - `APP_URL` = URL public của ứng dụng, ví dụ `https://your-domain.vercel.app` (dùng cho email duyệt tài khoản, link chia sẻ Open Graph, `sitemap.xml` và `robots.txt`; nếu bỏ trống, trên Vercel sẽ dùng domain production). Ảnh chia sẻ mạng xã hội là `public/og-image.png` (1200×630), có thể thay bằng ảnh của dòng họ bạn.
   - `SUPABASE_SERVICE_ROLE_KEY` = **Secret key** trong **Project Settings → API Keys → Secret keys**. Nếu project dùng giao diện cũ, vào tab **Legacy API Keys** và copy key `service_role`. Đây là key có quyền cao, chỉ lưu ở Vercel server environment; tuyệt đối không dùng publishable/anon key cho biến này và không đặt tên biến với tiền tố `NEXT_PUBLIC_`.
   - `SUPABASE_DB_URL` = PostgreSQL connection string trong **Project Settings → Database → Connection Pooling** (Session mode, chỉ lưu ở Vercel server environment). Biến này cho phép admin kiểm tra/chạy migration ngay trong Dashboard.
   - `RESEND_API_KEY` = API key của [Resend](https://resend.com)
   - `RESEND_FROM_EMAIL` = địa chỉ gửi đã xác minh domain trên Resend, ví dụ `Gia Phả OS <no-reply@your-domain.com>`
   - `ADMIN_NOTIFICATION_EMAIL` = tuỳ chọn; email nhận thông báo. Nếu bỏ trống, hệ thống tự gửi tới email của các admin đang hoạt động
4. Nhấn **Deploy** và chờ 2 -> 3 phút.

Bạn sẽ có một đường link website để sử dụng ngay.

> **Nếu đang nâng cấp hệ thống đã có dữ liệu:** chỉ cần mở Supabase Dashboard → SQL Editor, bấm **Copy toàn bộ SQL** ở trang `/setup`, dán và chạy một lần. Bundle này bao gồm schema và tất cả migration theo đúng thứ tự, đồng thời có thể chạy lặp lại an toàn. Không cần copy hoặc chạy từng file riêng lẻ. Các tài khoản đang hoạt động được giữ nguyên; chỉ tài khoản đăng ký mới ở trạng thái chờ duyệt.

---

## Cách 2: Chạy trên máy cá nhân

Yêu cầu: máy đã cài [Node.js](https://nodejs.org/en) và [Bun](https://bun.sh/)

1. Clone hoặc tải project về máy.
2. Đổi tên file `.env.example` thành `.env.local`.
3. Mở file `.env.local` và điền các giá trị đã lưu ở **bước 1**.

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
```

4. Cài thư viện

```bash
bun install
```

5. Chạy dự án

```bash
bun run dev
```

Mở trình duyệt và truy cập: `http://localhost:3000`

---

## Cách 3: Chạy bằng Docker

Phù hợp khi tự host trên VPS hoặc máy chủ riêng. Yêu cầu: [Docker](https://docs.docker.com/get-docker/) có Docker Compose.

1. Clone project, đổi tên `.env.example` thành `.env.local` và điền các giá trị ở **bước 1** (giống Cách 1: `NEXT_PUBLIC_*`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_*`...).
2. Build và chạy:

```bash
docker compose --env-file .env.local up -d --build
```

Mở `http://localhost:3000` (hoặc domain của bạn qua reverse proxy, nhớ thêm domain vào Supabase như mục [Xử lý lỗi khi đăng ký](#xử-lý-lỗi-khi-đăng-ký)).

**Lưu ý quan trọng về biến môi trường:**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` và `NEXT_PUBLIC_DISABLE_SSO` được Next.js ghi thẳng vào JavaScript **lúc build**, nên phải truyền dưới dạng build arg. `--env-file .env.local` giúp `docker-compose.yml` đọc chúng từ `.env.local`; thiếu hai biến Supabase thì build dừng với thông báo lỗi. Đổi các biến này thì phải build lại (`--build`), chỉ khởi động lại container là không đủ.
- Các biến bí mật của server (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_API_KEY`...) **không** nằm trong image: container đọc chúng từ `.env.local` lúc chạy (`env_file`). File `.env*` không được copy vào image.

Không dùng Compose:

```bash
docker build -t giapha-os \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key" \
  --build-arg NEXT_PUBLIC_DISABLE_SSO=true \
  .
docker run -d -p 3000:3000 --env-file .env.local --restart always giapha-os
```

Image có sẵn `HEALTHCHECK` gọi trang `/login` mỗi 30 giây: `docker ps` hiện `healthy` hoặc `unhealthy` ở cột STATUS, và `docker inspect --format '{{.State.Health.Status}}' <container>` cho kết quả tương tự. Container báo `unhealthy` nghĩa là ứng dụng không còn trả lời; xem `docker logs <container>`.

Image đã có sẵn `docs/schema.sql` và `docs/migrations/`, nên trang `/setup` và `/dashboard/upgrade` hoạt động như bản Vercel. **Cập nhật:** `git pull`, chạy lại lệnh `docker compose --env-file .env.local up -d --build`, rồi vào `/dashboard/upgrade` để chạy migration mới (nếu có).

---

## Tài khoản đầu tiên

- Đăng ký tài khoản mới khi vào web lần đầu.
- Người đăng ký đầu tiên sẽ tự động có quyền **admin**.
- Các tài khoản đăng ký sau sẽ mặc định là **member** và ở trạng thái **chờ admin duyệt**.

### Thông báo và duyệt tài khoản mới

Sau khi người dùng xác nhận email, tài khoản vẫn giữ trạng thái **chờ duyệt**. Hệ thống gửi email cho admin kèm liên kết duyệt một lần, có hiệu lực 7 ngày. Admin cũng có thể đăng nhập ứng dụng và duyệt tại **Quản lý người dùng**.

Để bật email thông báo trên Vercel, khai báo `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` và `RESEND_FROM_EMAIL`. `ADMIN_NOTIFICATION_EMAIL` là tuỳ chọn; nếu không khai báo, hệ thống sẽ tự lấy email từ các tài khoản admin đang hoạt động. Secret key/service role key có thể bỏ qua Row Level Security (RLS), vì vậy chỉ được lưu ở server và không được đưa vào source code, trình duyệt hoặc Git. Xem thêm [hướng dẫn API keys của Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Xử lý lỗi khi đăng ký

Sau khi cài đặt xong, nếu bạn gặp lỗi `Failed to fetch` khi đăng ký:

**Nguyên nhân:** Supabase chặn các request từ domain chưa được thêm vào danh sách cho phép.

**Cách khắc phục:**

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn Project của bạn.
2. Vào **Authentication → URL Configuration**.
3. Ở mục **Site URL**, điền URL chính của ứng dụng, ví dụ:
   - Vercel: `https://your-domain.vercel.app`
   - Máy cá nhân: `http://localhost:3000`
4. Ở mục **Redirect URLs**, nhấn **Add URL** và thêm:
   - `https://your-domain.vercel.app/**`
   - `http://localhost:3000/**` (nếu chạy local)
   - Hoặc tối thiểu: `https://your-domain.vercel.app/auth/callback` và `http://localhost:3000/auth/callback`
5. Nhấn **Save** và thử lại.

> **Lưu ý:** Thay `your-domain.vercel.app` bằng domain thực tế của bạn. Nếu dùng domain tùy chỉnh, hãy thêm cả domain đó vào danh sách.

### Đăng nhập bằng Google và Facebook

Màn hình đăng nhập đã hỗ trợ Google và Facebook thông qua Supabase Auth. Để bật hai nút này:

1. Vào Supabase Dashboard → **Authentication → Sign In / Providers** và bật Google hoặc Facebook.
2. Tạo OAuth app tương ứng trên Google Cloud Console/Facebook Developers.
3. Trong cấu hình OAuth app, đặt callback URL do Supabase cung cấp, có dạng:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. Trong Supabase → **Authentication → URL Configuration**, thêm callback của ứng dụng:
   `https://<domain-cua-ban>/auth/callback`

Tài khoản đăng ký bằng SSO cũng được tạo ở trạng thái **chờ admin duyệt**, giống đăng ký bằng email. Xem thêm hướng dẫn chính thức cho [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) và [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

Nếu chưa cấu hình SSO, đặt `NEXT_PUBLIC_DISABLE_SSO=true` trong biến môi trường của Vercel rồi deploy lại. Nếu không khai báo biến này, ứng dụng cũng mặc định ẩn SSO để tránh hiển thị chức năng chưa sẵn sàng. Khi đó người dùng sẽ thấy thông báo kèm link tới phần hướng dẫn này. Vì đây là biến `NEXT_PUBLIC_*`, cần build/deploy lại sau khi thay đổi.

### Nâng cấp hệ thống trong Dashboard

Admin có thể mở mục **Nâng cấp hệ thống** trong menu quản trị để kiểm tra version source code trên GitHub và version database, sau đó chạy các migration còn thiếu. Nếu source code hiện tại cũ hơn version mới nhất trên GitHub, hệ thống sẽ yêu cầu cập nhật source code trước khi cho phép chạy migration. Tính năng migration trực tiếp chỉ hoạt động khi đã cấu hình `SUPABASE_DB_URL` ở server. Nếu chưa cấu hình, trang `/dashboard/upgrade` vẫn cho phép copy SQL bundle tại `/setup` để chạy thủ công.

**Phục hồi dữ liệu cần migration `20261026000000_add_restore_backup.sql`.** Từ bản này, chức năng phục hồi (Dashboard → Dữ liệu) chạy trong một transaction của database qua hàm `restore_backup`: nếu có lỗi giữa chừng, dữ liệu hiện tại được giữ nguyên. Bản tự host đã cài từ trước cần chạy migration này (bấm chạy migration ở `/dashboard/upgrade`, hoặc chạy file trong `docs/migrations/` bằng Supabase SQL Editor). Khi chưa chạy, phục hồi vẫn hoạt động theo cách cũ (xoá rồi chèn từng phần, không có transaction) và hiển thị nhắc nâng cấp database. File phục hồi tối đa 25 MB; trên Vercel, request gửi lên server bị giới hạn khoảng 4,5 MB, nên gia phả rất lớn (vài nghìn thành viên trở lên) nên phục hồi trên bản self-host.

**Cập nhật thế hệ cần migration `20261026120000_add_update_generations.sql`.** Nút "Áp dụng" ở trang Phả hệ và tuỳ chọn cập nhật thế hệ con cháu khi sửa thành viên lưu tất cả thành viên bằng một lần gọi hàm `update_generations` của database, trong một transaction: một dòng lỗi (thành viên vừa bị xoá, không có quyền sửa) thì không dòng nào bị đổi và ứng dụng báo lỗi. Hàm chạy với quyền của người gọi (SECURITY INVOKER) nên RLS của bảng `persons` vẫn áp dụng. Khi chưa chạy migration, ứng dụng cập nhật từng người như trước và nhắc nâng cấp database.

**Gộp hồ sơ trùng cần migration `20261027120000_add_merge_persons.sql`.** Công cụ "Người có thể trùng" (Dashboard → Sao lưu & phục hồi) có nút gộp hai hồ sơ thành một qua hàm `merge_persons` của database, trong một transaction: quan hệ của hồ sơ bị gộp được chuyển sang hồ sơ giữ (quan hệ trùng và quan hệ giữa hai hồ sơ bị bỏ), chi tiết riêng tư điền vào trường trống của hồ sơ giữ, các trường trống (ngày sinh/mất, đời, thứ tự con, ảnh đại diện) lấy giá trị của hồ sơ bị gộp, tên khác được nhớ lại và ghi chú được nối thêm, rồi hồ sơ bị gộp bị xoá. Ứng dụng hiện xem trước nội dung sẽ chuyển, khuyến nghị tải bản sao lưu trước và phải gõ đúng tên hồ sơ bị xoá mới cho chạy. Gộp không thể hoàn tác; một lỗi giữa chừng thì không gì bị đổi. Chỉ admin dùng được. Khi chưa chạy migration, nút gộp nhắc nâng cấp database.

### Hướng dẫn cập nhật source code

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

---

## Phân quyền người dùng (User Roles)

Hệ thống có 3 cấp độ phân quyền để dễ dàng quản lý ai được phép cập nhật gia phả:

1. **Admin (Quản trị viên):** Có toàn quyền đối với hệ thống.
2. **Editor (Biên soạn):** Cho phép thêm, sửa, xóa thông tin hồ sơ và các mối quan hệ.
3. **Member (Thành viên):** Chỉ có thể xem sơ đồ gia phả và các thống kê trực quan.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn.

Trước khi gửi pull request, hãy chạy:

```bash
bun run test          # unit test (bun test) cho các hàm trong utils/
bun run lint
bun run format:check
bun run typecheck     # tsc --noEmit
```

GitHub Actions (`.github/workflows/test.yml`) chạy đúng các lệnh này cho mỗi push lên `main` và mỗi pull request.

Test đặt cạnh file được kiểm tra (`utils/gedcom.ts` → `utils/gedcom.test.ts`). Hàm gọi Supabase được test với client giả `utils/testing/fakeSupabase.ts` (trả `{ data, error }` theo từng lệnh). Thay đổi đáng chú ý ghi vào [CHANGELOG.md](CHANGELOG.md), mục `## [Unreleased]`.

Trang chỉ hiển thị số liệu (như `/dashboard/stats`) tính kết quả trên server và chỉ `select` các cột cần (xem `STATS_PERSON_COLUMNS` trong `utils/familyStats.ts`), không gửi cả bảng `persons` xuống trình duyệt.

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong tài khoản Supabase của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.

- **Demo công khai:** Trang demo tại `giapha-os.homielab.com` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới [giấy phép MIT](LICENSE). Copyright (c) 2026 HomieLab.
