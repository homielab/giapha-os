# Copilot Instructions for Giapha OS

**Giapha OS** — Open-source family tree (gia phả) management application with multi-generational records, Vietnamese kinship calculations, grave management, and AI bot integration.

---

## 1. Quick Start Commands

### Development Setup
```bash
# Install dependencies
npm install
bun install  # Alternative: Bun package manager

# Environment setup
cp .env.example .env.local
# Update .env.local with Supabase credentials and API keys
```

### Development Server
```bash
npm run dev      # Start dev server (http://localhost:3000)
bun run dev      # Using Bun
```

### Build & Production
```bash
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # ESLint check (PSR-style)
npm run lint:fix  # Auto-fix ESLint issues
```

### Database & Migrations
```bash
# Run schema migration (check at app/api/setup/schema.sql)
# Migrations are auto-checked on app startup via app/api/middleware.ts

# Seed demo data
# Files: docs/seed.sql, docs/seed-demo.sql
```

---

## 2. Critical Architecture Notes

### Supabase Configuration — Service Role Key Requirement

⚠️ **CRITICAL:** Routes using Supabase REST API (like `/api/v1/members`) require `SUPABASE_SERVICE_ROLE_KEY`.

```bash
# In .env.local — MUST be set for API routes to work:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # ← REQUIRED for REST API endpoints

# Missing this causes routes like /api/v1/members to fail with 500 errors
```

**Why?** Service role key bypasses RLS policies for server-side operations, allowing public API endpoints to access data with admin privileges.

### Row-Level Security (RLS) Policies

All database tables have RLS policies enforcing role-based access:
- **Admin:** Full access (READ, INSERT, UPDATE, DELETE)
- **Editor:** Can edit members and events, limited admin features
- **Member:** Can view and edit own profile + family data
- **Anonymous:** Public-only tables (public_families, memorials)

**Important:** Every new table/column needs corresponding RLS policies. Check `docs/schema.sql` for patterns:

```sql
-- Pattern: Enable for authenticated users with role check
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON persons
  FOR ALL USING (auth.jwt() ->> 'user_role' = 'admin');

CREATE POLICY "editor_read_write" ON persons
  FOR SELECT USING (auth.jwt() ->> 'user_role' IN ('admin', 'editor'));
```

### RLS Policy Naming Convention

```
{operation}_{audience}
- operation: admin_full, user_read, auth_read_write, public_read
- audience: access, select, insert, update, delete (specific)
```

Example: `public_read_memorial_pages`, `editor_update_members`

### Authentication via Supabase

- **Auth Method:** Email/password with Supabase Auth
- **User Role:** Stored in JWT custom claim `user_role` (admin/editor/member)
- **Session:** Managed via supabase-js client cookies
- **2FA:** NOT currently implemented (can be added via Supabase MFA)

**Checking user role in server actions:**
```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Role is in JWT — fetch from user metadata or use custom RPC
const role = user?.user_metadata?.role || 'member';
```

---

## 3. File Structure & Key Directories

```
app/
├── layout.tsx                    # Root layout with i18n, dark mode, auth
├── auth/                         # Login/signup pages
├── dashboard/                    # Main app (protected)
│   ├── members/                  # Member CRUD
│   ├── lineage/                  # Tree/Mindmap visualization
│   ├── kinship/                  # Kinship calculator
│   ├── events/                   # Birthday/anniversary events
│   ├── timeline/                 # Activity feed
│   ├── cemetery-map/             # Grave location map
│   └── settings/                 # Admin/user settings
├── api/                          # API routes
│   ├── v1/                       # Public API (requires auth)
│   │   ├── members/              # Member CRUD API
│   │   ├── stats/                # Family statistics
│   │   └── docs                  # OpenAPI documentation
│   ├── admin/                    # Admin-only endpoints
│   ├── cron/                     # Vercel cron (reminders)
│   ├── telegram/                 # Telegram webhook
│   ├── zalo/                     # Zalo webhook
│   └── middleware.ts             # Schema version check
├── public/                       # Public pages (no auth)
│   └── [token]/                  # Public family tree share links
└── (auth)/                       # Auth group layout
    ├── login
    ├── signup
    └── join/[token]              # Invitation links

components/                       # React components
├── TreeView.tsx                  # Tree visualization (D3)
├── MindmapView.tsx               # Radial mindmap
├── MemberForm.tsx                # Create/edit member
├── KinshipCalculator.tsx         # Vietnamese kinship logic
├── CemeteryMap.tsx               # Grave location map
├── ThemeProvider.tsx             # Dark/light mode context
└── [other components]

types/                            # TypeScript types
├── index.ts                      # Core types (Person, Family, etc.)
└── database.ts                   # Database types from Supabase

utils/
├── supabase/                     # Supabase client factories
│   ├── client.ts                 # Browser client (anon key)
│   ├── server.ts                 # Server client (service role)
│   └── admin.ts                  # Admin-only server client
├── kinship.ts                    # Vietnamese kinship calculation logic
├── lunar.ts                      # Lunar calendar conversion
└── [other utilities]

docs/
├── schema.sql                    # Full database schema (40+ tables)
├── ROADMAP.md                    # Feature roadmap
├── PROJECT_OVERVIEW.md           # Architecture overview
└── GIT_WORKFLOW.md               # Contribution guidelines
```

---

## 4. Key Services & Patterns

### Supabase Client Creation

⚠️ **Important:** Use the correct client type for each context.

```typescript
// Browser/Client Component:
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();

// Server Component / Server Action:
import { createClient } from '@/utils/supabase/server';
const supabase = createClient();

// Admin Operations (has full access):
import { createAdminClient } from '@/utils/supabase/admin';
const admin = createAdminClient();
```

### Kinship Calculation (Vietnamese-Specific)

The `utils/kinship.ts` module calculates Vietnamese kinship terms automatically.

```typescript
import { calculateKinship } from '@/utils/kinship';

// Returns: { term: 'Chú', type: 'uncle', distance: 1, ... }
const kinship = calculateKinship(personA_id, personB_id);
console.log(`A gọi B là: ${kinship.term}`);
```

**Key Logic:**
- Based on generation difference (ancestors: thế hệ âm; descendants: thế hệ dương)
- Gender matters (chú/cô/dì for uncles/aunts)
- Age order matters (anh/em)
- Handles special cases: con dâu (daughter-in-law), rể (son-in-law), con kế (step-child)

### Lunar Calendar Conversion

```typescript
import { lunarToSolar, solarToLunar } from '@/utils/lunar';

// Convert lunar (13/01/Âm) → solar (dương lịch)
const solarDate = lunarToSolar(2025, 1, 13);  // 2025-02-11

// Convert solar → lunar for death anniversaries
const lunarDate = solarToLunar(2025, 2, 11);  // { year: 2025, month: 1, day: 13 }
```

---

## 5. i18n (Internationalization) Setup

**Supported Languages:** Vietnamese (vi), English (en), Chinese (zh)

### Using Translations in Components

```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('members');
  
  return <h1>{t('title')}</h1>;  // messages/vi/members.json -> "Danh sách thành viên"
}
```

### Message Files Location

```
messages/
├── en.json                    # English (fallback)
├── vi.json                    # Vietnamese (primary)
└── zh.json                    # Chinese
```

Each JSON file has nested namespaces:
```json
{
  "common": { "save": "Save", ... },
  "members": { "title": "Member List", ... },
  "kinship": { "uncle": "Uncle", ... }
}
```

### Adding New Translations

1. Add to all three JSON files (en.json, vi.json, zh.json)
2. Use consistent dot-path naming: `namespace.key`
3. For Vietnamese-specific terms (kinship), keep Vietnamese as primary

---

## 6. Database Schema — Key Tables

### Core Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `families` | Family branches (chi nhánh dòng họ) | public_read + auth |
| `persons` | Family members | family-scoped auth |
| `relationships` | Parent-child, marriage, adoption | family-scoped |
| `events` | Birthdays, anniversaries, custom events | family-scoped |
| `family_events` | Gia đình sự kiện (họp mặt, lễ...) | family-scoped |
| `graves` | Cemetery records (v1.1+) | family-scoped |
| `users` | User profiles with roles | auth-scoped |
| `audit_logs` | Change tracking for compliance | family-scoped |

### RLS Key Principles

1. **All tables require RLS** — no public write access
2. **Family-scoped** — users see only their family's data
3. **Role-based** — admin > editor > member > anon
4. **Audit logged** — changes tracked in `audit_logs` for compliance

---

## 7. API Routes & Endpoints

### Public API (v1)

Requires authentication. Service role key needed for server-side calls.

```
GET  /api/v1/members               # List members (paginated)
GET  /api/v1/members/[id]          # Get member details
GET  /api/v1/stats                 # Family statistics
GET  /api/v1/docs                  # OpenAPI documentation
```

### Admin Endpoints

```
POST /api/admin/[feature]/...      # Feature-specific admin operations
```

### Cron Jobs (Vercel)

```
GET  /api/cron/reminders           # Vercel cron trigger (scheduled)
                                   # Sends email/Telegram reminders
```

### Webhooks

```
POST /api/telegram/webhook/[branchId]  # Telegram Bot webhook
POST /api/zalo/webhook                 # Zalo OA webhook
```

---

## 8. Common Patterns & Gotchas

### Pattern 1: Server Actions for Data Mutations

Use server actions in `app/dashboard/members/actions.ts` style:

```typescript
'use server';
import { createClient } from '@/utils/supabase/server';

export async function updateMember(id: string, data: Partial<Person>) {
  const supabase = createClient();
  
  // RLS will enforce that user can only update their family
  const { error } = await supabase
    .from('persons')
    .update(data)
    .eq('id', id);
    
  if (error) throw new Error(error.message);
}
```

### Pattern 2: Handling Lunar Calendar Dates

Always store BOTH solar and lunar dates in the database:

```typescript
// When saving a birthday:
const { error } = await supabase.from('persons').update({
  birth_date: solarDate,           // Dương lịch
  birth_date_lunar: lunarDateStr,  // Âm lịch (stored as string "2025-01-13")
});
```

**Why?** Lunar calendar calculations are complex; storing both prevents recalculation errors.

### Pattern 3: Family-Scoped Queries

Always filter by `family_id` when querying persons:

```typescript
// ❌ WRONG — gets ALL members from ALL families
const { data } = await supabase
  .from('persons')
  .select('*');

// ✅ CORRECT — RLS will enforce, but explicitly filter
const { data } = await supabase
  .from('persons')
  .select('*')
  .eq('family_id', currentFamily.id);
```

### Pattern 4: File Uploads to Storage

Members can have avatars in Supabase Storage:

```typescript
// Upload avatar
const { data, error } = await supabase
  .storage
  .from('person-photos')
  .upload(`${family_id}/${person_id}/avatar.jpg`, file);

if (error) throw error;

// Get public URL
const { data: { publicUrl } } = supabase
  .storage
  .from('person-photos')
  .getPublicUrl(`${family_id}/${person_id}/avatar.jpg`);
```

**Storage RLS:** By default, only family members can access their photos.

### Gotcha 1: Missing Service Role Key in .env

**Symptom:** `/api/v1/members` returns 500 error  
**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not in `.env.local`  
**Fix:** Copy from Supabase dashboard → Project Settings → API

### Gotcha 2: Lunar Date Calculation Off by 1 Day

**Symptom:** Anniversary reminders trigger on wrong date  
**Cause:** Lunar calendar has leap months; `solarToLunar()` can be off  
**Solution:** Store both solar + lunar, display lunar as primary for events

### Gotcha 3: Kinship Calculation Doesn't Handle All Cases

**Symptom:** Some relationship types return `undefined`  
**Cause:** Kinship logic only handles 9 ancestor/8 descendant levels  
**Impact:** Distant relatives beyond scope won't have Vietnamese term  
**Workaround:** Display generic "Họ hàng xa" (distant relative) instead

---

## 9. Testing & Quality Assurance

### Linting

```bash
npm run lint      # Check for ESLint errors
npm run lint:fix  # Auto-fix errors
```

**ESLint Config:** `.eslintrc.js` enforces Next.js best practices and TypeScript strict mode.

### Running Tests

```bash
# Currently: No automated tests (add as needed)
# Manual testing checklist:
# 1. Member CRUD (create, read, update, delete)
# 2. Tree visualization (zoom, pan, filter)
# 3. Kinship calculation (5+ relationship types)
# 4. Event reminders (trigger test emails)
# 5. RLS enforcement (users see only own family)
```

### Pre-Deployment Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — successful
- [ ] Schema migrations applied (check `/api/setup`)
- [ ] Supabase RLS policies verified
- [ ] Service role key configured in `.env.local`
- [ ] All secrets (API keys, Telegram token) configured
- [ ] Test one full user flow (signup → member creation → tree view)

---

## 10. Deployment (Vercel)

### Automatic Deployment

- **Main branch** → Production (`giapha-os.vercel.app`)
- **Pull requests** → Preview deployments

### Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
ZALO_OA_SECRET=...
OPENAI_API_KEY=...  (or platform key)
[+ other feature keys]
```

### Vercel Cron Jobs

Reminders cron runs daily via `@vercel/functions`:

```bash
# In vercel.json:
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"  # 9 AM UTC daily
    }
  ]
}
```

---

## 11. Development Workflow

### Branch Naming

```
feature/issue-N-description       # New feature (issue #N)
bugfix/issue-N-description        # Bug fix
docs/description                  # Documentation
refactor/description              # Code refactoring
```

Example: `feature/issue-90-email-notifications`

### Commit Messages

```
type: description (#issue)

[optional detailed body]

type: feat, fix, docs, refactor, chore, perf, test
```

Example:
```
feat: email notifications for birthdays (#90)

- Add Supabase Edge Function for email trigger
- Implement email template with lunar dates
- Add opt-in settings per user
```

### Pull Request Process

1. Create PR from feature branch → main
2. ESLint check must pass (`npm run lint`)
3. Request review from maintainers
4. After approval, merge with "Squash and merge"
5. Delete feature branch

---

## 12. Common Tasks & Solutions

### Task: Add a New Field to Member Profile

1. **Migrate database:**
   - Update `docs/schema.sql`
   - Create migration in `docs/migrations/`
   - Supabase auto-applies on next deployment

2. **Update TypeScript types:**
   - Modify `types/index.ts` (Person interface)

3. **Update UI:**
   - Edit `components/MemberForm.tsx` (form input)
   - Edit `components/MemberCard.tsx` (display)

4. **Add translation:**
   - Add key to `messages/en.json`, `messages/vi.json`, `messages/zh.json`

### Task: Add a New Event Type

1. Update `types/index.ts` → `EventType` enum
2. Add translations in `messages/*/events.json`
3. Update `utils/kinship.ts` if needed
4. Add reminder logic in `app/api/cron/reminders/`

### Task: Add Admin-Only Feature

1. Create server action in `app/dashboard/settings/actions.ts`
2. Add RLS policy with role check:
   ```sql
   CREATE POLICY "admin_only" ON [table]
     USING (auth.jwt() ->> 'user_role' = 'admin');
   ```
3. Protect UI with role check:
   ```typescript
   if (user?.user_metadata?.role !== 'admin') {
     return <NotFound />;
   }
   ```

---

## 13. Troubleshooting

### Problem: Build fails with TypeScript errors

```bash
npx tsc --noEmit
```

Check `tsconfig.json` — strict mode is enabled. Fix all type errors before pushing.

### Problem: Supabase queries return empty

**Likely cause:** RLS policy blocking the query.

**Debug steps:**
1. Check user role in JWT (`auth.jwt() ->> 'user_role'`)
2. Verify RLS policy syntax in `docs/schema.sql`
3. Test with service role key (should work)
4. Test with user anon key (may be blocked by RLS)

### Problem: Lunar date calculation is off

**Solution:**
1. Verify both `birth_date` and `birth_date_lunar` are set
2. Use primary lunar date for events (not calculated)
3. Report issue if difference is > 1 day

### Problem: Cron reminders not triggering

**Debug steps:**
1. Check `/api/cron/reminders` manually: `curl https://yourapp/api/cron/reminders`
2. Verify `vercel.json` has cron job configured
3. Check Vercel logs for errors
4. Verify Supabase Edge Function is deployed (if using)

---

## 14. Key Resources

- **Documentation:** `docs/PROJECT_OVERVIEW.md`, `docs/ROADMAP.md`
- **API Docs:** `/api/v1/docs` (OpenAPI format)
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

## 15. Project Statistics

| Metric | Value |
|--------|-------|
| **Version** | v1.5.0 |
| **Database Tables** | 40+ |
| **API Endpoints** | 30+ |
| **Languages** | 3 (Vietnamese, English, Chinese) |
| **Components** | 50+ |
| **Lines of Code** | 15,000+ |
| **Phases Completed** | 11 (Phase 0 → Phase 11) |
| **Current Status** | Feature-complete, stable |

---

**Last Updated:** March 2026  
**Maintained by:** Development Team  
**Status:** Production Ready (v1.5.0 + continuous improvements)
