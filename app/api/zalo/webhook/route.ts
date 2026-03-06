// Zalo OA webhook signature verification using HMAC-SHA256.
// Set ZALO_OA_SECRET env var (your OA App Secret from Zalo Developer Console).
// If not set, signature verification is skipped (dev/migration mode).
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendZaloGroupMessage } from "@/utils/bot/zalo";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface ZaloEvent {
  event_name: string;
  app_id?: string;
  user_id_by_app?: string;
  /** For message events */
  message?: {
    text?: string;
    msg_id?: string;
  };
  sender?: {
    id: string;
  };
  recipient?: {
    id: string;
  };
  timestamp?: number;
}

/** Verify Zalo OA webhook signature (HMAC-SHA256 over raw body). */
async function verifyZaloSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.ZALO_OA_SECRET;
  if (!secret) return true; // Skip if secret not configured (backward compat)

  const signature = req.headers.get("x-zalo-signature");
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  // Constant-time comparison to prevent timing attacks
  return signature === expected;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!await verifyZaloSignature(req, rawBody)) {
      console.warn("[Zalo webhook] Invalid signature — request rejected");
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as ZaloEvent;
    const senderId = event.sender?.id;

    if (!senderId) return NextResponse.json({ ok: true });

    const supabase = getServiceSupabase();

    // Find active Zalo bot by OA ID (app_id matches zalo_oa_id)
    const { data: bot } = await supabase
      .from("branch_bots")
      .select("*")
      .eq("platform", "zalo")
      .eq("is_active", true)
      .maybeSingle();

    if (!bot?.bot_token) return NextResponse.json({ ok: true });

    // Handle follow event
    if (event.event_name === "follow") {
      await sendZaloGroupMessage(
        bot.bot_token,
        senderId,
        "🏡 Chào mừng bạn đã quan tâm Gia Phả Bot!\n\n" +
          "Tôi có thể giúp bạn:\n" +
          "• /lichgio — Lịch giỗ sắp tới\n" +
          "• /sukien — Sự kiện họ tộc\n" +
          "• /giapha [tên] — Tìm thành viên\n\n" +
          "Hoặc đặt câu hỏi tự do về dòng họ!",
      );
      return NextResponse.json({ ok: true });
    }

    // Handle text message
    const text = event.message?.text?.trim();
    if (!text) return NextResponse.json({ ok: true });

    if (text.startsWith("/start") || text.startsWith("/help")) {
      await sendZaloGroupMessage(
        bot.bot_token,
        senderId,
        "🏡 Gia Phả Bot\n\n" +
          "Lệnh có sẵn:\n" +
          "/lichgio — Danh sách giỗ sắp tới\n" +
          "/sukien — Sự kiện họ tộc sắp tới\n" +
          "/giapha [tên] — Tìm thành viên\n\n" +
          "Hoặc đặt câu hỏi tự do về dòng họ!",
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/lichgio")) {
      const today = new Date();
      const next30 = new Date(today);
      next30.setDate(next30.getDate() + 30);

      const { data: persons } = await supabase
        .from("persons")
        .select("full_name, death_month, death_day, death_year")
        .not("death_year", "is", null)
        .not("death_month", "is", null)
        .not("death_day", "is", null);

      if (!persons || persons.length === 0) {
        await sendZaloGroupMessage(bot.bot_token, senderId, "📅 Không có lịch giỗ trong 30 ngày tới.");
        return NextResponse.json({ ok: true });
      }

      const year = today.getFullYear();
      const upcoming = persons
        .map((p) => {
          const d = new Date(year, (p.death_month as number) - 1, p.death_day as number);
          if (d < today) d.setFullYear(year + 1);
          return { name: p.full_name, date: d, deathYear: p.death_year };
        })
        .filter((p) => p.date <= next30)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 10);

      if (upcoming.length === 0) {
        await sendZaloGroupMessage(bot.bot_token, senderId, "📅 Không có lịch giỗ trong 30 ngày tới.");
      } else {
        const lines = upcoming.map((p) => {
          const diff = Math.round((p.date.getTime() - today.getTime()) / 86400000);
          const dateStr = `${p.date.getDate()}/${p.date.getMonth() + 1}`;
          return `• ${p.name} — ${dateStr} (còn ${diff} ngày, giỗ năm thứ ${year - (p.deathYear as number)})`;
        });
        await sendZaloGroupMessage(
          bot.bot_token,
          senderId,
          `🕯️ Lịch giỗ 30 ngày tới:\n\n${lines.join("\n")}`,
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/sukien")) {
      const { data: events } = await supabase
        .from("family_events")
        .select("title, event_date, event_type, location")
        .gte("event_date", new Date().toISOString().split("T")[0])
        .order("event_date")
        .limit(5);

      if (!events || events.length === 0) {
        await sendZaloGroupMessage(bot.bot_token, senderId, "📅 Không có sự kiện họ tộc sắp tới.");
      } else {
        const lines = events.map(
          (e) => `• ${e.title} — ${e.event_date}${e.location ? ` | ${e.location}` : ""}`,
        );
        await sendZaloGroupMessage(
          bot.bot_token,
          senderId,
          `📋 Sự kiện sắp tới:\n\n${lines.join("\n")}`,
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/giapha ")) {
      const query = text.replace("/giapha ", "").trim();
      const { data: found } = await supabase
        .from("persons")
        .select("full_name, birth_year, death_year, generation")
        .ilike("full_name", `%${query}%`)
        .limit(5);

      if (!found || found.length === 0) {
        await sendZaloGroupMessage(
          bot.bot_token,
          senderId,
          `🔍 Không tìm thấy thành viên tên "${query}"`,
        );
      } else {
        const lines = found.map((p) => {
          const status = p.death_year ? `†${p.death_year}` : "còn sống";
          return `• ${p.full_name} — Sinh: ${p.birth_year ?? "?"} (${status}) — Thế hệ: ${p.generation ?? "?"}`;
        });
        await sendZaloGroupMessage(
          bot.bot_token,
          senderId,
          `🔍 Kết quả tìm kiếm "${query}":\n\n${lines.join("\n")}`,
        );
      }
      return NextResponse.json({ ok: true });
    }

    // AI chat
    if (bot.ai_enabled) {
      const { handleAIChat } = await import("@/utils/bot/aiClient");
      // Build a minimal TelegramMessage-compatible object for the shared AI handler
      await handleAIChat(
        { ...bot },
        senderId,
        {
          message_id: 0,
          chat: { id: Number(senderId) || 0, type: "private" },
          from: { id: Number(senderId) || 0, first_name: senderId },
          text,
          date: Math.floor(Date.now() / 1000),
        },
        supabase,
      );
    } else {
      await sendZaloGroupMessage(
        bot.bot_token,
        senderId,
        "💬 Trả lời AI chưa được bật cho bot này. Admin vui lòng cấu hình AI trong phần cài đặt bot.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Zalo webhook error:", e);
    return NextResponse.json({ ok: true }); // Always return 200 to Zalo
  }
}

/** Zalo OA verification endpoint (GET) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("challenge");
  if (challenge) return new Response(challenge, { status: 200 });
  return NextResponse.json({ ok: true });
}
