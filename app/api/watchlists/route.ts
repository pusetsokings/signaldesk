import { NextRequest, NextResponse } from "next/server";
import { createWatchlist, dbConfigured, listWatchlists } from "@/lib/db";
import { supportedPlatforms } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, watchlists: [], error: "Storage not configured." });
  }
  try {
    const watchlists = await listWatchlists();
    return NextResponse.json({ ok: true, watchlists });
  } catch (error) {
    return NextResponse.json(
      { ok: false, watchlists: [], error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Storage not configured." },
      { status: 503 }
    );
  }

  let body: {
    name?: string;
    offerName?: string;
    query?: string;
    signalTerms?: string;
    platforms?: string[];
    minIntentScore?: number;
    crmWorkspaceId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const offerName = body.offerName?.trim();
  const query = body.query?.trim();
  if (!name || !offerName || !query) {
    return NextResponse.json(
      { ok: false, error: "name, offerName, and query are required." },
      { status: 400 }
    );
  }

  const valid = new Set(supportedPlatforms());
  const platforms = (body.platforms || ["hackernews", "bluesky", "mastodon"]).filter(
    (platform) => valid.has(platform)
  );
  if (platforms.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one supported platform is required." },
      { status: 400 }
    );
  }

  try {
    const watchlist = await createWatchlist({
      name,
      offerName,
      query,
      signalTerms: body.signalTerms?.trim() || "",
      platforms,
      minIntentScore: Math.max(0, Math.min(100, Number(body.minIntentScore) || 70)),
      crmWorkspaceId: body.crmWorkspaceId?.trim() || null
    });
    return NextResponse.json({ ok: true, watchlist });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
