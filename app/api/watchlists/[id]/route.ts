import { NextRequest, NextResponse } from "next/server";
import { deleteWatchlist, updateWatchlist } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") patch.is_active = body.isActive;
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.offerName === "string") patch.offer_name = body.offerName.trim();
  if (typeof body.query === "string") patch.query = body.query.trim();
  if (typeof body.signalTerms === "string") patch.signal_terms = body.signalTerms.trim();
  if (Array.isArray(body.platforms)) patch.platforms = body.platforms;
  if (typeof body.minIntentScore === "number") {
    patch.min_intent_score = Math.max(0, Math.min(100, body.minIntentScore));
  }
  if (typeof body.crmWorkspaceId === "string") {
    patch.crm_workspace_id = body.crmWorkspaceId.trim() || null;
  }
  if (typeof body.magnetUrl === "string") {
    patch.magnet_url = body.magnetUrl.trim() || null;
  }

  try {
    const watchlist = await updateWatchlist(id, patch);
    if (!watchlist) {
      return NextResponse.json({ ok: false, error: "Watchlist not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, watchlist });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await deleteWatchlist(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
