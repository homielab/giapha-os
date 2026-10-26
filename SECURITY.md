# Security Policy / Chính sách bảo mật

Gia Phả OS is self-hosted: every family runs its own copy and holds its own data. Please report security problems privately so a fix can ship before details are public.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: open the repository's **Security** tab → **Report a vulnerability**
(<https://github.com/homielab/giapha-os/security/advisories/new>). Do **not** open a public issue or pull request for a vulnerability.

Please include the affected version (`package.json`), the steps to reproduce and the impact. Use made-up data in your report.

Báo lỗi bảo mật qua tab **Security** → **Report a vulnerability** của repo (báo riêng tư), không mở issue công khai. Nêu phiên bản, các bước tái hiện và tác động; dùng dữ liệu giả.

## Never share secrets

- `SUPABASE_SERVICE_ROLE_KEY` bypasses all row-level security. Keep it only in server-side environment variables, never in a report, issue, screenshot, log, commit or `NEXT_PUBLIC_*` variable.
- The same goes for `SUPABASE_DB_URL` and your `.env.local`.
- If a key may have leaked (for example you pasted it in a public issue or committed it), rotate it right away in the Supabase dashboard (Project Settings → API) and update your deployment.
- Don't post real family data; it is personal data.

Không bao giờ gửi `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` hay `.env.local` ở bất kỳ đâu công khai. Nếu nghi lộ khóa, hãy tạo lại khóa trong Supabase (Project Settings → API) và cập nhật nơi deploy.

## Supported versions

Only the latest version on `main` receives fixes. Update through Dashboard → Upgrade or see the README ("Hướng dẫn cập nhật source code" / "Updating").
