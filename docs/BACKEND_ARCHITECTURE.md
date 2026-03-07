# Giapha OS — Backend Architecture & Changes

**Version:** v1.7.0-beta.1  
**Technology:** Next.js App Router + TypeScript + Supabase  
**Last Updated:** March 2026

---

## 🏗️ Backend Architecture

### Key Technologies
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL via Supabase
- **Real-time:** Supabase websockets
- **Authentication:** Supabase Auth (JWT-based)
- **File Storage:** Supabase Storage (S3-compatible)
- **Cron Jobs:** Vercel Functions (@vercel/functions)
- **Edge Functions:** Supabase Edge Functions (Deno)
- **API:** RESTful + RPC functions

### Project Structure
```
app/
├── api/
│   ├── v1/                      # Public REST API (requires auth)
│   │   ├── members/[id].ts      # GET member details
│   │   ├── stats/route.ts       # GET family statistics
│   │   └── docs/route.ts        # OpenAPI documentation
│   │
│   ├── admin/                   # Admin-only endpoints
│   │   ├── users/route.ts       # Admin user management
│   │   ├── settings/route.ts    # Admin settings
│   │   └── [feature]/route.ts   # Feature-specific
│   │
│   ├── cron/
│   │   └── reminders/route.ts   # Vercel cron: daily reminders
│   │
│   ├── email/
│   │   └── test/route.ts        # Email testing endpoint
│   │
│   ├── telegram/
│   │   └── webhook/[branchId]/route.ts  # Telegram bot webhook
│   │
│   ├── zalo/
│   │   └── webhook/route.ts     # Zalo OA webhook
│   │
│   └── middleware.ts            # Schema version check
│
├── actions/
│   ├── user.ts                  # Auth & profile actions
│   └── *.ts                     # Feature-specific server actions
│
└── dashboard/
    └── [feature]/
        ├── page.tsx             # UI page
        ├── actions.ts           # Server actions (mutations)
        └── layout.tsx           # Layout
```

---

## 🔌 Server Actions (Data Mutations)

### Pattern: Server Actions for Create/Update/Delete

**File Structure:**
```typescript
// app/dashboard/members/actions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function updateMember(id: string, data: Partial<Person>) {
  const supabase = createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // RLS will enforce family_id filtering
  const { error } = await supabase
    .from('persons')
    .update(data)
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/members');
}
```

**Key Pattern:**
1. Import `createClient()` from `utils/supabase/server`
2. Check auth with `supabase.auth.getUser()`
3. Execute query (RLS enforces access)
4. Handle errors
5. `revalidatePath()` for cache invalidation

### Why Server Actions?
- ✅ Type-safe RPC to server
- ✅ No API route boilerplate
- ✅ Automatic CSRF protection
- ✅ Can redirect after mutation
- ✅ Direct database access without HTTP

---

## 📡 REST API (v1)

### Authentication
```
Header: Authorization: Bearer <JWT>
Provider: Supabase JWT from login
```

### Endpoints

#### GET /api/v1/members
**Query Params:**
- `family_id` (required)
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "data": [{ "id", "full_name", "gender", ... }],
  "count": 150,
  "next_offset": 50
}
```

**Code:**
```typescript
// app/api/v1/members/route.ts
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // Query with pagination
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
  const offset = Number(searchParams.get('offset') || 0);
  
  const { data, error, count } = await supabase
    .from('persons')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(offset, offset + limit - 1);
    
  if (error) return new Response(error.message, { status: 500 });
  
  return Response.json({ data, count, next_offset: offset + limit });
}
```

#### GET /api/v1/stats
**Returns:**
```json
{
  "total_members": 150,
  "total_deceased": 8,
  "generations": {
    "ancestors": 3,
    "current": 2,
    "descendants": 1
  },
  "avg_age": 45.2
}
```

#### GET /api/v1/docs
**Returns:** OpenAPI 3.0 schema with all endpoints documented

---

## ⏰ Cron Jobs (Vercel Functions)

### GET /api/cron/reminders
**Trigger:** Daily at 9 AM UTC (via `vercel.json`)

**Purpose:** Send reminders for:
- Birthdays (today)
- Anniversaries (today)
- Death anniversaries (today)
- Custom events (today)

**Implementation:**
```typescript
// app/api/cron/reminders/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // For each family:
  // 1. Get all reminders due today
  // 2. Check notification_settings for user preferences
  // 3. Send via email (Resend), Telegram, Zalo
  // 4. Log in reminder_logs table
  
  return Response.json({ status: 'ok' });
}
```

**Flow:**
```
1. Vercel triggers at scheduled time
2. Fetch all families + their events due today
3. For each event:
   a. Check notification_settings (email/telegram/zalo)
   b. Send reminder via configured channels
   c. Log delivery in reminder_logs
4. Handle failures atomically
```

---

## 🤖 Webhook Handlers

### Telegram Webhook
**File:** `app/api/telegram/webhook/[branchId]/route.ts`

```typescript
export async function POST(
  req: Request,
  { params: { branchId } }: { params: { branchId: string } }
) {
  const body = await req.json();
  const { message, callback_query } = body;
  
  // Handle different message types
  if (message?.text) {
    // Process text command (/search, /event, /reminder, /invite)
  }
  
  if (callback_query) {
    // Handle button clicks
  }
  
  // Send response to Telegram API
}
```

### Zalo Webhook
**File:** `app/api/zalo/webhook/route.ts`

**HMAC Signature Verification:**
```typescript
const hmac = crypto
  .createHmac('sha256', ZALO_OA_SECRET)
  .update(body)
  .digest('hex');

if (hmac !== req.headers.get('x-signature')) {
  return new Response('Signature mismatch', { status: 403 });
}
```

---

## 🔑 Authentication Flow

### Login (Email/Password)
```typescript
// app/actions/user.ts
export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw new Error(error.message);
  
  return data.user;
}
```

### JWT Token Structure
```
Header: {
  "alg": "HS256",
  "typ": "JWT"
}

Payload: {
  "sub": "user-id",
  "email": "user@example.com",
  "user_role": "admin|editor|member",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### RLS Policy with JWT
```sql
-- Check role in JWT
WHERE (auth.jwt() ->> 'user_role')::text = 'admin'

-- Check user ID
WHERE auth.uid() = user_id
```

---

## 📊 Database Queries & Optimization

### Example: Get Family Tree with Relationships
```typescript
export async function getFamilyTree(familyId: string) {
  const supabase = createClient();
  
  // Get all persons in family
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('family_id', familyId)
    .order('generation', { ascending: false })
    .order('birth_order', { ascending: true });
  
  // Get all relationships
  const { data: relationships } = await supabase
    .from('relationships')
    .select('person1_id, person2_id, relationship_type')
    .or(`person1_id.in.(${persons.map(p => p.id).join(',')}),person2_id.in.(${persons.map(p => p.id).join(',')})`);
  
  // Build tree structure in memory
  return buildTreeStructure(persons, relationships);
}
```

### Lunar Date Calculation
```typescript
// utils/eventHelpers.ts
export function getNextLunarEventDate(lunarMonth: number, lunarDay: number): Date {
  // Lunar (14, 1) → Next 14th lunar month, 1st day
  // Convert to solar date
  const lunar = new Lunar(year, lunarMonth, lunarDay);
  return lunar.toSolar();
}

// Used in cron job for reminders
const nextDate = getNextLunarEventDate(1, 15);  // Lunar New Year
```

---

## 🔒 Security Patterns

### Input Validation
```typescript
// Server action must validate input
export async function createEvent(input: unknown) {
  // Validate with Zod
  const validated = eventSchema.parse(input);
  
  // Proceed with validated data
}
```

### Rate Limiting (Cron Job)
```typescript
// Prevent duplicate reminder sends
// Use reminder_logs with unique composite index:
// (branch_bot_id, reminder_type, subject_id, days_before, scheduled_date)

// Only send if no matching log exists
const { count } = await supabase
  .from('reminder_logs')
  .select('id', { count: 'exact' })
  .eq('reminder_type', 'birthday')
  .eq('subject_id', personId)
  .eq('scheduled_date', today);

if (count === 0) {
  // Send reminder
}
```

### CORS & Headers
```typescript
// All API routes include security headers
const response = new Response(data, { status: 200 });
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
return response;
```

---

## 📚 Service Layer Examples

### EventHelpers (Lunar + Solar Dates)
```typescript
export class EventHelpers {
  // Get solar date from lunar
  static getLunarEventDate(lunar: Lunar): Date { }
  
  // Check if event is today
  static isEventToday(event: Event): boolean { }
  
  // Get next 30 days of events
  static getUpcomingEvents(family: Family, days: 30): Event[] { }
}
```

### KinshipHelpers (Vietnamese Kinship Terms)
```typescript
export class KinshipHelpers {
  // Calculate relationship term (Việt)
  static calculateTerm(person1: Person, person2: Person): string { }
  
  // Get common ancestors
  static findCommonAncestors(p1Id, p2Id): Person[] { }
}
```

---

## 🚀 Deployment

### Vercel Cron Configuration
**File:** `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 9 * * *"
  }]
}
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
TELEGRAM_BOT_TOKEN=...
ZALO_OA_SECRET=...
CRON_SECRET=...
```

---

## 📝 Related Documentation
- **schema.sql** — Database schema
- **DATABASE_ARCHITECTURE.md** — Table structures, RLS
- **copilot-instructions.md** — API patterns

