/**
 * Email Notification Cron Endpoint
 *
 * This route queries upcoming birthdays and death anniversaries and sends
 * reminder emails via the Resend API. It is protected by a secret token.
 *
 * ─── Setup ───────────────────────────────────────────────────────────────────
 *
 * Required environment variables:
 *   CRON_SECRET          — A random secret string to protect this endpoint
 *   RESEND_API_KEY       — Your Resend.com API key (https://resend.com)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key to bypass RLS
 *
 * ─── Vercel Cron (vercel.json) ───────────────────────────────────────────────
 * {
 *   "crons": [{
 *     "path": "/api/notifications/send?token=YOUR_CRON_SECRET",
 *     "schedule": "0 7 * * *"
 *   }]
 * }
 *
 * ─── Manual / External Cron ──────────────────────────────────────────────────
 * curl "https://your-domain.com/api/notifications/send?token=YOUR_CRON_SECRET"
 */

import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/utils/supabase/api";
import { NextRequest, NextResponse } from "next/server";
import { Lunar, Solar } from "lunar-javascript";

interface PersonRow {
  id: string;
  full_name: string;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_year: number | null;
  is_deceased: boolean;
}

interface UpcomingEvent {
  personId: string;
  personName: string;
  eventType: "birthday" | "death_anniversary";
  scheduledDate: Date;
  daysUntil: number;
  label: string;
}

interface NotificationSettingsRow {
  enabled: boolean;
  days_before: number[];
  email_recipients: string[];
}

function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  for (let offset = 0; offset <= 2; offset++) {
    try {
      const l = LunarClass.fromYmd(currentLunarYear + offset, lunarMonth, lunarDay);
      const s = l.getSolar();
      const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      if (candidate >= fromDate) return candidate;
    } catch {
      // lunar date doesn't exist in this year; try next
    }
  }
  return null;
}

function computeUpcomingEvents(
  persons: PersonRow[],
  maxDaysAhead: number,
): UpcomingEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: UpcomingEvent[] = [];

  for (const p of persons) {
    // Birthday (solar)
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear();
      let next = new Date(thisYear, p.birth_month - 1, p.birth_day);
      if (next < today) next = new Date(thisYear + 1, p.birth_month - 1, p.birth_day);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
      if (daysUntil <= maxDaysAhead) {
        const dd = String(p.birth_day).padStart(2, "0");
        const mm = String(p.birth_month).padStart(2, "0");
        events.push({
          personId: p.id,
          personName: p.full_name,
          eventType: "birthday",
          scheduledDate: next,
          daysUntil,
          label: `${dd}/${mm}`,
        });
      }
    }

    // Death anniversary (lunar → solar)
    if (p.is_deceased && p.death_month && p.death_day) {
      try {
        const deathYear = p.death_year ?? today.getFullYear();
        const solar = Solar.fromYmd(deathYear, p.death_month, p.death_day);
        const lunar = solar.getLunar();
        const lMonth = Math.abs(lunar.getMonth());
        const lDay = lunar.getDay();
        const next = nextSolarForLunar(lMonth, lDay, today);
        if (!next) continue;
        const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
        if (daysUntil <= maxDaysAhead) {
          const dd = String(lDay).padStart(2, "0");
          const mm = String(lMonth).padStart(2, "0");
          events.push({
            personId: p.id,
            personName: p.full_name,
            eventType: "death_anniversary",
            scheduledDate: next,
            daysUntil,
            label: `${dd}/${mm} ÂL`,
          });
        }
      } catch {
        // Skip if conversion fails
      }
    }
  }

  return events;
}

function buildEmailHtml(events: UpcomingEvent[]): string {
  const rows = events
    .map((ev) => {
      const icon = ev.eventType === "birthday" ? "🎂" : "🕯️";
      const typeLabel = ev.eventType === "birthday" ? "Sinh nhật" : "Ngày giỗ";
      const when =
        ev.daysUntil === 0
          ? "Hôm nay"
          : ev.daysUntil === 1
            ? "Ngày mai"
            : `${ev.daysUntil} ngày nữa`;
      return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #f5f5f4; font-size: 20px; width: 36px;">${icon}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #f5f5f4;">
          <strong style="color: #1c1917;">${ev.personName}</strong>
          <span style="color: #78716c; font-size: 13px; margin-left: 6px;">${typeLabel} — ${ev.label}</span>
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #f5f5f4; white-space: nowrap; font-size: 13px; color: #f59e0b; font-weight: 600;">
          ${when}
        </td>
      </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:0; background:#fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#ffffff; border-radius:16px; border:1px solid #e7e5e4; overflow:hidden;">
    <div style="background:#78350f; padding:24px 28px;">
      <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">
        🔔 Sự kiện gia đình sắp tới
      </h1>
      <p style="margin:4px 0 0; color:#fde68a; font-size:13px;">
        Nhắc nhở từ hệ thống Gia Phả OS
      </p>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%; border-collapse:collapse;">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    <div style="padding:16px 28px; background:#fafaf9; border-top:1px solid #e7e5e4;">
      <p style="margin:0; color:#a8a29e; font-size:12px;">
        Email này được gửi tự động bởi Gia Phả OS. Truy cập hệ thống để xem thêm chi tiết.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const token = request.nextUrl.searchParams.get("token");

  if (!cronSecret || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secretBuf = Buffer.from(cronSecret);
  const tokenBuf = Buffer.from(token);
  const valid =
    secretBuf.length === tokenBuf.length &&
    timingSafeEqual(secretBuf, tokenBuf);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const supabase = createServiceRoleClient();

    // ── Load notification settings ──────────────────────────────────────────
    const { data: settingsRow } = await supabase
      .from("notification_settings")
      .select("enabled, days_before, email_recipients")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const settings = settingsRow as NotificationSettingsRow | null;

    if (!settings?.enabled) {
      return NextResponse.json({ message: "Notifications disabled" });
    }

    const { days_before, email_recipients } = settings;
    if (!email_recipients || email_recipients.length === 0) {
      return NextResponse.json({ message: "No recipients configured" });
    }

    const maxDaysAhead = Math.max(...days_before);

    // ── Load persons ────────────────────────────────────────────────────────
    const { data: persons, error: personsError } = await supabase
      .from("persons")
      .select(
        "id, full_name, birth_month, birth_day, birth_year, death_month, death_day, death_year, is_deceased",
      );

    if (personsError) throw new Error(personsError.message);

    const allEvents = computeUpcomingEvents(
      (persons ?? []) as PersonRow[],
      maxDaysAhead,
    );

    // Filter by configured days_before thresholds
    const filteredEvents = allEvents.filter((ev) =>
      days_before.includes(ev.daysUntil),
    );

    if (filteredEvents.length === 0) {
      return NextResponse.json({ message: "No upcoming events to notify" });
    }

    // ── Deduplicate via notification_log ────────────────────────────────────
    const today = toISODate(new Date());
    const { data: existingLogs } = await supabase
      .from("notification_log")
      .select("person_id, event_type, scheduled_date")
      .eq("sent_at::date", today);

    const sentKeys = new Set(
      (existingLogs ?? []).map(
        (l: { person_id: string; event_type: string; scheduled_date: string }) =>
          `${l.person_id}:${l.event_type}:${l.scheduled_date}`,
      ),
    );

    const newEvents = filteredEvents.filter(
      (ev) =>
        !sentKeys.has(
          `${ev.personId}:${ev.eventType}:${toISODate(ev.scheduledDate)}`,
        ),
    );

    if (newEvents.length === 0) {
      return NextResponse.json({
        message: "All notifications already sent today",
      });
    }

    // ── Send email ──────────────────────────────────────────────────────────
    const html = buildEmailHtml(newEvents);
    const subjectCount = newEvents.length;
    const subject = `🔔 ${subjectCount} sự kiện gia đình sắp tới`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gia Phả OS <onboarding@resend.dev>",
        to: email_recipients,
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const body = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} ${body}`);
    }

    // ── Log sent notifications ──────────────────────────────────────────────
    await supabase.from("notification_log").insert(
      newEvents.map((ev) => ({
        person_id: ev.personId,
        event_type: ev.eventType,
        scheduled_date: toISODate(ev.scheduledDate),
      })),
    );

    return NextResponse.json({
      message: "Notifications sent",
      count: newEvents.length,
      recipients: email_recipients.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
