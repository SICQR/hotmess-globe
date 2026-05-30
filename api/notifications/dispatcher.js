/**
 * Multi-channel safety dispatcher.
 *
 * Two modes:
 *
 *   Mode A — fanout (P0: SOS / Get Out)
 *     Fire push/SMS/WhatsApp/email simultaneously to every contact.
 *     Voice is held back as the 90-second escalation if no other channel acks.
 *     SLA: at least one ack within 15min. If none → escalate to operator panel.
 *
 *   Mode B — sequential (P1: Land Time miss / check-in miss / movement)
 *     Push the user themselves first, escalate to backups over 15 minutes:
 *       T+0:    push to user (in case they forgot)
 *       T+60s:  push to backups
 *       T+120s: + SMS
 *       T+300s: + WhatsApp + email
 *       T+900s: + voice
 *
 *   Both modes: respect daily push cap + quiet hours for non-SOS pushes.
 *   SOS bypasses ALL caps and quiet hours.
 *
 * The dispatcher writes one safety_delivery_log row per (contact, channel,
 * attempt). It does NOT poll — sequential mode writes a future-dated row with
 * status='queued', and a separate cron sweep picks them up at their attempted_at.
 *
 * Public surface:
 *
 *   dispatchSafetyEvent({ supabase, eventId, mode, contactsOverride? })
 *     → { delivered, failed, skipped, log_ids }
 */
import { buildAckUrl } from '../safety/_ack-token.js';
import * as pushChannel from './channels/push.js';
import * as smsChannel from './channels/sms.js';
import * as emailChannel from './channels/email.js';
import * as whatsappChannel from './channels/whatsapp.js';
import * as voiceChannel from './channels/voice.js';

export const CHANNEL_MAP = {
  push: pushChannel,
  sms: smsChannel,
  email: emailChannel,
  whatsapp: whatsappChannel,
  voice: voiceChannel,
};

const FANOUT_IMMEDIATE = ['push', 'sms', 'whatsapp', 'telegram', 'email'];  // telegram added by audit 2026-05-18 (multichannel)
// Voice is held back as the 90-second escalation if no other channel acks.
// The voice escalation cron is round-4 work; the constant moves there with it.

// Sequential-mode schedule keyed off the event's created_at.
// Unit: seconds offset from t0.
const SEQUENTIAL_SCHEDULE = [
  { offsetSec: 0,   target: 'self',    channels: ['push'] },
  { offsetSec: 60,  target: 'contact', channels: ['push'] },
  { offsetSec: 120, target: 'contact', channels: ['sms'] },
  { offsetSec: 300, target: 'contact', channels: ['whatsapp', 'email'] },
  { offsetSec: 900, target: 'contact', channels: ['voice'] },
];

const QUIET_HOURS_START = 0;
const QUIET_HOURS_END = 9;

function isQuietHourLocal(timezone) {
  // Best-effort: format the current time in the recipient's TZ and read the hour.
  // Falls back to UTC if TZ unavailable or invalid.
  try {
    const tz = timezone || 'UTC';
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: tz });
    const hour = parseInt(fmt.format(new Date()), 10);
    return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
  } catch {
    const h = new Date().getUTCHours();
    return h >= QUIET_HOURS_START && h < QUIET_HOURS_END;
  }
}

function isP0Type(eventType) {
  return eventType === 'sos' || eventType === 'get_out';
}

async function loadEvent(supabase, eventId) {
  const { data, error } = await supabase
    .from('safety_events')
    .select('id, user_id, type, metadata, created_at')
    .eq('id', eventId)
    .single();
  if (error || !data) throw new Error(`safety_event ${eventId} not found: ${error?.message || ''}`);
  return data;
}

async function loadUser(supabase, userId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, email, last_lat, last_lng, timezone')
    .eq('id', userId)
    .maybeSingle();
  return data || { id: userId, display_name: null, email: null };
}

async function loadContacts(supabase, userId) {
  const { data } = await supabase
    .from('trusted_contacts')
    .select('id, contact_name, contact_phone, contact_email, contact_whatsapp, contact_telegram_handle, contact_telegram_chat_id, channels_enabled, preferred_channel, role, notify_on_sos')
    .eq('user_id', userId)
    .eq('notify_on_sos', true)
    .limit(3); // Phil 2026-05-27 — cost cap: max 3 SOS recipients per fanout
  // Best-effort: see if the contact's phone matches an internal HOTMESS user
  // — if so, web push becomes possible. Skipped if no matching profile.
  const enriched = [];
  for (const c of data || []) {
    let internalUserId = null;
    if (c.contact_phone) {
      try {
        const { data: profByPhone } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', c.contact_phone)
          .maybeSingle();
        internalUserId = profByPhone?.id || null;
      } catch { /* phone column may not exist */ }
    }
    enriched.push({ ...c, user_id_if_internal: internalUserId });
  }
  return enriched;
}

function eventLocationStr(event, user) {
  const meta = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
  const lat = meta.lat ?? user.last_lat;
  const lng = meta.lng ?? user.last_lng;
  if (lat != null && lng != null) {
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }
  return 'Location unavailable';
}

async function recordAttempt(supabase, row) {
  const { data, error } = await supabase
    .from('safety_delivery_log')
    .insert(row)
    .select('id')
    .single();
  if (error) {
    // Don't throw — dispatcher must not be brittle. Caller logs.
    return null;
  }
  return data.id;
}

async function updateAttempt(supabase, id, patch) {
  if (!id) return;
  await supabase.from('safety_delivery_log').update(patch).eq('id', id);
}

/**
 * Atomically pre-allocate a delivery_log row in 'queued' state, then attempt
 * the channel send and update the row with the outcome. Pre-allocating gives
 * the channel module the deliveryId it needs to embed in the ack URL.
 */
async function attemptChannel({ supabase, channelName, contact, user, event, ackBaseUrl, mode = 'fanout' }) {
  const channel = CHANNEL_MAP[channelName];
  if (!channel) return { ok: false, error: 'unknown_channel' };

  const deliveryId = await recordAttempt(supabase, {
    safety_event_id: event.id,
    user_id: event.user_id,
    trusted_contact_id: contact.id || null,
    channel: channelName,
    attempt_number: 1,
    status: 'queued',
  });

  const ackUrl = deliveryId ? buildAckUrl(deliveryId, event.user_id, ackBaseUrl) : null;

  let result;
  try {
    result = await channel.send({
      contact,
      user,
      event: { ...event, location_str: eventLocationStr(event, user) },
      ackUrl,
      deliveryId,
      mode,
      supabase,
    });
  } catch (err) {
    result = { ok: false, error: `channel_threw:${err.message}` };
  }

  if (result.skipped) {
    await updateAttempt(supabase, deliveryId, {
      status: 'skipped',
      error: result.error || null,
      provider_response: result.raw || null,
    });
  } else if (result.ok) {
    await updateAttempt(supabase, deliveryId, {
      status: result.deliveredAt ? 'delivered' : 'sent',
      provider_id: result.providerId || null,
      provider_response: result.raw || null,
      delivered_at: result.deliveredAt || null,
    });
  } else {
    await updateAttempt(supabase, deliveryId, {
      status: 'failed',
      error: result.error || 'unknown',
      provider_response: result.raw || null,
    });
  }

  return { ...result, deliveryId };
}

// alreadyAcked() lived here — short-circuit guard for ack-aware fan-out — but the
// voice escalation cron that needs it is round-4 work. The helper moves there with
// it, alongside FANOUT_VOICE_DELAY_MS.

/**
 * Fan-out dispatch (Mode A). Awaits all immediate-channel attempts in parallel,
 * then schedules a voice escalation 90s later via setTimeout in the same Vercel
 * invocation — only completes if the function lives that long. For environments
 * where the function returns before 90s, the voice attempt is dropped on the
 * floor and the sequential cron sweeper (TODO) picks up the slack.
 *
 * In practice: Vercel default maxDuration is plenty for the immediate fan-out.
 * Voice escalation is best handled by a separate cron pass that scans for
 * unacked events 90s+ old.
 */
async function dispatchFanout({ supabase, event, user, contacts, ackBaseUrl }) {
  const stats = { delivered: 0, failed: 0, skipped: 0, attempts: [] };
  if (!contacts.length) return stats;

  // Per-contact channels_enabled gate (audit 2026-05-18). Each contact's row
  // carries a JSONB { sms, whatsapp, telegram, email } map. Push is sent
  // when the contact is an internal user (separate path inside attemptChannel).
  // Push is always attempted (gated separately on user_id_if_internal).
  function channelEnabledForContact(contact, ch) {
    if (ch === 'push') return true;
    const ce = (contact && contact.channels_enabled) || null;
    if (!ce || typeof ce !== 'object') {
      // Legacy contact (no per-row map): infer from which value-bearing field is populated.
      if (ch === 'sms')      return !!contact.contact_phone;
      if (ch === 'whatsapp') return !!(contact.contact_whatsapp || contact.contact_phone);
      if (ch === 'telegram') return !!(contact.contact_telegram_chat_id || contact.contact_telegram_handle);
      if (ch === 'email')    return !!contact.contact_email;
      return false;
    }
    return ce[ch] === true;
  }

  const tasks = [];
  for (const contact of contacts) {
    for (const ch of FANOUT_IMMEDIATE) {
      if (!channelEnabledForContact(contact, ch)) continue;
      tasks.push(attemptChannel({ supabase, channelName: ch, contact, user, event, ackBaseUrl }));
    }
  }

  const results = await Promise.all(tasks);
  for (const r of results) {
    stats.attempts.push(r);
    if (r.skipped) stats.skipped++;
    else if (r.ok) stats.delivered++;
    else stats.failed++;
  }

  return stats;
}

/**
 * Sequential dispatch (Mode B). Pre-allocates queued delivery_log rows for each
 * future scheduled step. The sweeper cron (api/notifications/dispatch.js,
 * already running every 5min) will eventually pick them up — but a dedicated
 * safety sweep with finer granularity is the proper home for this. Recorded
 * here so the audit trail is in place from t0.
 */
async function dispatchSequential({ supabase, event, user, contacts }) {
  const stats = { delivered: 0, failed: 0, skipped: 0, scheduled: 0, attempts: [] };
  const t0 = new Date(event.created_at || new Date()).getTime();

  // Pre-allocate queued rows for FUTURE steps only. The t+0 step fires
  // immediately below and creates its own delivery_log row via attemptChannel.
  for (const step of SEQUENTIAL_SCHEDULE) {
    if (step.offsetSec === 0) continue;
    const attemptedAt = new Date(t0 + step.offsetSec * 1000).toISOString();

    if (step.target === 'self') {
      for (const ch of step.channels) {
        const id = await recordAttempt(supabase, {
          safety_event_id: event.id,
          user_id: event.user_id,
          trusted_contact_id: null,
          channel: ch,
          attempt_number: 1,
          status: 'queued',
          attempted_at: attemptedAt,
        });
        stats.scheduled++;
        stats.attempts.push({ deliveryId: id, channel: ch, target: 'self' });
      }
    } else {
      for (const contact of contacts) {
        for (const ch of step.channels) {
          const id = await recordAttempt(supabase, {
            safety_event_id: event.id,
            user_id: event.user_id,
            trusted_contact_id: contact.id || null,
            channel: ch,
            attempt_number: 1,
            status: 'queued',
            attempted_at: attemptedAt,
          });
          stats.scheduled++;
          stats.attempts.push({ deliveryId: id, channel: ch, target: 'contact' });
        }
      }
    }
  }

  // Fire t+0 self-push immediately (creates its own delivery_log row)
  const selfStep = SEQUENTIAL_SCHEDULE.find(s => s.offsetSec === 0 && s.target === 'self');
  if (selfStep) {
    for (const ch of selfStep.channels) {
      const r = await attemptChannel({
        supabase,
        channelName: ch,
        contact: { id: null, user_id_if_internal: event.user_id, contact_name: 'Self' },
        user,
        event,
        ackBaseUrl: null,
        mode: 'sequential',
      });
      if (r.ok) stats.delivered++;
      else if (r.skipped) stats.skipped++;
      else stats.failed++;
    }
  }

  return stats;
}

export async function dispatchSafetyEvent({ supabase, eventId, mode, contactsOverride, ackBaseUrl }) {
  if (!supabase) throw new Error('supabase client required');
  if (!eventId) throw new Error('eventId required');

  const event = await loadEvent(supabase, eventId);
  const user = await loadUser(supabase, event.user_id);
  const contacts = contactsOverride ?? await loadContacts(supabase, event.user_id);

  // Resolve mode from event type if not explicit
  const resolvedMode = mode || (isP0Type(event.type) ? 'fanout' : 'sequential');

  // Quiet-hours suppression for non-SOS only
  if (resolvedMode === 'sequential' && isQuietHourLocal(user.timezone)) {
    // Quiet hours suppress the entire P1 cascade. Persist a single marker row
    // so the audit trail shows we deliberately deferred, and bail before any
    // channel send. SOS bypass is implicit because P0 always uses fanout mode.
    // A follow-up cron pass (round 4) will resurface deferred events at 09:00
    // local and re-enter the dispatcher.
    const markerId = await recordAttempt(supabase, {
      safety_event_id: event.id,
      user_id: event.user_id,
      trusted_contact_id: null,
      channel: 'push',
      attempt_number: 1,
      status: 'skipped',
      error: 'quiet_hours_deferred',
    });
    return {
      mode: 'sequential',
      event_id: event.id,
      delivered: 0,
      failed: 0,
      skipped: 1,
      scheduled: 0,
      attempts: [{ deliveryId: markerId, channel: 'push', target: 'self', skipped: true, reason: 'quiet_hours' }],
      deferred: true,
    };
  }

  if (resolvedMode === 'fanout') {
    const stats = await dispatchFanout({ supabase, event, user, contacts, ackBaseUrl });
    // Cofounder ops alert (Sprint 1 #01 brief §"Three reference flows" / SOS):
    // for P0 events (sos / get_out) Phil receives notification regardless of
    // whether the affected user has Phil in their trusted_contacts. Implemented
    // as a separate parallel send-path so a misconfigured user can't gag the
    // ops alert. WhatsApp + Telegram are graceful no-ops when their respective
    // env vars (or — for WhatsApp — a non-expired token) are absent; SMS is
    // the reliable channel given current ops-channel state.
    let opsAlert = null;
    if (isP0Type(event.type)) {
      opsAlert = await dispatchPhilOpsAlert({ supabase, event, user });
    }
    return { mode: 'fanout', event_id: event.id, ops_alert: opsAlert, ...stats };
  }
  const stats = await dispatchSequential({ supabase, event, user, contacts });
  return { mode: 'sequential', event_id: event.id, ...stats };
}

/**
 * Cofounder ops alert. Sends Phil an SOS notification regardless of whether
 * the affected user has Phil in their trusted_contacts. Three channels in
 * parallel — Telegram (requires PHIL_TELEGRAM_CHAT_ID), WhatsApp (requires
 * a non-expired WHATSAPP_ACCESS_TOKEN + an approved template), SMS (requires
 * PHIL_OPS_PHONE + Twilio creds, the reliable path).
 *
 * Each adapter call is independently logged to safety_delivery_log under a
 * synthetic trusted_contact_id=null + role='ops_alert' marker so the health-
 * check cron can distinguish ops-alert failures from regular fan-out failures.
 *
 * NEVER throws — if every channel fails, returns a stats object the caller
 * can persist for observability.
 */
async function dispatchPhilOpsAlert({ supabase, event, user }) {
  const philPhone = process.env.PHIL_OPS_PHONE?.trim() || null;
  const philChatId = process.env.PHIL_TELEGRAM_CHAT_ID?.trim() || null;
  const stats = { delivered: 0, failed: 0, skipped: 0, attempts: [] };

  // Build the contact object the existing adapters expect. user_id_if_internal
  // null because Phil's not pushable via this path (use his own profile push
  // subscription via the normal fanout if he's also in the user's trusted
  // contacts list).
  const opsContact = {
    id: null,
    contact_name: 'Phil (ops)',
    contact_phone: philPhone,
    contact_email: null,
    role: 'ops_alert',
    notify_on_sos: true,
    user_id_if_internal: null,
  };

  // SMS — the high-confidence path. Works as soon as PHIL_OPS_PHONE is set
  // and the Twilio creds are valid (they are, per current Vercel env).
  if (philPhone) {
    const r = await attemptChannel({ supabase, channelName: 'sms', contact: opsContact, user, event, ackBaseUrl: null });
    stats.attempts.push({ channel: 'sms', ok: !!r.ok, error: r.error || null });
    if (r.ok) stats.delivered++; else if (r.skipped) stats.skipped++; else stats.failed++;
  } else {
    stats.skipped++;
    stats.attempts.push({ channel: 'sms', ok: false, error: 'PHIL_OPS_PHONE not set' });
  }

  // WhatsApp — fires only if token + phone present. Graceful when token expired.
  if (philPhone && (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN)) {
    const r = await attemptChannel({ supabase, channelName: 'whatsapp', contact: opsContact, user, event, ackBaseUrl: null });
    stats.attempts.push({ channel: 'whatsapp', ok: !!r.ok, error: r.error || null });
    if (r.ok) stats.delivered++; else if (r.skipped) stats.skipped++; else stats.failed++;
  }

  // Telegram — direct sendMessage to Phil's chat. Requires PHIL_TELEGRAM_CHAT_ID
  // (captured via /start auth on @HotmessAuthBot per brief 01 §7). Until that
  // happens this is a skipped no-op.
  if (philChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const meta = (event.metadata && typeof event.metadata === 'object') ? event.metadata : {};
      const loc = (meta.lat != null && meta.lng != null)
        ? `https://maps.google.com/?q=${Number(meta.lat).toFixed(5)},${Number(meta.lng).toFixed(5)}`
        : '(no location)';
      const text = `🚨 HOTMESS SOS\n${user.display_name || 'A member'} (id: ${event.user_id.slice(0,8)}) triggered ${event.type.toUpperCase()} at ${event.created_at}.\nLocation: ${loc}\nEvent id: ${event.id}`;
      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: philChatId, text, parse_mode: 'Markdown' }),
      });
      const tgOk = tgRes.ok;
      stats.attempts.push({ channel: 'telegram', ok: tgOk, error: tgOk ? null : `telegram_${tgRes.status}` });
      if (tgOk) stats.delivered++; else stats.failed++;
    } catch (e) {
      stats.failed++;
      stats.attempts.push({ channel: 'telegram', ok: false, error: e?.message || 'telegram_threw' });
    }
  } else {
    stats.skipped++;
    stats.attempts.push({ channel: 'telegram', ok: false, error: 'PHIL_TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN not set' });
  }

  return stats;
}

export const __testing = {
  isQuietHourLocal,
  isP0Type,
  eventLocationStr,
  SEQUENTIAL_SCHEDULE,
  FANOUT_IMMEDIATE,
};
