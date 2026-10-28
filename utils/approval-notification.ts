import { getLocale, Locale, translate } from '@/lib/i18n/messages'
import { parseSiteOrigin } from '@/lib/siteUrl'
import {
  APPROVAL_TOKEN_TTL_DAYS,
  createApprovalToken,
  getApprovalTokenExpiry,
  hashApprovalToken
} from '@/utils/approval'
import { getAdminSupabase } from '@/utils/supabase/admin'

interface PendingUser {
  id: string
  email: string
  // Language of the email; defaults to Vietnamese.
  locale?: Locale
}

interface NotificationResult {
  sent: boolean
  configured: boolean
  reason?: string
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

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_NOTIFICATION_EMAIL || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

async function getAdminEmails(supabase: ReturnType<typeof getAdminSupabase>) {
  const configuredEmails = getConfiguredAdminEmails()
  if (configuredEmails.length > 0) return configuredEmails

  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (adminsError) {
    console.error('Cannot find active administrators:', adminsError)
    return []
  }

  const adminUsers = await Promise.all(
    (admins || []).map(({ id }) => supabase.auth.admin.getUserById(id))
  )

  return adminUsers
    .map(({ data }) => data.user?.email)
    .filter((email): email is string => Boolean(email))
}

export async function notifyAdminOfPendingUser({
  id,
  email,
  locale: requestedLocale
}: PendingUser): Promise<NotificationResult> {
  const locale = getLocale(requestedLocale)
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  // Never derive an approval URL from the request Host header. APP_URL must be
  // an explicitly configured trusted origin to prevent poisoned email links.
  // A bare host gets https://; anything that is not http(s) is ignored.
  const appUrl = parseSiteOrigin(process.env.APP_URL)

  if (!apiKey || !from || !appUrl) {
    console.warn(
      'Pending-user email is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and APP_URL.'
    )
    return { sent: false, configured: false, reason: 'missing_configuration' }
  }

  let supabase
  try {
    supabase = getAdminSupabase()
  } catch (error) {
    console.error('Cannot create the Supabase admin client:', error)
    return { sent: false, configured: false, reason: 'missing_service_key' }
  }

  const adminEmails = await getAdminEmails(supabase)
  if (adminEmails.length === 0) {
    console.warn(
      'No active administrator email was found. Set ADMIN_NOTIFICATION_EMAIL or ensure the admin account has an email.'
    )
    return { sent: false, configured: false, reason: 'missing_admin_email' }
  }

  const { data: existingRequest, error: lookupError } = await supabase
    .from('user_approval_requests')
    .select('id, used_at, expires_at')
    .eq('user_id', id)
    .maybeSingle()

  if (lookupError) {
    console.error(
      'Cannot look up the pending-user approval request:',
      lookupError
    )
    return { sent: false, configured: true, reason: 'database_lookup_failed' }
  }

  if (
    existingRequest &&
    !existingRequest.used_at &&
    new Date(existingRequest.expires_at).getTime() > Date.now()
  ) {
    return { sent: false, configured: true, reason: 'already_notified' }
  }

  const token = createApprovalToken()
  const { data: approvalRequest, error: insertError } = await supabase
    .from('user_approval_requests')
    .upsert(
      {
        user_id: id,
        email,
        token_hash: hashApprovalToken(token),
        expires_at: getApprovalTokenExpiry(),
        used_at: null,
        notified_at: null
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single()

  if (insertError || !approvalRequest) {
    console.error(
      'Cannot create the pending-user approval request:',
      insertError
    )
    return { sent: false, configured: true, reason: 'database_insert_failed' }
  }

  const approveUrl = `${appUrl}/api/admin/approve/${token}`
  const safeEmail = escapeHtml(email)
  const t = (
    key: Parameters<typeof translate>[1],
    values?: Record<string, string | number>
  ) => translate(locale, key, values)
  const subject = t('approvalEmailSubject', { email })
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#292524;max-width:640px">
      <h2 style="color:#b45309">${escapeHtml(t('approvalEmailTitle'))}</h2>
      <p>${escapeHtml(t('approvalEmailIntro'))}</p>
      <p><strong>${safeEmail}</strong></p>
      <p>
        <a href="${escapeHtml(approveUrl)}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
          ${escapeHtml(t('approvalEmailButton'))}
        </a>
      </p>
      <p style="color:#78716c;font-size:13px">${escapeHtml(t('approvalEmailExpiry', { days: APPROVAL_TOKEN_TTL_DAYS }))}</p>
    </div>
  `
  const text = t('approvalEmailText', { email, url: approveUrl })

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: adminEmails,
      subject,
      html,
      text
    })
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(
      'Resend rejected the pending-user email:',
      response.status,
      errorBody
    )
    await supabase
      .from('user_approval_requests')
      .delete()
      .eq('id', approvalRequest.id)
    return { sent: false, configured: true, reason: 'email_send_failed' }
  }

  const { error: markNotifiedError } = await supabase
    .from('user_approval_requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', approvalRequest.id)

  if (markNotifiedError) {
    console.error(
      'Pending-user email sent but could not be marked as notified:',
      markNotifiedError
    )
  }

  return { sent: true, configured: true }
}
