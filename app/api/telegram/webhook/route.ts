import { NextRequest, NextResponse } from "next/server";
import { getSignal, updateSignal, type StoredSignal } from "@/lib/db";
import { pushSignalToCrm } from "@/lib/crm";
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
