# Installation

[English](install.md) | [Tiếng Việt](../vi/cai-dat.md) · [← README](../../README.en.md)

You can set up a family genealogy system in about 10–15 minutes.

## 1. Create a database (free with Supabase)

1. Create a free account at https://github.com if you do not already have one.
2. Create a free account at https://supabase.com if you do not already have one. Signing up with GitHub is recommended for a faster setup.
3. Create a **New Project** and wait about 1–2 minutes for initialization to finish.
4. Open **Project → Connect** or **Project Settings → API Keys** and obtain:
   - `Project URL`
   - `Publishable key` (starts with `sb_publishable_`; older projects may show an `anon` key)
   - `Secret key` for server-side email notifications and administration when needed (starts with `sb_secret_`; older projects may use the `service_role` key in the **Legacy API Keys** tab)

## Option 1: Quick deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,SHORT_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Create a free account at https://vercel.com if you do not already have one. Signing up with GitHub is recommended for a faster setup.
2. Click the Deploy button above.
3. Enter the environment variables saved in **step 1**:
   - `SITE_NAME` = the site name shown in titles and on the about page (default `Gia Phả OS`)
   - `SHORT_NAME` = the short name under the home-screen icon (default `Gia Phả`)
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (or the `anon` key under **Legacy API Keys** in older projects)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` to enable SSO; set it to `true` to hide SSO until it is configured
   - `APP_URL` = the public application URL, for example `https://your-domain.vercel.app` (used for account-approval emails, Open Graph share links, JSON-LD structured data on the home and about pages, `sitemap.xml` and `robots.txt`; only the origin is used: `https://` is added when missing and any path is dropped; when empty or not an http(s) address, Vercel's production domain is used). The social share image is `public/og-image.png` (1200×630); you can replace it with your own family's image.
   - `SUPABASE_SERVICE_ROLE_KEY` = the **Secret key** under **Project Settings → API Keys → Secret keys**. For older projects, copy the `service_role` key from **Legacy API Keys**. This key has high privileges: store it only in Vercel server environment variables, never use a publishable/anon key for this variable, and never use a `NEXT_PUBLIC_` prefix.
   - `SUPABASE_DB_URL` = the PostgreSQL connection string under **Project Settings → Database → Connection Pooling** (Session mode). Store it only in the Vercel server environment. It allows administrators to check and run migrations from the Dashboard.
   - `RESEND_API_KEY` = an API key from [Resend](https://resend.com)
   - `RESEND_FROM_EMAIL` = a verified sender address on Resend, for example `Gia Pha OS <no-reply@your-domain.com>`
   - `ADMIN_NOTIFICATION_EMAIL` = optional address for notifications. If omitted, notifications are sent to active administrator accounts.
4. Click **Deploy** and wait 2–3 minutes.

You will receive a website URL that is ready to use.

> **If you are upgrading an existing installation with data:** open Supabase Dashboard → SQL Editor, click **Copy full SQL** on the `/setup` page, paste it, and run it once. The bundle includes the schema and all migrations in the correct order and is safe to run repeatedly. Existing active accounts are preserved; only newly registered accounts remain pending approval.

## Option 2: Run locally

Requirements: [Node.js](https://nodejs.org/en) and [Bun](https://bun.sh/)

1. Clone or download the project.
2. Rename `.env.example` to `.env.local`.
3. Open `.env.local` and enter the values saved in **step 1**.

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
```

4. Install dependencies:

```bash
bun install
```

5. Start the project:

```bash
bun run dev
```

Open a browser and visit `http://localhost:3000`.

## Option 3: Run with Docker

For self-hosting on a VPS or your own server. Requirements: [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

1. Clone the project, rename `.env.example` to `.env.local` and fill in the values from **step 1** (the same as Option 1: `NEXT_PUBLIC_*`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_*`...).
2. Build and start:

```bash
docker compose --env-file .env.local up -d --build
```

Open `http://localhost:3000` (or your domain behind a reverse proxy; add the domain to Supabase as described in [Troubleshooting registration](#troubleshooting-registration)).

**Important about environment variables:**

- Next.js writes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` and `NEXT_PUBLIC_DISABLE_SSO` into the JavaScript **at build time**, so they must be passed as build args. `--env-file .env.local` lets `docker-compose.yml` read them from `.env.local`; the build stops with an error when the two Supabase variables are missing. After changing them, rebuild (`--build`): restarting the container is not enough.
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `RESEND_API_KEY`...) are **not** stored in the image: the container reads them from `.env.local` when it starts (`env_file`). `.env*` files are not copied into the image.

Without Compose (`docker run --env-file` keeps quotes as part of the value, so write values in `.env.local` without quotes, even with spaces: `SITE_NAME=Gia Phả OS`):

```bash
docker build -t giapha-os \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key" \
  --build-arg NEXT_PUBLIC_DISABLE_SSO=true \
  .
docker run -d -p 3000:3000 --env-file .env.local --restart always giapha-os
```

The image has a built-in `HEALTHCHECK` that requests the `/login` page every 30 seconds: `docker ps` shows `healthy` or `unhealthy` in the STATUS column, and `docker inspect --format '{{.State.Health.Status}}' <container>` reports the same. An `unhealthy` container means the app no longer answers; check `docker logs <container>`.

The image includes `docs/schema.sql` and `docs/migrations/`, so `/setup` and `/dashboard/upgrade` work as on Vercel. **Updating:** `git pull`, run `docker compose --env-file .env.local up -d --build` again, then open `/dashboard/upgrade` to run new migrations (if any).

## Troubleshooting registration

If you see `Failed to fetch` while registering after setup:

**Cause:** Supabase is blocking requests from a domain that has not been added to the allowlist.

**Fix:**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **Authentication → URL Configuration**.
3. Under **Site URL**, enter the application’s primary URL, for example:
   - Vercel: `https://your-domain.vercel.app`
   - Local: `http://localhost:3000`
4. Under **Redirect URLs**, click **Add URL** and add:
   - `https://your-domain.vercel.app/**`
   - `http://localhost:3000/**` (for local development)
   - Or at minimum: `https://your-domain.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`
5. Click **Save** and try again.

> **Note:** Replace `your-domain.vercel.app` with your actual domain. If you use a custom domain, add that domain as well.
