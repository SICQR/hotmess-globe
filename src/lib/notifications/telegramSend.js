/**
 * src/lib/notifications/telegramSend.js
 *
 * Server-side Telegram sender. Used by the notification processor (PR 4).
 * Returns { ok: boolean, error?: string } so the caller can decide retry
 * vs failure-log per the delivery failure policy.
 *
 * Brief: PR 1 of the notification stack (Phil 2026-05-26).
 */

export async function sendTelegramMessage(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[telegramSend] TELEGRAM_BOT_TOKEN not set');
    return { ok: false, error: 'no_token' };
  }
  if (!chatId || !text) {
    return { ok: false, error: 'missing_args' };
  }

  try {
    const body = {
      chat_id: chatId,
      text,
      // Telegram supports HTML/Markdown — keep it plain unless the caller
      // explicitly asks for parse_mode (avoids accidental injection in
      // beacon titles and notification copy).
      ...(options.parse_mode ? { parse_mode: options.parse_mode } : {}),
      ...(options.disable_web_page_preview !== undefined
        ? { disable_web_page_preview: !!options.disable_web_page_preview }
        : {}),
    };
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const errMsg = j.description || `http_${r.status}`;
      console.warn('[telegramSend] failed:', errMsg);
      return { ok: false, error: errMsg };
    }
    return { ok: true };
  } catch (e) {
    const msg = String(e?.message || e);
    console.warn('[telegramSend] exception:', msg);
    return { ok: false, error: msg };
  }
}

export default sendTelegramMessage;
