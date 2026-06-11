import { NextResponse } from "next/server";

/**
 * Lists CRM workspaces so the UI can offer a destination picker for lead
 * pushes. Proxies the CRM's authenticated workspaces endpoint so the shared
 * secret never reaches the browser.
 */

export async function GET() {
  const webhookUrl = process.env.BRANDLYTICS_CRM_WEBHOOK_URL;
  const apiKey = process.env.BRANDLYTICS_CRM_API_KEY;

  if (!webhookUrl) {
    return NextResponse.json({ ok: false, workspaces: [], error: "CRM not configured." });
  }

  try {
    const workspacesUrl = new URL("/api/signaldesk/workspaces", webhookUrl);
    const response = await fetch(workspacesUrl.toString(), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        workspaces: [],
        error: `CRM returned ${response.status}.`
      });
    }

    const data = (await response.json()) as {
      ok: boolean;
      workspaces?: Array<{
        id: string;
        name: string;
        offerName?: string | null;
        icp?: string | null;
      }>;
    };

    return NextResponse.json({ ok: true, workspaces: data.workspaces || [] });
  } catch {
    return NextResponse.json({
      ok: false,
      workspaces: [],
      error: "Unable to reach the CRM workspaces endpoint."
    });
  }
}
