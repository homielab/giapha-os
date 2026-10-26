# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Keyboard access to the tree views: in the Bubble view every family can be reached with Tab (read out with the names and birth years) and selected with Enter or Space; on the Tree, `+`/`-` zoom around the centre, `0` resets and the arrow keys scroll by 40 px. Both canvases announce how to use them.
- Events page: an "Add to calendar (.ics)" button downloads birthdays (repeating yearly), death anniversaries for this and next year (lunar dates, same solar dates as the page) and custom events, ready to import into Google or Apple Calendar for reminders. The README feature lists (Vietnamese and English) now cover the bubble view, A4/A3 PDF, pinch zoom, duplicate checks, custom events, the lunar recompute tool and the English interface.
- Members list view: shows the first 60 members and a "Show 60 more" button instead of rendering everyone at once; a new search, filter or sort starts again from the first 60. Tree, mind map and bubble views are unchanged.
- Restore: the file is read as soon as you choose it. A broken or invalid file shows its error right away, and the confirmation now says how many members, relationships and events the file holds (and its export date), with a "Download the current backup first" button before anything is deleted.
- A translated (Vietnamese/English) "page not found" page, for example for a wrong member link, and a fallback error page; every dashboard page now has its own browser tab title (the member's name on a member page).
- GEDCOM export writes other names (`NAME` with `TYPE aka`) and the lunar death date as a custom `_LUNAR` tag under `DEAT`; import reads them back, so an export followed by an import keeps both.
- Export: besides the single-page PDF, the menu now offers multi-page A4 and A3 landscape PDFs. The tree is cut into sheets with a 10 mm overlap for gluing and a "row,column / rows x columns" label on every page; the last choice is remembered.
- Family tree: pinch with two fingers on a phone or tablet to zoom around the fingers; one finger still scrolls. Mouse and Ctrl/⌘ + scroll behave as before.
- Member form: a new member with the same name (ignoring accents) and birth year as an existing one now asks "Create another one anyway?" and lists the matches. A mother who died before the child's birth is refused, and a father who died more than 10 months before it (a year when the month or day is unknown) asks for confirmation, when adding a parent link and when editing birth or death dates; adopted children are not checked.
- Adding a relationship: typing a name without accents ("nguyen van duc") now finds "Nguyễn Văn Đức". The member list loads once when the form opens and is filtered in the browser, showing up to 20 matches (names starting with what you typed first); a failed load now shows an error. The English README also covers GEDCOM, the photo gallery and the lunar death date recompute tool.
- Unit tests for the member relationship loader, avatar URL signing and the pending-user approval email.
- Unit tests (`bun run test`) for GEDCOM and CSV import/export, kinship terms, tree helpers, the lunar calendar and upcoming events; also for generation, in-law and birth-order computation, member sorting and family stats.
- Search and share metadata for the public pages (home, about, login) in Vietnamese and English: page titles, descriptions, Open Graph and Twitter cards with a 1200×630 share image (`public/og-image.png`), plus `robots.txt` (keeps `/dashboard`, `/api`, `/setup` out of search engines) and `sitemap.xml`. Links use `APP_URL`, or the Vercel production domain.
- GitHub Actions workflow running lint, format check, type-check (`bun run typecheck`) and unit tests on every push and pull request.
- The gallery shows 24 images per page with previous/next links (`?page=`), so galleries with more than 1,000 images are no longer cut off silently; a page past the end shows the last page.
- Admin tool "Recompute lunar death dates" on Dashboard → Backup & restore: lists the members whose saved lunar death date differs from the one computed from the solar death date with the Vietnamese calendar; the admin selects rows (none by default) and applies them after a confirmation. A row edited in the meantime is skipped.

### Changed

- Kinship page: the note about ambiguous terms is now decided by the calculation itself instead of searching the text of the answer, so it also appears for the generic "Họ hàng" result.
- Members and lineage pages load only the relationship columns they use (no note or timestamps): for 2,000 people with about 4,800 relationship links the data sent with the page drops from about 1,310 KB to about 810 KB. The language dictionaries were already not part of the page data (only the chosen language code is sent).
- The members and lineage pages no longer load `note`, `created_at` and `updated_at` of every person, which no view reads: about 24% less data for 2,000 members (≈ 983 KB → 743 KB in a synthetic test).
- The gallery signs all image links of a page in one storage request instead of one request per image.
- Profile photos on the members page (tree, list, mindmap, bubble view) and the kinship page load from links signed in one storage request for the whole page, instead of one request through the app server per member. Other pages still load them through `/api/avatar`.
- The statistics page (`/dashboard/stats`) computes the totals on the server from the few columns it needs and sends only the numbers to the browser: for a family of 2,000 members the page data drops from about 2 MB to about 1 KB.
- The PDF/image export libraries (jspdf, html-to-image) load only when you export: opening the tree or mindmap view downloads 25 KB instead of 446 KB of JavaScript (7 KB instead of 143 KB gzipped). d3 is replaced by the d3 modules the bubble view uses (`d3-selection`, `d3-zoom`, `d3-force`, `d3-drag`, `d3-transition`).
- Updating generations (Lineage page "Apply", or saving a member with "update descendants' generations") saves all members in one call to the new `update_generations` database function (migration `20261026120000_add_update_generations.sql`) instead of one request per member. It runs in one transaction: if any member fails, nothing changes and the Lineage page shows the error instead of "applied". Databases without the migration keep the per-member update, now report failed rows, and show a reminder to upgrade on `/dashboard/upgrade`.
- Lunar dates and death anniversaries use the Vietnamese lunar calendar (UTC+7) instead of the Chinese one, so dates no longer shift by a day or a month in the years where the two calendars differ. The `lunar-javascript` dependency is removed.

### Fixed

- Deleting a member now also removes their profile photo from storage, after the member is deleted (a failed file removal is only logged), so photos are no longer left behind forever.
- Saving a member, changing or deleting a relationship, deleting a member and editing a gallery photo no longer say "saved" when the database refused the change (for example after your role was lowered or your session expired). You now see a clear message to reload the page, and the form keeps what you typed.
- GEDCOM import no longer cuts long notes (`CONC` lines are now joined), keeps the first date of `BET … AND …` and `FROM … TO …` ranges (the original text goes to the note), ignores `@#DJULIAN@` escapes and keeps second and later names as other names.
- Dashboard pages (home, family tree, kinship, lineage, events, statistics) now show the "could not load data, try again" error when a page of rows fails to load, instead of a family with missing people; the lineage page no longer offers Apply on partial data.
- Gallery: deleting an image removes the database row first and reports an error when it is refused (the file is kept); the stored file is removed only after that.
- Create user (Dashboard → Users): the password hint and field now say "At least 8 characters" (they said 6), and a shorter password is refused with a translated message before reaching the database instead of showing a database error.
- Events: custom events created by someone else are no longer clickable for members (only the creator or an admin can edit or delete them). If the database still refuses an edit or delete, the form now shows "You can only edit or delete events you created" instead of closing as if it had saved.
- Upcoming events: "today" now follows the date in Vietnam on the dashboard and the events page, so an anniversary or birthday is no longer shown as "tomorrow" between midnight and 7 a.m. Vietnam time. A 29 February birthday is on 28 February in a common year (it used to jump to 1 March), and an anniversary with only a solar day and month of death (no year, no lunar date) is labelled "(estimated)" because its lunar date depends on the current year.
- Accessibility: the custom event, gallery upload, restore confirmation and create-user dialogs and the gallery lightbox now announce themselves as dialogs to screen readers, close with Escape, move keyboard focus into the dialog and give it back to the button that opened it. The page behind no longer scrolls while they are open.
- Family tree: zooming in no longer cuts off the leftmost branches (the canvas now scrolls to the full width) and zooming out leaves no empty space.
- User management (Dashboard → Users): creating users, changing roles, locking and deleting now check on the server that you are an active admin before reaching the database, and database refusals ("Cannot remove the last active administrator.", "Access denied.", a taken email…) are shown as translated messages in Vietnamese and English; an unexpected error shows a generic message and is logged on the server.
- A member name of only spaces is refused, and extra spaces around names are trimmed when saving.
- A profile photo is checked by its content, not its name or the type the browser reports: a text file renamed to `.jpg` is refused, and the photo is stored with the extension of its real type.
- Adding several children at once no longer reports success for a child whose parent link was refused: that child is removed again, its row shows the reason and stays in the form for another try.
- Adding a relationship or saving a member now warns when the generation update that follows it fails, instead of only logging it; the member family list shows a load error with a retry button instead of an empty list.
- Recomputing generations (Lineage) no longer freezes when the data contains a parent–child loop; the members of the loop stop at a bounded generation.
- The English interface no longer shows Vietnamese text in dates and stats: "Unknown", leap-month marker, zodiac signs and animals, today's lunar date on the dashboard and the family tree label. The email to admins about a new account waiting for approval follows the language of the browser that signed up.
- Editing a member's birth date now checks it against their parents and children with the same rule as a new parent link, naming the relative it conflicts with; before, only the member's own dates were checked.
- Restoring a backup with a parent–child loop or a couple stored twice (in either order) is refused before any data is touched, listing up to the first 10 problems with the members' names.
- Adding a relationship now refuses a couple that is already married (in either order), a parent–child link that would create a loop, and a child born before the parent (comparing month and day when both are known); the "add several children" form checks birth years before creating anyone.
- A death date earlier in the same year as the birth date is refused (it was only compared by year).
- Restoring a JSON backup made by a newer version of the app is refused with a hint to upgrade, instead of silently dropping the columns this version does not know; files without a version are read as old backups.
- Docker image: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` and `NEXT_PUBLIC_DISABLE_SSO` are now build args (`docker compose --env-file .env.local up -d --build`), so sign-in, editing members and uploads work in the browser; the build stops when they are missing. The image now contains `docs/schema.sql` and `docs/migrations/`, so `/setup` and `/dashboard/upgrade` work. README has a "Run with Docker" section.
- Dashboard page titles end with the site name, and the gallery title uses `SITE_NAME` instead of a hard-coded "Gia Phả OS".
- README examples use a placeholder domain (`your-domain.vercel.app`) instead of a real-looking project URL; the demo is giapha-os.homielab.com.
- A death anniversary on day 30 of a lunar month no longer disappears in years where that month has 29 days: it falls on day 29.
- A death in a leap month keeps its leap month: the anniversary falls in the leap month in years that have it, otherwise in the regular month.
- CSV import keeps text columns as text: phone numbers keep their leading zero, ids and dates are no longer turned into numbers or dates. Only the number and yes/no columns of `persons.csv` are converted.
- Kinship terms through marriage: no more double spaces ("Em vợ (họ)"), and a younger sibling's husband or wife is "Em rể" / "Em dâu" instead of "Em rể (họ)" / "Em dâu (họ)".
- Restoring a backup no longer leaves the family tree half deleted when something fails: the delete and all inserts run in one database transaction (`restore_backup` function, migration `20261026000000_add_restore_backup.sql`), so on any error the current data stays as it was. Databases that have not run the migration yet keep the old restore and show a reminder to upgrade on `/dashboard/upgrade`.
- Restoring a backup larger than 1 MB (a few thousand members) is no longer rejected by the server: server actions accept up to 25 MB, the limit of the restore file picker.
- Gallery uploads check the size (10 MB), the type (JPG, PNG, GIF, WEBP) and the file's content for both the file picker and drag-and-drop; a renamed non-image file is rejected before anything is uploaded, and the stored file extension follows the real image type instead of the file name.
- GEDCOM export puts each child in the family of its own two parents: a child of a man's second wife is no longer also linked to his first wife, and a child linked only to the father no longer becomes a child of his wife after re-import. A parent with gender "other" and no spouse keeps the link to the children.
- GEDCOM keeps adopted children adopted (`PEDI ADOPTED`) on export and import.
- GEDCOM export writes the first word of a Vietnamese name as the surname (`/Nguyễn/ Văn An`, with `SURN` and `GIVN`); import reads `SURN`/`GIVN` when present, and files from earlier versions still import as before.

### Known issues

- Lunar death dates saved before this change were computed with the Chinese calendar and are not recomputed automatically; in the years where the calendars differ they can be a day or a month off. Admins can review and fix them with the "Recompute lunar death dates" tool. A lunar date typed in by hand (with the solar date derived from it) cannot be told apart, so leave those rows unselected.
- GEDCOM has no date with a day but no month, or without a year: export keeps only the year, or leaves such a date out. Lunar death dates, in-law flags, birth order, generation and other names are not exported to GEDCOM.

## [2.4.0] - 2026-10-18

Last release before this changelog was started.
