import { NextResponse } from 'next/server'

import config from '@/app/config'
import {
  getLocale,
  getMessages,
  Locale,
  TranslationKey,
  TranslationValues
} from '@/lib/i18n/messages'
import { hashApprovalToken } from '@/utils/approval'
import { getAdminSupabase } from '@/utils/supabase/admin'
import { isMissingDatabaseFunction } from '@/utils/supabase/missingFunction'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ token: string }>
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[character] || character
  )
}

function getRequestTranslations(request: Request) {
  const localeCookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('locale='))
    ?.slice('locale='.length)

  const locale = getLocale(localeCookie)
  const dictionary = getMessages(locale)

  return {
    locale,
    t: (key: TranslationKey, values?: TranslationValues) => {
      let value: string = dictionary[key]
      if (values) {
        Object.entries(values).forEach(([name, replacement]) => {
          value = value.replace(`{${name}}`, String(replacement))
        })
      }
      return value
    }
  }
}

type Translator = (key: TranslationKey, values?: TranslationValues) => string

function htmlResponse(content: string, status = 200, locale: Locale = 'vi') {
  const title = getMessages(locale).approvalTitle

  return new NextResponse(
    `<!doctype html>
      <html lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(config.siteName)} - ${title}</title>
        </head>
        <body style="margin:0;background:#fafaf9;font-family:Arial,sans-serif;color:#292524">
          <main style="box-sizing:border-box;max-width:560px;margin:0 auto;padding:48px 20px">
            <section style="background:#fff;border:1px solid #e7e5e4;border-radius:16px;padding:32px;box-shadow:0 4px 16px rgba(28,25,23,.06)">
              ${content}
            </section>
          </main>
        </body>
      </html>`,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  )
}

function isApprovalToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

async function getRequest(token: string) {
  if (!isApprovalToken(token)) return { supabase: null, request: null }

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('user_approval_requests')
    .select('id, user_id, email, expires_at, used_at')
    .eq('token_hash', hashApprovalToken(token))
    .maybeSingle()

  if (error) throw error
  return { supabase, request: data }
}

function invalidRequestResponse(locale: Locale, t: Translator) {
  return htmlResponse(
    `<h1 style="margin-top:0;color:#991b1b">${t('approvalInvalidTitle')}</h1><p>${t('approvalInvalidText')}</p>`,
    404,
    locale
  )
}

function processedResponse(locale: Locale, t: Translator) {
  return htmlResponse(
    `<h1 style="margin-top:0;color:#166534">${t('approvalProcessedTitle')}</h1><p>${t('approvalProcessedText')}</p>`,
    200,
    locale
  )
}

function revokedResponse(locale: Locale, t: Translator) {
  return htmlResponse(
    `<h1 style="margin-top:0;color:#991b1b">${t('approvalRevokedTitle')}</h1><p>${t('approvalRevokedText')}</p>`,
    410,
    locale
  )
}

type AdminSupabase = ReturnType<typeof getAdminSupabase>

// What public.approve_user_request (migration 20261031180000) answers.
interface ApprovalResult {
  status?:
    'approved' | 'processed' | 'revoked' | 'expired' | 'invalid' | 'not_found'
  email?: string | null
}

// A used link whose account is inactive was revoked: locking a user in
// Manage users closes their open approval link. Answer 410 so the old email
// cannot be mistaken for a working approval.
async function usedRequestResponse(
  supabase: AdminSupabase,
  userId: string,
  locale: Locale,
  t: Translator
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (profile && !profile.is_active) return revokedResponse(locale, t)
  return processedResponse(locale, t)
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { locale, t } = getRequestTranslations(_request)
  try {
    const { token } = await params
    const { supabase, request } = await getRequest(token)

    if (!request || !supabase) return invalidRequestResponse(locale, t)

    if (request.used_at) {
      return usedRequestResponse(supabase, request.user_id, locale, t)
    }

    if (new Date(request.expires_at).getTime() <= Date.now()) {
      return invalidRequestResponse(locale, t)
    }

    return htmlResponse(
      `<h1 style="margin-top:0;color:#b45309">${t('approvalTitle')}</h1>
      <p>${t('approvalPendingText')}</p>
      <p style="font-weight:700">${escapeHtml(request.email)}</p>
      <form method="post">
        <button type="submit" style="border:0;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-size:16px;padding:11px 18px">
          ${t('approvalConfirm')}
        </button>
      </form>
      <p style="color:#78716c;font-size:13px;margin-bottom:0">${t('approvalIgnore')}</p>
    `,
      200,
      locale
    )
  } catch (error) {
    console.error('Cannot open the pending-user approval link:', error)
    return htmlResponse(
      `<h1 style="margin-top:0;color:#991b1b">${t('approvalConfigErrorTitle')}</h1><p>${t('approvalConfigErrorText')}</p>`,
      503,
      locale
    )
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { locale, t } = getRequestTranslations(_request)
  try {
    const requestOrigin = new URL(_request.url).origin
    const requestOriginHeader = _request.headers.get('origin')
    const requestReferer = _request.headers.get('referer')
    if (
      (requestOriginHeader && requestOriginHeader !== requestOrigin) ||
      (requestReferer && !requestReferer.startsWith(`${requestOrigin}/`))
    ) {
      return htmlResponse(
        `<h1 style="margin-top:0;color:#991b1b">${t('approvalInvalidRequestTitle')}</h1>`,
        403,
        locale
      )
    }

    const { token } = await params
    if (!isApprovalToken(token)) return invalidRequestResponse(locale, t)

    // One database transaction checks the request and the account and
    // activates it, so a lock made after this page was opened (even one
    // landing during this request) is never undone, and of two concurrent
    // clicks only one approves.
    const { data, error } = await getAdminSupabase().rpc(
      'approve_user_request',
      { p_token_hash: hashApprovalToken(token) }
    )

    if (isMissingDatabaseFunction(error)) {
      console.error(
        'Cannot approve pending user: run the database migrations (approve_user_request is missing).'
      )
      return htmlResponse(
        `<h1 style="margin-top:0;color:#991b1b">${t('approvalUpgradeTitle')}</h1><p>${t('approvalUpgradeText')}</p>`,
        503,
        locale
      )
    }
    if (error) throw error

    const result = (data ?? {}) as ApprovalResult
    switch (result.status) {
      case 'approved':
        return htmlResponse(
          `<h1 style="margin-top:0;color:#166534">${t('approvalSuccessTitle')}</h1><p>${t('approvalSuccessText', { email: `<strong>${escapeHtml(result.email ?? '')}</strong>` })}</p>`,
          200,
          locale
        )
      case 'processed':
        return processedResponse(locale, t)
      case 'revoked':
        return revokedResponse(locale, t)
      case 'not_found':
        return htmlResponse(
          `<h1 style="margin-top:0;color:#991b1b">${t('approvalNotFoundTitle')}</h1><p>${t('approvalNotFoundText')}</p>`,
          404,
          locale
        )
      case 'invalid':
      case 'expired':
        return invalidRequestResponse(locale, t)
      default:
        throw new Error(
          `approve_user_request returned an unknown status: ${String(result.status)}`
        )
    }
  } catch (error) {
    console.error('Cannot approve pending user:', error)
    return htmlResponse(
      `<h1 style="margin-top:0;color:#991b1b">${t('approvalFailureTitle')}</h1><p>${t('approvalFailureText')}</p>`,
      500,
      locale
    )
  }
}
