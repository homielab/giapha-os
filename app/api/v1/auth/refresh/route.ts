import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/api";

/**
 * POST /api/v1/auth/refresh
 * Refresh expired access token
 */

export async function POST(request: NextRequest) {
  try {
    let body: { refresh_token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { refresh_token } = body;
    if (!refresh_token) {
      return NextResponse.json(
        { error: "Refresh token required", code: "MISSING_TOKEN" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Token refresh failed", code: "REFRESH_FAILED" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: 3600,
        token_type: "Bearer",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
