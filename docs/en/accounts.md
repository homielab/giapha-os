# Accounts and sign-in

[English](accounts.md) | [Tiếng Việt](../vi/tai-khoan.md) · [← README](../../README.en.md)

- Register a new account when you first open the website.
- The first registered account automatically receives the **admin** role.
- Later registrations default to **member** and remain **pending admin approval**.

## Notifications and approving new accounts

A new account stays **pending approval** until an administrator approves it. The system emails administrators a one-time approval link, valid for 7 days, as soon as the account first signs in:

- **Supabase "Confirm email" on** (the default): after the user clicks the confirmation link in their email.
- **Supabase "Confirm email" off**: right after signing up, because the user is signed in at once.
- **SSO**: when the user comes back from Google/Facebook.

Each account gets one email while its link is valid; a pending account that signs in again after the link expired sends administrators a new one. The email is always in Vietnamese (the app's default language), not in the language the new user picked. Administrators can also sign in and approve the account from **Manage users**.

Locking an account in **Manage users** also revokes its open approval link: the link in the old email (or a forwarded copy) only shows "Request revoked" and does not turn the account back on. To restore access, unlock the account in the app. Needs the migration `20261031120000_revoke_approval_link_on_lock.sql`; until it is run, a link that has not expired can still reactivate a locked account.

A locked account is no longer pending approval: signing in again opens no new approval request and sends administrators no new email. The approval link checks and activates the account in one database transaction, so locking the account while the approval page is open (even right as "Confirm approval" is pressed) leaves it locked. Needs the migration `20261031180000_lock_blocks_approval.sql`; until it is run, the approval link shows "Database upgrade needed" (administrators can still approve in **Manage users**) and a locked account that signs in again still sends an email as before.

To enable email notifications on Vercel, configure `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. `ADMIN_NOTIFICATION_EMAIL` is optional; when omitted, the system uses the email addresses of active administrators. Secret/service-role keys can bypass Row Level Security (RLS), so store them only on the server and never put them in source code, the browser, or Git. See the [Supabase API keys guide](https://supabase.com/docs/guides/getting-started/api-keys).

## Sign in with Google and Facebook

The login screen supports Google and Facebook through Supabase Auth. To enable these providers:

1. Open Supabase Dashboard → **Authentication → Sign In / Providers** and enable Google or Facebook.
2. Create the corresponding OAuth app in Google Cloud Console or Facebook Developers.
3. In the OAuth app configuration, set the Supabase callback URL, which looks like:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to `https://<your-domain>`. If the app also runs on another domain (a preview, `localhost`…), add that domain to **Redirect URLs** as:
   `https://<other-domain>/**`
   The callback carries the page to open (`/auth/callback?next=…`, when someone signs in from a shared member link), so an exact `https://<domain>/auth/callback` entry does not match; when nothing matches, Supabase sends the user to the Site URL instead of that page.

Accounts registered through SSO are also created as **pending admin approval**, just like email registrations. See the official guides for [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

If SSO is not configured, set `NEXT_PUBLIC_DISABLE_SSO=true` in Vercel and deploy again. If the variable is omitted, the application also hides SSO by default to avoid displaying an unavailable feature. Users will then see a notice with a link to this guide. Because this is a `NEXT_PUBLIC_*` variable, you must rebuild and redeploy after changing it.
