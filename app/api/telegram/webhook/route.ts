import { NextRequest, NextResponse } from "next/server";
import { getSignal, updateSignal, type StoredSignal } from "@/lib/db";
import {
  answerCallback,
  clearMessageButtons,
  escapeHtml,
  sendTelegramMessage
} from "@/lib/telegram";

/**
 * Telegram bot webhook: handles Approve / Dismiss / Push buttons on hot
 * signal alerts so the whole review flow works from the owner's phone.
 * Verified via the secret token Telegram echoes back on every update.
 */

export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    chat?: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat?: { id: number }; message_id?: number };
  };
};

async function pushSignalToCrm(signal: StoredSignal) {
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

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Plain messages: greet and point at the dashboard.
  if (update.message?.text && !update.callback_query) {
    await sendTelegramMessage(
      "SignalDesk Alerts is connected ✅\nHot signals arrive here with Approve / Dismiss / Push buttons.\n" +
        '<a href="https://signal.brandlytics.agency/#inbox">Open the Signal Inbox →</a>'
    );
    return NextResponse.json({ ok: true });
  }

  const callback = update.callback_query;
  if (!callback?.data) return NextResponse.json({ ok: true });

  const [action, signalId] = callback.data.split("|");
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;

  let signal: StoredSignal | null = null;
  try {
    signal = await getSignal(signalId);
  } catch {
    signal = null;
  }
  if (!signal) {
    await answerCallback(callback.id, "Signal not found (it may have been removed).");
    return NextResponse.json({ ok: true });
  }

  if (action === "d") {
    await updateSignal(signal.id, { status: "dismissed" });
    await answerCallback(callback.id, "Dismissed.");
    if (chatId && messageId) await clearMessageButtons(chatId, messageId);
    return NextResponse.json({ ok: true });
  }

  if (action === "a") {
    await updateSignal(signal.id, { status: "approved" });
    await answerCallback(callback.id, "Approved. Draft sent below.");
    const followUp = signal.magnet_url
      ? `\n\n<b>Follow-up magnet link</b> (share after they engage):\n${signal.magnet_url}`
      : "";
    await sendTelegramMessage(
      `<b>Reply draft</b> — long-press to copy, then post it here:\n${signal.url}\n\n` +
        `<pre>${escapeHtml(signal.response_draft)}</pre>` +
        followUp
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "p") {
    const result = await pushSignalToCrm(signal);
    if (result.ok) {
      await updateSignal(signal.id, { status: "pushed" });
      await answerCallback(callback.id, "Lead pushed to Brandlytics CRM ✅");
      if (chatId && messageId) await clearMessageButtons(chatId, messageId);
      await sendTelegramMessage(
        `📤 Pushed <b>${escapeHtml(signal.author)}</b> (${escapeHtml(
          signal.source_label
        )}) to the CRM as a lead.`
      );
    } else {
      await answerCallback(callback.id, `Push failed: ${result.error}`);
    }
    return NextResponse.json({ ok: true });
  }

  await answerCallback(callback.id, "Unknown action.");
  return NextResponse.json({ ok: true });
}
