import { NextResponse } from "next/server";
import { configuredEngines } from "@/lib/engine";

export async function GET() {
  return NextResponse.json({
    ok: true,
    engines: configuredEngines(),
    reddit: Boolean(
      process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
    ),
    crm: Boolean(process.env.BRANDLYTICS_CRM_WEBHOOK_URL)
  });
}
