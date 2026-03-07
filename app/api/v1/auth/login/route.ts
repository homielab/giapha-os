import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/api";
import * as crypto from "crypto";

/**
 * POST /api/v1/auth/login
 * Mobile authentication endpoint
 * 
 * Request:
 *   { email: string, password: string }
 * 
 * Response on success:
 *   {
 *     access_token: string,
 *     refresh_token: string,
 *     expires_in: 3600,
 *     token_type: "Bearer",
 *     user_id: string,
 *     user_role: "admin" | "editor" | "member"
 *   }
 * 
 * Response on error:
 *   { error: string, code: string }
 */

// Rate limiting: store IPs and attempt counts (in-memory for demo)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxAttempts: number = 3, windowMs: number = 5 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= maxAttempts) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      };
    }
    record.count++;
  } else {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";

    // Check rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfter?.toString() || "300",
          },
        }
      );
    }

    // Parse request body
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validate input
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        {
          error: "Invalid email format",
          code: "INVALID_EMAIL",
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          error: "Invalid password (minimum 8 characters)",
          code: "INVALID_PASSWORD",
        },
        { status: 400 }
      );
    }

    // Get service role client for admin operations
    const supabase = createServiceRoleClient();

    // Authenticate user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: "Invalid email or password",
          code: "AUTH_FAILED",
        },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Fetch user profile with role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_role, full_name, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "User profile not found",
          code: "PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const userRole = profile.user_role || "member";

    // Generate JWT token with user info
    // For production, this should use a proper JWT library (jsonwebtoken)
    // For now, we'll use Supabase's existing session
    const accessToken = authData.session?.access_token;
    const refreshToken = authData.session?.refresh_token;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          error: "Failed to generate authentication tokens",
          code: "TOKEN_GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    // Store refresh token in refresh_tokens table for rotation tracking
    const { error: tokenError } = await supabase.from("refresh_tokens").insert([
      {
        user_id: userId,
        token_hash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || "unknown",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    ]);

    if (tokenError) {
      console.error("Failed to store refresh token:", tokenError);
    }

    // Return token response
    return NextResponse.json(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: "Bearer",
        user_id: userId,
        user_role: userRole,
        user_email: profile.email,
        user_name: profile.full_name,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Login endpoint error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
