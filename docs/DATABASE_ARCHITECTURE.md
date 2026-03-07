# Giapha OS — Database Architecture & Changes

**Version:** v1.7.0-beta.1  
**Last Updated:** March 2026  
**Status:** Production-ready with active feature development

---

## 📊 Database Overview

### Technology Stack
- **Database:** PostgreSQL (via Supabase)
- **Schema Version:** 56KB (1315 lines)
- **Tables:** 40+ core tables
- **Row-Level Security:** Full RLS policies for all tables
- **Enums:** gender_enum, relationship_type_enum, user_role_enum

### Core Principles
1. **No DROP TABLE** — All migrations are additive (preserve data)
2. **RLS-First Design** — Every table has row-level security policies
3. **Audit Logging** — All user changes tracked in audit_logs
4. **Referential Integrity** — Foreign keys with CASCADE deletes where appropriate

---

## 🗂️ Table Structure (40+ Tables)

### 1. Authentication & Profiles (3 tables)

**profiles**
```
id (UUID) — Linked to auth.users
role (enum: admin|editor|member)
is_active (boolean)
account_status (enum: pending|active|rejected|suspended)
phone_number, onboarding_completed, linked_person_id, etc.
created_at, updated_at
```

**user_preferences**
```
user_id (UUID) — FK to profiles
default_root_person_id
default_branch_id
tree_view_mode (tree|mindmap|list)
updated_at
```

**audit_logs**
```
id (UUID)
user_id, family_id, table_name, record_id
operation (SELECT|INSERT|UPDATE|DELETE)
old_data, new_data (JSONB)
changed_at (TIMESTAMPTZ)
INDEX: (changed_at, user_id)
```

### 2. Family Structure (5 tables)

**families**
```
id (UUID)
name, description
founder_person_id
created_by (user_id)
is_public (boolean)
created_at, updated_at
```

**branches** (v1.5+)
```
id (UUID)
family_id (FK)
name, description
created_by, created_at
display_order, updated_at
```

**persons** — Core entity (64 columns)
```
id, full_name, gender, generation
birth_year/month/day, death_year/month/day
is_deceased, is_in_law, birth_order
place_of_birth, avatar_url, note
branch_id (v1.5+)
[Extended profile fields: saint_name, religion, career, etc.]
[Privacy fields: privacy_level, phone_number (private)]
created_at, updated_at
```

**relationships**
```
id, person1_id, person2_id
relationship_type (marriage|biological_child|adopted_child|etc.)
created_by, created_at, updated_at
```

**person_details_private** (v1.2+)
```
person_id (FK)
phone_number, occupation, current_residence
created_at, updated_at
[RLS: Only admin/owner can read]
```

### 3. Events & Reminders (6 tables)

**events**
```
id, person_id, event_type (birthday|anniversary|death_day)
event_date (TIMESTAMPTZ)
lunar_date (for birthdays)
reminder_sent (boolean)
created_at, updated_at
```

**custom_events** (v1.7.1+)
```
id, family_id
title, description
event_date (TIMESTAMPTZ, now optional for lunar-only)
lunar_month, lunar_day (SMALLINT, NEW in v1.7.1)
recurring_type (daily|weekly|monthly|yearly|lunar_annual)
created_by, created_at, updated_at
```

**reminder_logs** (v1.5+)
```
id, reminder_type, subject_id
status (sent|failed|bounced)
delivery_channel (email|telegram|zalo)
scheduled_date, sent_at
error_message, retry_count
created_at
[INDEX: (branch_bot_id, reminder_type, subject_id, days_before, scheduled_date)]
```

**notification_settings** (v1.5+)
```
user_id (FK)
notify_on_birthday, notify_on_anniversary, notify_on_family_event
notify_on_member_added
email_days_before, telegram_days_before, zalo_days_before
created_at, updated_at
```

**family_events** (v1.5+)
```
id, family_id, title
event_date, description
created_by, created_at
```

**subscriptions** (v1.5+)
```
id, family_id
plan (free|pro|enterprise)
is_active (unique partial index)
monthly_member_quota, monthly_reminder_quota
created_at, expires_at
[UNIQUE INDEX: (family_id) WHERE is_active = true]
```

### 4. Graves & Memorials (4 tables, v1.1+)

**graves**
```
id, person_id, cemetery_id
location_lat, location_lng
photos (JSONB: {url, uploaded_at})
panorama_url (360° photo)
notes, burial_date
created_at, updated_at
```

**cemeteries**
```
id, family_id, name, location_lat, location_lng
is_famous (boolean)
created_at, updated_at
```

**grave_maintenance_events** (v1.5+)
```
id, grave_id, maintenance_type (tết|cleaning|repair)
maintenance_date, next_reminder_date
created_at, updated_at
```

**public_memorials** (v1.1+)
```
id, person_id (public, no auth required)
access_token (URL-safe token for sharing)
created_at, expires_at
[RLS: Public read, no auth needed]
```

### 5. Bots & API (3 tables, v1.5+)

**branch_bots**
```
id, branch_id, platform (telegram|zalo)
bot_token, webhook_url
is_active, created_at, updated_at
```

**ai_conversations**
```
id, user_id, branch_id
messages (JSONB: [{role, content, timestamp}])
model_used (openai|anthropic|openrouter)
total_tokens, cost_estimate
created_at, updated_at
```

**api_keys** (v1.5+)
```
id, family_id, key_hash (SHA256)
permissions (JSONB: ["members.read", "events.read"])
is_active, last_used_at
created_at, expires_at
[RLS: Family admin only]
```

### 6. Photos & Media (2 tables)

**person_photos** (v1.1+)
```
id, person_id, storage_path (Supabase Storage)
photo_type (avatar|document|memorial)
uploaded_by, created_at
[RLS: Family members can view, admin can manage]
```

**grave_photos** (v1.1+)
```
id, grave_id, storage_path
description, uploaded_by, created_at
```

### 7. Invitations & Access (2 tables, v1.4+)

**invitations**
```
id, family_id
token (unique, URL-safe)
email, invited_role (admin|editor|member)
assigned_branch_id (optional)
is_used, used_by, used_at
expires_at, created_by, created_at
[RLS: Admin/editor can create, anyone can use with token]
```

**user_access_tokens** (v1.5+)
```
id, user_id
token (unique, JWT-like)
expires_at, last_used_at, created_at
```

---

## 🔄 Recent Database Changes (v1.7.0+)

### v1.7.1: Lunar Events Enhancement
**File:** `docs/migrations/v1.7.1_custom_events_lunar.sql`

```sql
-- NEW COLUMNS in custom_events:
ALTER TABLE public.custom_events
  ADD COLUMN IF NOT EXISTS lunar_month SMALLINT CHECK (lunar_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS lunar_day SMALLINT CHECK (lunar_day BETWEEN 1 AND 30);

-- event_date now OPTIONAL (for lunar-only recurring events)
ALTER TABLE public.custom_events
  ALTER COLUMN event_date DROP NOT NULL;
```

**Why?**
- Support lunar-only events (e.g., "7th day of 1st lunar month" annually)
- Allow flexible event scheduling based on lunar calendar
- Store both solar date (when set) and lunar date

**Migration Path:**
1. Existing events keep event_date (solar date)
2. New events can specify ONLY lunar_month/day (no event_date)
3. EventHelpers.ts computes next solar date annually from lunar

### v1.6: Email Notifications & PDF Export
- Email notifications via Resend (v1.6)
- PDF family book export by branch (v1.6)
- New columns added incrementally, no breaking changes

### v1.5+: Bot Platform & Subscriptions
- branch_bots table for Telegram/Zalo
- subscriptions table for Free/Pro/Enterprise
- reminder_logs with atomic operations
- Full RLS policies for multi-tenant isolation

---

## 🔐 Row-Level Security (RLS) Strategy

### Authentication Context
All RLS policies check `auth.jwt()`:
```
auth.jwt() ->> 'user_role'  → 'admin' | 'editor' | 'member'
(auth.uid())                → Current user ID
```

### Policy Pattern by Role

**Admin**
```sql
CREATE POLICY "admin_full_access" ON persons
  FOR ALL USING (auth.jwt() ->> 'user_role' = 'admin');
```
✅ Full read/write/delete

**Editor**
```sql
CREATE POLICY "editor_read_write" ON persons
  FOR SELECT USING (auth.jwt() ->> 'user_role' IN ('admin', 'editor'));
  
CREATE POLICY "editor_update" ON persons
  FOR UPDATE USING (auth.jwt() ->> 'user_role' IN ('admin', 'editor'));
```
✅ Read, write, update; cannot delete

**Member**
```sql
CREATE POLICY "member_read_own_family" ON persons
  FOR SELECT USING (
    family_id = (
      SELECT family_id FROM families 
      WHERE created_by = auth.uid() OR id IN (
        SELECT family_id FROM family_memberships WHERE user_id = auth.uid()
      )
    )
  );
```
✅ Read only; cannot modify data

**Anonymous**
```sql
CREATE POLICY "anon_public_memorial" ON public_memorials
  FOR SELECT USING (true);  -- Anyone can read via token
```
✅ Public read-only (no auth needed)

### Multi-Tenant Isolation
Each family has its own users with roles:
```
families (1) ← → (N) family_memberships ← → (N) profiles

Every query filters by family_id first:
SELECT * FROM persons WHERE family_id = current_family_id
```

---

## 📊 Schema Changelog

| Version | Date | Changes | Files |
|---------|------|---------|-------|
| v1.7.1 | Mar 2026 | Lunar events (lunar_month/day in custom_events) | migration v1.7.1, utils/eventHelpers.ts |
| v1.7.0 | Mar 2026 | PDF branch export, family groups, vertical name, print | FamilyBookExport, BaseToolbar |
| v1.6 | Feb 2026 | Email notifications (Resend), advanced search | app/api/email, components |
| v1.5 | Jan 2026 | Bots (Telegram/Zalo), subscriptions, AI chat | branch_bots, ai_conversations |
| v1.4 | Dec 2025 | Invitations, admin approval, CCCD | invitations, user_access_tokens |
| v1.3 | Nov 2025 | Public dashboard, memorials | public_memorials, public family views |
| v1.2 | Oct 2025 | Privacy controls, branch management | privacy_level, branches, person_details_private |
| v1.1 | Sep 2025 | Graves, cemetery map, photos | graves, cemeteries, photos |
| v1.0 | Aug 2025 | Core family tree, kinship, events | persons, relationships, events |

---

## 🔗 Foreign Key Relationships

```
auth.users
    ↓
profiles (1:1)
    ↓
audit_logs (N:1)
audit_logs → families, persons
    ↓
families (1:N)
    ├→ persons (1:N)
    │  ├→ relationships (N:N via person1/person2)
    │  ├→ events (1:N)
    │  ├→ graves (1:1)
    │  │   └→ grave_photos (1:N)
    │  ├→ person_photos (1:N)
    │  └→ person_details_private (1:1)
    ├→ branches (1:N)
    ├→ cemeteries (1:N)
    ├→ custom_events (1:N)
    ├→ family_events (1:N)
    ├→ invitations (1:N)
    ├→ branch_bots (1:N)
    └→ subscriptions (1:N)
```

---

## 📈 Performance Optimizations

### Indices
```sql
-- High-traffic queries
INDEX: persons (family_id, generation, birth_year)
INDEX: relationships (person1_id, person2_id)
INDEX: events (person_id, event_type)
INDEX: audit_logs (changed_at, user_id)
INDEX: reminder_logs (branch_bot_id, reminder_type, subject_id, days_before, scheduled_date)
```

### JSONB Query Examples
```sql
-- Search within JSONB arrays
SELECT * FROM ai_conversations 
WHERE messages @> '[{"role": "assistant"}]'::jsonb;

-- Store flexible metadata
UPDATE branch_bots SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{last_error}',
  to_jsonb(error_message)
);
```

---

## �� Scaling Considerations

### Current Limits
- **Families:** Unlimited (1000s supported)
- **Members per family:** ~5000+ (tested)
- **Events per member:** ~100+
- **Bot platforms per family:** 2 (Telegram + Zalo)
- **Photo storage:** 100GB/family (Supabase Storage default)

### Horizontal Scaling
- PostgreSQL read replicas for reporting
- Supabase Edge Functions for async jobs
- S3-compatible storage for photos (Supabase Storage)
- Redis for caching (optional future)

### Archival Strategy
- Old families → read-only archive tables
- Photo cleanup after 2 years (configurable)
- Audit log retention: 7 years (compliance)

---

## 🔧 Migration Management

### How Migrations Work
1. **File naming:** `vX.Y.Z_description.sql`
2. **Location:** `docs/migrations/`
3. **Application:** Manual via Supabase SQL Editor or CI/CD
4. **Idempotency:** Use `IF NOT EXISTS`, `IF NOT EXISTS VALUE`, `ALTER ... DROP NOT NULL`
5. **No breaking changes:** Never `DROP TABLE`, only `ADD COLUMN`

### Best Practices
✅ Always use `CREATE TABLE IF NOT EXISTS`  
✅ Make columns nullable initially, then add constraints  
✅ Test migrations on staging first  
✅ Document in commit message: "Migration: v1.X.Y — description"  
✅ Never modify existing columns (add new ones instead)

---

## 📚 Related Documentation
- **schema.sql** — Full 1315-line schema definition
- **PROJECT_OVERVIEW.md** — Architecture overview
- **copilot-instructions.md** — RLS and service role key setup
- **Mobile App Plan** → See separate document

