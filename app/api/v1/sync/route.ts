import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/api";
import { verifyAuth } from "@/utils/api/auth";

/**
 * GET /api/v1/sync?since=timestamp&branch_id=uuid
 * Incremental sync endpoint for mobile clients
 * 
 * Returns changed data since the provided timestamp
 * Uses last-write-wins conflict resolution (based on updated_at)
 * 
 * Query Parameters:
 *   - since: ISO 8601 timestamp (optional, defaults to 24 hours ago)
 *   - branch_id: UUID (optional, filters to specific branch)
 * 
 * Response:
 *   {
 *     timestamp: ISO 8601,
 *     persons: [...],
 *     relationships: [...],
 *     custom_events: [...],
 *     changes: { persons: 5, relationships: 2, events: 1 }
 *   }
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = authResult.userId!;
    const userRole = authResult.userRole!;

    // Parse query parameters
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");
    const branchIdParam = url.searchParams.get("branch_id");

    // Default to 24 hours ago if not specified
    const since = sinceParam 
      ? new Date(sinceParam) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "Invalid timestamp format", code: "INVALID_TIMESTAMP" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch changed persons since timestamp
    let personsQuery = supabase
      .from("persons")
      .select("*")
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false });

    if (branchIdParam) {
      personsQuery = personsQuery.eq("branch_id", branchIdParam);
    }

    const { data: persons, error: personsError } = await personsQuery;

    if (personsError) {
      console.error("Persons sync error:", personsError);
      return NextResponse.json(
        { error: "Failed to fetch persons", code: "SYNC_ERROR" },
        { status: 500 }
      );
    }

    // Fetch changed relationships since timestamp
    let relationshipsQuery = supabase
      .from("relationships")
      .select("*")
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false });

    if (branchIdParam) {
      relationshipsQuery = relationshipsQuery.eq("branch_id", branchIdParam);
    }

    const { data: relationships, error: relationshipsError } = await relationshipsQuery;

    if (relationshipsError) {
      console.error("Relationships sync error:", relationshipsError);
      return NextResponse.json(
        { error: "Failed to fetch relationships", code: "SYNC_ERROR" },
        { status: 500 }
      );
    }

    // Fetch changed custom events since timestamp
    let eventsQuery = supabase
      .from("custom_events")
      .select("*")
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false });

    if (branchIdParam) {
      eventsQuery = eventsQuery.eq("branch_id", branchIdParam);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error("Events sync error:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events", code: "SYNC_ERROR" },
        { status: 500 }
      );
    }

    // Log sync operation for audit
    try {
      await supabase.from("sync_logs").insert([
        {
          user_id: userId,
          since_timestamp: since.toISOString(),
          rows_synced: (persons?.length || 0) + (relationships?.length || 0) + (events?.length || 0),
          branch_id: branchIdParam || null,
        },
      ]);
    } catch (logError) {
      console.error("Failed to log sync:", logError);
    }

    const now = new Date();
    return NextResponse.json(
      {
        timestamp: now.toISOString(),
        persons: persons || [],
        relationships: relationships || [],
        custom_events: events || [],
        changes: {
          persons: persons?.length || 0,
          relationships: relationships?.length || 0,
          events: events?.length || 0,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Sync endpoint error:", error);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
