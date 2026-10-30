import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { nextParamFor, safeNextPath } from '@/utils/safeNextPath'

// A redirect is a new response: carry over the session cookies that
// supabase.auth.getUser() may have just refreshed on supabaseResponse,
// otherwise the browser keeps the old (already rotated) refresh token.
function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url)
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => response.cookies.set(cookie))
  return response
}

// Set once the profiles table has answered without error. The schema does not
// disappear while the server runs, so later requests skip the probe instead of
// paying an extra Supabase query each. Until then (fresh install, /setup not
// run yet) every dashboard or login request still checks and redirects.
let schemaReady = false

// For tests: forget a previous successful probe.
export function resetSchemaCheck() {
  schemaReady = false
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  // If env vars are missing, we cannot create a supabase client
  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname !== '/missing-db-config') {
      const url = request.nextUrl.clone()
      url.pathname = '/missing-db-config'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      }
    }
  })

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-browser cookies across mobile browsers.
  // https://supabase.com/docs/guides/auth/server-side/nextjs

  const {
    data: { user }
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Check if DB schema is initialized by checking if profiles table exists
  if ((isProtectedPath || isLoginPage) && !schemaReady) {
    const { error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (
      profileError &&
      (profileError.code === 'PGRST205' || profileError.code === '42P01')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/setup'
      return redirectWithCookies(url, supabaseResponse)
    }

    if (!profileError) schemaReady = true
  }

  if (isProtectedPath && !user) {
    // no user, potentially respond by redirecting the user to the login page
    // ?next= brings them back to this page after signing in (a shared link
    // to a member or event page).
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    const next = nextParamFor(request.nextUrl.pathname, request.nextUrl.search)
    if (next) url.searchParams.set('next', next)
    return redirectWithCookies(url, supabaseResponse)
  }

  // Redirect users who are already logged in away from the login page, to
  // the page in ?next= when it is a safe dashboard page
  if (isLoginPage && user) {
    const url = new URL(
      safeNextPath(request.nextUrl.searchParams.get('next')),
      request.nextUrl.origin
    )
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}
