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

- **Interactive family trees**: Explore your genealogy as a Tree, Mindmap or Bubble view. On the tree, drag, Ctrl/⌘ + scroll or pinch with two fingers to zoom around the pointer or fingers; the +/- buttons keep what is in the middle of the view in place. It also works from the keyboard: Tab into the tree, then `+`/`-` to zoom, `0` to reset and the arrow keys to scroll; in the Bubble view, Tab through the families and press Enter or Space to select one.
- **Image and PDF export**: Export the tree as an image, a single-page PDF, or a multi-page A4/A3 PDF (with an overlap for gluing sheets together and a "row,column" label on each page; portrait or landscape, whichever takes fewer sheets, following the tree's shape on a tie). The branch expand/collapse buttons are left out of the exported file. Large trees are rendered at a lower resolution to fit the browser's canvas limits; a tree too large for any canvas asks you to pick a smaller root.
- **Kinship finder**: Automatically determine accurate Vietnamese forms of address, such as uncle, aunt, or cousin; a person whose gender is "Other" gets the form shared by both genders ("Vợ/Chồng", "Bố/Mẹ", "Anh/Chị", "Con dâu/Con rể") with a note saying why. Who is older: siblings with the same parents go by birth order, then birth date; half siblings (and step siblings) go by birth date first and use the birth order only when the dates are missing, because the children of each wife are often numbered on their own.
- **Member management**: Store member information and avatars, and organize family branches; deceased members get a "Burial place" field (e.g. "X Cemetery, Y commune", public like the dates of death) shown on the member page, the printed profile and the family book, so descendants know where to visit the grave; accent-insensitive search (also in the member pickers on the Kinship page and the relationship form), usable from the keyboard (arrows, Enter, Esc); press ⌘/Ctrl + K on any Dashboard page to jump to a member (it tells how many match, up to 20).
- **Relationship management**: Manage family relationships, including special cases such as polygamous relationships.
- **Data checks**: Warnings for impossible relationships (parent-child loops, a child born before a parent, a mother who died before the child's birth, a father who died long before it) and for people with the same name and birth year.
- **Statistics and events**: Track birthdays, death anniversaries (Vietnamese lunar calendar), custom events and family demographic statistics (including lifespan: average, longest-lived, oldest living member, by birth decade); admins get "recompute lunar death dates" and "possible duplicates" tools.
- **Add to calendar**: The Events page has an "Add to calendar (.ics)" button to import birthdays, anniversaries and events into Google/Apple Calendar and get reminders on your phone.
- **Print a profile**: the member page has a "Print profile" button; the A4 printout has no header, footer or edit buttons and includes the photo, the full note and the family list, ready to hand out, keep at the ancestral hall or archive.
- **Family book**: the Lineage page opens the "Family book", the whole tree as a printable book, generation by generation: a cover with the main surname, the print date and a table of contents; each generation starts on its own page with numbered members listing other names, birth and death dates, the lunar death date, the burial place, parents, spouses (in-law marked), children in birth order (tap to jump to their entry) and the note; members without a generation get their own section at the end.
- **Data backup**: Export and import JSON, CSV, and GEDCOM files for easy storage or migration; the restore file is previewed before anything is replaced. A chosen file can be imported two ways: **Replace the whole tree** (restore a backup: the current data is deleted and replaced by the file) or **Add to the current tree** (e.g. a relative sends their branch as JSON, GEDCOM or CSV ZIP): every member and event of the file gets a new id and is inserted in one transaction, without deleting or changing existing data; profile photos are not imported. People in both the file and the tree end up as two profiles (adding a file twice also makes two copies): after adding, click "Scan for duplicates now" to run Possible duplicates and merge them, which also links the new branch to the tree. Photos (avatars, gallery) are not included in JSON/CSV/GEDCOM (the `gallery_items` table is also not included in backups); copy the Supabase Storage buckets `avatars` and `gallery` separately (Dashboard Storage → download, or `supabase storage` CLI). CSV cells starting with `=`, `+`, `-` or `@` get a leading `'` on export so spreadsheets don't run them as formulas (a phone number `+84…` shows as `'+84…` in Excel); that `'` is removed again on import. When restoring a CSV ZIP, a file with a row that has fewer or more cells than the header, or a broken double quote, is rejected as soon as it is chosen, with the file name and line (nothing is deleted); blank lines are skipped.
- **Security**: Use Admin, Editor, and Member roles with data protection through Supabase.
- **Responsive, bilingual**: A modern interface optimized for desktop and mobile devices, switchable between Vietnamese and English (the first visit follows the browser: English when it prefers English, Vietnamese otherwise).
- **Install on the home screen**: a web app manifest and app icons, so "Add to Home Screen" on a phone shows the site name "Gia Phả OS" (change it with `SITE_NAME`/`SHORT_NAME`) and opens the dashboard directly. There is no service worker, so a connection is still required.

### Lunar calendar and death anniversaries

The app uses the Vietnamese lunar calendar (computed for UTC+7 with Hồ Ngọc Đức's algorithm), not the Chinese one (UTC+8): in some years the two differ by a day or a whole month (Tết 2007 is February 17 in Vietnam, February 18 in China). Death anniversaries are recomputed every year on the lunar calendar:

- **First anniversary**: anniversaries start in the lunar year after the year of death (taken from the lunar year of death, else from the solar date of death); the year of death itself has none, on the Events page and in the .ics file. With an unknown year of death, every year has one.
- **Day 30 in a 29-day month**: in a year where that month has only 29 days, the anniversary falls on day 29 (the last day of the month).
- **Death in a leap month**: in a year with the same leap month, the anniversary falls in the leap month; otherwise in the regular month with the same number. The leap month is known from the solar date of death; a lunar date typed in by hand is read as a regular month.
- **Time zone and 29 February**: "today" for upcoming events is always the date in Vietnam (UTC+7), on the server and in the browser, so anniversaries and birthdays are not a day off between midnight and 7 a.m. A 29 February birthday falls on 28 February in a common year.
- **Unknown year of death**: with only a solar day and month of death (no year and no lunar date), the anniversary is converted to the lunar calendar using the current year and shown as "(estimated)"; enter the year of death or the lunar date for a fixed anniversary.
- **Lunar dates saved by older versions**: before the switch to the Vietnamese lunar calendar, lunar dates were computed with the Chinese calendar and are not recomputed automatically. An administrator opens **Dashboard → Backup & Restore → Recompute lunar death dates** and clicks "Check death anniversaries" to list members whose stored lunar date differs from the one computed from the solar date of death (only people with a full day/month/year on both dates). No row is selected by default; select rows one by one or all, then confirm to apply. Do not select a row whose lunar date was typed by hand (the solar date derived from it may be wrong). Export a JSON backup first. Each row is updated on its own and only if the date of death has not been edited since the check; rows that fail or are skipped show up again at the next check. The tool never runs by itself and needs no migration.

- **Possible duplicates**: **Dashboard → Backup & Restore → Possible duplicates**, click "Scan for possible duplicates" to scan the whole tree (including data imported from GEDCOM/CSV). Two members share a group when their names are equal (ignoring accents and case) and they have the same birth year, or the same name and a shared parent. Each group lists birth – death years, the number of relationships and a link to open the profile (first 200 groups, the rest is counted). View only: nothing is changed, deleted or merged; fix or delete with the usual tools. No migration needed.
- **Data check**: **Dashboard → Backup & Restore → Data check**, click "Check the data" to scan the whole tree (including data imported from GEDCOM/CSV) for impossible dates: death before birth, a child born after the mother died, a father who died more than 10 months before the child was born, a parent less than 12 or more than 70 years older than the child (only when both birth years are known; adopted children are skipped), birth or death dates that have not come yet, repeated marriage or parent–child links, a child with too many biological parents, parent–child loops (each person on the loop is named and linked), people with a marriage or parent–child link to themselves, a biological child whose generation is not the parent's plus one (only when both generations are set; in-laws and adopted children are skipped), children of the same pair of parents who share a birth order or whose birth order runs against their known birth dates (birth orders are compared only within the same pair of parents, so children of two wives numbered separately or straight through are both fine; a child with only one recorded parent is compared with the other children of that parent alone; adopted children skipped), people with no parent, spouse or child at all (often a GEDCOM family record lost on import; not checked in a tree of one person), people with a date of death (solar or lunar) who are not marked deceased (usually from a CSV/JSON import; they get no death anniversary and count as living), people older than 120 (living with no date of death at all, often an old GEDCOM/CSV tree missing the death, or died more than 120 years after the birth year); plus a "Missing info" group: no birth year, deceased but no death year, gender unknown. Results are grouped by kind with counts and a link to open each profile (first 200 of each kind). View only: nothing is changed; members not connected to the root are on the Lineage page. No migration needed.

### Add events to a calendar (.ics)

On **Dashboard → Events**, the **Add to calendar (.ics)** button downloads `giapha-events.ics`, which you can import into Google Calendar, Apple Calendar, Outlook and others:

- **Birthdays** of living members: one all-day event repeating every year (a 29 Feb birthday falls on 28 Feb in a common year).
- **Death anniversaries**: a lunar date cannot repeat yearly on the solar calendar, so each year is its own event. The file holds this year's and next year's anniversaries (the same solar dates as the Events page, marked "estimated" when the death year is missing). Download it again next year.
- **Custom events**: on their own date, with the location and notes you entered. An "Every year (solar calendar)" event is one event repeating yearly from its first date (29 Feb falls on the last day of February); an "Every year (lunar calendar)" event works like a death anniversary: one event for each occurrence this year and next year.

Every event has a UID that is stable per member, so importing the file again into the same calendar updates events instead of duplicating them. The file is generated in the browser, with no server or email involved; reminders are handled by your calendar app.

### GEDCOM

Export and import GEDCOM (7.0) to open the family tree in Gramps, MyHeritage… or import it back:

- **Names**: the first word of the full name is the surname: `Nguyễn Văn An` is written `1 NAME /Nguyễn/ Văn An` with `2 SURN Nguyễn` and `2 GIVN Văn An`. On import the app prefers `SURN`/`GIVN` (keeping the surname–given-name order of the `NAME` line); without them it reads `NAME` and drops the `/` marks, so files exported by older versions read as before.
- **Families (FAM)**: each child belongs to the family of their own parent pair (a second wife's child is in the family with the second wife); a child linked to only one person (father, mother or a person with gender "other") gets a single-parent family. A person with gender "other" is written in the `HUSB` position.
- **Adopted children**: written as `2 PEDI ADOPTED` under `1 FAMC`; on import, `PEDI ADOPTED` becomes an adoptive relationship.
- **Dates**: GEDCOM has no date without a month or without a year, so a date with day + year but no month exports only the year. A birth or death date with day + month but no year (a birthday or death anniversary whose year is unknown) is written with the custom tag `2 _DATEDM <day> <month>` under `1 BIRT`/`1 DEAT` and read back on import (other programs ignore it); any other date without a year (month only) is dropped.
- **Other names**: each name in `other_names` (separated by commas or semicolons) is written as its own `1 NAME` with `2 TYPE aka`; on import, the second and later `NAME` records are joined back into other names.
- **Burial place**: written as `1 BURI` + `2 PLAC <burial place>` (standard GEDCOM, read by Gramps, MyHeritage…); on import, the `PLAC` under `BURI` becomes the burial place and marks the person as deceased.
- **Place of birth, place of death, occupation**: the app has no fields for these. On import, the `PLAC` under `BIRT`, the `PLAC` under `DEAT` and each `1 OCCU` are added to the end of the person's note as `Nơi sinh: …`, `Nơi mất: …`, `Nghề nghiệp: …` (after the existing note and the date-range lines); a `PLAC` under `DEAT` marks the person as deceased. On export these lines stay in the note (no `PLAC`/`OCCU` is written), so importing the file again does not repeat them.
- **Notes**: long notes are split into `CONC` lines (≤ 255 characters), line breaks become `CONT`. On import both inline notes and **pointer notes** (`1 NOTE @N1@` pointing to `0 @N1@ NOTE …`, as written by Gramps, Family Tree Maker, Legacy, Ancestry, and the GEDCOM 7 `SNOTE`) are supported; several notes of one person are joined, and a pointer to a note that is not in the file is ignored and counted in a warning of the restore confirmation. A marriage's note is exported as `1 NOTE` in the couple's `FAM` record; on import, the `NOTE`s of a `FAM` (inline or pointer) become the marriage's note, ahead of its `Nguồn: …` lines. A `FAM` with only a husband or only a wife has no marriage to hold its notes and sources: they are dropped (not given to anyone else) and counted in the restore confirmation's warning.
- **Sources**: the app has no source table. On import, each `SOUR @S1@` citation of a person (also under events such as `BIRT`) or a family is copied into the person's or marriage's note as `Nguồn: <TITL or ABBR>` (plus `TEXT` when present); `REPO` records are not kept. The restore confirmation tells how many SOUR/REPO records the file has. The header's `1 SOUR` line (the exporting program) is not counted.
- **Lunar death anniversary**: GEDCOM has no lunar calendar, so the lunar date of death is written with the custom tag `2 _LUNAR <day> <month> [<year>] [LEAP]` under `1 DEAT` (the year is left out when unknown) and read back on import. Other programs ignore it. The `LEAP` flag exists only in GEDCOM files (the database does not store leap months).
- **Long notes and date ranges**: import reads both `CONC` (joined without a line break) and `CONT`, so long notes from MyHeritage or Ancestry are no longer cut. `BET a AND b` and `FROM a TO b` keep the first date and append the original text to the note (`BIRT: BET 1850 AND 1855`); `@#DJULIAN@` escapes and ABT/EST/AFT/BEF/CAL prefixes are ignored.
- **Generation, birth order, in-law flag**: written with the custom tags `1 _GEN <number>`, `1 _ORDER <number>`, `1 _INLAW Y` under each person, only when set, and read back on import (moving a tree between two installs keeps the order of children and the in-law flag). Other programs ignore these tags; files without them import as before.
- Not exported: profile photos and photo gallery (files in Supabase Storage buckets `avatars` and `gallery` must be copied separately).

### Data checks

- **Relationships**: before saving, the app refuses a link from a person to themselves, a couple that is already married (A–B and B–A count as the same), a parent–child link that would create a loop (making a grandchild the parent of their grandfather) and a child born before the parent. Birth dates are compared as far as both people have them: year, then month, then day; without a birth year this check is skipped. The "add several children" form checks every row before creating anyone: birth year and birth order must be whole numbers (year from 1 to the current year, order from 1), and the birth year is compared with the parents; errors name the child.
- **Death date**: cannot be before the birth date, comparing month and day within the same year.
- **Name**: a name of only spaces is refused; extra spaces at the ends are trimmed when saving.
- **Possible duplicates**: creating a member with the same name (ignoring accents and case) and birth year as an existing one (two members without a birth year match on the name alone) asks first and lists them; Continue creates it anyway. Editing never asks.
- **Parents' death dates**: a mother who died before the child's birth is refused (when adding the link and when editing birth or death dates); a father who died more than 10 months before the birth (more than 1 year when a month or day is missing) asks for confirmation. Adopted children are not checked.
- **JSON backup version**: files carry a `version` (currently 3). On restore, a file without `version` is read as version 1 (old file); a file with a higher version than the app reads is refused with a hint to upgrade the app, so new columns are not lost.

### Photo gallery

- Accepts JPG, PNG, GIF and WEBP up to 20 MB (GIFs up to 10 MB, as they are stored unchanged), whether picked with the file button or dragged in. The app reads the start of the file to find the real image type (a text file renamed to `.jpg` is refused) and sets the extension in the `gallery` bucket from that type, not from the file name. Before uploading, the browser scales photos down to at most 2048 px on the long side and stores them as WebP (a 6 MB phone photo ends up under 1 MB); GIFs, animated WebP and images that are already small are kept as they are; the stored file must still be under 10 MB. Photos uploaded earlier are not changed.
- Each page shows 24 images (`/dashboard/gallery?page=2`…); the signed links for the whole page are created in one Supabase Storage call, valid for 1 hour. A page past the end shows the last page.

### Profile photos

- Profile photos live in the private `avatars` bucket and only activated accounts can see them. The members page (tree, list, mindmap, bubble view) and the kinship page sign the links of every photo on the page in one Supabase Storage call on the server, valid for 24 hours. The server reuses each link for 12 hours (until the photo changes), so the browser keeps the photos in its cache when moving between pages; the cache sits in the server's memory and is used only after checking that the account is active. A photo changed since, other pages and tabs left open past that time load through `/api/avatar`. A copied link opens the photo until it expires, as before but for up to 24 hours instead of 1.
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

---

## First account

- Register a new account when you first open the website.
- The first registered account automatically receives the **admin** role.
- Later registrations default to **member** and remain **pending admin approval**.

### Notifications and approving new accounts

A new account stays **pending approval** until an administrator approves it. The system emails administrators a one-time approval link, valid for 7 days, as soon as the account first signs in:

- **Supabase "Confirm email" on** (the default): after the user clicks the confirmation link in their email.
- **Supabase "Confirm email" off**: right after signing up, because the user is signed in at once.
- **SSO**: when the user comes back from Google/Facebook.

Each account gets one email while its link is valid; a pending account that signs in again after the link expired sends administrators a new one. The email is always in Vietnamese (the app's default language), not in the language the new user picked. Administrators can also sign in and approve the account from **Manage users**.

Locking an account in **Manage users** also revokes its open approval link: the link in the old email (or a forwarded copy) only shows "Request revoked" and does not turn the account back on. To restore access, unlock the account in the app. Needs the migration `20261031120000_revoke_approval_link_on_lock.sql`; until it is run, a link that has not expired can still reactivate a locked account.

A locked account is no longer pending approval: signing in again opens no new approval request and sends administrators no new email. The approval link checks and activates the account in one database transaction, so locking the account while the approval page is open (even right as "Confirm approval" is pressed) leaves it locked. Needs the migration `20261031180000_lock_blocks_approval.sql`; until it is run, the approval link shows "Database upgrade needed" (administrators can still approve in **Manage users**) and a locked account that signs in again still sends an email as before.

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
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to `https://<your-domain>`. If the app also runs on another domain (a preview, `localhost`…), add that domain to **Redirect URLs** as:
   `https://<other-domain>/**`
   The callback carries the page to open (`/auth/callback?next=…`, when someone signs in from a shared member link), so an exact `https://<domain>/auth/callback` entry does not match; when nothing matches, Supabase sends the user to the Site URL instead of that page.

Accounts registered through SSO are also created as **pending admin approval**, just like email registrations. See the official guides for [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) and [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook).

If SSO is not configured, set `NEXT_PUBLIC_DISABLE_SSO=true` in Vercel and deploy again. If the variable is omitted, the application also hides SSO by default to avoid displaying an unavailable feature. Users will then see a notice with a link to this guide. Because this is a `NEXT_PUBLIC_*` variable, you must rebuild and redeploy after changing it.

### System upgrades in the Dashboard

Administrators can open **System upgrade** from the administration menu to check the source code version on GitHub and the database version, then run pending migrations. If the current source code is older than the latest GitHub version, the system requires the source code to be updated before migrations can run. Direct migration support requires `SUPABASE_DB_URL` on the server. Without it, `/dashboard/upgrade` still provides the SQL bundle from `/setup` for manual execution.

**Restoring data needs the migration `20261026000000_add_restore_backup.sql`.** From this version, restore (Dashboard → Data) runs in a single database transaction through the `restore_backup` function: if anything fails halfway, the current data is kept as it was. Existing self-hosted installs must run this migration (run the migrations on `/dashboard/upgrade`, or run the file from `docs/migrations/` in the Supabase SQL Editor). Until then, restore still works the old way (delete, then insert in chunks, without a transaction) and shows a reminder to upgrade the database. Restore files can be up to 25 MB; on Vercel, request bodies are limited to about 4.5 MB, so very large family trees (several thousand members or more) are best restored on a self-hosted install.

**Updating generations needs the migration `20261026120000_add_update_generations.sql`.** The "Apply" button on the Lineage page and the option to update descendants' generations when editing a member save all members with a single call to the database function `update_generations`, in one transaction: if one row fails (a member that was just deleted, or one you are not allowed to edit), no row is changed and the app reports the error. The function runs with the caller's rights (SECURITY INVOKER), so the Row Level Security of the `persons` table still applies. Until the migration is run, the app updates people one by one as before and shows a reminder to upgrade the database.

**Merging duplicates needs the migration `20261027120000_add_merge_persons.sql`.** The "People that may be duplicates" tool (Dashboard → Backup & restore) can merge two profiles into one through the database function `merge_persons`, in one transaction: the merged-away member's relationships are re-pointed to the kept one (duplicates and the relationship between the two profiles are removed), private details fill the kept profile's empty fields, empty columns (birth and death dates, generation, birth order, avatar) take the merged-away values, other names are remembered, notes are appended, and the merged-away profile is deleted. The app requires a preview of what will move, recommends downloading a backup first, and requires typing the deleted profile's name to confirm. If the kept profile would end up with more than 2 birth parents, 2 birth parents of the same gender, or one profile is an ancestor of the other (the tree would loop), the preview shows a warning that must be acknowledged before the name can be typed. A merge cannot be undone; if anything fails halfway, nothing is changed. Admins only. Until the migration is run, the merge button shows a reminder to upgrade the database.

**Yearly events need the migration `20261027180000_custom_events_recurrence.sql`.** It adds a `recurrence` column to `custom_events` (`none` = once, `yearly_solar` = every year on the solar day and month, `yearly_lunar` = every year on the lunar day and month of the event date, leap month kept like a death anniversary) with the default `none`: existing events stay as they are and no data is lost. It also updates `restore_backup` so a restore keeps each event's recurrence. The **System upgrade** page lists it automatically. Until it is run, one-off events can still be added and edited; choosing a yearly option shows a database error until you upgrade.

**Adding a file to the current tree needs the migration `20261030180000_add_append_import.sql`.** It only adds the `append_import` function (insert only, never deletes or updates a row); no table changes. The **System upgrade** page lists it automatically. Until it is run, "Add to the current tree" asks for the upgrade and adds nothing; restore (replace the whole tree) works as before.

**Burial places need the migration `20261028120000_add_burial_place.sql`.** It adds a nullable text column `burial_place` to `persons` to record where a member is buried. Like the dates of death it is public: every approved member can read it, and the Row Level Security is unchanged. It also updates `restore_backup` (a restore keeps the burial place; older backups without it restore it empty) and `merge_persons` (a merge fills the kept profile's empty burial place from the merged-away one). JSON backups (format v5) and CSV exports gain a `burial_place` column. The **System upgrade** page lists it automatically. Until it is run, the app works as before; burial places just cannot be stored yet.

**Locking an account revokes its approval link with the migration `20261031120000_revoke_approval_link_on_lock.sql`.** It only redefines the lock/unlock function (`set_user_active_status`): locking marks the account's unused approval request as used. No table changes and no data removed; backup and restore are unchanged. The **System upgrade** page lists it automatically.

**Locked accounts stop asking for approval, and approval is safe against a concurrent lock, with the migration `20261031180000_lock_blocks_approval.sql`.** It adds a nullable `locked_at` column to `profiles`: set when an administrator locks the account, cleared on unlock. Accounts already locked whose approval link was used or revoked are filled in; other inactive accounts stay "pending". It also redefines `set_user_active_status` (sets/clears `locked_at`) and adds `approve_user_request` (callable by the server's service role only) to approve in one transaction. No data removed; backup and restore are unchanged. The **System upgrade** page lists it automatically. An account locked before this migration without a used or revoked approval link (e.g. locked before the migration `20261031120000`) still counts as pending: lock it once more in **Manage users** to stop the emails.

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
3. **Member**: Can view the family tree and visual statistics, and add, edit or delete the custom events they created themselves.

## Contributing

This is an open-source project. Contributions, issue reports, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, and use the issue and pull request templates. Found a security problem? Report it privately as described in [SECURITY.md](SECURITY.md) (no public issue, and never share `SUPABASE_SERVICE_ROLE_KEY`).

Before opening a pull request, run:

```bash
bun run test          # unit tests (bun test) for the utils/ functions
bun run lint
bun run format:check
bun run typecheck     # tsc --noEmit
```

GitHub Actions (`.github/workflows/test.yml`) runs the same commands on every push to `main` and every pull request.

Tests live next to the file they cover (`utils/csv.ts` → `utils/csv.test.ts`). Notable changes go in [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`.

Pages that only show numbers (such as `/dashboard/stats`) compute them on the server and `select` only the columns they need (see `STATS_PERSON_COLUMNS` in `utils/familyStats.ts`) instead of sending the whole `persons` table to the browser.

## Disclaimer and privacy

> **This project provides source code only. The author does not collect or store any personal data.**

- **Fully self-hosted:** When you deploy the application, all family tree data—names, birth dates, relationships, contact information, and more—is stored **in your own Supabase account**. The project author has no access to that database.

- **No data collection:** The source code includes no analytics, tracking, telemetry, or other form of user data collection.

- **You control your data:** All family data and member information remains in the Supabase database you create and manage. You can delete, export, or move it at any time.

- **Public demo:** The demo at `giapha-os.homielab.com` uses fictional sample data and contains no information about real people. Do not enter real personal information on the demo site.

## License

This project is distributed under the [MIT License](LICENSE). Copyright (c) 2026 HomieLab.
