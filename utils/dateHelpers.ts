import { Lunar, Solar } from "lunar-javascript";

export function formatDisplayDate(
  year: number | null,
  month: number | null,
  day: number | null,
): string {
  if (!year && !month && !day) return "Chưa rõ";

  const parts = [];
  if (day) parts.push(day.toString().padStart(2, "0"));
  if (month) parts.push(month.toString().padStart(2, "0"));
  if (year) parts.push(year.toString());

  return parts.join("/");
}

export function getLunarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
): string | null {
  if (!year || !month || !day) return null;

  try {
    const solar = Solar.fromYmd(
      year,
      parseInt(month.toString()),
      parseInt(day.toString()),
    );
    const lunar = solar.getLunar();

    const lDay = lunar.getDay().toString().padStart(2, "0");
    const lMonthRaw = lunar.getMonth();
    const isLeap = lMonthRaw < 0;
    const lMonth = Math.abs(lMonthRaw).toString().padStart(2, "0");
    const lYear = lunar.getYear();

    return `${lDay}/${lMonth}${isLeap ? " nhuận" : ""}/${lYear}`;
  } catch (error) {
    console.error("Lunar conversion error:", error);
    return null;
  }
}

export function getDeathAnniversaryDate(
  lunarYear: number | null,
  lunarMonth: number | null,
  lunarDay: number | null
): string | null {
  if (!lunarMonth || !lunarDay) return null;

  // Ngày giỗ là ngày trước ngày mất 1 ngày
  let annivDay = lunarDay - 1;
  let annivMonth = lunarMonth;

  if (annivDay === 0) {
    // Lùi lại 1 tháng
    annivMonth = lunarMonth - 1;
    if (annivMonth === 0) {
       annivMonth = 12;
    }
    // Lấy số ngày của tháng trước (mặc định 30 ngày đối với âm lịch đơn giản)
    // Để chính xác tuyệt đối cần tra cứu lịch, nhưng thường tính là 30 hoặc 29.
    // Chúng ta tạm dùng 30 vì thư viện lunar-javascript cần có năm để tính chính xác,
    // nhưng ngày giỗ thì lặp lại hằng năm.
    annivDay = 30; // Hoặc có thể hiển thị dạng "Ngày cuối của tháng"
  }

  return `${annivDay.toString().padStart(2, '0')}/${annivMonth.toString().padStart(2, '0')} (Âm lịch)`;
}

export function getSolarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
): string | null {
  if (!year || !month || !day) return "Chưa rõ";

  try {
    const lunar = Lunar.fromYmd(
      year,
      parseInt(month.toString()),
      parseInt(day.toString()),
    );
    const solar = lunar.getSolar();

    const sDay = solar.getDay().toString().padStart(2, "0");
    const sMonthRaw = solar.getMonth();
    const sMonth = Math.abs(sMonthRaw).toString().padStart(2, "0");
    const sYear = solar.getYear();

    return `${sDay}/${sMonth}/${sYear}`;
  } catch (error) {
    console.error("Solar conversion error:", error);
    return null;
  }
}

export function calculateAge(
  birthYear: number | null,
  birthMonth: number | null,
  birthDay: number | null,
  deathYear: number | null,
  deathMonth: number | null,
  deathDay: number | null,
  isDeceased: boolean = false,
): { age: number; isDeceased: boolean } | null {
  if (!birthYear) return null;

  if (isDeceased || deathYear) {
    if (deathYear) {
      let age = deathYear - birthYear;
      if (birthMonth && birthDay && deathMonth && deathDay) {
        if (
          deathMonth < birthMonth ||
          (deathMonth === birthMonth && deathDay < birthDay)
        ) {
          age--;
        }
      }
      return { age, isDeceased: true };
    }
    return null;
  }

  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnDate = new Date(vnTimeStr);
  const currentYear = vnDate.getFullYear();

  let age = currentYear - birthYear;

  if (birthMonth && birthDay) {
    const currentMonth = vnDate.getMonth() + 1;
    const currentDay = vnDate.getDate();
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age--;
    }
  }

  return { age, isDeceased: false };
}

export function getZodiacSign(
  day: number | null,
  month: number | null,
): string | null {
  if (!day || !month) return null;
  const d = day;
  const m = month;

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Bạch Dương";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Kim Ngưu";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return "Song Tử";
  if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return "Cự Giải";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Sư Tử";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Xử Nữ";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return "Thiên Bình";
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return "Thiên Yết";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Nhân Mã";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Ma Kết";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Bảo Bình";
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "Song Ngư";

  return null;
}

export function getZodiacAnimal(
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): string | null {
  if (!year) return null;
  const animals = [
    "Thân",
    "Dậu",
    "Tuất",
    "Hợi",
    "Tý",
    "Sửu",
    "Dần",
    "Mão",
    "Thìn",
    "Tỵ",
    "Ngọ",
    "Mùi",
  ];

  let targetYear = year;

  if (month && day) {
    try {
      const solar = Solar.fromYmd(
        year,
        parseInt(month.toString()),
        parseInt(day.toString()),
      );
      targetYear = solar.getLunar().getYear();
    } catch (error) {
      console.error("Lunar conversion error in zodiac:", error);
    }
  }

  return animals[targetYear % 12];
}

/* ── Thiên Can & Địa Chi (Vietnamese Can Chi) ─────────────────────── */
const THIEN_CAN: Record<string, string> = {
  甲: "Giáp",
  乙: "Ất",
  丙: "Bính",
  丁: "Đinh",
  戊: "Mậu",
  己: "Kỷ",
  庚: "Canh",
  辛: "Tân",
  壬: "Nhâm",
  癸: "Quý",
};

const DIA_CHI: Record<string, string> = {
  子: "Tý",
  丑: "Sửu",
  寅: "Dần",
  卯: "Mão",
  辰: "Thìn",
  巳: "Tỵ",
  午: "Ngọ",
  未: "Mùi",
  申: "Thân",
  酉: "Dậu",
  戌: "Tuất",
  亥: "Hợi",
};

/**
 * Convert a Chinese Gan-Zhi string (e.g. "丙午") to Vietnamese (e.g. "Bính Ngọ").
 */
function ganZhiToVietnamese(ganZhi: string): string {
  if (!ganZhi || ganZhi.length < 2) return ganZhi;
  const can = THIEN_CAN[ganZhi[0]] ?? ganZhi[0];
  const chi = DIA_CHI[ganZhi[1]] ?? ganZhi[1];
  return `${can} ${chi}`;
}

/**
 * Get today's solar and lunar date info for display.
 */
export function getTodayLunar() {
  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnDate = new Date(vnTimeStr);

  const solar = Solar.fromYmd(
    vnDate.getFullYear(),
    vnDate.getMonth() + 1,
    vnDate.getDate(),
  );
  const lunar = solar.getLunar();

  return {
    solarStr: vnDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    lunarDay: lunar.getDay(),
    lunarMonth: Math.abs(lunar.getMonth()),
    lunarYear: ganZhiToVietnamese(lunar.getYearInGanZhi()),
    lunarDayStr: `${lunar.getDay()} tháng ${Math.abs(lunar.getMonth())}`,
  };
}
