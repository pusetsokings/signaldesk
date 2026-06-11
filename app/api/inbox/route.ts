import { NextRequest, NextResponse } from "next/server";
import { dbConfigured, inboxCounts, listInboxSignals } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, signals: [], counts: {}, error: "Storage not configured." });
  }
  const status = request.nextUrl.searchParams.get("status") || "new";
  try {
    const [signals, counts] = await Promise.all([
      listInboxSignals({ status, limit: 50 }),
      inboxCounts()
    ]);
    return NextResponse.json({ ok: true, signals, counts });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        signals: [],
        counts: {},
        error: error instanceof Error ? error.message : "Failed"
      },
      { status: 500 }
    );
  }
}
