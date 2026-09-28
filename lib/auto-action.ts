import { getSignal, updateSignal } from "@/lib/db";
import { pushSignalToCrm } from "@/lib/crm";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

/**
 * Urgent-signal auto-action: approve and push to Brandlytics CRM without
 * waiting for a human tap. Nothing is posted publicly — the operator still
 * posts the reply, using the draft sent to Telegram.
 *
 * Rule (all must hold): AI-scored (never rule-based keyword scores),
 * intent type is not "none", a reply draft exists, intent score and urgency
 * score both at or above their thresholds.
 *
 * Env: AUTO_ACTION_ENABLED ("false" disables; default on),
 * AUTO_ACTION_MIN_URGENCY (default 80), AUTO_ACTION_MIN_INTENT (default 80).
 */

export type AutoActionCandidate = {
  id: string;
  intentType: string;
  intentScore: number;
  urgencyScore: number;
  responseDraft: string;
};

const HANDLED_STATUSES = new Set(["approved", "pushed", "dismissed", "responded"]);

export function autoActionEnabled() {
  return (process.env.AUTO_ACTION_ENABLED || "true").toLowerCase() !== "false";
}

export function isUrgentForAutoAction(item: AutoActionCandidate, engine: string) {
  const minUrgency = Number(process.env.AUTO_ACTION_MIN_URGENCY || 80);
  const minIntent = Number(process.env.AUTO_ACTION_MIN_INTENT || 80);
  return (
    autoActionEnabled() &&
    engine !== "rule-based" &&
    item.intentType !== "none" &&
    item.responseDraft.trim().length > 0 &&
    item.urgencyScore >= minUrgency &&
    item.intentScore >= minIntent
  );
}

/**
 * Approve and push each signal. Returns the ids that were handled (approved,
 * whether or not the CRM push succeeded) so the caller can leave them out of
 * the normal hot-signal alert, which would otherwise offer a duplicate Push.
 */
export async function runAutoActions(ids: string[]): Promise<Set<string>> {
  const handled = new Set<string>();

  for (const id of ids) {
    const signal = await getSignal(id);
    // Never re-act on a signal a person or an earlier run already handled.
    if (!signal || HANDLED_STATUSES.has(signal.status)) continue;

    await updateSignal(id, { status: "approved" });
    handled.add(id);

    const push = await pushSignalToCrm(signal);
    if (push.ok) await updateSignal(id, { status: "pushed" });

    if (telegramConfigured()) {
      const outcome = push.ok
        ? "auto-approved and pushed to the CRM ✅"
        : `auto-approved, but the CRM push failed: ${escapeHtml(push.error || "unknown error")}`;
      await sendTelegramMessage(
        `⚡ <b>Urgent signal</b> ${outcome}\n` +
          `${escapeHtml(signal.author)} (${escapeHtml(signal.source_label)}) · ` +
          `intent ${signal.intent_score} · urgency ${signal.urgency_score}\n` +
          `${escapeHtml(signal.summary)}\n\n` +
          `<b>Reply draft</b> — post it here:\n${signal.url}\n\n` +
          `<pre>${escapeHtml(signal.response_draft)}</pre>`
      );
    }
  }

  return handled;
}
