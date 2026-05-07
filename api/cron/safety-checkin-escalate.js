/**
 * api/cron/safety-checkin-escalate.js
 *
 * Second-tier escalation for missed safety check-ins.
 *
 * Two-tier model:
 *
 *   Tier 1 — `/api/safety/check-ins` (every 2 minutes):
 *     Fires soft notifications the moment a check-in expires. Pushes to the
 *     user, queues outbox rows for trusted contacts (eventually email/WA via
 *     the dispatcher), writes a safety_events row for audit.
 *
 *   Tier 2 — THIS cron (every 30 minutes):
 *     If the user STILL hasn't responded 30+ minutes after expiry, escalate
 *     directly via the panic-alert pattern: per-contact safety_alerts rows
 *     plus a real Twilio SMS via the canonical sms.js helper. This bypasses
 *     the outbox queue so the dispatch doesn't sit waiting on the next
 *     dispatcher run.
 *
 * Idempotency: marks safety_checkins.delivery_status='escalated' after a
 * successful escalation pass. Re-runs filter that out.
 *
 * Auth: CRON_SECRET header.
 */

import { createClient } from '@supabase/supabase-js';
import { sendSms } from '../notifications/channels/sms.js';

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    : null;

const ESCALATION_GRACE_MINUTES = 30;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!supabase) return res.status(500).json({ error: 'server_misconfigured' });

  const cutoff = new Date(Date.now() - ESCALATION_GRACE_MINUTES * 60 * 1000).toISOString();

  // Tier-2 candidates: ONLY status='active' check-ins overdue by 30+ min that
  // haven't been escalated yet. status='checked_out' / 'aftercare_response' /
  // 'checked_in' all mean the user is accounted for. Dedup on delivery_status
  // alone — the tier-1 cron may run a few seconds before this one.
  const { data: missed, error: fetchErr } = await supabase
    .from('safety_checkins')
    .select('id, user_id, expires_at, location, note, notes, delivery_status')
    .lt('expires_at', cutoff)
    .eq('status', 'active')
    .or('delivery_status.is.null,delivery_status.neq.escalated')
    .limit(50);

  if (fetchErr) {
    console.error('[safety-checkin-escalate] fetch failed:', fetchErr.message);
    return res.status(500).json({ error: 'fetch_failed', detail: fetchErr.message });
  }

  if (!missed?.length) {
    return res.status(200).json({ ok: true, scanned: 0, escalated: 0 });
  }

  let escalated = 0;
  let totalContactsAlerted = 0;
  let totalContactsFailed = 0;
  let totalContactsSkipped = 0;
  let errors = 0;

  for (const checkin of missed) {
    try {
      // Mark escalated immediately to prevent double-fire if the cron overlaps.
      const { error: markErr } = await supabase
        .from('safety_checkins')
        .update({
          delivery_status: 'escalated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', checkin.id);
      if (markErr) {
        console.error(`[safety-checkin-escalate] mark failed for ${checkin.id}:`, markErr.message);
        errors++;
        continue;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', checkin.user_id)
        .maybeSingle();
      const userName = profile?.display_name?.trim() || 'Your friend';
      const overdueMins = Math.max(
        ESCALATION_GRACE_MINUTES,
        Math.round((Date.now() - new Date(checkin.expires_at).getTime()) / 60000),
      );

      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name, contact_phone, contact_email')
        .eq('user_id', checkin.user_id)
        .eq('notify_on_sos', true);

      if (!contacts?.length) {
        // Nothing to escalate to — already marked escalated above so we don't
        // retry. Move on.
        escalated++;
        continue;
      }

      const text = `${userName} hasn't responded to their HOTMESS safety check-in in over ${overdueMins} minute(s). If you can, please check on them.`;

      await Promise.allSettled(contacts.map(async (contact) => {
        const channel = contact.contact_phone ? 'sms' : 'email';

        const { data: alertRow, error: insErr } = await supabase
          .from('safety_alerts')
          .insert({
            user_id: checkin.user_id,
            contact_id: contact.id,
            alert_type: 'check_in_miss',
            channel,
            status: 'queued',
            location_data: checkin.location ?? null,
            payload: {
              source: 'cron/safety-checkin-escalate',
              checkin_id: checkin.id,
              overdue_minutes: overdueMins,
              note: checkin.note ?? checkin.notes ?? null,
            },
          })
          .select('id')
          .maybeSingle();

        if (insErr || !alertRow?.id) {
          console.error('[safety-checkin-escalate] safety_alerts insert failed:', insErr?.message);
          totalContactsFailed++;
          return;
        }

        if (!contact.contact_phone) {
          // Email path stays in the dispatcher pipeline.
          await supabase.from('safety_alerts')
            .update({ status: 'skipped', error_message: 'no_phone_email_pipeline_pending' })
            .eq('id', alertRow.id);
          totalContactsSkipped++;
          return;
        }

        const result = await sendSms({ to: contact.contact_phone, body: text });
        if (result.ok) {
          await supabase.from('safety_alerts')
            .update({
              status: 'delivered',
              delivered_at: new Date().toISOString(),
              payload: { provider_id: result.providerId ?? null },
            })
            .eq('id', alertRow.id);
          totalContactsAlerted++;
        } else {
          await supabase.from('safety_alerts')
            .update({
              status: result.skipped ? 'skipped' : 'failed',
              error_message: (result.error ?? 'unknown_error').slice(0, 500),
            })
            .eq('id', alertRow.id);
          if (result.skipped) totalContactsSkipped++;
          else totalContactsFailed++;
        }
      }));

      escalated++;
    } catch (err) {
      console.error('[safety-checkin-escalate] per-checkin error:', err?.message ?? err);
      errors++;
    }
  }

  console.log(
    `[safety-checkin-escalate] scanned=${missed.length} escalated=${escalated} alerted=${totalContactsAlerted} failed=${totalContactsFailed} skipped=${totalContactsSkipped} errors=${errors}`,
  );

  return res.status(200).json({
    ok: true,
    scanned: missed.length,
    escalated,
    contacts_alerted: totalContactsAlerted,
    contacts_failed: totalContactsFailed,
    contacts_skipped: totalContactsSkipped,
    errors,
  });
}
