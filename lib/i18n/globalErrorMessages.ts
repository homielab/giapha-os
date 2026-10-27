import type { Locale } from './locales'

// Strings of app/global-error.tsx. That page replaces the root layout, so it
// cannot receive the dictionary from the server and imports these instead of
// the whole of messages.ts. messages.ts includes them for everything else.
export const globalErrorMessages = {
  vi: {
    home: 'Trang chủ',
    globalErrorTitle: 'Đã xảy ra lỗi',
    globalErrorDescription:
      'Ứng dụng gặp sự cố không mong muốn. Hãy thử lại hoặc quay về trang chủ.',
    tryAgain: 'Thử lại'
  },
  en: {
    home: 'Home',
    globalErrorTitle: 'Something went wrong',
    globalErrorDescription:
      'The app hit an unexpected problem. Try again or go back to the home page.',
    tryAgain: 'Try again'
  }
} as const satisfies Record<Locale, Record<string, string>>
