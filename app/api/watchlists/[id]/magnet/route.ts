import { NextRequest, NextResponse } from "next/server";
import { getWatchlist, updateWatchlist } from "@/lib/db";

/**
 * Generates a tracked CRM capture link (lead magnet) for a watchlist via
 * the CRM's signaldesk magnet endpoint, then stores it on the watchlist.
 * Clicks and form submissions on the link are attributed in the CRM.
 */

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const webhookUrl = process.env.BRANDLYTICS_CRM_WEBHOOK_URL;
  const apiKey = process.env.BRANDLYTICS_CRM_API_KEY;

  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "CRM is not configured." },
      { status: 503 }
    );
  }

  try {
    const watchlist = await getWatchlist(id);
    if (!watchlist) {
      return NextResponse.json({ ok: false, error: "Watchlist not found." }, { status: 404 });
    }
    if (watchlist.magnet_url) {
      return NextResponse.json({ ok: true, url: watchlist.magnet_url, existing: true });
    }

    const magnetUrl = new URL("/api/signaldesk/magnet", webhookUrl);
    const response = await fetch(magnetUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        watchlist_name: watchlist.name,
        offer_name: watchlist.offer_name,
        workspace_id: watchlist.crm_workspace_id || ""
      })
    });

    const data = (await response.json()) as {
      ok: boolean;
      url?: string;
      slug?: string;
      error?: string;
    };

    if (!data.ok || !data.url) {
      return NextResponse.json(
        { ok: false, error: data.error || `CRM returned ${response.status}.` },
        { status: 502 }
      );
    }

    await updateWatchlist(id, {
      magnet_url: data.url,
      magnet_slug: data.slug || null
    });

    return NextResponse.json({ ok: true, url: data.url, slug: data.slug });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
