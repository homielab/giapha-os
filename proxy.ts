import { type NextRequest } from 'next/server'

import { localeFromAcceptLanguage } from '@/lib/i18n/locales'
import { updateSession } from '@/utils/supabase/middleware'

const LOCALE_COOKIE = 'locale'

export async function proxy(request: NextRequest) {
  // First visit: pick the language from the browser once. The request cookie
  // makes this very page render in it; the response cookie keeps it. A
  // language chosen later in the app overwrites the cookie.
  const firstLocale = request.cookies.has(LOCALE_COOKIE)
    ? null
    : localeFromAcceptLanguage(request.headers.get('accept-language'))
  if (firstLocale) request.cookies.set(LOCALE_COOKIE, firstLocale)

  const response = await updateSession(request)

  if (firstLocale) {
    response.cookies.set(LOCALE_COOKIE, firstLocale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax'
    })
  }
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (public, no session needed)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
