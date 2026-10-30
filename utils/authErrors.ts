import type { TranslationKey } from '@/lib/i18n/messages'

type AuthErrorLike = { code?: string | null; message?: string | null }

const BY_CODE: Record<string, TranslationKey> = {
  invalid_credentials: 'authInvalidCredentials',
  email_not_confirmed: 'authEmailNotConfirmed',
  user_already_exists: 'authUserExists',
  email_exists: 'authUserExists',
  weak_password: 'authWeakPassword',
  over_request_rate_limit: 'authRateLimited',
  over_email_send_rate_limit: 'authRateLimited',
  email_address_invalid: 'authEmailInvalid'
}

// Older Supabase servers send no code, only these messages.
const BY_MESSAGE: [RegExp, TranslationKey][] = [
  [/invalid login credentials/i, 'authInvalidCredentials'],
  [/email not confirmed/i, 'authEmailNotConfirmed'],
  [/user already registered/i, 'authUserExists'],
  [/rate limit/i, 'authRateLimited']
]

/**
 * Message key for a Supabase sign-in or sign-up error. Unknown errors get a
 * generic message so users never see the server's raw English text.
 */
export function authErrorKey(error: AuthErrorLike): TranslationKey {
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  const message = error.message ?? ''
  for (const [pattern, key] of BY_MESSAGE) {
    if (pattern.test(message)) return key
  }
  return 'unexpectedError'
}
