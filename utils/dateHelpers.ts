import {
  lunarToSolar,
  lunarYearName,
  solarToLunar
} from '@/utils/lunarCalendar'

export function formatDisplayDate(
  year: number | null,
  month: number | null,
  day: number | null
): string {
  if (!year && !month && !day) return 'Chưa rõ'

  const parts = []
  if (day) parts.push(day.toString().padStart(2, '0'))
  if (month) parts.push(month.toString().padStart(2, '0'))
  if (year) parts.push(year.toString())

  return parts.join('/')
}

export function getLunarDateString(
  year: number | null,
  month: number | null,
  day: number | null
): string | null {
  if (!year || !month || !day) return null

  const lunar = solarToLunar(
    year,
    parseInt(month.toString()),
    parseInt(day.toString())
  )
  if (!lunar) return null

  const lDay = lunar.day.toString().padStart(2, '0')
  const lMonth = lunar.month.toString().padStart(2, '0')
  return `${lDay}/${lMonth}${lunar.leap ? ' nhuận' : ''}/${lunar.year}`
}

export function getSolarDateString(
  year: number | null,
  month: number | null,
  day: number | null
): string | null {
  if (!year || !month || !day) return 'Chưa rõ'

  const solar = lunarToSolar(
    year,
    parseInt(month.toString()),
    parseInt(day.toString())
  )
  if (!solar) return null

  const sDay = solar.day.toString().padStart(2, '0')
  const sMonth = solar.month.toString().padStart(2, '0')
  return `${sDay}/${sMonth}/${solar.year}`
}

export function calculateAge(
  birthYear: number | null,
  birthMonth: number | null,
  birthDay: number | null,
  deathYear: number | null,
  deathMonth: number | null,
  deathDay: number | null,
  isDeceased: boolean = false
): { age: number; isDeceased: boolean } | null {
  if (!birthYear) return null

  if (isDeceased || deathYear) {
    if (deathYear) {
      let age = deathYear - birthYear
      if (birthMonth && birthDay && deathMonth && deathDay) {
        if (
          deathMonth < birthMonth ||
          (deathMonth === birthMonth && deathDay < birthDay)
        ) {
          age--
        }
      }
      return { age, isDeceased: true }
    }
    return null
  }

  const now = new Date()
  const vnTimeStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  const vnDate = new Date(vnTimeStr)
  const currentYear = vnDate.getFullYear()

  let age = currentYear - birthYear

  if (birthMonth && birthDay) {
    const currentMonth = vnDate.getMonth() + 1
    const currentDay = vnDate.getDate()
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age--
    }
  }

  return { age, isDeceased: false }
}

export function getZodiacSign(
  day: number | null,
  month: number | null
): string | null {
  if (!day || !month) return null
  const d = day
  const m = month

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Bạch Dương'
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Kim Ngưu'
  if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return 'Song Tử'
  if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return 'Cự Giải'
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Sư Tử'
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Xử Nữ'
  if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return 'Thiên Bình'
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return 'Thiên Yết'
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Nhân Mã'
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Ma Kết'
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Bảo Bình'
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'Song Ngư'

  return null
}

export function getZodiacAnimal(
  year: number | null,
  month: number | null = null,
  day: number | null = null
): string | null {
  if (!year) return null
  const animals = [
    'Thân',
    'Dậu',
    'Tuất',
    'Hợi',
    'Tý',
    'Sửu',
    'Dần',
    'Mão',
    'Thìn',
    'Tỵ',
    'Ngọ',
    'Mùi'
  ]

  let targetYear = year

  if (month && day) {
    const lunar = solarToLunar(
      year,
      parseInt(month.toString()),
      parseInt(day.toString())
    )
    if (lunar) targetYear = lunar.year
  }

  return animals[targetYear % 12]
}

/**
 * Get today's solar and lunar date info for display.
 */
export function getTodayLunar() {
  const now = new Date()
  const vnTimeStr = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  const vnDate = new Date(vnTimeStr)

  const lunar = solarToLunar(
    vnDate.getFullYear(),
    vnDate.getMonth() + 1,
    vnDate.getDate()
  )!

  return {
    solarStr: vnDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunarYearName(lunar.year),
    lunarDayStr: `${lunar.day} tháng ${lunar.month}`
  }
}
