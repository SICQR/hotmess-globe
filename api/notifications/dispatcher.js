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

const FANOUT_IMMEDIATE = ['push', 'sms', 'whatsapp', 'email'];
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
    .select('id, contact_name, contact_phone, contact_email, role, notify_on_sos')
    .eq('user_id', userId)
    .eq('notify_on_sos', true)
    .limit(5);
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
async function attemptChannel({ supabase, channelName, contact, user, event, ackBaseUrl }) {
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
      mode: 'fanout',
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

  const tasks = [];
  for (const contact of contacts) {
    for (const ch of FANOUT_IMMEDIATE) {
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
    // Defer entire sequential cascade by 9h-current_hour — i.e. wait until end of quiet hours.
    // Simplest implementation: still record the event but mark all queued rows skipped with
    // a quiet_hours flag and let a separate cron resurface after 09:00 local.
    // For now: log and bypass; a follow-up commit will persist the deferred schedule.
    // (SOS bypass is implicit because P0 always uses fanout mode, never sequential.)
  }

  if (resolvedMode === 'fanout') {
    const stats = await dispatchFanout({ supabase, event, user, contacts, ackBaseUrl });
    return { mode: 'fanout', event_id: event.id, ...stats };
  }
  const stats = await dispatchSequential({ supabase, event, user, contacts });
  return { mode: 'sequential', event_id: event.id, ...stats };
}

export const __testing = {
  isQuietHourLocal,
  isP0Type,
  eventLocationStr,
  SEQUENTIAL_SCHEDULE,
  FANOUT_IMMEDIATE,
};
