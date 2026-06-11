import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, listWatchlists } from "@/lib/db";
import { runWatchlist } from "@/lib/scan-runner";

/**
 * Scheduled scanner: runs every active watchlist. Triggered by Vercel Cron
 * (which sends Authorization: Bearer CRON_SECRET automatically).
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: false, error: "SIGNALDESK_DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const watchlists = (await listWatchlists()).filter((w) => w.is_active);
  const results = [];
  for (const watchlist of watchlists) {
    try {
      results.push(await runWatchlist(watchlist));
    } catch (error) {
      results.push({
        watchlistId: watchlist.id,
        watchlistName: watchlist.name,
        error: error instanceof Error ? error.message : "Run failed"
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    watchlists: results
  });
}
