import { describe, expect, test } from 'bun:test'

import { translate } from '@/lib/i18n/messages'

import { authErrorKey } from './authErrors'

describe('authErrorKey', () => {
  test('maps Supabase error codes', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe(
      'authInvalidCredentials'
    )
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe(
      'authEmailNotConfirmed'
    )
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('authUserExists')
    expect(authErrorKey({ code: 'weak_password' })).toBe('authWeakPassword')
    expect(authErrorKey({ code: 'over_request_rate_limit' })).toBe(
      'authRateLimited'
    )
    expect(authErrorKey({ code: 'email_address_invalid' })).toBe(
      'authEmailInvalid'
    )
  })

  test('falls back to known messages without a code', () => {
    expect(authErrorKey({ message: 'Invalid login credentials' })).toBe(
      'authInvalidCredentials'
    )
    expect(authErrorKey({ message: 'User already registered' })).toBe(
      'authUserExists'
    )
  })

  test('hides unknown server text', () => {
    expect(authErrorKey({ code: 'something_new', message: 'Boom' })).toBe(
      'unexpectedError'
    )
    expect(authErrorKey({})).toBe('unexpectedError')
  })

  test('has Vietnamese and English text', () => {
    expect(translate('vi', authErrorKey({ code: 'invalid_credentials' }))).toBe(
      'Email hoặc mật khẩu không đúng.'
    )
    expect(translate('en', 'unexpectedError')).toBe(
      'An unexpected error occurred'
    )
  })
})
