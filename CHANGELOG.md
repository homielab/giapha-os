# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Unit tests (`bun run test`) for GEDCOM and CSV import/export, kinship terms, tree helpers, the lunar calendar and upcoming events.
- Search and share metadata for the public pages (home, about, login) in Vietnamese and English: page titles, descriptions, Open Graph and Twitter cards with a 1200×630 share image (`public/og-image.png`), plus `robots.txt` (keeps `/dashboard`, `/api`, `/setup` out of search engines) and `sitemap.xml`. Links use `APP_URL`, or the Vercel production domain.
- GitHub Actions workflow running lint, format check, type-check (`bun run typecheck`) and unit tests on every push and pull request.

### Changed

- Lunar dates and death anniversaries use the Vietnamese lunar calendar (UTC+7) instead of the Chinese one, so dates no longer shift by a day or a month in the years where the two calendars differ. The `lunar-javascript` dependency is removed.

### Fixed

- Dashboard page titles end with the site name, and the gallery title uses `SITE_NAME` instead of a hard-coded "Gia Phả OS".
- README examples use a placeholder domain (`your-domain.vercel.app`) instead of a real-looking project URL; the demo is giapha-os.homielab.com.
- A death anniversary on day 30 of a lunar month no longer disappears in years where that month has 29 days: it falls on day 29.
- A death in a leap month keeps its leap month: the anniversary falls in the leap month in years that have it, otherwise in the regular month.
- CSV import keeps text columns as text: phone numbers keep their leading zero, ids and dates are no longer turned into numbers or dates. Only the number and yes/no columns of `persons.csv` are converted.
- Kinship terms through marriage: no more double spaces ("Em vợ (họ)"), and a younger sibling's husband or wife is "Em rể" / "Em dâu" instead of "Em rể (họ)" / "Em dâu (họ)".
- Restoring a backup no longer leaves the family tree half deleted when something fails: the delete and all inserts run in one database transaction (`restore_backup` function, migration `20261026000000_add_restore_backup.sql`), so on any error the current data stays as it was. Databases that have not run the migration yet keep the old restore and show a reminder to upgrade on `/dashboard/upgrade`.
- Restoring a backup larger than 1 MB (a few thousand members) is no longer rejected by the server: server actions accept up to 25 MB, the limit of the restore file picker.
- GEDCOM export puts each child in the family of its own two parents: a child of a man's second wife is no longer also linked to his first wife, and a child linked only to the father no longer becomes a child of his wife after re-import. A parent with gender "other" and no spouse keeps the link to the children.
- GEDCOM keeps adopted children adopted (`PEDI ADOPTED`) on export and import.
- GEDCOM export writes the first word of a Vietnamese name as the surname (`/Nguyễn/ Văn An`, with `SURN` and `GIVN`); import reads `SURN`/`GIVN` when present, and files from earlier versions still import as before.

### Known issues

- Lunar death dates saved before this change were computed with the Chinese calendar and are not recomputed; in the years where the calendars differ they can be a day or a month off. Clearing and re-entering the lunar date of a member fixes it.
- GEDCOM has no date with a day but no month, or without a year: export keeps only the year, or leaves such a date out. Lunar death dates, in-law flags, birth order, generation and other names are not exported to GEDCOM.

## [2.4.0] - 2026-10-18

Last release before this changelog was started.
