import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/api";
import { verifyAuth } from "@/utils/api/auth";

/**
 * POST /api/v1/notifications/tokens
 * Register a push notification token
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = authResult.userId!;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { token, platform, device_name, device_os_version } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token required", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }

    if (!platform || !["ios", "android", "web"].includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform required", code: "INVALID_PLATFORM" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("notification_tokens")
      .upsert([
        {
          user_id: userId,
          token,
          platform,
          device_name: device_name || null,
          device_os_version: device_os_version || null,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
      ], { onConflict: "token" })
      .select("id, token, platform, created_at")
      .single();

    if (error) {
      console.error("Token registration error:", error);
      return NextResponse.json(
        { error: "Failed to register token", code: "REGISTRATION_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: data.id,
        token: data.token,
        platform: data.platform,
        created_at: data.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Token endpoint error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/notifications/tokens
 * List all notification tokens
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = authResult.userId!;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("notification_tokens")
      .select("id, token, platform, device_name, is_active, last_used_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Token list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tokens", code: "FETCH_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        tokens: data || [],
        count: data?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/notifications/tokens?token=<token>
 * Unregister a token
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = authResult.userId!;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token parameter required", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("notification_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);

    if (error) {
      console.error("Token deletion error:", error);
      return NextResponse.json(
        { error: "Failed to delete token", code: "DELETION_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Token deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
