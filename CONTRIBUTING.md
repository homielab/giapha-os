# Contributing to Gia Phả OS / Đóng góp cho Gia Phả OS

Thank you for helping. Bug reports, ideas and pull requests are all welcome.
Cảm ơn bạn đã đóng góp: báo lỗi, đề xuất và pull request đều được hoan nghênh.

For a security problem, do **not** open a public issue: see [SECURITY.md](SECURITY.md).

## Before you start

- Search the [issues](https://github.com/homielab/giapha-os/issues) first. For a larger change, open an issue to discuss it before writing code.
- Use the issue forms for bugs and feature requests. Never paste real family data, keys or `.env` contents into an issue; use made-up names.

## Set up

You need [Bun](https://bun.sh/) and a Supabase project (see the README, "Run locally").

```bash
bun install
cp .env.example .env.local   # fill in your own Supabase values
bun run dev
```

## Checks

CI (`.github/workflows/test.yml`) runs these on every push to `main` and every pull request. Run them before you open one:

```bash
bun run lint          # eslint, no warnings allowed
bun run format:check  # prettier; `bun run format` fixes it
bun run typecheck     # tsc --noEmit
bun run test          # bun test
```

- CI also runs `bun run build` (with placeholder Supabase values) and a Docker image build without pushing; run `bun run build` yourself if you touch `next.config.ts` or the `Dockerfile`.
- Put a test next to the file it covers (`utils/csv.ts` → `utils/csv.test.ts`).
- Database changes: add a new file `docs/migrations/<timestamp>_<name>.sql`; the setup and upgrade pages pick it up.
- UI changes follow [DESIGN.md](DESIGN.md): use its tokens, don't invent new ones.

## Languages (i18n)

The interface is Vietnamese and English. Every user-visible string lives in `lib/i18n/messages.ts` and must exist in both `vi` and `en` (`lib/i18n/messages.test.ts` checks that the keys match). Don't hard-code text in components.

Client components read strings through `useI18n()`: the root layout passes only the current language's dictionary to `I18nProvider`, so import from `lib/i18n/messages.ts` with `import type` only in client code (values such as `locales` come from `lib/i18n/locales.ts`). Placeholders like `{name}` are filled by `interpolate()` in `lib/i18n/interpolate.ts`. For a text with a number, pass `{ count }`: when the language's plural rule (`Intl.PluralRules`) says `one` (English 1), `t` uses the `<key>_one` string if it exists, e.g. `eventCount_one: '{count} event'` next to `eventCount: '{count} events'`. Add the `_one` key to `vi` too, with the same text as the base key. `app/global-error.tsx` cannot get the dictionary from the layout and uses `lib/i18n/globalErrorMessages.ts`, which `messages.ts` includes.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org): `<type>(<scope>): <summary>`, for example `fix(kinship): handle a missing parent`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- Keep a pull request focused on one change and fill in the pull request template.
- Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) when users will notice the change.

## Tiếng Việt (tóm tắt)

- Cài đặt: `bun install`, tạo `.env.local` từ `.env.example`, chạy `bun run dev`.
- Trước khi gửi pull request chạy: `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run test` (giống CI).
- Chuỗi giao diện thêm vào `lib/i18n/messages.ts` cho cả `vi` và `en`.
- Commit theo Conventional Commits; thay đổi người dùng thấy được ghi vào `CHANGELOG.md`, mục `## [Unreleased]`.
- Lỗi bảo mật: báo riêng theo [SECURITY.md](SECURITY.md), không mở issue công khai.
