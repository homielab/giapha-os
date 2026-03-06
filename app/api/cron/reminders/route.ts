import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/utils/bot/telegram";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev mode — no secret required
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

/** Vietnam time (UTC+7) */
function getVietnamDate(offsetDays = 0): Date {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  if (offsetDays) d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatDDMM(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface BranchBot {
  id: string;
  branch_id: string | null;
  platform: string;
  bot_token: string;
  chat_id: string;
  is_active: boolean;
}

interface Person {
  id: string;
  full_name: string;
  death_month: number | null;
  death_day: number | null;
  birth_month: number | null;
  birth_day: number | null;
  is_deceased: boolean;
}

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

async function hasReminderBeenSent(
  supabase: SupabaseClient,
  branchBotId: string,
  reminderType: string,
  subjectId: string,
  daysBefore: number,
  scheduledDate: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_logs")
    .select("id")
    .eq("branch_bot_id", branchBotId)
    .eq("reminder_type", reminderType)
    .eq("subject_id", subjectId)
    .eq("days_before", daysBefore)
    .eq("scheduled_date", scheduledDate)
    .maybeSingle();
  return !!data;
}

async function logReminder(
  supabase: SupabaseClient,
  branchBotId: string,
  reminderType: string,
  subjectId: string,
  daysBefore: number,
  scheduledDate: string,
  status: "sent" | "failed" = "sent",
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("reminder_logs") as any).insert({
    branch_bot_id: branchBotId,
    reminder_type: reminderType,
    subject_id: subjectId,
    days_before: daysBefore,
    scheduled_date: scheduledDate,
    platform: "telegram",
    status,
  });
}

async function processDeathAnniversaries(
  supabase: SupabaseClient,
  bot: BranchBot,
): Promise<void> {
  const { data: persons, error } = await supabase
    .from("persons")
    .select("id, full_name, death_month, death_day, birth_month, birth_day, is_deceased")
    .not("death_month", "is", null)
    .not("death_day", "is", null);

  if (error || !persons) return;

  // Check for each offset: 7, 3, 1, 0 days before
  const offsets: number[] = [7, 3, 1, 0];

  for (const person of persons as Person[]) {
    for (const offset of offsets) {
      const targetDate = getVietnamDate(offset);
      const targetMonth = targetDate.getUTCMonth() + 1;
      const targetDay = targetDate.getUTCDate();

      if (person.death_month !== targetMonth || person.death_day !== targetDay) {
        continue;
      }

      // The actual anniversary date is always "today" + offset days from now,
      // but we store the scheduled_date as the anniversary date itself.
      const anniversaryDate = formatDate(targetDate);
      const ddmm = formatDDMM(targetDate);

      const alreadySent = await hasReminderBeenSent(
        supabase,
        bot.id,
        "anniversary",
        person.id,
        offset,
        anniversaryDate,
      );
      if (alreadySent) continue;

      let message: string;
      if (offset === 7) {
        message = `🕯️ Nhắc nhở: Giỗ cụ/ông/bà <b>${person.full_name}</b> vào ngày ${ddmm}, còn 7 ngày nữa.`;
      } else if (offset === 3) {
        message = `⏰ Sắp tới: Giỗ <b>${person.full_name}</b> — còn 3 ngày (ngày ${ddmm}). Xin chuẩn bị lễ vật.`;
      } else if (offset === 1) {
        message = `🙏 Ngày mai là ngày giỗ <b>${person.full_name}</b> (${ddmm}). Kính mời quý vị sắp xếp tham dự.`;
      } else {
        message = `🕯️ Hôm nay ngày giỗ <b>${person.full_name}</b> (${ddmm}). Kính mời toàn thể con cháu tưởng nhớ. 🙏`;
      }

      try {
        await sendTelegramMessage(bot.bot_token, bot.chat_id, message);
        await logReminder(supabase, bot.id, "anniversary", person.id, offset, anniversaryDate, "sent");
      } catch (sendErr) {
        console.error(`[reminders] Failed to send anniversary reminder for ${person.full_name}:`, sendErr);
        try { await logReminder(supabase, bot.id, "anniversary", person.id, offset, anniversaryDate, "failed"); } catch { /* ignore */ }
      }
    }
  }
}

async function processFamilyEvents(
  supabase: SupabaseClient,
  bot: BranchBot,
): Promise<void> {
  const today = getVietnamDate(0);
  const in3Days = getVietnamDate(3);

  const todayStr = formatDate(today);
  const in3DaysStr = formatDate(in3Days);

  const { data: events, error } = await supabase
    .from("family_events")
    .select("id, title, event_date, location")
    .in("event_date", [todayStr, in3DaysStr]);

  if (error || !events) return;

  for (const event of events as FamilyEvent[]) {
    const isToday = event.event_date === todayStr;
    const daysBefore = isToday ? 0 : 3;

    const alreadySent = await hasReminderBeenSent(
      supabase,
      bot.id,
      "event",
      event.id,
      daysBefore,
      event.event_date,
    );
    if (alreadySent) continue;

    let message: string;
    if (daysBefore === 3) {
      message = `📅 Nhắc nhở sự kiện: <b>${event.title}</b> sẽ diễn ra vào ngày ${event.event_date}. Còn 3 ngày nữa.`;
    } else {
      const locationPart = event.location ? ` tại ${event.location}` : "";
      message = `🎉 Hôm nay có sự kiện: <b>${event.title}</b>${locationPart}. Kính mời tham dự!`;
    }

    try {
      await sendTelegramMessage(bot.bot_token, bot.chat_id, message);
      await logReminder(supabase, bot.id, "event", event.id, daysBefore, event.event_date, "sent");
    } catch (sendErr) {
      console.error(`[reminders] Failed to send event reminder for ${event.title}:`, sendErr);
      try { await logReminder(supabase, bot.id, "event", event.id, daysBefore, event.event_date, "failed"); } catch { /* ignore */ }
    }
  }
}

async function processBirthdays(
  supabase: SupabaseClient,
  bot: BranchBot,
): Promise<void> {
  const today = getVietnamDate(0);
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  const todayStr = formatDate(today);

  const { data: persons, error } = await supabase
    .from("persons")
    .select("id, full_name, birth_month, birth_day, is_deceased")
    .eq("is_deceased", false)
    .not("birth_month", "is", null)
    .not("birth_day", "is", null);

  if (error || !persons) return;

  for (const person of persons as Person[]) {
    if (person.birth_month !== todayMonth || person.birth_day !== todayDay) {
      continue;
    }

    const alreadySent = await hasReminderBeenSent(
      supabase,
      bot.id,
      "birthday",
      person.id,
      0,
      todayStr,
    );
    if (alreadySent) continue;

    const message = `🎂 Chúc mừng sinh nhật <b>${person.full_name}</b>! Chúc sức khỏe và hạnh phúc! 🎉`;
    try {
      await sendTelegramMessage(bot.bot_token, bot.chat_id, message);
      await logReminder(supabase, bot.id, "birthday", person.id, 0, todayStr, "sent");
    } catch (sendErr) {
      console.error(`[reminders] Failed to send birthday reminder for ${person.full_name}:`, sendErr);
      try { await logReminder(supabase, bot.id, "birthday", person.id, 0, todayStr, "failed"); } catch { /* ignore */ }
    }
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  const { data: bots, error } = await supabase
    .from("branch_bots")
    .select("id, branch_id, platform, bot_token, chat_id, is_active")
    .eq("is_active", true)
    .not("chat_id", "is", null)
    .not("bot_token", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bots || bots.length === 0) {
    return NextResponse.json({ message: "No active bots found" });
  }

  let processed = 0;

  for (const bot of bots as BranchBot[]) {
    await processDeathAnniversaries(supabase, bot);
    await processFamilyEvents(supabase, bot);
    await processBirthdays(supabase, bot);
    processed++;
  }

  return NextResponse.json({ message: "Reminders processed", bots: processed });
}
