import { NextRequest, NextResponse } from "next/server";
import { getWatchlist } from "@/lib/db";
import { runWatchlist } from "@/lib/scan-runner";

/**
 * Manual "run now" for a single watchlist. Throttled to once per 3 minutes
 * per watchlist to bound API/AI spend from repeated triggers.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const THROTTLE_MS = 3 * 60 * 1000;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const watchlist = await getWatchlist(id);
    if (!watchlist) {
      return NextResponse.json({ ok: false, error: "Watchlist not found." }, { status: 404 });
    }

    if (
      watchlist.last_scanned_at &&
      Date.now() - new Date(watchlist.last_scanned_at).getTime() < THROTTLE_MS
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "This watchlist was scanned moments ago. Try again in a few minutes."
        },
        { status: 429 }
      );
    }

    const result = await runWatchlist(watchlist);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
