import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getLocale } from '@/lib/i18n/messages'
import { notifyAdminOfPendingUser } from '@/utils/approval-notification'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const authError = requestUrl.searchParams.get('error')

  if (authError) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', requestUrl.origin)
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_failed', requestUrl.origin)
      )
    }

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user?.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'member' && !profile.is_active) {
        await notifyAdminOfPendingUser({
          id: user.id,
          email: user.email,
          locale: getLocale(cookieStore.get('locale')?.value)
        })
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
