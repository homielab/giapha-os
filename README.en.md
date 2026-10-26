<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Pha OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Pha OS (Gia Pha Open Source)

[English](README.en.md) | [Tiếng Việt](README.md)

An open-source family genealogy application with an intuitive interface for exploring family trees, managing members, and finding Vietnamese kinship terms.

The project was created to solve a practical need: a cloud-based system that allows family members in different places to update information together, such as marriages and births, instead of relying on a single local computer. Self-hosting this open-source project gives your family full control over sensitive data rather than handing it to third-party services. I initially built it for my own family, but decided to share it publicly after receiving interest from others.

Designed primarily for Vietnamese families.

## Table of contents

- [Key features](#key-features)
- [Demo](#demo)
- [Screenshots](#screenshots)
- [Installation and running the project](#installation-and-running-the-project)
  - [Option 1: Quick deploy to Vercel](#option-1-quick-deploy-to-vercel)
  - [Option 2: Run locally](#option-2-run-locally)
  - [Option 3: Run with Docker](#option-3-run-with-docker)
- [First account](#first-account)
- [Troubleshooting registration](#troubleshooting-registration)
- [User roles](#user-roles)
- [Contributing](#contributing)
- [Disclaimer and privacy](#disclaimer-and-privacy)
- [License](#license)

## Key features

- **Interactive family trees**: Explore your genealogy as a Tree, Mindmap or Bubble view. On the tree, drag, Ctrl/⌘ + scroll or pinch with two fingers to zoom. It also works from the keyboard: Tab into the tree, then `+`/`-` to zoom, `0` to reset and the arrow keys to scroll; in the Bubble view, Tab through the families and press Enter or Space to select one.
- **Image and PDF export**: Export the tree as an image, a single-page PDF, or a multi-page A4/A3 landscape PDF (with an overlap for gluing sheets together and a "row,column" label on each page).
- **Kinship finder**: Automatically determine accurate Vietnamese forms of address, such as uncle, aunt, or cousin.
- **Member management**: Store member information and avatars, and organize family branches; accent-insensitive search (also in the member pickers on the Kinship page and the relationship form), usable from the keyboard (arrows, Enter, Esc); press ⌘/Ctrl + K on any Dashboard page to jump to a member.
- **Relationship management**: Manage family relationships, including special cases such as polygamous relationships.
- **Data checks**: Warnings for impossible relationships (parent-child loops, a child born before a parent, a parent who died before the child's birth) and for people with the same name and birth year.
- **Statistics and events**: Track birthdays, death anniversaries (Vietnamese lunar calendar), custom events and family demographic statistics; admins get "recompute lunar death dates" and "possible duplicates" tools.
- **Add to calendar**: The Events page has an "Add to calendar (.ics)" button to import birthdays, anniversaries and events into Google/Apple Calendar and get reminders on your phone.
- **Print a profile**: the member page has a "Print profile" button; the A4 printout has no header, footer or edit buttons and includes the photo, the full note and the family list, ready to hand out, keep at the ancestral hall or archive.
- **Data backup**: Export and import JSON, CSV, and GEDCOM files for easy storage or migration; the restore file is previewed before anything is replaced. CSV cells starting with `=`, `+`, `-` or `@` get a leading `'` on export so spreadsheets don't run them as formulas (a phone number `+84…` shows as `'+84…` in Excel); that `'` is removed again on import.
- **Security**: Use Admin, Editor, and Member roles with data protection through Supabase.
- **Responsive, bilingual**: A modern interface optimized for desktop and mobile devices, switchable between Vietnamese and English.

### Lunar calendar and death anniversaries

The app uses the Vietnamese lunar calendar (computed for UTC+7 with Hồ Ngọc Đức's algorithm), not the Chinese one (UTC+8): in some years the two differ by a day or a whole month (Tết 2007 is February 17 in Vietnam, February 18 in China). Death anniversaries are recomputed every year on the lunar calendar:

- **Day 30 in a 29-day month**: in a year where that month has only 29 days, the anniversary falls on day 29 (the last day of the month).
- **Death in a leap month**: in a year with the same leap month, the anniversary falls in the leap month; otherwise in the regular month with the same number. The leap month is known from the solar date of death; a lunar date typed in by hand is read as a regular month.
- **Time zone and 29 February**: "today" for upcoming events is always the date in Vietnam (UTC+7), on the server and in the browser, so anniversaries and birthdays are not a day off between midnight and 7 a.m. A 29 February birthday falls on 28 February in a common year.
- **Unknown year of death**: with only a solar day and month of death (no year and no lunar date), the anniversary is converted to the lunar calendar using the current year and shown as "(estimated)"; enter the year of death or the lunar date for a fixed anniversary.
- **Lunar dates saved by older versions**: before the switch to the Vietnamese lunar calendar, lunar dates were computed with the Chinese calendar and are not recomputed automatically. An administrator opens **Dashboard → Backup & Restore → Recompute lunar death dates** and clicks "Check death anniversaries" to list members whose stored lunar date differs from the one computed from the solar date of death (only people with a full day/month/year on both dates). No row is selected by default; select rows one by one or all, then confirm to apply. Do not select a row whose lunar date was typed by hand (the solar date derived from it may be wrong). Export a JSON backup first. Each row is updated on its own and only if the date of death has not been edited since the check; rows that fail or are skipped show up again at the next check. The tool never runs by itself and needs no migration.

- **Possible duplicates**: **Dashboard → Backup & Restore → Possible duplicates**, click "Scan for possible duplicates" to scan the whole tree (including data imported from GEDCOM/CSV). Two members share a group when their names are equal (ignoring accents and case) and they have the same birth year, or the same name and a shared parent. Each group lists birth – death years, the number of relationships and a link to open the profile (first 200 groups, the rest is counted). View only: nothing is changed, deleted or merged; fix or delete with the usual tools. No migration needed.

### Add events to a calendar (.ics)

On **Dashboard → Events**, the **Add to calendar (.ics)** button downloads `giapha-events.ics`, which you can import into Google Calendar, Apple Calendar, Outlook and others:

- **Birthdays** of living members: one all-day event repeating every year (a 29 Feb birthday falls on 28 Feb in a common year).
- **Death anniversaries**: a lunar date cannot repeat yearly on the solar calendar, so each year is its own event. The file holds this year's and next year's anniversaries (the same solar dates as the Events page, marked "estimated" when the death year is missing). Download it again next year.
- **Custom events**: on their own date, with the location and notes you entered.

Every event has a UID that is stable per member, so importing the file again into the same calendar updates events instead of duplicating them. The file is generated in the browser, with no server or email involved; reminders are handled by your calendar app.

### GEDCOM

Export and import GEDCOM (7.0) to open the family tree in Gramps, MyHeritage… or import it back:

- **Names**: the first word of the full name is the surname: `Nguyễn Văn An` is written `1 NAME /Nguyễn/ Văn An` with `2 SURN Nguyễn` and `2 GIVN Văn An`. On import the app prefers `SURN`/`GIVN` (keeping the surname–given-name order of the `NAME` line); without them it reads `NAME` and drops the `/` marks, so files exported by older versions read as before.
- **Families (FAM)**: each child belongs to the family of their own parent pair (a second wife's child is in the family with the second wife); a child linked to only one person (father, mother or a person with gender "other") gets a single-parent family. A person with gender "other" is written in the `HUSB` position.
- **Adopted children**: written as `2 PEDI ADOPTED` under `1 FAMC`; on import, `PEDI ADOPTED` becomes an adoptive relationship.
- **Dates**: GEDCOM has no date without a month or without a year, so a date with day + year but no month exports only the year, and a date without a year is dropped.
- **Other names**: each name in `other_names` (separated by commas or semicolons) is written as its own `1 NAME` with `2 TYPE aka`; on import, the second and later `NAME` records are joined back into other names.
- **Lunar death anniversary**: GEDCOM has no lunar calendar, so the lunar date of death is written with the custom tag `2 _LUNAR <day> <month> <year> [LEAP]` under `1 DEAT` and read back on import. Other programs ignore it. The `LEAP` flag exists only in GEDCOM files (the database does not store leap months).
- **Long notes and date ranges**: import reads both `CONC` (joined without a line break) and `CONT`, so long notes from MyHeritage or Ancestry are no longer cut. `BET a AND b` and `FROM a TO b` keep the first date and append the original text to the note (`BIRT: BET 1850 AND 1855`); `@#DJULIAN@` escapes and ABT/EST/AFT/BEF/CAL prefixes are ignored.
- Not exported: in-law flag (`is_in_law`), birth order, generation, profile photo.

### Data checks

- **Relationships**: before saving, the app refuses a link from a person to themselves, a couple that is already married (A–B and B–A count as the same), a parent–child link that would create a loop (making a grandchild the parent of their grandfather) and a child born before the parent. Birth dates are compared as far as both people have them: year, then month, then day; without a birth year this check is skipped. The "add several children" form checks every child's birth year against the parents before creating anyone.
- **Death date**: cannot be before the birth date, comparing month and day within the same year.
- **Name**: a name of only spaces is refused; extra spaces at the ends are trimmed when saving.
- **Possible duplicates**: creating a member with the same name (ignoring accents and case) and birth year as an existing one (two members without a birth year match on the name alone) asks first and lists them; Continue creates it anyway. Editing never asks.
- **Parents' death dates**: a mother who died before the child's birth is refused (when adding the link and when editing birth or death dates); a father who died more than 10 months before the birth (more than 1 year when a month or day is missing) asks for confirmation. Adopted children are not checked.
- **JSON backup version**: files carry a `version` (currently 3). On restore, a file without `version` is read as version 1 (old file); a file with a higher version than the app reads is refused with a hint to upgrade the app, so new columns are not lost.

### Photo gallery

- Accepts JPG, PNG, GIF and WEBP up to 10 MB, whether picked with the file button or dragged in. The app reads the start of the file to find the real image type (a text file renamed to `.jpg` is refused) and sets the extension in the `gallery` bucket from that type, not from the file name.
- Each page shows 24 images (`/dashboard/gallery?page=2`…); the signed links for the whole page are created in one Supabase Storage call, valid for 1 hour. A page past the end shows the last page.

### Profile photos

- Profile photos live in the private `avatars` bucket and only activated accounts can see them. The members page (tree, list, mindmap, bubble view) and the kinship page sign the links of every photo on the page in one Supabase Storage call on the server, valid for 1 hour; a photo changed since, other pages and tabs left open past that time load through `/api/avatar`.
- When you pick a photo, the app reads the start of the file to find its real type (JPG, PNG, GIF, WEBP; a text file renamed to `.jpg` is refused) and stores it with that extension, not the one in the file name.

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Account: `giaphaos@homielab.com`
- Password: `giaphaos`

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

![Member list](docs/screenshots/list.png)

![Family tree](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Statistics](docs/screenshots/stats.png)

![Kinship finder](docs/screenshots/kinship.png)

![Events](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Installation and running the project

You can set up a family genealogy system in about 10–15 minutes.

---

## 1. Create a database (free with Supabase)

1. Create a free account at https://github.com if you do not already have one.
2. Create a free account at https://supabase.com if you do not already have one. Signing up with GitHub is recommended for a faster setup.
3. Create a **New Project** and wait about 1–2 minutes for initialization to finish.
4. Open **Project → Connect** or **Project Settings → API Keys** and obtain:
   - `Project URL`
   - `Publishable key` (starts with `sb_publishable_`; older projects may show an `anon` key)
   - `Secret key` for server-side email notifications and administration when needed (starts with `sb_secret_`; older projects may use the `service_role` key in the **Legacy API Keys** tab)

---

## Option 1: Quick deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)

1. Create a free account at https://vercel.com if you do not already have one. Signing up with GitHub is recommended for a faster setup.
2. Click the Deploy button above.
3. Enter the environment variables saved in **step 1**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `Project URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `Publishable key` (or the `anon` key under **Legacy API Keys** in older projects)
   - `NEXT_PUBLIC_DISABLE_SSO` = `false` to enable SSO; set it to `true` to hide SSO until it is configured
   - `APP_URL` = the public application URL, for example `https://your-domain.vercel.app` (used for account-approval emails, Open Graph share links, `sitemap.xml` and `robots.txt`; when empty, Vercel's production domain is used). The social share image is `public/og-image.png` (1200×630); you can replace it with your own family's image.
   - `SUPABASE_SERVICE_ROLE_KEY` = the **Secret key** under **Project Settings → API Keys → Secret keys**. For older projects, copy the `service_role` key from **Legacy API Keys**. This key has high privileges: store it only in Vercel server environment variables, never use a publishable/anon key for this variable, and never use a `NEXT_PUBLIC_` prefix.
   - `SUPABASE_DB_URL` = the PostgreSQL connection string under **Project Settings → Database → Connection Pooling** (Session mode). Store it only in the Vercel server environment. It allows administrators to check and run migrations from the Dashboard.
   - `RESEND_API_KEY` = an API key from [Resend](https://resend.com)
   - `RESEND_FROM_EMAIL` = a verified sender address on Resend, for example `Gia Pha OS <no-reply@your-domain.com>`
   - `ADMIN_NOTIFICATION_EMAIL` = optional address for notifications. If omitted, notifications are sent to active administrator accounts.
4. Click **Deploy** and wait 2–3 minutes.

You will receive a website URL that is ready to use.

> **If you are upgrading an existing installation with data:** open Supabase Dashboard → SQL Editor, click **Copy full SQL** on the `/setup` page, paste it, and run it once. The bundle includes the schema and all migrations in the correct order and is safe to run repeatedly. Existing active accounts are preserved; only newly registered accounts remain pending approval.

---

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

---

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

Without Compose:

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

---

## First account

- Register a new account when you first open the website.
- The first registered account automatically receives the **admin** role.
- Later registrations default to **member** and remain **pending admin approval**.

### Notifications and approving new accounts

After a user confirms their email, the account remains **pending approval**. The system sends administrators a one-time approval link that is valid for 7 days. Administrators can also sign in and approve the account from **Manage users**.

To enable email notifications on Vercel, configure `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. `ADMIN_NOTIFICATION_EMAIL` is optional; when omitted, the system uses the email addresses of active administrators. Secret/service-role keys can bypass Row Level Security (RLS), so store them only on the server and never put them in source code, the browser, or Git. See the [Supabase API keys guide](https://supabase.com/docs/guides/getting-started/api-keys).

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

### Sign in with Google and Facebook

The login screen supports Google and Facebook through Supabase Auth. To enable these providers:

1. Open Supabase Dashboard → **Authentication → Sign In / Providers** and enable Google or Facebook.
2. Create the corresponding OAuth app in Google Cloud Console or Facebook Developers.
3. In the OAuth app configuration, set the Supabase callback URL, which looks like:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. In Supabase → **Authentication → URL Configuration**, add the application callback:
   `https://<your-domain>/auth/callback`

Accounts registered through SSO are also created as **pending admin approval**, just like email registrations. See the official guides for [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

If SSO is not configured, set `NEXT_PUBLIC_DISABLE_SSO=true` in Vercel and deploy again. If the variable is omitted, the application also hides SSO by default to avoid displaying an unavailable feature. Users will then see a notice with a link to this guide. Because this is a `NEXT_PUBLIC_*` variable, you must rebuild and redeploy after changing it.

### System upgrades in the Dashboard

Administrators can open **System upgrade** from the administration menu to check the source code version on GitHub and the database version, then run pending migrations. If the current source code is older than the latest GitHub version, the system requires the source code to be updated before migrations can run. Direct migration support requires `SUPABASE_DB_URL` on the server. Without it, `/dashboard/upgrade` still provides the SQL bundle from `/setup` for manual execution.

**Restoring data needs the migration `20261026000000_add_restore_backup.sql`.** From this version, restore (Dashboard → Data) runs in a single database transaction through the `restore_backup` function: if anything fails halfway, the current data is kept as it was. Existing self-hosted installs must run this migration (run the migrations on `/dashboard/upgrade`, or run the file from `docs/migrations/` in the Supabase SQL Editor). Until then, restore still works the old way (delete, then insert in chunks, without a transaction) and shows a reminder to upgrade the database. Restore files can be up to 25 MB; on Vercel, request bodies are limited to about 4.5 MB, so very large family trees (several thousand members or more) are best restored on a self-hosted install.

**Updating generations needs the migration `20261026120000_add_update_generations.sql`.** The "Apply" button on the Lineage page and the option to update descendants' generations when editing a member save all members with a single call to the database function `update_generations`, in one transaction: if one row fails (a member that was just deleted, or one you are not allowed to edit), no row is changed and the app reports the error. The function runs with the caller's rights (SECURITY INVOKER), so the Row Level Security of the `persons` table still applies. Until the migration is run, the app updates people one by one as before and shows a reminder to upgrade the database.

### Source code updates

When `/dashboard/upgrade` reports that the source code is outdated, update the **entire source tree** to the latest version. Do not only change the `version` number in `package.json` to bypass the warning, because migrations may require corresponding code changes.

**If deployed on Vercel:**

1. Confirm that the Vercel project is linked to the correct `homielab/giapha-os` repository and deployment branch.
2. Synchronize that branch with the latest GitHub code. If updating from a local Git checkout:

   ```bash
   git fetch origin
   git pull --ff-only origin main
   git push origin main
   ```

3. Wait for Vercel to finish building and deploying. If it does not deploy automatically, open **Deployments** and choose **Redeploy** on the latest deployment.
4. Reopen `/dashboard/upgrade`, click **Check again**, and confirm that the current version is not lower than the GitHub version.

**If running locally or self-hosted:**

```bash
git fetch origin
git pull --ff-only origin main
bun install
bun run build
```

Restart the application with the command you use, such as `bun run start`. Once the source code is updated, an administrator can return to `/dashboard/upgrade` and run the database migrations. Back up the database before upgrading. If `SUPABASE_DB_URL` is not configured, use the SQL bundle at `/setup` as described above.

---

## User roles

The system has three roles for controlling who can update the family tree:

1. **Admin**: Full access to the system.
2. **Editor**: Can add, edit, and delete member profiles and relationships.
3. **Member**: Can view the family tree and visual statistics.

## Contributing

This is an open-source project. Contributions, issue reports, and pull requests are welcome.

Before opening a pull request, run:

```bash
bun run test          # unit tests (bun test) for the utils/ functions
bun run lint
bun run format:check
bun run typecheck     # tsc --noEmit
```

GitHub Actions (`.github/workflows/test.yml`) runs the same commands on every push to `main` and every pull request.

Tests live next to the file they cover (`utils/gedcom.ts` → `utils/gedcom.test.ts`). Notable changes go in [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`.

Pages that only show numbers (such as `/dashboard/stats`) compute them on the server and `select` only the columns they need (see `STATS_PERSON_COLUMNS` in `utils/familyStats.ts`) instead of sending the whole `persons` table to the browser.

## Disclaimer and privacy

> **This project provides source code only. The author does not collect or store any personal data.**

- **Fully self-hosted:** When you deploy the application, all family tree data—names, birth dates, relationships, contact information, and more—is stored **in your own Supabase account**. The project author has no access to that database.

- **No data collection:** The source code includes no analytics, tracking, telemetry, or other form of user data collection.

- **You control your data:** All family data and member information remains in the Supabase database you create and manage. You can delete, export, or move it at any time.

- **Public demo:** The demo at `giapha-os.homielab.com` uses fictional sample data and contains no information about real people. Do not enter real personal information on the demo site.

## License

This project is distributed under the [MIT License](LICENSE). Copyright (c) 2026 HomieLab.
