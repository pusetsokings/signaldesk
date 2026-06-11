import type { Watchlist } from "@/lib/db";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

/**
 * Hot-signal alerts. Telegram is the primary channel (free, instant, with
 * Approve / Dismiss / Push buttons handled by /api/telegram/webhook);
 * Resend email is the fallback. Both are optional: alerts are silently
 * skipped when neither is configured, so scanning never depends on them.
 */

export type HotSignal = {
  id: string;
  title: string;
  author: string;
  url: string;
  sourceLabel: string;
  intentScore: number;
  intentType: string;
  summary: string;
};

async function sendTelegram(watchlist: Watchlist, signals: HotSignal[]) {
  if (!telegramConfigured()) return false;

  const header =
    `<b>SignalDesk: ${signals.length} hot signal${signals.length > 1 ? "s" : ""}</b>\n` +
    `Watchlist: ${escapeHtml(watchlist.name)} (offer: ${escapeHtml(watchlist.offer_name)})`;
  let delivered = await sendTelegramMessage(header);

  for (const signal of signals.slice(0, 5)) {
    const text =
      `🔥 <b>${escapeHtml(signal.title.slice(0, 120))}</b>\n` +
      `${escapeHtml(signal.sourceLabel)} · ${escapeHtml(signal.author)} · ` +
      `${escapeHtml(signal.intentType)} ${signal.intentScore}/100\n` +
      (signal.summary ? `${escapeHtml(signal.summary.slice(0, 220))}\n` : "") +
      `<a href="${signal.url}">View post</a>`;

    const ok = await sendTelegramMessage(text, {
      buttons: [
        [
          { text: "✅ Approve + get draft", callback_data: `a|${signal.id}` },
          { text: "🚫 Dismiss", callback_data: `d|${signal.id}` }
        ],
        [{ text: "📤 Push to CRM", callback_data: `p|${signal.id}` }]
      ]
    });
    delivered = delivered || ok;
  }

  if (signals.length > 5) {
    await sendTelegramMessage(
      `…and ${signals.length - 5} more in the <a href="https://signal.brandlytics.agency/#inbox">Signal Inbox</a>.`
    );
  }

  return delivered;
}

async function sendEmail(watchlist: Watchlist, signals: HotSignal[]) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SIGNAL_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.SIGNAL_FROM_EMAIL || "SignalDesk <onboarding@resend.dev>";

  const items = signals
    .map(
      (signal) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin:0 0 10px;">
        <div style="font-size:13px;color:#64748b;">${signal.sourceLabel} · ${signal.author} · ${signal.intentType} ${signal.intentScore}/100</div>
        <div style="font-weight:600;margin:4px 0;">${signal.title.slice(0, 140)}</div>
        ${signal.summary ? `<div style="font-size:13px;color:#334155;margin:4px 0;">${signal.summary}</div>` : ""}
        <a href="${signal.url}" style="font-size:13px;">View post</a>
      </div>`
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;">
      <h2 style="margin:0 0 4px;">🔥 ${signals.length} hot signal${signals.length > 1 ? "s" : ""} found</h2>
      <p style="margin:0 0 14px;color:#475569;">Watchlist <strong>${watchlist.name}</strong> (offer: ${watchlist.offer_name})</p>
      ${items}
      <p style="margin:14px 0 0;">
        <a href="https://signal.brandlytics.agency/#inbox">Open the Signal Inbox to review, approve, and push to CRM →</a>
      </p>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `SignalDesk: ${signals.length} hot signal${signals.length > 1 ? "s" : ""} for ${watchlist.offer_name}`,
        html
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function notifyHotSignals(watchlist: Watchlist, signals: HotSignal[]) {
  if (signals.length === 0) return false;
  const viaTelegram = await sendTelegram(watchlist, signals);
  if (viaTelegram) return true;
  return await sendEmail(watchlist, signals);
}
