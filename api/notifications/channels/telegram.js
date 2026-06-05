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

/**
 * Format an SOS body for Telegram.
 *
 * D58 S0 (Phil 2026-06-04, Amendment 8): this is now a thin delegator to the
 * canonical composer. DO NOT add channel-specific copy here — extend
 * api/safety/_payload-compose.js instead. Three composers caused payload drift
 * that produced anonymous-alert + duplicate-trigger production behaviour. One
 * source of truth closes that failure door.
 *
 * Backward-compatible signature: callers that pass the legacy `userName`,
 * `locationStr` shape are auto-wrapped into the composer's `user` + `event`
 * inputs. New callers should pass `event` + `user` directly.
 */
import { composeSosPayload } from '../../safety/_payload-compose.js';

export function buildSosTelegramText(opts) {
  const o = opts || {};

  // New-shape call: pass through to composer directly.
  if (o.event && o.user) {
    const { body } = composeSosPayload({
      channel: 'telegram',
      event: o.event,
      user: o.user,
      ackUrl: o.ackUrl || null,
    });
    return body;
  }

  // Legacy-shape call: synthesise the composer inputs from old fields. Best-
  // effort only — callers should migrate to new shape so display_name + phone
  // come from the actual profile row, not a string.
  const { body } = composeSosPayload({
    channel: 'telegram',
    event: {
      id: o.eventId || null,
      created_at: o.createdAt || new Date().toISOString(),
      type: o.eventType || 'sos',
      metadata: o.metadata || {},
    },
    user: {
      display_name: o.userName || null,
      phone: o.userPhone || null,
      last_lat: o.lat ?? null,
      last_lng: o.lng ?? null,
    },
    ackUrl: o.ackUrl || null,
  });
  return body;
}

/**
 * D58 S0: full composer result (body + eventCode + templateVersion + missing
 * fields) for callers that need to persist the dispatch audit shape per
 * Amendments 6 + 9. Telegram channel adapter should use this in preference to
 * buildSosTelegramText so it can write rendered_body / event_code /
 * template_version to safety_delivery_log alongside the send.
 */
export function buildSosTelegramPayload({ event, user, ackUrl }) {
  return composeSosPayload({ channel: 'telegram', event, user, ackUrl });
}
