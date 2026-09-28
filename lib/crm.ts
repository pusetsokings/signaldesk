import type { StoredSignal } from "@/lib/db";

/**
 * Push one stored signal to Brandlytics CRM as a lead. Shared by the
 * Telegram Push button and urgent-signal auto-actions.
 */
export async function pushSignalToCrm(signal: StoredSignal) {
  const webhookUrl = process.env.BRANDLYTICS_CRM_WEBHOOK_URL;
  const apiKey = process.env.BRANDLYTICS_CRM_API_KEY;
  if (!webhookUrl) return { ok: false, error: "CRM is not configured." };

  const magnetNote = signal.magnet_url
    ? ` Follow-up magnet link: ${signal.magnet_url}`
    : "";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        source: "SignalDesk",
        workspace_id: signal.crm_workspace_id || "workspace_default",
        platform: signal.platform,
        lead_name: signal.author,
        profile_url: signal.profile_url,
        source_url: signal.url,
        signal_text: `${signal.title} ${signal.text}`.trim().slice(0, 1000),
        matched_offer: signal.offer_name || "Configured offer",
        matched_offer_id: "",
        intent_type: signal.intent_type || "need",
        intent_score: signal.intent_score,
        urgency_score: signal.urgency_score,
        location: "Global",
        recommended_action: `${signal.suggested_action}${magnetNote}`,
        response_draft: signal.response_draft,
        status: "new_signal"
      })
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    return data.ok
      ? { ok: true }
      : { ok: false, error: data.error || `CRM returned ${response.status}.` };
  } catch {
    return { ok: false, error: "Could not reach the CRM." };
  }
}
