-- ============================================================
-- Seed File cho Gia Pha OS
-- Dòng họ: VẠN (Họ hư cấu, không đại diện cho người thật nào)
-- 4 Đời, ~27 thành viên, đủ quan hệ để test mọi tính năng
-- CẢNH BÁO: TRUNCATE toàn bộ dữ liệu hiện có trước khi chạy
-- ============================================================

TRUNCATE TABLE relationships CASCADE;
TRUNCATE TABLE person_details_private CASCADE;
TRUNCATE TABLE persons CASCADE;

-- ============================================================
-- ĐỜI 1 — TỔ TIÊN (Sinh ~1900-1920)
-- ============================================================
INSERT INTO persons (id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, generation, birth_order, note)
VALUES
(
  '10000000-0000-0000-0000-000000000001',
  'Vạn Công Gốc',
  'male', 1902, 3, 15, 1975, 8, 22, 1975, 7, 16, TRUE, FALSE, 1, NULL,
  'Ông tổ dòng họ Vạn. Xuất thân nông dân, người có công khai phá vùng đất và lập nên dòng tộc. Nổi tiếng về đức tính cần cù và chí khí. [Nhân vật hư cấu]'
),
(
  '10000000-0000-0000-0000-000000000002',
  'Bình Thị Mộc',
  'female', 1908, 6, 10, 1980, 1, 5, 1979, 11, 18, TRUE, TRUE, 1, NULL,
  'Tổ mẫu, người vợ đảm đang một tay nuôi dạy con cái qua thời chiến loạn. Được cháu chắt kính trọng và nhớ mãi. [Nhân vật hư cấu]'
);

-- ============================================================
-- ĐỜI 2 — ÔNG BÀ (Sinh ~1930-1950)
-- ============================================================
INSERT INTO persons (id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, generation, birth_order, note)
VALUES
-- Nhánh Trưởng (ở lại quê Bắc)
(
  '20000000-0000-0000-0000-000000000001',
  'Vạn Công Thuận',
  'male', 1930, 2, 4, 2008, 11, 30, 2008, 11, 3, TRUE, FALSE, 2, 1,
  'Con trai trưởng, từng là cán bộ địa phương. Người cẩn thận, chữ đẹp, để lại cuốn gia phả viết tay. [Nhân vật hư cấu]'
),
(
  '20000000-0000-0000-0000-000000000002',
  'Cam Thị Dịu',
  'female', 1934, 9, 20, 2012, 4, 14, 2012, 3, 24, TRUE, TRUE, 2, NULL,
  'Vợ của ông Thuận, con gái nhà buôn. Giỏi nấu ăn truyền thống, thường dạy cháu các món ăn ngày Tết. [Nhân vật hư cấu]'
),
-- Nhánh Thứ (con gái, không lấy chồng)
(
  '20000000-0000-0000-0000-000000000003',
  'Vạn Thị Bình',
  'female', 1935, 7, 7, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 2, 2,
  'Con gái thứ hai, dạy học cấp 2 hơn 30 năm. Không lấy chồng, dành cả đời vì học trò và gia đình. [Nhân vật hư cấu]'
),
-- Nhánh Út (vào Nam)
(
  '20000000-0000-0000-0000-000000000004',
  'Vạn Công Viễn',
  'male', 1942, 12, 1, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 2, 3,
  'Con trai út, vào Nam năm 1975, định cư tại TP.HCM. Kinh doanh vật liệu xây dựng thành công. Hay về thăm quê dịp Tết. [Nhân vật hư cấu]'
),
(
  '20000000-0000-0000-0000-000000000005',
  'Tân Thị Khéo',
  'female', 1945, 3, 8, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 2, NULL,
  'Vợ của ông Viễn. Người nhanh nhẹn, thực sự điều hành cửa hàng vật liệu của gia đình từ những ngày đầu. [Nhân vật hư cấu]'
);

-- ============================================================
-- ĐỜI 3 — BỐ MẸ / CÔ CHÚ (Sinh ~1955-1975)
-- ============================================================
INSERT INTO persons (id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, generation, birth_order, note)
VALUES
-- Con của ông Thuận & bà Dịu (nhánh Bắc)
(
  '30000000-0000-0000-0000-000000000001',
  'Vạn Công Trí',
  'male', 1958, 4, 12, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 3, 1,
  'Con trai trưởng của ông Thuận. Kỹ sư xây dựng, tham gia nhiều công trình lớn. Hiện về hưu, hay đi câu cá và chơi cờ. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000002',
  'Ngô Thị Dịu Hiền',
  'female', 1961, 8, 25, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 3, NULL,
  'Vợ của anh Trí. Giáo viên dạy Văn nghỉ hưu, yêu thơ và hay viết thơ tặng cháu. Nấu phở nức tiếng cả phố. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000003',
  'Vạn Thị Cẩm',
  'female', 1962, 11, 3, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 3, 2,
  'Con gái thứ hai. Bác sĩ nhi khoa được kính trọng, hay khám bệnh miễn phí cho trẻ em nghèo. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000004',
  'Tề Văn Chính',
  'female', 1959, 5, 18, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 3, NULL,
  'Chồng của bác Cẩm. Làm luật sư, điềm tĩnh và hay đọc sách lịch sử. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000005',
  'Vạn Công Mộc',
  'male', 1967, 6, 20, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 3, 3,
  'Con trai út của ông Thuận. Từng đi lao động xuất khẩu Đông Âu. Về nước mở xưởng mộc, người vui tính hay kể chuyện cười. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000006',
  'Quế Thị Lam',
  'female', 1970, 2, 14, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 3, NULL,
  'Vợ của chú Mộc. Gốc miền Bắc, hát dân ca hay, hay tổ chức họp mặt gia đình dịp lễ Tết. [Nhân vật hư cấu]'
),
-- Con của ông Viễn & bà Khéo (nhánh Nam)
(
  '30000000-0000-0000-0000-000000000007',
  'Vạn Viễn Tuệ',
  'male', 1970, 9, 5, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 3, 1,
  'Con trai cả ở Sài Gòn. Kỹ sư tin học, hay về thăm quê Bắc và mang đặc sản miền Nam. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000008',
  'Vạn Viễn Thanh',
  'female', 1973, 4, 22, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 3, 2,
  'Con gái ở Sài Gòn. Giáo viên tiếng Anh, đạt IELTS 8.0. Sống tại TP.HCM cùng chồng và hai con. [Nhân vật hư cấu]'
),
(
  '30000000-0000-0000-0000-000000000009',
  'Liêu Văn Kiến',
  'male', 1971, 11, 30, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 3, NULL,
  'Chồng của cô Thanh. Kiến trúc sư, hay đưa gia đình đi du lịch khám phá. [Nhân vật hư cấu]'
);

-- ============================================================
-- ĐỜI 4 — CHÁU CHẮT (Sinh ~1988-2010)
-- ============================================================
INSERT INTO persons (id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, generation, birth_order, note)
VALUES
-- Con của anh Trí & bà Dịu Hiền
(
  '40000000-0000-0000-0000-000000000001',
  'Vạn Trí Minh',
  'male', 1989, 3, 14, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 1,
  'Con trai cả của anh Trí. Lập trình viên fullstack, yêu công nghệ mã nguồn mở. Tác giả dự án Gia Pha OS này! [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000002',
  'Đinh Thị Mỹ Duyên',
  'female', 1991, 7, 8, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, 4, NULL,
  'Vợ của anh Minh. Nhà thiết kế UI/UX, đứng sau giao diện đẹp của nhiều ứng dụng. [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000003',
  'Vạn Trí Ngọc',
  'female', 1992, 12, 25, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 2,
  'Con gái anh Trí. Nghiên cứu sinh Tiến sĩ Hóa học, nhận học bổng toàn phần từ nước ngoài. [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000004',
  'Vạn Trí Khang',
  'male', 1998, 1, 30, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 3,
  'Cậu út của anh Trí. Sinh viên Kinh tế, thích bóng đá và chơi guitar. [Nhân vật hư cấu]'
),
-- Con của bác Cẩm & chú Chính
(
  '40000000-0000-0000-0000-000000000005',
  'Tề Vạn Liên',
  'female', 1990, 5, 20, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 1,
  'Con gái bác Cẩm, mang họ đôi Tề Vạn. Dược sĩ bệnh viện, thừa hưởng đức y đức của mẹ. [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000006',
  'Tề Vạn Hào',
  'male', 1993, 8, 11, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 2,
  'Con trai bác Cẩm. Phi công hàng không dân dụng. Ngoài giờ bay đi phượt khám phá vùng núi phía Bắc. [Nhân vật hư cấu]'
),
-- Con của chú Mộc & thím Lam
(
  '40000000-0000-0000-0000-000000000007',
  'Vạn Mộc Kiên',
  'male', 1995, 10, 15, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 1,
  'Con trai chú Mộc. Tiếp nối nghề mộc theo hướng thiết kế nội thất hiện đại. Mở xưởng riêng từ năm 22 tuổi. [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000008',
  'Vạn Mộc Ngân',
  'female', 1999, 3, 3, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 2,
  'Con gái chú Mộc. Vừa tốt nghiệp đại học Tài chính - Ngân hàng. Hay hát dân ca theo mẹ Lam. [Nhân vật hư cấu]'
),
-- Con của anh Tuệ (nhánh HCM)
(
  '40000000-0000-0000-0000-000000000009',
  'Vạn Tuệ An',
  'male', 2000, 6, 18, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 1,
  'Con trai anh Tuệ. Đang học IT tại TP.HCM. Mê AI và tự học lập trình Python từ năm lớp 8. [Nhân vật hư cấu]'
),
-- Con của cô Thanh & anh Kiến (nhánh HCM)
(
  '40000000-0000-0000-0000-000000000010',
  'Liêu Vạn Bình',
  'female', 2003, 2, 28, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 1,
  'Con gái cô Thanh, mang họ đôi Liêu Vạn. Học sinh cấp 3 giỏi tiếng Anh. Mơ ước trở thành kiến trúc sư. [Nhân vật hư cấu]'
),
(
  '40000000-0000-0000-0000-000000000011',
  'Liêu Vạn Kỳ',
  'male', 2007, 9, 9, NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, 4, 2,
  'Con trai cô Thanh. Học sinh lớp 8, thích đá bóng và vẽ truyện tranh manga. [Nhân vật hư cấu]'
);

-- ============================================================
-- THÔNG TIN RIÊNG TƯ (Admin only)
-- ============================================================
INSERT INTO person_details_private (person_id, phone_number, occupation, current_residence)
VALUES
('30000000-0000-0000-0000-000000000001', '09xx xxx 001', 'Kỹ sư xây dựng (đã nghỉ hưu)', 'Hà Đông, Hà Nội'),
('30000000-0000-0000-0000-000000000002', '09xx xxx 002', 'Giáo viên Văn (đã nghỉ hưu)', 'Hà Đông, Hà Nội'),
('30000000-0000-0000-0000-000000000003', '09xx xxx 003', 'Bác sĩ Nhi khoa', 'Đống Đa, Hà Nội'),
('30000000-0000-0000-0000-000000000005', '09xx xxx 005', 'Chủ xưởng mộc', 'Hà Đông, Hà Nội'),
('30000000-0000-0000-0000-000000000007', '09xx xxx 007', 'Kỹ sư Tin học', 'Quận 7, TP.HCM'),
('40000000-0000-0000-0000-000000000001', '09xx xxx 101', 'Lập trình viên Fullstack', 'Cầu Giấy, Hà Nội'),
('40000000-0000-0000-0000-000000000002', '09xx xxx 102', 'Nhà thiết kế UI/UX', 'Cầu Giấy, Hà Nội'),
('40000000-0000-0000-0000-000000000003', '09xx xxx 103', 'Nghiên cứu sinh Tiến sĩ', 'Đống Đa, Hà Nội'),
('40000000-0000-0000-0000-000000000005', '09xx xxx 105', 'Dược sĩ bệnh viện', 'Thanh Xuân, Hà Nội'),
('40000000-0000-0000-0000-000000000006', '09xx xxx 106', 'Phi công hàng không', 'Long Biên, Hà Nội');

-- ============================================================
-- QUAN HỆ GIA ĐÌNH
-- biological_child: person_a = Bố/Mẹ, person_b = Con
-- marriage: person_a & person_b = Vợ chồng
-- ============================================================

-- Đời 1: Hôn nhân tổ tiên
INSERT INTO relationships (type, person_a, person_b) VALUES
('marriage', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

-- Đời 1 → Đời 2
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
('biological_child', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
('biological_child', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
('biological_child', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
('biological_child', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004'),
('biological_child', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004');

-- Đời 2: Hôn nhân
INSERT INTO relationships (type, person_a, person_b) VALUES
('marriage', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
('marriage', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005');

-- Đời 2 → Đời 3 (nhánh ông Thuận & bà Dịu)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
('biological_child', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001'),
('biological_child', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
('biological_child', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003'),
('biological_child', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005'),
('biological_child', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005');

-- Đời 2 → Đời 3 (nhánh ông Viễn & bà Khéo)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000007'),
('biological_child', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000007'),
('biological_child', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000008'),
('biological_child', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000008');

-- Đời 3: Hôn nhân
INSERT INTO relationships (type, person_a, person_b) VALUES
('marriage', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
('marriage', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004'),
('marriage', '30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000006'),
('marriage', '30000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000009');

-- Đời 3 → Đời 4 (con anh Trí & bà Dịu Hiền)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
('biological_child', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001'),
('biological_child', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003'),
('biological_child', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003'),
('biological_child', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004'),
('biological_child', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000004');

-- Đời 3 → Đời 4 (con bác Cẩm & chú Chính)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000005'),
('biological_child', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005'),
('biological_child', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000006'),
('biological_child', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000006');

-- Đời 3 → Đời 4 (con chú Mộc & thím Lam)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007'),
('biological_child', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000007'),
('biological_child', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000008'),
('biological_child', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000008');

-- Đời 3 → Đời 4 (con anh Tuệ - nhánh HCM)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000009');

-- Đời 3 → Đời 4 (con cô Thanh & anh Kiến - nhánh HCM)
INSERT INTO relationships (type, person_a, person_b) VALUES
('biological_child', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000010'),
('biological_child', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000010'),
('biological_child', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000011'),
('biological_child', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000011');

-- Đời 4: Hôn nhân
INSERT INTO relationships (type, person_a, person_b) VALUES
('marriage', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002');

-- ============================================================
-- END OF SEED
-- Dòng họ Vạn (hư cấu): 4 đời, 27 thành viên
-- Nhánh Bắc (Hà Nội) + Nhánh Nam (TP.HCM)
-- Tất cả nhân vật, tên, số điện thoại đều là HƯ CẤU
-- ============================================================
