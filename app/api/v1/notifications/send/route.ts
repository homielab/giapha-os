import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/api";

/**
 * POST /api/v1/notifications/send
 * Internal endpoint to send push notifications to all tokens for a user
 * Called from cron jobs and event handlers (CRON_SECRET auth)
 * 
 * Request:
 *   {
 *     user_id: string,
 *     notification_type: string,
 *     title: string,
 *     body: string,
 *     data?: { [key: string]: string }
 *   }
 */

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronToken = request.headers.get("x-cron-secret");
    if (cronToken !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { user_id, notification_type, title, body: notificationBody, data } = body;

    if (!user_id || !notification_type || !title) {
      return NextResponse.json(
        { error: "Missing required fields", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch all active tokens for user
    const { data: tokens, error: tokenError } = await supabase
      .from("notification_tokens")
      .select("id, token, platform")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (tokenError) {
      console.error("Failed to fetch tokens:", tokenError);
      return NextResponse.json(
        { error: "Failed to fetch tokens", code: "FETCH_ERROR" },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      // No tokens registered, log and return
      try {
        await supabase
          .from("notification_logs")
          .insert([
            {
              user_id,
              notification_type,
              title,
              body: notificationBody,
              failed_at: new Date().toISOString(),
              error_message: "No active tokens registered",
            },
          ]);
      } catch (err) {
        console.error("Failed to log notification:", err);
      }

      return NextResponse.json(
        { sent: 0, failed: 0, skipped: 1 },
        { status: 200 }
      );
    }

    let sent = 0;
    let failed = 0;

    // Send to each token (in production, batch with Expo/Firebase)
    for (const tokenRecord of tokens) {
      try {
        // Here you would integrate with Expo Notifications or Firebase
        // For now, we'll just log the intent
        await supabase
          .from("notification_logs")
          .insert([
            {
              user_id,
              notification_token_id: tokenRecord.id,
              notification_type,
              title,
              body: notificationBody,
              sent_at: new Date().toISOString(),
            },
          ]);

        // Update token's last_used_at
        try {
          await supabase
            .from("notification_tokens")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", tokenRecord.id);
        } catch (err) {
          console.error("Failed to update token:", err);
        }

        sent++;
      } catch (error) {
        console.error(`Failed to send to token ${tokenRecord.token}:`, error);
        failed++;

        try {
          await supabase
            .from("notification_logs")
            .insert([
              {
                user_id,
                notification_token_id: tokenRecord.id,
                notification_type,
                title,
                body: notificationBody,
                failed_at: new Date().toISOString(),
                error_message: String(error),
              },
            ]);
        } catch (logError) {
          console.error("Failed to log error:", logError);
        }
      }
    }

    return NextResponse.json(
      {
        sent,
        failed,
        total: tokens.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send notifications error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
