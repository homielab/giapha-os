<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Pha OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Pha OS (Gia Pha Open Source)

[English](README.en.md) | [Tiếng Việt](README.md)

An open-source family genealogy application with an intuitive interface for exploring family trees, managing members, and finding Vietnamese kinship terms.

The project was created to solve a practical need: a cloud-based system that allows family members in different places to update information together, such as marriages and births, instead of relying on a single local computer. Self-hosting this open-source project gives your family full control over sensitive data rather than handing it to third-party services. I initially built it for my own family, but decided to share it publicly after receiving interest from others.

Designed primarily for Vietnamese families.

## Documentation

| Document                                    | What it covers                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| [Installation](docs/en/install.md)          | Supabase database, Vercel deploy, running locally, Docker, sign-up errors   |
| [Accounts and sign-in](docs/en/accounts.md) | First account, approving new accounts, email notifications, Google/Facebook |
| [Upgrading](docs/en/upgrade.md)             | Upgrades in the Dashboard, database migrations, updating the source code    |
| [Features in detail](docs/en/features.md)   | Lunar calendar and anniversaries, .ics files, data checks, backups, photos  |
| [GEDCOM](docs/en/gedcom.md)                 | GEDCOM export and import with Gramps, MyHeritage and other programs         |

## Key features

- **Interactive family trees**: explore the family as a Tree, Mindmap or Bubble view; drag and zoom with a mouse, touch or the keyboard.
- **Image and PDF export**: export the tree as an image, a single-page PDF, or a multi-page A4/A3 PDF to print and glue together.
- **Kinship finder**: work out the correct Vietnamese form of address (Bác, Chú, Cô, Dì...) between two members.
- **Members and relationships**: details, profile photos, burial place and branch order; polygamous marriages and adopted children are supported. Press ⌘/Ctrl + K to find a member quickly.
- **Data checks**: warnings for impossible relationships, wrong dates and possible duplicates; merge two duplicate profiles.
- **Statistics and events**: birthdays, death anniversaries on the Vietnamese lunar calendar, custom events and family statistics; add them all to Google/Apple Calendar with an .ics file.
- **Profiles and family book**: print one member's profile, or the whole family tree as a book, generation by generation.
- **Photo gallery**: keep family photos and tag the members in them.
- **Backup and restore**: export and import JSON, CSV and GEDCOM; replace the whole tree or add a branch to the current one.
- **Security**: Admin, Editor and Member roles, with data protected by Supabase.
- **Responsive, bilingual**: works on desktop and mobile, switches between Vietnamese and English, and can be added to the home screen.

Every feature in full: [docs/en/features.md](docs/en/features.md).

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Account: `giaphaos@homielab.com`
- Password: `giaphaos`

## Screenshots

![Family tree](docs/screenshots/tree.png)

![Kinship finder](docs/screenshots/kinship.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Installation

You can set up a family genealogy system in about 10–15 minutes:

1. Create a free project on [Supabase](https://supabase.com) and copy its `Project URL` and `Publishable key`.
2. Choose how to run the app:
   - **Vercel** (fastest): [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,SHORT_NAME,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,NEXT_PUBLIC_DISABLE_SSO,APP_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_DB_URL,RESEND_API_KEY,RESEND_FROM_EMAIL,ADMIN_NOTIFICATION_EMAIL)
   - **Locally**: install [Bun](https://bun.sh/), create `.env.local` from `.env.example`, then run `bun install` and `bun run dev`.
   - **Docker**: `docker compose --env-file .env.local up -d --build`.
3. Open the site and register: the first account automatically becomes **admin**.

Step-by-step instructions, every environment variable, and the fix for `Failed to fetch` when registering: [docs/en/install.md](docs/en/install.md).

### Sign in with Google and Facebook

Enable Google or Facebook in Supabase (**Authentication → Sign In / Providers**), then add your domain under **Authentication → URL Configuration**. If you have not set this up, set `NEXT_PUBLIC_DISABLE_SSO=true` and deploy again. Full guide: [docs/en/accounts.md](docs/en/accounts.md#sign-in-with-google-and-facebook).

### Source code updates

When `/dashboard/upgrade` says the source code is out of date, update **the whole source code** to the latest version (do not just change `version` in `package.json`):

- **Vercel**: sync the deployed branch with `main` of `homielab/giapha-os` and wait for Vercel to finish deploying.
- **Locally or self-hosted**: run `git pull --ff-only origin main`, `bun install` and `bun run build`, then restart the app. With Docker, run `docker compose --env-file .env.local up -d --build` again.

Then open `/dashboard/upgrade` to run any missing database migrations. Back up your data first. Details for each migration: [docs/en/upgrade.md](docs/en/upgrade.md).

## User roles

1. **Admin**: full access to the system.
2. **Editor**: can add, edit and delete member profiles and relationships.
3. **Member**: can view the family tree and statistics, and add, edit or delete the custom events they created.

Accounts registered after the first one are **Members** and wait for admin approval. See [docs/en/accounts.md](docs/en/accounts.md).

## Contributing

Issue reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Found a security problem? Report it privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## Disclaimer and privacy

> **This project provides source code only. The author does not collect or store any personal data.**

- **Fully self-hosted:** all family tree data (names, birth dates, relationships, contact information and more) is stored **in your own Supabase account**. The project author has no access to that database.
- **No data collection:** the source code includes no analytics, tracking or telemetry.
- **You control your data:** you can delete, export or move it at any time.
- **Public demo:** the demo at `giapha-os.homielab.com` uses fictional sample data. Do not enter real personal information on the demo site.

## License

This project is distributed under the [MIT License](LICENSE). Copyright (c) 2026 HomieLab.
