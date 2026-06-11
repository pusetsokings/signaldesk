import { NextRequest, NextResponse } from "next/server";
import { updateSignal } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["new", "approved", "pushed", "dismissed", "responded"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: string; responseDraft?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: { status?: string; response_draft?: string } = {};
  if (body.status) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.responseDraft === "string") {
    patch.response_draft = body.responseDraft;
  }

  try {
    const signal = await updateSignal(id, patch);
    if (!signal) {
      return NextResponse.json({ ok: false, error: "Signal not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, signal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
