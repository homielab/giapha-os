# Supabase Edge Function: send-reminder-emails

This document provides the complete code for deploying the `send-reminder-emails` Edge Function to Supabase.

## Deployment Steps

### 1. Create the Function via Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref [your-project-ref]

# Create the function
supabase functions new send-reminder-emails
```

### 2. Replace the Function Code

Copy the entire code from `send-reminder-emails-code.ts` (below) into:
```
supabase/functions/send-reminder-emails/index.ts
```

### 3. Deploy to Supabase

```bash
supabase functions deploy send-reminder-emails
```

### 4. Set Environment Variables

In Supabase console (Settings → Secrets):
```
RESEND_API_KEY=re_your_actual_api_key_here
```

### 5. Test the Deployment

```bash
curl -X POST https://[your-project-id].functions.supabase.co/send-reminder-emails \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "reminders": [
      {
        "personId": "person-123",
        "userId": "user-456",
        "userEmail": "user@example.com",
        "type": "birthday",
        "dateLabel": "15/03",
        "lunarMonth": 2,
        "lunarDay": 10,
        "daysUntil": 3,
        "personName": "Nguyễn Văn A",
        "familyName": "Gia Đình Nguyễn",
        "dashboardUrl": "https://giapha.app",
        "language": "vi"
      }
    ]
  }'
```

Expected response:
```json
{
  "processed": 1,
  "sent": 1,
  "failed": 0,
  "results": [
    {
      "personId": "person-123",
      "userId": "user-456",
      "status": "sent",
      "emailId": "email-resend-id"
    }
  ]
}
```

---

## Edge Function Source Code

**File:** `supabase/functions/send-reminder-emails/index.ts`

```typescript
/**
 * Supabase Edge Function: send-reminder-emails
 * 
 * Processes reminder payloads and sends via Resend API.
 * Called by the cron job (app/api/cron/reminders/route.ts)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables");
}

// Initialize Supabase client for logging
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// EMAIL TEMPLATE BUILDERS (Inlined to avoid dependencies)
// ============================================================================

const translations = {
  vi: {
    birthday: "Sinh nhật",
    death_anniversary: "Ngày giỗ",
    custom_event: "Sự kiện",
    today: "Hôm nay",
    tomorrow: "Ngày mai",
    daysFromNow: (n: number) => `${n} ngày nữa`,
    time: "Thời gian",
    viewFamily: "Xem gia phả →",
    emailFrom: "Email tự động từ hệ thống Gia Phả",
    unsubscribeLink: "cài đặt",
    toDisable: "để tắt thông báo",
    lunarDate: "Âm lịch",
  },
  en: {
    birthday: "Birthday",
    death_anniversary: "Death Anniversary",
    custom_event: "Event",
    today: "Today",
    tomorrow: "Tomorrow",
    daysFromNow: (n: number) => `in ${n} days`,
    time: "Time",
    viewFamily: "View family tree →",
    emailFrom: "Automated email from Gia Phả system",
    unsubscribeLink: "settings",
    toDisable: "to disable notifications",
    lunarDate: "Lunar Date",
  },
  zh: {
    birthday: "生日",
    death_anniversary: "忌日",
    custom_event: "事件",
    today: "今天",
    tomorrow: "明天",
    daysFromNow: (n: number) => `${n}天后`,
    time: "时间",
    viewFamily: "查看家族树 →",
    emailFrom: "来自Gia Phả系统的自动邮件",
    unsubscribeLink: "设置",
    toDisable: "以禁用通知",
    lunarDate: "农历",
  },
} as const;

function getEmoji(type: string): string {
  switch (type) {
    case "birthday":
      return "🎂";
    case "death_anniversary":
      return "🕯️";
    case "custom_event":
      return "📅";
    default:
      return "📬";
  }
}

function getTimeLabel(daysUntil: number, lang: string): string {
  const trans = translations[lang as keyof typeof translations] || translations.en;
  if (daysUntil === 0) return trans.today;
  if (daysUntil === 1) return trans.tomorrow;
  return trans.daysFromNow(daysUntil);
}

function formatLunarDate(month?: number, day?: number, lang?: string): string | null {
  if (month === undefined || day === undefined) return null;
  const trans = translations[lang as keyof typeof translations] || translations.en;
  if (lang === "zh") {
    return `${trans.lunarDate}：农历 ${month}月 ${day}日`;
  }
  return `${trans.lunarDate}: Ngày ${day} tháng ${month}`;
}

function buildReminderEmailHtml(params: {
  emoji: string;
  typeLabel: string;
  familyName: string;
  personName: string;
  dateLabel: string;
  lunarDateStr: string | null;
  timeLabel: string;
  dashboardUrl: string;
  headerColor: string;
  language: string;
  unsubscribeLink: string;
  toDisable: string;
  viewFamily: string;
  emailFrom: string;
}): string {
  return `<!DOCTYPE html>
<html lang="${params.language === "zh" ? "zh" : params.language === "en" ? "en" : "vi"}">
<head>
  <meta charset="UTF-8">
  <title>${params.typeLabel} - ${params.familyName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f6f0; padding: 24px; color: #3c2f1a; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: ${params.headerColor}; padding: 24px 32px;">
      <h1 style="margin: 0; color: #fff; font-size: 20px;">${params.emoji} ${params.typeLabel}</h1>
      <p style="margin: 4px 0 0; color: #fde68a; font-size: 13px;">${params.familyName}</p>
    </div>
    <div style="padding: 28px 32px;">
      <p style="font-size: 16px; font-weight: 600; margin: 0 0 16px; color: #3c2f1a;">${params.personName}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b5c3e;"><strong>${params.typeLabel}:</strong></td>
          <td style="padding: 8px 0; color: #6b5c3e; text-align: right;">${params.dateLabel}</td>
        </tr>
        ${params.lunarDateStr ? `<tr><td style="padding: 8px 0; color: #78716c;"><strong>${params.lunarDateStr}</strong></td><td></td></tr>` : ""}
        <tr>
          <td style="padding: 8px 0; color: #78716c;"><strong>${params.timeLabel}</strong></td>
          <td style="padding: 8px 0;"></td>
        </tr>
      </table>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.dashboardUrl}/dashboard" style="display: inline-block; background: ${params.headerColor}; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">${params.viewFamily}</a>
      </div>
    </div>
    <div style="padding: 16px 32px; background: #faf7f2; border-top: 1px solid #e7e0d4;">
      <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.6;">${params.emailFrom}. <a href="${params.dashboardUrl}/dashboard/settings" style="color: #b45309;">${params.unsubscribeLink}</a> ${params.toDisable}.</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// RESEND API HELPER
// ============================================================================

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gia Phả <noreply@giapha.app>",
        to: [to],
        subject,
        html,
      }),
    });

    const responseTime = Date.now() - startTime;

    const data = await response.json() as { id?: string; error?: { message: string } };

    if (!response.ok || data.error) {
      console.error(
        `[Resend] Failed to send email to ${to}: ${data.error?.message || response.status}`,
      );
      return { ok: false, error: data.error?.message ?? `HTTP ${response.status}` };
    }

    console.log(`[Resend] Email sent to ${to} in ${responseTime}ms (ID: ${data.id})`);
    return { ok: true, id: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Resend] Exception sending email to ${to}: ${errorMessage}`);
    return { ok: false, error: errorMessage };
  }
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

interface ReminderRequest {
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
  language: "vi" | "en" | "zh";
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as { reminders: ReminderRequest[] };

    if (!Array.isArray(payload.reminders)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: reminders must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    console.log(`[Edge Function] Processing ${payload.reminders.length} reminder emails`);

    for (const reminder of payload.reminders) {
      const trans = translations[reminder.language as keyof typeof translations] || translations.en;
      const emoji = getEmoji(reminder.type);
      const typeLabel = trans[reminder.type as keyof typeof trans[string]] || "Event";
      const headerColor =
        reminder.type === "birthday"
          ? "#b45309"
          : reminder.type === "death_anniversary"
            ? "#6b5c3e"
            : "#059669";

      const timeLabel = getTimeLabel(reminder.daysUntil, reminder.language);
      const lunarDateStr = formatLunarDate(reminder.lunarMonth, reminder.lunarDay, reminder.language);

      const html = buildReminderEmailHtml({
        emoji,
        typeLabel,
        familyName: reminder.familyName,
        personName: reminder.personName,
        dateLabel: reminder.dateLabel,
        lunarDateStr,
        timeLabel,
        dashboardUrl: reminder.dashboardUrl,
        headerColor,
        language: reminder.language,
        unsubscribeLink: trans.unsubscribeLink,
        toDisable: trans.toDisable,
        viewFamily: trans.viewFamily,
        emailFrom: trans.emailFrom,
      });

      const subject =
        reminder.language === "vi"
          ? `[Gia Phả] ${typeLabel} của ${reminder.personName}`
          : reminder.language === "en"
            ? `[Gia Phả] ${reminder.personName}'s ${typeLabel}`
            : `[Gia Phả] ${reminder.personName}的${typeLabel}`;

      const sendResult = await sendEmailViaResend(reminder.userEmail, subject, html);

      if (sendResult.ok) {
        sentCount++;
        results.push({
          personId: reminder.personId,
          userId: reminder.userId,
          status: "sent",
          emailId: sendResult.id,
        });

        try {
          await supabase.from("reminder_logs").insert({
            user_id: reminder.userId,
            reminder_type: reminder.type,
            subject_id: reminder.personId,
            days_before: reminder.daysUntil,
            scheduled_date: new Date().toISOString().split("T")[0],
            status: "sent",
            sent_at: new Date().toISOString(),
            email_id: sendResult.id,
          });
        } catch (logError) {
          console.error(`[Supabase] Failed to log reminder: ${logError}`);
        }
      } else {
        failedCount++;
        results.push({
          personId: reminder.personId,
          userId: reminder.userId,
          status: "failed",
          error: sendResult.error,
        });

        try {
          await supabase.from("reminder_logs").insert({
            user_id: reminder.userId,
            reminder_type: reminder.type,
            subject_id: reminder.personId,
            days_before: reminder.daysUntil,
            scheduled_date: new Date().toISOString().split("T")[0],
            status: "failed",
            error_message: sendResult.error || "Unknown error",
          });
        } catch (logError) {
          console.error(`[Supabase] Failed to log failed reminder: ${logError}`);
        }
      }
    }

    console.log(
      `[Edge Function] Complete: ${payload.reminders.length} processed, ${sentCount} sent, ${failedCount} failed`,
    );

    return new Response(
      JSON.stringify({
        processed: payload.reminders.length,
        sent: sentCount,
        failed: failedCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Edge Function] Fatal error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
```

---

## Monitoring & Logs

After deployment, monitor the function:

1. **Supabase Dashboard:**
   - Go to Functions → send-reminder-emails
   - View execution logs in real-time
   - Check invocations and response times

2. **Check Reminder Logs:**
   ```sql
   SELECT * FROM reminder_logs 
   WHERE created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Verify Email Delivery:**
   - Resend dashboard shows delivery status
   - Check email open rates and click tracking

---

## Troubleshooting

**Issue: "RESEND_API_KEY not found"**
- Verify the secret is set in Supabase Settings → Secrets
- Redeploy after setting the secret

**Issue: "Failed to log reminder"**
- Check database permissions for service role
- Verify reminder_logs table exists with correct schema

**Issue: "Email not sending"**
- Check Resend API quota (usually 100/day on free tier)
- Verify recipient email format
- Check logs for specific Resend API error messages

---

## Next Steps

1. Deploy this Edge Function to Supabase
2. Update `app/api/cron/reminders/route.ts` to call this function
3. Test with the curl command above
4. Monitor first 24 hours of production use

