import { NextRequest, NextResponse } from "next/server";

/**
 * Push an approved lead into Brandlytics CRM.
 * Payload shape follows docs/CRM_SYNC_CONTRACT.md.
 */

type LeadPayload = {
  workspace_id?: string;
  platform: string;
  lead_name: string;
  profile_url: string;
  source_url: string;
  signal_text: string;
  matched_offer: string;
  matched_offer_id?: string;
  intent_type: string;
  intent_score: number;
  urgency_score?: number;
  location?: string;
  recommended_action?: string;
  response_draft?: string;
};

const REQUIRED_FIELDS: Array<keyof LeadPayload> = [
  "platform",
  "lead_name",
  "source_url",
  "signal_text",
  "matched_offer",
  "intent_score"
];

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.BRANDLYTICS_CRM_WEBHOOK_URL;
  const apiKey = process.env.BRANDLYTICS_CRM_API_KEY;

  let lead: LeadPayload;
  try {
    lead = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => lead[field] === undefined || lead[field] === ""
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing required lead fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  if (!webhookUrl) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          "CRM push is not configured. Set BRANDLYTICS_CRM_WEBHOOK_URL (and BRANDLYTICS_CRM_API_KEY) in Vercel environment variables."
      },
      { status: 503 }
    );
  }

  const payload = {
    source: "SignalDesk",
    workspace_id: lead.workspace_id || "workspace_default",
    platform: lead.platform,
    lead_name: lead.lead_name,
    profile_url: lead.profile_url || "",
    source_url: lead.source_url,
    signal_text: lead.signal_text,
    matched_offer: lead.matched_offer,
    matched_offer_id: lead.matched_offer_id || "",
    intent_type: lead.intent_type || "need",
    intent_score: lead.intent_score,
    urgency_score: lead.urgency_score ?? 0,
    location: lead.location || "Global",
    recommended_action: lead.recommended_action || "",
    response_draft: lead.response_draft || "",
    status: "new_signal"
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const text = await response.text();
    let crmResponse: unknown = null;
    try {
      crmResponse = JSON.parse(text);
    } catch {
      crmResponse = text.slice(0, 500);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Brandlytics CRM returned ${response.status}.`,
          crm: crmResponse
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, crm: crmResponse });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to reach Brandlytics CRM. Check BRANDLYTICS_CRM_WEBHOOK_URL and that crm.brandlytics.agency accepts the webhook."
      },
      { status: 502 }
    );
  }
}
