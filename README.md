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

- **Sơ đồ trực quan**: Xem gia phả dạng Cây (Tree), Sơ đồ tư duy (Mindmap) và Bong bóng (Bubble). Trên cây: kéo, Ctrl/⌘ + cuộn chuột hoặc chụm hai ngón (pinch) để phóng to/thu nhỏ quanh con trỏ/ngón tay; nút +/- giữ nguyên phần đang xem ở giữa khung. Dùng được bằng bàn phím: Tab vào khung cây rồi bấm `+`/`-` để phóng to/thu nhỏ, `0` để về mặc định, phím mũi tên để cuộn; ở Bong bóng, Tab qua từng gia đình và bấm Enter hoặc Space để chọn.
- **Xuất ảnh và PDF**: Xuất cây ra ảnh, PDF một trang hoặc PDF nhiều trang A4/A3 (có lề chồng để dán ghép và nhãn "hàng,cột" trên từng tờ; khổ dọc hay ngang tuỳ cách nào tốn ít tờ hơn, ngang nhau thì theo dáng cây). Nút mở rộng/thu gọn nhánh không có trong file xuất. Cây lớn được vẽ ở độ phân giải thấp hơn cho vừa giới hạn canvas của trình duyệt; cây quá lớn sẽ báo chọn gốc nhỏ hơn.
- **Tìm danh xưng**: Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...) chính xác; người ghi giới tính "Khác" được gọi bằng dạng chung cho cả nam và nữ ("Vợ/Chồng", "Bố/Mẹ", "Anh/Chị", "Con dâu/Con rể") kèm ghi chú lý do. Ai lớn hơn: anh chị em cùng cha mẹ so "con thứ" trước rồi ngày sinh; anh chị em cùng cha khác mẹ (hay cùng mẹ khác cha, anh chị em kế) so ngày sinh trước, chỉ khi thiếu mới dùng "con thứ", vì con mỗi bà vợ thường đánh số riêng. Vợ/chồng của ông bà (hay cụ, kỵ…) chưa được ghi là cha/mẹ của người con trên dòng, khi người con đó chỉ ghi một cha/mẹ (gia phả cũ thường chỉ ghi cha), được gọi theo trực hệ ("Bà nội", "Cụ bà") kèm ghi chú có thể là vợ/chồng sau và liên kết tới hồ sơ người con để thêm quan hệ; người con đã ghi đủ cha mẹ thì vẫn là "Vợ của Ông nội".
- **Quản lý thành viên**: Lưu trữ thông tin, avatar và sắp xếp thứ tự nhánh dòng họ; người đã mất có thêm ô "Nơi an táng" (ví dụ "Nghĩa trang X, xã Y", công khai như ngày mất) hiện ở trang thành viên, bản in hồ sơ và Phả ký để con cháu biết nơi tảo mộ; tìm không dấu (cả ô chọn người ở trang Quan hệ), chọn bằng bàn phím (mũi tên, Enter, Esc); ⌘/Ctrl + K ở mọi trang Dashboard để tìm nhanh một thành viên (báo số người khớp, tối đa 20).
- **Quản lý quan hệ**: Quản lý các mối quan hệ trong gia phả (hỗ trợ các trường hợp đặc biệt như đa thê, đa phu,...).
- **Kiểm tra dữ liệu**: Cảnh báo quan hệ vô lý (vòng cha–con, con sinh trước cha mẹ, mẹ mất trước khi con sinh, cha mất quá lâu trước khi con sinh) và người trùng tên + năm sinh.
- **Thống kê & Sự kiện**: Theo dõi sinh nhật, ngày giỗ (âm lịch Việt Nam), sự kiện tuỳ chỉnh và các chỉ số nhân khẩu học của dòng họ (cả tuổi thọ: trung bình, người thọ nhất, người còn sống cao tuổi nhất, theo thập niên sinh); công cụ "Tính lại ngày giỗ âm lịch" và "Người có thể trùng" cho quản trị viên.
- **Thêm vào lịch**: Trang Sự kiện có nút "Thêm vào lịch (.ics)" để nhập sinh nhật, ngày giỗ và sự kiện vào Google/Apple Calendar và nhận nhắc nhở trên điện thoại.
- **In hồ sơ**: Trang thành viên có nút "In hồ sơ" — bản in A4 gọn (không thanh đầu/cuối trang, không nút sửa), có ảnh, ghi chú đầy đủ và danh sách gia đình; để biếu, lưu trữ hoặc để ở nhà thờ họ.
- **Phả ký**: Trang Thứ tự gia phả mở "Phả ký" — bản in gia phả dạng sách theo đời: bìa ghi họ chính, ngày in và mục lục; mỗi đời bắt đầu một trang riêng, người trong đời đánh số thứ tự kèm tên khác, sinh–mất, ngày giỗ âm, nơi an táng, cha/mẹ, vợ/chồng (dâu/rể ghi rõ), con theo thứ tự sinh (bấm nhảy tới mục của con) và ghi chú; người chưa rõ đời để mục riêng cuối sách.
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng; xem trước nội dung file trước khi phục hồi. Khi chọn file có hai chế độ: **Thay toàn bộ cây** (phục hồi bản sao lưu: xoá dữ liệu hiện tại rồi thay bằng file) và **Thêm vào cây hiện tại** (ví dụ người thân gửi nhánh của họ dạng JSON, GEDCOM hay ZIP CSV): mọi thành viên và sự kiện trong file được cấp mã mới rồi thêm trong một transaction, không xoá hay sửa dữ liệu đang có; ảnh đại diện không được nhập. Người có cả trong file lẫn trong cây thành hai hồ sơ (nhập một file hai lần cũng thành hai bản): sau khi thêm, bấm "Rà trùng ngay" để quét Người có thể trùng rồi gộp, đó cũng là cách nối nhánh mới vào cây. Xuất theo nhánh (chọn một người làm gốc): lấy người đó, mọi con cháu (con đẻ và con nuôi) cùng vợ/chồng của họ, không lấy cha mẹ của gốc hay gia đình bên vợ/chồng; sự kiện tuỳ chỉnh không gắn với người nên luôn xuất đủ. Ảnh (avatars, gallery) không nằm trong JSON/CSV/GEDCOM (bảng `gallery_items` cũng không nằm trong bản sao lưu); sao chép bucket Supabase Storage `avatars` và `gallery` riêng (Dashboard Storage → download, hoặc `supabase storage` CLI). Ô CSV bắt đầu bằng `=`, `+`, `-`, `@` được thêm dấu `'` ở đầu khi xuất (để Excel không chạy như công thức; số điện thoại `+84…` hiện `'+84…` trong Excel) và tự bỏ dấu `'` đó khi nhập lại. Trên Vercel (như bản demo) dữ liệu phục hồi tối đa khoảng 4,5 MB (giới hạn request của Vercel): file lớn hơn bị từ chối ngay khi chọn kèm lời giải thích; bản tự host (Docker, máy chủ riêng) nhận tới 25 MB. Khi phục hồi từ ZIP CSV, file có dòng thiếu/thừa ô so với dòng tiêu đề hoặc dấu nháy kép hỏng bị từ chối ngay khi chọn, kèm tên file và số dòng (chưa xoá dữ liệu gì); dòng trống được bỏ qua.
- **Bảo mật**: Phân quyền (Admin, Editor, Member) và bảo vệ dữ liệu bằng Supabase.
- **Đa thiết bị, hai ngôn ngữ**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại; chuyển giữa tiếng Việt và tiếng Anh (lần đầu mở theo ngôn ngữ trình duyệt: tiếng Anh nếu trình duyệt ưu tiên tiếng Anh, còn lại tiếng Việt).
- **Cài lên màn hình chính**: có web manifest và biểu tượng ứng dụng, nên "Thêm vào màn hình chính" trên điện thoại hiện đúng tên "Gia Phả OS" (đổi bằng `SITE_NAME`/`SHORT_NAME`) và mở thẳng vào bảng điều khiển. Không có service worker nên vẫn cần mạng.

### Âm lịch và ngày giỗ

Ứng dụng dùng âm lịch Việt Nam (tính theo múi giờ UTC+7, thuật toán của Hồ Ngọc Đức), không dùng lịch Trung Quốc (UTC+8) — hai lịch có năm lệch nhau một ngày hoặc cả tháng (ví dụ Tết 2007 là 17/02 ở Việt Nam, 18/02 ở Trung Quốc). Ngày giỗ được tính lại mỗi năm theo âm lịch:

- **Giỗ đầu**: giỗ bắt đầu từ năm âm lịch sau năm mất (năm mất lấy từ năm âm lịch, không có thì từ ngày mất dương lịch); năm mất không có giỗ, kể cả trên trang Sự kiện và file .ics. Không rõ năm mất thì giỗ hiện mọi năm.
- **Ngày 30 ở tháng thiếu**: năm nào tháng đó chỉ có 29 ngày thì giỗ vào ngày 29 (ngày cuối tháng).
- **Mất trong tháng nhuận**: năm nào có đúng tháng nhuận đó thì giỗ trong tháng nhuận, năm khác thì giỗ trong tháng thường cùng số. Ứng dụng biết tháng nhuận từ ngày mất dương lịch; ngày âm lịch nhập tay được hiểu là tháng thường, trừ khi tick ô "Tháng nhuận" (hiện khi năm âm đó có tháng nhuận trùng số tháng; chỉ dùng để quy đổi, không lưu). Sửa ngày âm mà không đổi tháng/năm thì giữ tháng nhuận đã có.
- **Sự kiện tuỳ chỉnh nhập theo âm lịch**: cần đủ ngày, tháng, năm âm lịch; thiếu trường hoặc ngày không có trong tháng đó (ví dụ 30 của tháng thiếu) thì không lưu được. Ô "Tháng nhuận" hiện khi năm âm đó có tháng nhuận trùng số tháng (ví dụ tháng 6 năm 2025); ngày được lưu là ngày dương lịch quy đổi.
- **Múi giờ và ngày 29/2**: "hôm nay" của sự kiện sắp tới luôn theo giờ Việt Nam (UTC+7), cả trên server lẫn trình duyệt, nên giỗ và sinh nhật không lệch một ngày trong khoảng 0–7 giờ sáng. Sinh nhật 29/2 rơi vào 28/2 ở năm thường.
- **Không rõ năm mất**: nếu chỉ có ngày/tháng mất dương lịch (không có năm và không có ngày âm lịch), ngày giỗ được đổi sang âm lịch theo năm hiện tại và hiện nhãn "(ước tính)"; nhập năm mất hoặc ngày mất âm lịch để có ngày giỗ cố định.
- **Ngày âm lịch lưu từ bản cũ**: trước khi chuyển sang âm lịch Việt Nam, ngày âm lịch được tính theo lịch Trung Quốc và không tự tính lại. Quản trị viên vào **Dashboard → Sao lưu & Phục hồi → Tính lại ngày giỗ âm lịch**, bấm "Kiểm tra ngày giỗ" để xem các thành viên có ngày âm lịch đang lưu khác ngày tính lại từ ngày mất dương lịch (chỉ xét người có đủ ngày/tháng/năm cả hai ngày). Mặc định không dòng nào được chọn; chọn từng dòng hoặc tất cả rồi xác nhận để áp dụng. Nếu ngày âm lịch là ngày nhập tay (ngày dương suy ra từ đó có thể sai) thì đừng chọn dòng đó. Nên xuất bản sao lưu JSON trước. Mỗi dòng được cập nhật riêng và chỉ khi ngày mất chưa bị sửa từ lúc tính; dòng nào lỗi hay bị bỏ qua sẽ hiện lại ở lần kiểm tra sau. Công cụ không bao giờ tự chạy và không cần migration.

- **Người có thể trùng**: **Dashboard → Sao lưu & Phục hồi → Người có thể trùng**, bấm "Quét người có thể trùng" để quét cả cây (kể cả dữ liệu nhập từ GEDCOM/CSV). Hai thành viên được xếp chung nhóm khi cùng tên (không phân biệt dấu, hoa/thường) và cùng năm sinh, hoặc cùng tên và cùng cha/mẹ. Bảng hiện từng nhóm với năm sinh – mất, số quan hệ và liên kết mở hồ sơ (tối đa 200 nhóm đầu, ghi số còn lại). Chỉ để xem: không sửa, không xoá, không gộp; tự sửa hoặc xoá bằng công cụ sẵn có. Không cần migration.
- **Kiểm tra dữ liệu**: **Dashboard → Sao lưu & Phục hồi → Kiểm tra dữ liệu**, bấm "Kiểm tra dữ liệu" để rà cả cây (kể cả dữ liệu nhập từ GEDCOM/CSV) tìm mốc ngày vô lý: mất trước khi sinh, con sinh sau khi mẹ mất, cha mất hơn 10 tháng trước khi con sinh, cha/mẹ hơn con dưới 12 hoặc trên 70 tuổi (chỉ khi có đủ năm sinh; bỏ qua con nuôi), ngày sinh/mất chưa tới, quan hệ hôn nhân hoặc cha/mẹ – con bị lặp, con có quá nhiều cha mẹ ruột, vòng cha–con (liệt kê tên từng người trên vòng, kèm liên kết mở hồ sơ), người nối quan hệ hôn nhân hoặc cha/mẹ – con với chính mình, con chỉ ghi một cha/mẹ (ruột hoặc nuôi) trong khi người đó có vợ/chồng (liệt kê vợ/chồng làm ứng viên cha/mẹ còn thiếu; chỉ gợi ý, không tự nối quan hệ), con ruột có đời khác đời cha/mẹ cộng một (chỉ khi cả hai có đời; bỏ qua dâu/rể và con nuôi), các con cùng cặp cha mẹ trùng 'con thứ' hoặc có thứ tự ngược với năm sinh đã biết (số thứ tự so trong cùng cặp cha mẹ: con các bà vợ khác nhau đánh số riêng hay đánh số liền đều không bị báo; con chỉ ghi một cha/mẹ so với các con khác chỉ ghi cha/mẹ đó; bỏ qua con nuôi), người không có cha mẹ, vợ chồng hay con nào (thường do mất bản ghi gia đình khi nhập GEDCOM; cây chỉ một người thì không xét), người có ngày mất (dương hoặc âm lịch) nhưng chưa đánh dấu đã mất (thường do nhập CSV/JSON; người đó không có ngày giỗ và bị đếm là còn sống), người quá 120 tuổi (còn sống mà không có ngày mất nào, thường do bản GEDCOM/CSV cũ thiếu ngày mất, hoặc thọ hơn 120 tuổi theo năm sinh và năm mất); cùng nhóm "Thiếu thông tin": chưa có năm sinh, đã mất nhưng thiếu năm mất, chưa rõ giới tính. Kết quả nhóm theo loại, kèm số lượng và liên kết mở hồ sơ (tối đa 200 điểm đầu mỗi loại). Chỉ để xem: không sửa gì; người không nối được với gốc xem ở trang Dòng dõi. Không cần migration.

### Thêm sự kiện vào lịch (.ics)

Ở **Dashboard → Sự kiện**, nút **Thêm vào lịch (.ics)** tải file `giapha-events.ics` để nhập vào Google Calendar, Apple Calendar, Outlook…:

- **Sinh nhật** của người còn sống: một sự kiện cả ngày lặp hằng năm (sinh nhật 29/2 rơi vào 28/2 ở năm thường).
- **Ngày giỗ**: âm lịch không lặp hằng năm theo dương lịch được, nên mỗi năm là một sự kiện riêng — file có ngày giỗ của năm nay và năm sau (ngày dương đúng như trang Sự kiện, ghi chú "ước tính" nếu thiếu năm mất). Tải lại file khi sang năm.
- **Sự kiện tuỳ chỉnh**: đúng ngày, địa điểm và ghi chú đã nhập. Sự kiện "Hằng năm theo dương lịch" là một sự kiện lặp hằng năm từ ngày đầu tiên (29/2 rơi vào ngày cuối tháng 2); sự kiện "Hằng năm theo âm lịch" giống ngày giỗ: mỗi lần là một sự kiện riêng của năm nay và năm sau.

**Nhắc trước**: ô chọn cạnh nút (Không nhắc / 1 / 3 / 7 ngày, mặc định 1 ngày, trình duyệt nhớ lựa chọn) thêm vào mỗi sự kiện một lời nhắc lúc 8 giờ sáng, trước ngày đó N ngày, để kịp sắm lễ giỗ.

Mỗi sự kiện có mã (UID) ổn định theo thành viên, nên nhập lại file vào cùng lịch sẽ cập nhật thay vì tạo trùng. File được tạo ngay trên trình duyệt, không cần máy chủ hay email; nhắc nhở do ứng dụng lịch của bạn đảm nhiệm.

### GEDCOM

Xuất/nhập GEDCOM (7.0) để mở gia phả trong Gramps, MyHeritage… hoặc nhập lại:

- **Họ tên**: từ đầu tiên của họ tên là họ: `Nguyễn Văn An` được ghi `1 NAME /Nguyễn/ Văn An` kèm `2 SURN Nguyễn`, `2 GIVN Văn An`. Khi nhập file từ chương trình khác (Gramps, MyHeritage…), mặc định họ đứng đầu: họ lấy từ `SURN` hoặc phần giữa hai dấu `/`, tên từ `GIVN` hoặc phần còn lại, nên `1 NAME Văn An /Nguyễn/` thành `Nguyễn Văn An`. Hộp xác nhận phục hồi có lựa chọn "Giữ như trong file": khi đó `SURN`/`GIVN` theo thứ tự như dòng `NAME`, không có thì đọc `NAME` bỏ dấu `/`. File do Giapha OS xuất (`1 SOUR Giapha_OS`, kể cả bản cũ) luôn đọc theo cách sau, như trước.
- **Người không có tên**: người không có `NAME` (hoặc tên rỗng) được nhập với tên "Chưa rõ tên" (giao diện tiếng Anh: "Unknown"); hộp xác nhận nhập báo số người như vậy để sửa sau. Khi xuất, tên rỗng ghi `1 NAME Unknown /Unknown/`.
- **Gia đình (FAM)**: mỗi con nằm trong gia đình của đúng cặp cha mẹ của mình (con vợ hai ở gia đình với vợ hai); con chỉ nối với một người (cha, mẹ hoặc người có giới tính "khác") có gia đình một cha/mẹ riêng. Người giới tính "khác" được ghi ở vị trí `HUSB`.
- **Con nuôi**: ghi `2 PEDI ADOPTED` dưới `1 FAMC`; khi nhập, `PEDI ADOPTED` thành quan hệ con nuôi; `PEDI FOSTER`, `STEP`, `SEALING` (hoa hay thường) cũng thành con nuôi, kèm dòng `Con nuôi (foster)` / `(step)` / `(sealing)` trong ghi chú người con (nhập lại không lặp).
- **Ngày tháng**: GEDCOM không có ngày thiếu tháng hay thiếu năm, nên ngày có ngày + năm mà không có tháng chỉ xuất năm. Ngày sinh/ngày mất có ngày + tháng mà không có năm (sinh nhật, ngày giỗ không rõ năm) ghi bằng tag riêng `2 _DATEDM <ngày> <tháng>` dưới `1 BIRT`/`1 DEAT` và được đọc lại khi nhập (chương trình khác bỏ qua); ngày không năm còn lại (chỉ có tháng) thì bỏ.
- **Tên khác**: mỗi tên trong `other_names` (cách nhau dấu phẩy hoặc chấm phẩy) xuất thành một `1 NAME` kèm `2 TYPE aka`; khi nhập, các `NAME` từ thứ hai trở đi nối lại thành tên khác.
- **Nơi an táng**: xuất thành `1 BURI` + `2 PLAC <nơi an táng>` (chuẩn GEDCOM, Gramps/MyHeritage đọc được); khi nhập, `PLAC` dưới `BURI` thành nơi an táng và người đó được đánh dấu đã mất.
- **Nơi sinh, nơi mất, nghề nghiệp**: ứng dụng không có cột riêng cho các thông tin này. Khi nhập, `PLAC` dưới `BIRT`, `PLAC` dưới `DEAT` và mỗi `1 OCCU` được thêm vào cuối ghi chú của người đó dạng `Nơi sinh: …`, `Nơi mất: …`, `Nghề nghiệp: …` (sau ghi chú sẵn có và các dòng ngày khoảng); có `PLAC` dưới `DEAT` thì người đó được đánh dấu đã mất. Khi xuất, các dòng này nằm trong ghi chú (không ghi lại `PLAC`/`OCCU`), nên nhập lại không bị lặp.
- **Kết hôn, ly hôn**: khi nhập, `1 MARR` (`DATE`, `PLAC`) và `1 DIV` của một FAM được thêm vào cuối ghi chú hôn nhân dạng `Kết hôn: 12 MAR 1950, Huế`, `Ly hôn` (hoặc `Ly hôn: <ngày>`); `MARR` không ngày/nơi bị bỏ qua. Khi xuất, các dòng này nằm trong ghi chú, nên nhập lại không bị lặp.
- **Ghi chú**: ghi chú dài được tách thành các dòng `CONC` (≤ 255 ký tự), xuống dòng thành `CONT`. Khi nhập, hỗ trợ cả ghi chú trực tiếp lẫn **NOTE con trỏ** (`1 NOTE @N1@` trỏ tới `0 @N1@ NOTE …`, cách Gramps, Family Tree Maker, Legacy, Ancestry và `SNOTE` của GEDCOM 7 ghi); nhiều ghi chú của một người được nối lại, con trỏ tới ghi chú không có trong file thì bỏ qua và được đếm trong cảnh báo của hộp xác nhận phục hồi. Ghi chú của hôn nhân được xuất thành `1 NOTE` trong bản ghi `FAM` của cặp vợ chồng; khi nhập, `NOTE` của `FAM` (trực tiếp hay con trỏ) thành ghi chú hôn nhân, đứng trước các dòng `Nguồn: …`. `FAM` chỉ có chồng hoặc chỉ có vợ thì không có hôn nhân để giữ ghi chú/nguồn: chúng bị bỏ (không gán cho người khác) và được đếm trong cảnh báo của hộp xác nhận phục hồi.
- **Ký tự `@`**: dòng giá trị bắt đầu bằng `@` (ghi chú `@nhà`, tên, nơi an táng) được xuất thành `@@` để chương trình khác không đọc nhầm là con trỏ; khi nhập, `@@` ở bất kỳ đâu thành `@` (`a@@b.com` → `a@b.com`), con trỏ thật `@N1@` vẫn là con trỏ.
- **Nguồn**: ứng dụng không có bảng nguồn. Khi nhập, mỗi trích dẫn `SOUR @S1@` của một người (cả dưới sự kiện như `BIRT`) hoặc của gia đình được chép vào ghi chú người/hôn nhân dạng `Nguồn: <TITL hoặc ABBR>` (kèm `TEXT` nếu có); bản ghi `REPO` không được giữ. Hộp xác nhận phục hồi báo số bản ghi SOUR/REPO trong file. Dòng `1 SOUR` của phần đầu file (tên chương trình xuất) không bị tính.
- **Ngày giỗ âm lịch**: GEDCOM không có âm lịch nên ngày mất âm lịch ghi bằng tag riêng `2 _LUNAR <ngày> <tháng> [<năm>] [LEAP]` dưới `1 DEAT` (không rõ năm thì bỏ năm), và được đọc lại khi nhập. Chương trình khác bỏ qua tag này. Cờ `LEAP` (mất tháng nhuận) khi xuất được tính từ ngày mất dương lịch (CSDL không lưu tháng nhuận); khi nhập, dòng có `LEAP` mà thiếu ngày mất dương lịch thì ngày dương được điền từ ngày âm nhuận đó, còn nếu file có ngày dương thì giữ ngày dương.
- **Ngày ước lượng**: `ABT`, `EST`, `CAL`, `BEF`, `AFT`, `INT` được bỏ khỏi ngày (`ABT 1950` → năm 1950) và nguyên văn ghi vào ghi chú (`BIRT: ABT 1950`, `DEAT: BEF 1950`) để biết ngày không chắc chắn; nhập lại file đã xuất không lặp dòng.
- **Ghi chú dài và ngày khoảng**: nhập đọc cả `CONC` (nối liền, không xuống dòng) lẫn `CONT`, nên ghi chú dài từ MyHeritage, Ancestry không bị cắt. `BET a AND b`, `FROM a TO b` lấy ngày đầu và ghi nguyên văn vào cuối ghi chú (`BIRT: BET 1850 AND 1855`); `@#DJULIAN@` bị bỏ qua; tiền tố ước lượng xem mục Ngày ước lượng. Ngày không có thật trong lịch (`31 APR 1850`, `29 FEB 1900`) không làm hỏng cả file: bỏ ngày, giữ tháng và năm, chữ gốc ghi vào cuối ghi chú (`BIRT: 31 APR 1850`).
- **Đời, thứ tự sinh, dâu/rể**: ghi bằng tag riêng `1 _GEN <số>`, `1 _ORDER <số>`, `1 _INLAW Y` dưới mỗi người, chỉ khi có giá trị, và được đọc lại khi nhập (chuyển gia phả giữa hai bản cài không mất thứ tự con và cờ dâu/rể). Chương trình khác bỏ qua các tag này; file không có tag nhập như trước.
- Không xuất: ảnh đại diện và thư viện ảnh (các file trong bucket Supabase Storage `avatars` và `gallery` cần sao chép riêng).

### Kiểm tra dữ liệu

- **Quan hệ**: trước khi lưu, ứng dụng từ chối quan hệ của một người với chính mình, cặp vợ chồng đã có (A–B hay B–A đều tính là một), quan hệ cha/mẹ–con tạo vòng (thêm cháu làm cha của ông) và người con sinh trước cha/mẹ. Ngày sinh được so theo phần cả hai người cùng có: năm, rồi tháng, rồi ngày; thiếu năm sinh thì bỏ qua bước này. Form thêm nhiều con kiểm tra từng dòng trước khi tạo ai: năm sinh và thứ tự con chỉ nhận số nguyên (năm từ 1 đến năm nay, thứ tự từ 1), năm sinh còn được so với cha/mẹ; lỗi nêu tên con. Khi sửa ngày sinh của một thành viên đã có cha/mẹ hoặc con, ngày mới cũng được so với ngày sinh của họ theo cùng luật; thông báo lỗi nêu tên người bị lệch. Khi phục hồi, file sao lưu có vòng cha/mẹ–con hoặc cặp vợ chồng lưu hai lần (theo cả hai chiều) bị từ chối trước khi đụng tới dữ liệu, kèm danh sách tối đa 10 lỗi đầu.
- **Lỗi khi lưu**: ở form thêm nhiều con, một người con chỉ tính là đã thêm khi đã gắn được với cha/mẹ; gắn lỗi (ví dụ bị chặn quyền) thì người vừa tạo được xoá lại, dòng đó báo lỗi kèm lý do và được giữ trong form để thử lại. Khi quan hệ hoặc thành viên đã lưu nhưng bước cập nhật đời/thế hệ đi kèm bị lỗi, ứng dụng hiện cảnh báo thay vì báo thành công. Danh sách quan hệ tải lỗi thì hiện lỗi và nút thử lại.
- **Ngày mất**: không được trước ngày sinh, so cả tháng và ngày khi cùng năm.
- **Tên**: tên chỉ gồm khoảng trắng bị từ chối; khoảng trắng thừa ở đầu/cuối được cắt khi lưu.
- **Trùng người**: khi tạo thành viên mới, nếu đã có người cùng tên (không phân biệt dấu, hoa/thường) và cùng năm sinh (cả hai chưa có năm sinh thì chỉ xét tên), ứng dụng hỏi lại và liệt kê những người đó; bấm Tiếp tục để vẫn tạo. Sửa thành viên không hỏi.
- **Ngày mất của cha mẹ**: mẹ mất trước ngày sinh của con bị từ chối (cả khi thêm quan hệ lẫn khi sửa ngày sinh/ngày mất); cha mất hơn 10 tháng trước ngày sinh (hơn 1 năm khi thiếu tháng hoặc ngày) thì hỏi lại. Con nuôi không bị kiểm.
- **Phiên bản file sao lưu JSON**: file ghi `version` (hiện là 3). Khi phục hồi, file không có `version` được coi là bản 1 (file cũ); file có `version` lớn hơn bản ứng dụng đọc được bị từ chối với lời nhắc nâng cấp ứng dụng, để không mất dữ liệu của cột mới.

### Phòng trưng bày ảnh

- Nhận ảnh JPG, PNG, GIF, WEBP tối đa 20 MB (GIF tối đa 10 MB vì được lưu nguyên), qua nút chọn file hay kéo thả đều như nhau. Ứng dụng đọc phần đầu file để biết đúng loại ảnh (file chữ đổi đuôi thành `.jpg` bị từ chối) và đặt phần mở rộng trong bucket `gallery` theo loại đó, không theo tên file. Trước khi tải lên, trình duyệt thu nhỏ ảnh về cạnh dài tối đa 2048 px và lưu dạng WebP (ảnh 6 MB từ điện thoại còn dưới 1 MB); GIF, WebP động và ảnh đã nhỏ giữ nguyên; file sau khi thu nhỏ vẫn phải dưới 10 MB. Ảnh đã tải lên trước đó không bị đổi.
- Mỗi trang hiện 24 ảnh (`/dashboard/gallery?page=2`…); đường dẫn ký cho cả trang được tạo trong một lần gọi Supabase Storage, hiệu lực 1 giờ. Trang vượt quá trang cuối hiện trang cuối. Nếu một ảnh không ký được đường dẫn (file thiếu trong bucket) thì thẻ đó hiện "Không tải được ảnh" thay vì ô trống; nếu cả lần ký thất bại (chưa tạo bucket `gallery`, chính sách sai, Storage lỗi) trang hiện thông báo kèm tên bucket, và lỗi chi tiết nằm trong log server.
- Khi xem ảnh phóng to, dùng nút Trước/Sau hoặc phím mũi tên Trái/Phải để sang ảnh khác trên trang hiện tại (theo thứ tự đang hiện, dòng thời gian hay lưới); góc dưới ảnh hiện vị trí ("Ảnh 3/12"). Xoá ảnh đang xem thì chuyển sang ảnh kế, hết ảnh thì đóng.
- Chế độ xem Dòng thời gian/Lưới được nhớ trong trình duyệt (localStorage `giapha-gallery-view`), giữ nguyên khi sang trang khác hay mở lại.

### Ảnh đại diện

- Ảnh đại diện nằm trong bucket riêng tư `avatars`, chỉ tài khoản đã kích hoạt mới xem được. Trang thành viên (cây, danh sách, sơ đồ tư duy, bong bóng) và trang Xưng hô ký đường dẫn cho mọi ảnh của trang trong một lần gọi Supabase Storage trên server, hiệu lực 24 giờ. Server dùng lại mỗi đường dẫn trong 12 giờ (tới khi ảnh đổi) nên trình duyệt giữ ảnh trong cache khi chuyển trang; bộ nhớ đệm nằm trong RAM của server và chỉ dùng sau khi đã kiểm tài khoản đang hoạt động. Ảnh vừa đổi, trang khác hoặc tab mở quá hạn thì tải qua `/api/avatar`. Đường dẫn bị sao chép ra ngoài vẫn mở được ảnh tới khi hết hạn, như trước nhưng tới 24 giờ thay vì 1 giờ.
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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,SHORT_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1**:
   - `SITE_NAME` = tên site hiện ở tiêu đề và trang giới thiệu (mặc định `Gia Phả OS`)
   - `SHORT_NAME` = tên ngắn dưới biểu tượng khi thêm vào màn hình chính (mặc định `Gia Phả`)
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (hoặc key `anon` trong **Legacy API Keys**)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` để bật SSO; đặt `true` để ẩn SSO khi chưa cấu hình
   - `APP_URL` = URL public của ứng dụng, ví dụ `https://your-domain.vercel.app` (dùng cho email duyệt tài khoản, link chia sẻ Open Graph, dữ liệu có cấu trúc JSON-LD ở trang chủ và giới thiệu, `sitemap.xml` và `robots.txt`; chỉ lấy phần gốc: thiếu `https://` sẽ tự thêm, đường dẫn phía sau bị bỏ; nếu bỏ trống hoặc không phải địa chỉ http(s), trên Vercel sẽ dùng domain production). Ảnh chia sẻ mạng xã hội là `public/og-image.png` (1200×630), có thể thay bằng ảnh của dòng họ bạn.
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
- Tự host cả Supabase/PostgREST: giữ `max_rows` (`PGRST_DB_MAX_ROWS`) ≥ 1000 (mặc định của Supabase). Ứng dụng vẫn đọc đủ dữ liệu với mức nhỏ hơn nhưng tốn nhiều request hơn.
- Các biến bí mật của server (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_API_KEY`...) **không** nằm trong image: container đọc chúng từ `.env.local` lúc chạy (`env_file`). File `.env*` không được copy vào image.

Không dùng Compose (`docker run --env-file` giữ nguyên dấu nháy, nên trong `.env.local` viết giá trị không bọc nháy, kể cả khi có khoảng trắng: `SITE_NAME=Gia Phả OS`):

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

Tài khoản mới giữ trạng thái **chờ duyệt** cho tới khi admin duyệt. Hệ thống gửi email cho admin kèm liên kết duyệt một lần, có hiệu lực 7 ngày, ngay khi tài khoản đăng nhập lần đầu:

- **Supabase bật "Confirm email"** (mặc định): sau khi người dùng bấm liên kết xác nhận trong email.
- **Supabase tắt "Confirm email"**: ngay khi đăng ký xong, vì người dùng được đăng nhập luôn.
- **SSO**: khi quay về từ Google/Facebook.

Mỗi tài khoản chỉ gửi một email khi liên kết còn hiệu lực; tài khoản còn chờ duyệt đăng nhập lại sau khi liên kết hết hạn thì admin nhận email mới. Email luôn viết bằng tiếng Việt (ngôn ngữ mặc định của ứng dụng), không theo ngôn ngữ người đăng ký đang chọn. Admin cũng có thể đăng nhập ứng dụng và duyệt tại **Quản lý người dùng**.

Khoá một tài khoản ở **Quản lý người dùng** cũng thu hồi liên kết duyệt còn hiệu lực của tài khoản đó: bấm liên kết trong email cũ (hoặc bản được chuyển tiếp) chỉ hiện "Yêu cầu đã bị thu hồi" và không mở lại tài khoản. Muốn mở lại, admin mở khoá ngay trong ứng dụng. Cần migration `20261031120000_revoke_approval_link_on_lock.sql`; khi chưa chạy, liên kết còn hạn vẫn kích hoạt lại được tài khoản đã khoá.

Tài khoản bị khoá không còn ở trạng thái chờ duyệt: đăng nhập lại không tạo yêu cầu duyệt mới và admin không nhận thêm email. Liên kết duyệt kiểm tra và kích hoạt tài khoản trong một giao dịch của database, nên khoá tài khoản trong lúc trang duyệt đang mở (kể cả đúng lúc bấm "Xác nhận duyệt") thì tài khoản vẫn bị khoá. Cần migration `20261031180000_lock_blocks_approval.sql`; khi chưa chạy, liên kết duyệt báo "Cần nâng cấp database" (admin vẫn duyệt được ở **Quản lý người dùng**) và tài khoản bị khoá đăng nhập lại vẫn gửi email như trước.

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
4. Trong Supabase → **Authentication → URL Configuration**, đặt **Site URL** là `https://<domain-cua-ban>`. Nếu ứng dụng chạy ở domain khác Site URL (bản preview, `localhost`…), thêm domain đó vào **Redirect URLs** dạng:
   `https://<domain-khac>/**`
   Callback mang theo trang cần mở (`/auth/callback?next=…`, khi người dùng đăng nhập từ link thành viên được chia sẻ), nên mục chính xác `https://<domain>/auth/callback` không khớp; khi không khớp, Supabase đưa người dùng về Site URL thay vì trang đó.

Tài khoản đăng ký bằng SSO cũng được tạo ở trạng thái **chờ admin duyệt**, giống đăng ký bằng email. Xem thêm hướng dẫn chính thức cho [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) và [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

Nếu chưa cấu hình SSO, đặt `NEXT_PUBLIC_DISABLE_SSO=true` trong biến môi trường của Vercel rồi deploy lại. Nếu không khai báo biến này, ứng dụng cũng mặc định ẩn SSO để tránh hiển thị chức năng chưa sẵn sàng. Khi đó người dùng sẽ thấy thông báo kèm link tới phần hướng dẫn này. Vì đây là biến `NEXT_PUBLIC_*`, cần build/deploy lại sau khi thay đổi.

### Nâng cấp hệ thống trong Dashboard

Admin có thể mở mục **Nâng cấp hệ thống** trong menu quản trị để kiểm tra version source code trên GitHub và version database, sau đó chạy các migration còn thiếu. Nếu source code hiện tại cũ hơn version mới nhất trên GitHub, hệ thống sẽ yêu cầu cập nhật source code trước khi cho phép chạy migration. Tính năng migration trực tiếp chỉ hoạt động khi đã cấu hình `SUPABASE_DB_URL` ở server. Nếu chưa cấu hình, trang `/dashboard/upgrade` vẫn cho phép copy SQL bundle tại `/setup` để chạy thủ công.

**Phục hồi dữ liệu cần migration `20261026000000_add_restore_backup.sql`.** Từ bản này, chức năng phục hồi (Dashboard → Dữ liệu) chạy trong một transaction của database qua hàm `restore_backup`: nếu có lỗi giữa chừng, dữ liệu hiện tại được giữ nguyên. Bản tự host đã cài từ trước cần chạy migration này (bấm chạy migration ở `/dashboard/upgrade`, hoặc chạy file trong `docs/migrations/` bằng Supabase SQL Editor). Khi chưa chạy, phục hồi vẫn hoạt động theo cách cũ (xoá rồi chèn từng phần, không có transaction) và hiển thị nhắc nâng cấp database. File phục hồi tối đa 25 MB; trên Vercel, request gửi lên server bị giới hạn khoảng 4,5 MB, nên gia phả rất lớn (vài nghìn thành viên trở lên) nên phục hồi trên bản self-host.

**Cập nhật thế hệ cần migration `20261026120000_add_update_generations.sql`.** Nút "Áp dụng" ở trang Phả hệ và tuỳ chọn cập nhật thế hệ con cháu khi sửa thành viên lưu tất cả thành viên bằng một lần gọi hàm `update_generations` của database, trong một transaction: một dòng lỗi (thành viên vừa bị xoá, không có quyền sửa) thì không dòng nào bị đổi và ứng dụng báo lỗi. Hàm chạy với quyền của người gọi (SECURITY INVOKER) nên RLS của bảng `persons` vẫn áp dụng. Khi chưa chạy migration, ứng dụng cập nhật từng người như trước và nhắc nâng cấp database.

**Gộp hồ sơ trùng cần migration `20261027120000_add_merge_persons.sql`.** Công cụ "Người có thể trùng" (Dashboard → Sao lưu & phục hồi) có nút gộp hai hồ sơ thành một qua hàm `merge_persons` của database, trong một transaction: quan hệ của hồ sơ bị gộp được chuyển sang hồ sơ giữ (quan hệ trùng và quan hệ giữa hai hồ sơ bị bỏ), chi tiết riêng tư điền vào trường trống của hồ sơ giữ, các trường trống (ngày sinh/mất, đời, thứ tự con, ảnh đại diện) lấy giá trị của hồ sơ bị gộp, tên khác được nhớ lại và ghi chú được nối thêm, rồi hồ sơ bị gộp bị xoá. Ứng dụng bắt buộc xem trước nội dung sẽ chuyển, khuyến nghị tải bản sao lưu trước và phải gõ đúng tên hồ sơ bị xoá mới cho chạy. Nếu sau khi gộp hồ sơ giữ sẽ có hơn 2 cha mẹ ruột, 2 cha mẹ ruột cùng giới, hoặc một hồ sơ là tổ tiên của hồ sơ kia (cây thành vòng lặp), phần xem trước hiện cảnh báo và phải tick "Tôi hiểu" mới gõ tên xác nhận được. Gộp không thể hoàn tác; một lỗi giữa chừng thì không gì bị đổi. Chỉ admin dùng được. Khi chưa chạy migration, nút gộp nhắc nâng cấp database.

**Sự kiện lặp hằng năm cần migration `20261027180000_custom_events_recurrence.sql`.** Migration thêm cột `recurrence` vào bảng `custom_events` (`none` = một lần, `yearly_solar` = hằng năm theo ngày/tháng dương lịch, `yearly_lunar` = hằng năm theo ngày/tháng âm lịch của ngày diễn ra, giữ tháng nhuận như ngày giỗ) với mặc định `none`: sự kiện cũ giữ nguyên, không mất dữ liệu, và cập nhật hàm `restore_backup` để phục hồi giữ kiểu lặp. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy migration, sự kiện một lần vẫn thêm/sửa bình thường; chọn kiểu lặp hằng năm sẽ báo lỗi database cho tới khi nâng cấp.

**Thêm file vào cây hiện tại cần migration `20261030180000_add_append_import.sql`.** Migration chỉ thêm hàm `append_import` (chỉ chèn, không xoá/sửa dòng nào), không đổi bảng. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy, chế độ "Thêm vào cây hiện tại" báo cần nâng cấp và không thêm gì; phục hồi (thay toàn bộ cây) vẫn như cũ.

**Nơi an táng cần migration `20261028120000_add_burial_place.sql`.** Migration thêm cột `burial_place` (văn bản, có thể để trống) vào bảng `persons` để ghi nơi an táng của thành viên. Cột công khai như ngày mất: mọi thành viên đã được duyệt đều xem được, quyền (RLS) không đổi. Migration cũng cập nhật hàm `restore_backup` (phục hồi giữ nơi an táng; bản sao lưu cũ không có trường này thì để trống) và `merge_persons` (gộp hồ sơ điền nơi an táng còn trống của hồ sơ giữ từ hồ sơ bị gộp). Sao lưu JSON (định dạng v5) và CSV có thêm cột `burial_place`. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Khi chưa chạy migration, ứng dụng vẫn hoạt động như cũ, chỉ chưa lưu được nơi an táng.

**Khoá tài khoản thu hồi liên kết duyệt cần migration `20261031120000_revoke_approval_link_on_lock.sql`.** Migration chỉ định nghĩa lại hàm khoá/mở khoá tài khoản (`set_user_active_status`): khi khoá, yêu cầu duyệt chưa dùng của tài khoản đó được đánh dấu đã dùng. Không đổi bảng, không xoá dữ liệu; sao lưu/phục hồi không đổi. Trang **Nâng cấp hệ thống** tự liệt kê migration này.

**Tài khoản bị khoá không xin duyệt lại và duyệt an toàn khi đang khoá cần migration `20261031180000_lock_blocks_approval.sql`.** Migration thêm cột `locked_at` (có thể trống) vào bảng `profiles`: được ghi khi admin khoá tài khoản, xoá khi mở khoá. Tài khoản đang khoá có liên kết duyệt đã dùng hoặc đã thu hồi được điền sẵn; tài khoản chưa kích hoạt khác vẫn là "chờ duyệt". Migration cũng định nghĩa lại `set_user_active_status` (ghi/xoá `locked_at`) và thêm hàm `approve_user_request` (chỉ server gọi được bằng service role) để duyệt trong một giao dịch. Không xoá dữ liệu; sao lưu/phục hồi không đổi. Trang **Nâng cấp hệ thống** tự liệt kê migration này. Tài khoản bị khoá trước migration này mà không có liên kết duyệt đã dùng hoặc đã thu hồi (ví dụ khoá trước migration `20261031120000`) vẫn được coi là chờ duyệt: khoá lại một lần ở **Quản lý người dùng** để ngừng email.

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
3. **Member (Thành viên):** Xem sơ đồ gia phả và các thống kê trực quan; có thể thêm, sửa, xóa các sự kiện riêng do chính mình tạo.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn. Xem hướng dẫn đầy đủ ở [CONTRIBUTING.md](CONTRIBUTING.md); khi báo lỗi hoặc gửi pull request hãy dùng mẫu có sẵn. Phát hiện lỗi bảo mật? Báo riêng theo [SECURITY.md](SECURITY.md) (không mở issue công khai, không gửi `SUPABASE_SERVICE_ROLE_KEY`).

Trước khi gửi pull request, hãy chạy:

```bash
bun run test          # unit test (bun test) cho các hàm trong utils/
bun run lint          # eslint, no warnings allowed (--max-warnings 0)
bun run format:check
bun run typecheck     # tsc --noEmit
```

GitHub Actions (`.github/workflows/test.yml`) chạy đúng các lệnh này cho mỗi push lên `main` và mỗi pull request.

Test đặt cạnh file được kiểm tra (`utils/csv.ts` → `utils/csv.test.ts`). Hàm gọi Supabase được test với client giả `utils/testing/fakeSupabase.ts` (trả `{ data, error }` theo từng lệnh). Server action (`app/actions/`) được test bằng cách `mock.module` `@/utils/supabase/queries`, `@/lib/i18n/server` và `next/cache` (xem `utils/adminActions.test.ts`, `utils/memberActions.test.ts`); `mock.module` có hiệu lực qua cả các file test nên mock `queries` phải đủ mọi export. Thay đổi đáng chú ý ghi vào [CHANGELOG.md](CHANGELOG.md), mục `## [Unreleased]`.

Trang chỉ hiển thị số liệu (như `/dashboard/stats`) tính kết quả trên server và chỉ `select` các cột cần (xem `STATS_PERSON_COLUMNS` trong `utils/familyStats.ts`), không gửi cả bảng `persons` xuống trình duyệt.

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong tài khoản Supabase của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu Supabase mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.

- **Demo công khai:** Trang demo tại `giapha-os.homielab.com` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới [giấy phép MIT](LICENSE). Copyright (c) 2026 HomieLab.
