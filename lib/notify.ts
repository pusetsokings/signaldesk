import type { Watchlist } from "@/lib/db";

/**
 * Hot-signal alerts. Telegram is the primary channel (free, instant);
 * Resend email is the fallback. Both are optional: alerts are silently
 * skipped when neither is configured, so scanning never depends on them.
 */

type HotSignal = {
  title: string;
  author: string;
  url: string;
  sourceLabel: string;
  intentScore: number;
  intentType: string;
  summary: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegram(watchlist: Watchlist, signals: HotSignal[]) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  const items = signals
    .slice(0, 5)
    .map(
      (signal) =>
        `\n\n🔥 <b>${escapeHtml(signal.title.slice(0, 120))}</b>\n` +
        `${escapeHtml(signal.sourceLabel)} · ${escapeHtml(signal.author)} · ` +
        `${escapeHtml(signal.intentType)} ${signal.intentScore}/100\n` +
        (signal.summary ? `${escapeHtml(signal.summary.slice(0, 200))}\n` : "") +
        `<a href="${signal.url}">View post</a>`
    )
    .join("");

  const more = signals.length > 5 ? `\n\n…and ${signals.length - 5} more.` : "";

  const text =
    `<b>SignalDesk: ${signals.length} hot signal${signals.length > 1 ? "s" : ""}</b>\n` +
    `Watchlist: ${escapeHtml(watchlist.name)} (offer: ${escapeHtml(watchlist.offer_name)})` +
    items +
    more +
    `\n\n<a href="https://signal.brandlytics.agency/#inbox">Open the Signal Inbox →</a>`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true }
        })
      }
    );
    return response.ok;
  } catch {
    return false;
  }
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
