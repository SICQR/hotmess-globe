/**
 * Telegram channel handler — sendMessage via Bot API.
 *
 * Requires:
 *   TELEGRAM_BOT_TOKEN  — bot token from BotFather
 *
 * Per-call requires:
 *   chatId              — numeric chat id (NOT @handle). Captured via the
 *                         @HotmessAuthBot /start deeplink and stored on
 *                         trusted_contacts.contact_telegram_chat_id.
 *
 * Returns { ok, providerId?, error?, skipped? }.
 *
 * Cofounder audit 2026-05-18 — new file. Until the trusted-contacts UI ships
 * a deeplink to capture chat_ids, this handler is mostly invoked from the
 * ops-alert path which uses PHIL_TELEGRAM_CHAT_ID directly. For per-contact
 * fan-out, dispatcher.js falls back to a 'skipped' log when chat_id is null
 * and the contact has only a handle.
 */
const FETCH_TIMEOUT_MS = 8_000;

export async function send(opts) {
  const { chatId, text } = opts || {};
  if (!chatId) return { ok: false, error: 'no_chat_id', skipped: true };
  if (!text) return { ok: false, error: 'no_text' };

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) return { ok: false, error: 'telegram_bot_token_missing', skipped: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: `telegram_${res.status}:${data?.error_code || ''}:${data?.description || 'unknown'}`,
        raw: data,
      };
    }
    return { ok: true, providerId: String(data?.result?.message_id ?? ''), raw: data };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    return { ok: false, error: `telegram_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Format an SOS body for Telegram. Parallel to the SMS body shape. */
export function buildSosTelegramText(opts) {
  const {
    userName = 'A friend',
    eventType = 'SOS',
    locationStr = 'location unavailable',
    ackUrl = 'https://hotmessldn.com/',
  } = opts || {};
  return `🚨 HOTMESS ${String(eventType).toUpperCase()}\n\n${userName} just triggered a safety alert.\n\nLocation: ${locationStr}\n\nAcknowledge: ${ackUrl}\n— call them now`;
}
