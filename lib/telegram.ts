/**
 * Minimal Telegram Bot API helpers for hot-signal alerts and the
 * approve/dismiss/push workflow driven from the owner's phone.
 */

type InlineButton = { text: string; callback_data: string };

function api(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return `https://api.telegram.org/bot${token}/${method}`;
}

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  text: string,
  options: { chatId?: string; buttons?: InlineButton[][] } = {}
) {
  const url = api("sendMessage");
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!url || !chatId) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(options.buttons
          ? { reply_markup: { inline_keyboard: options.buttons } }
          : {})
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function answerCallback(callbackQueryId: string, text: string) {
  const url = api("answerCallbackQuery");
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    });
  } catch {
    // best effort
  }
}

export async function clearMessageButtons(chatId: number | string, messageId: number) {
  const url = api("editMessageReplyMarkup");
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] }
      })
    });
  } catch {
    // best effort
  }
}
