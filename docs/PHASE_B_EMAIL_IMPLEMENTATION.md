# Phase B: Email Infrastructure Implementation Guide

**Status:** Implementation Ready  
**Last Updated:** March 8, 2026  
**Owner:** Backend Engineering  
**Timeline:** 1-2 weeks  

---

## Overview

Phase B implements production-ready email notifications for Giapha OS. Building on the existing Resend API integration, this phase adds:

1. **Supabase Edge Function** for scheduled reminder processing
2. **Multilingual Email Templates** for all event types (birthdays, death anniversaries, custom events)
3. **Lunar Calendar Support** in email reminders
4. **Cron Job Scheduling** for daily/hourly reminder processing

---

## Architecture

```
┌─ Notification Trigger ─────┐
│  (Cron job, 3x/day)        │
└──────────── ┬──────────────┘
             │ GET /api/cron/reminders?token=CRON_SECRET
             │
┌────────────────────────────┐
│ Check notification_settings│
│ & reminder_logs            │
└──────────── ┬──────────────┘
             │ (Query persons with upcoming dates)
             │
┌────────────────────────────┐
│ Supabase Edge Function     │
│ send-reminder-emails       │
└──────────── ┬──────────────┘
             │ (Process batch, call Resend API)
             │
┌────────────────────────────┐
│ Resend API                 │
│ /emails                    │
└────────────────────────────┘
```

---

## Implementation Checklist

### Phase B-1: Supabase Edge Function Setup

**Goal:** Create Deno-based Edge Function for email sending

**Files to Create:**
- `supabase/functions/send-reminder-emails/index.ts` (180 lines)
- `supabase/functions/send-reminder-emails/deno.json` (5 lines)

**Implementation Details:**

```typescript
// supabase/functions/send-reminder-emails/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface ReminderPayload {
  personId: string;
  userId: string;
  userEmail: string;
  type: "birthday" | "death_anniversary" | "custom_event";
  dateLabel: string;
  lunarMonth?: number;
  lunarDay?: number;
  daysUntil: number;
  personName: string;
  familyName: string;
  dashboardUrl: string;
}

serve(async (req: Request) => {
  // 1. Verify auth (Bearer token in header)
  // 2. Parse request body (array of ReminderPayload)
  // 3. Build emails using buildReminderEmailHtml
  // 4. Call Resend API for each batch
  // 5. Update reminder_logs with status
  // 6. Return { processed: N, sent: N, failed: N, errors: [...] }
});
```

**Key Features:**
- Receives batch of reminders from Cron route
- Sends via Resend API with proper error handling
- Logs each send attempt in reminder_logs table
- Returns processing stats for monitoring

---

### Phase B-2: Email Templates

**Goal:** Create multilingual email templates for all event types

**Files to Create:**
- `utils/email/templates.ts` (400 lines)

**Template Types:**

1. **Birthday Reminder**
   - Emoji: 🎂
   - Label: "Sinh nhật" (Vietnamese)
   - Supports lunar date display: "Ngày 15 tháng 3 (âm lịch: ngày 10 tháng 2)"

2. **Death Anniversary Reminder**
   - Emoji: 🕯️
   - Label: "Ngày giỗ"
   - Emphasizes respect, includes link to create memorial post

3. **Custom Event Reminder**
   - Emoji: 📅
   - Label: "Sự kiện"
   - Generic template for user-created events

4. **Notification Summary (Weekly)**
   - Emoji: 📬
   - Aggregates all upcoming events for the week
   - Prevents email fatigue

**Multilingual Support:**
- Vietnamese (vi) - Primary
- English (en) - For international users
- Chinese Simplified (zh) - For diaspora communities

**Template Structure:**
```
┌─────────────────────┐
│   Header (colored)  │  Brown/amber (#b45309)
├─────────────────────┤
│   Event Details     │  Person name, date, lunar
├─────────────────────┤
│  Call to Action     │  "View family tree" button
├─────────────────────┤
│   Footer (gray)     │  Unsubscribe link
└─────────────────────┘
```

---

### Phase B-3: Cron Job Setup

**Goal:** Schedule daily reminder processing

**Files to Modify:**
- `app/api/cron/reminders/route.ts` - Already exists, enhance for Resend

**Current Implementation:**
- Runs 3x/day (0:00, 8:00, 16:00 UTC)
- Queries notification_settings for enabled recipients
- Checks reminder_logs to avoid duplicates (key: user_id, reminder_type, subject_id, days_before, scheduled_date)
- Updates reminder_logs after sending

**Enhancements Needed:**
1. Call Supabase Edge Function instead of direct Supabase query
2. Handle rate limiting (Resend: 300 emails/hour limit)
3. Batch processing (process max 50 emails per run)
4. Error recovery (log failed sends for retry)

---

### Phase B-4: Notification Settings UI

**Goal:** Allow users to configure email preferences

**Current Implementation:**
- Frontend: `components/NotificationSettings.tsx` (exists)
- Backend: `app/dashboard/settings/[section]/actions.ts` (exists)
- Database: `public.notification_settings` table (exists)

**Enhancements Needed:**
1. Add granular controls:
   - [ ] Enable/disable email notifications (global toggle)
   - [ ] Days before event (e.g., 0, 1, 3, 7 days)
   - [ ] Event types (birthday, death, custom)
   - [ ] Email recipients (add/remove email addresses)
   - [ ] Frequency (immediate vs weekly summary)

2. Add timezone support:
   - Store user timezone in user_preferences
   - Send reminders at preferred time (not fixed UTC)

3. Add unsubscribe link:
   - Anonymous token-based link in footer
   - Allows users to disable notifications without login

**Example Database Schema Update:**
```sql
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS user_timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'immediate'; -- 'immediate' | 'daily_summary' | 'weekly'
```

---

## Database Schema Updates

### New Tables

**None** - Existing tables sufficient

### Existing Table Updates

**notification_settings** (already exists):
```sql
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS user_timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'immediate';
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;
```

**reminder_logs** (already exists):
```sql
-- Ensure proper unique index (non-status dependent)
CREATE UNIQUE INDEX IF NOT EXISTS reminder_logs_key_idx 
ON public.reminder_logs(branch_bot_id, reminder_type, subject_id, days_before, scheduled_date)
WHERE status = 'pending';

-- Add index for monitoring
CREATE INDEX IF NOT EXISTS reminder_logs_created_idx 
ON public.reminder_logs(created_at DESC);
```

---

## Environment Variables

**Required in production .env:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_FUNCTIONS_URL=https://[project-id].functions.supabase.co
NEXT_PUBLIC_APP_URL=https://giapha.app
CRON_SECRET=your-secret-token-here
```

**Existing (from previous phases):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## Testing Plan

### Unit Tests

```typescript
// __tests__/email/templates.test.ts
describe('Email Templates', () => {
  test('buildBirthdayEmail should include lunar date', () => {});
  test('buildDeathAnniversaryEmail should have correct emoji', () => {});
  test('buildCustomEventEmail should support custom labels', () => {});
  test('buildWeeklySummaryEmail should aggregate events', () => {});
});

// __tests__/email/resend.test.ts
describe('Resend API', () => {
  test('sendEmail should handle API errors', () => {});
  test('sendEmail should retry on network failure', () => {});
  test('sendEmail should log send attempts', () => {});
});
```

### Integration Tests

```typescript
// __tests__/api/cron/reminders.test.ts
describe('Reminder Cron Job', () => {
  test('should fetch upcoming reminders', () => {});
  test('should filter by notification_settings', () => {});
  test('should respect duplicate prevention', () => {});
  test('should handle Resend rate limiting', () => {});
  test('should update reminder_logs after send', () => {});
});
```

### Manual Testing

1. **Test Email Sending:**
   - POST /api/email/test with valid Resend API key
   - Verify email arrives within 30 seconds

2. **Test Cron Job:**
   - Manually trigger cron: GET /api/cron/reminders?token=CRON_SECRET
   - Check reminder_logs table for new entries
   - Verify emails sent to registered recipients

3. **Test Edge Function (Staging):**
   - Deploy to Supabase
   - Call via curl with batch payload
   - Monitor logs in Supabase dashboard

4. **Test Notification Settings UI:**
   - Enable/disable notifications
   - Verify changes persist in database
   - Test unsubscribe link from email

---

## Rollout Strategy

### Stage 1: Development (Week 1)
- [ ] Create Supabase Edge Function locally
- [ ] Create email templates with all 3 languages
- [ ] Write unit tests for templates and API
- [ ] Manual testing in local dev environment

### Stage 2: Staging (Week 1-2)
- [ ] Deploy Edge Function to Supabase staging
- [ ] Deploy to Vercel staging environment
- [ ] Execute full integration test suite
- [ ] Test with real Resend API (limited to staging emails)
- [ ] Performance test (load test with 1000 reminders)

### Stage 3: Production (Week 2, after approval)
- [ ] Final security review
- [ ] Deploy to Supabase production
- [ ] Deploy to Vercel production
- [ ] Monitor first 24 hours (error tracking, delivery rate)
- [ ] Create runbook for troubleshooting

---

## Monitoring & Observability

### Key Metrics

1. **Email Delivery Rate** 
   - Target: ≥ 98% success rate
   - Monitor: reminder_logs status = 'sent' vs 'failed'

2. **Send Latency**
   - Target: < 5 seconds per email
   - Monitor: Resend API response times in logs

3. **Cron Job Duration**
   - Target: < 60 seconds per run
   - Monitor: Function execution time

4. **Recipient Engagement**
   - Track: Email open rates via Resend analytics
   - Track: Click through rates to dashboard

### Logging

**Structure:**
```json
{
  "timestamp": "2026-03-08T12:34:56Z",
  "function": "send-reminder-emails",
  "reminderId": "reminder-123",
  "status": "sent|failed",
  "provider": "resend",
  "responseTime": 1234,
  "errorCode": null,
  "errorMessage": null,
  "emailId": "email-resend-id"
}
```

**Platforms:**
- Supabase: Function logs visible in dashboard
- Vercel: Build logs + Runtime logs
- Optional: Integrate with Sentry for error tracking

---

## Known Limitations & Future Work

### Current Limitations

1. **Single Timezone:**
   - Currently sends all reminders in UTC
   - Future: Per-user timezone support

2. **Rate Limiting:**
   - Hardcoded 100 emails/hour limit
   - Future: Make configurable, use Redis for distributed rate limiting

3. **Email Frequency:**
   - Only supports immediate sending
   - Future: Daily summary digest option

4. **A/B Testing:**
   - No support for testing email variations
   - Future: Add subject line A/B testing

### Future Enhancements

- [ ] SMS reminders via Twilio
- [ ] WhatsApp integration via Twilio
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Email preference center (advanced customization)
- [ ] Delivery tracking (open rates, click tracking)
- [ ] Template builder UI (admin panel)

---

## Support & Troubleshooting

### Common Issues

**Issue: "Email not sending" (reminder_logs shows 'failed')**
- Check RESEND_API_KEY is valid
- Check recipient email format
- Check daily Resend API quota (usually 100/day on free tier)

**Issue: "Cron job not running"**
- Verify CRON_SECRET is correct
- Check cron endpoint is accessible (not behind auth)
- Check Vercel logs for execution errors
- Verify scheduled_date is correctly set in database

**Issue: "Duplicate emails sent"**
- Check reminder_logs unique index is properly set
- Verify reminder_logs entries are created before Resend call
- Check email address isn't in multiple notification_settings records

**Issue: "Edge Function timeout"**
- Check batch size (should be max 50 emails)
- Monitor Supabase function execution time
- Split into smaller batches if needed

### Support Contacts

- **Resend Support:** support@resend.com
- **Supabase Support:** support@supabase.io  
- **Internal:** DevOps team (for Vercel/monitoring issues)

---

## Quick Start: Deploy Phase B

### For Backend Engineer

1. **Create Edge Function:**
   ```bash
   supabase functions new send-reminder-emails
   # Copy implementation from this document
   ```

2. **Create Email Templates:**
   ```bash
   # Create utils/email/templates.ts
   # Export: buildBirthdayEmail, buildDeathAnniversaryEmail, etc.
   ```

3. **Update Cron Route:**
   ```bash
   # Enhance app/api/cron/reminders/route.ts
   # Call new Edge Function instead of direct Supabase queries
   ```

4. **Test Locally:**
   ```bash
   npm run dev
   # POST http://localhost:3000/api/email/test
   # GET http://localhost:3000/api/cron/reminders?token=test-secret
   ```

5. **Deploy:**
   ```bash
   supabase functions deploy send-reminder-emails
   git push origin phase-b-email  # PR to main
   ```

### For DevOps Engineer

1. Set up Resend account (if not already done)
2. Add RESEND_API_KEY to production environment
3. Configure cron job (verify 3x daily schedule)
4. Set up error alerting (e.g., PagerDuty for failed sends)
5. Monitor first 24 hours after deployment

---

## Sign-off Checklist

- [ ] All code reviewed and approved
- [ ] Tests passing (unit + integration)
- [ ] Edge Function deployed to staging
- [ ] Resend API integration tested
- [ ] Email templates reviewed (Vietnamese, English, Chinese)
- [ ] Cron job tested in staging
- [ ] Notification settings UI working
- [ ] Documentation complete
- [ ] Deployment runbook created
- [ ] Team trained on operation

---

## References

- [Resend API Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Email Best Practices](https://www.litmus.com/best-practices)
- Previous: Phase A Documentation (API examples, deployment guide)
- Next: Phase C (Integration tests), Go7s Staging

