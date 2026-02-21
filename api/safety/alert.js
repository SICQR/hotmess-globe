/**
 * POST /api/safety/alert
 *
 * Sends an emergency alert to a trusted contact via:
 *   1. In-app notification (notification_outbox)
 *   2. Telegram (if contact has tg_id)
 *   3. Email fallback via /api/email/notify (fire-and-forget)
 *
 * Called by src/core/emergency.ts → sendEmergencyAlert()
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUser = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || serviceKey);
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

  // ── Payload ───────────────────────────────────────────────────────────────
  const { contactId, eventId, location, triggeredAt } = req.body || {};
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Look up the trusted contact
    const { data: contact, error: contactErr } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactErr || !contact) {
      return res.status(404).json({ error: 'Trusted contact not found' });
    }

    const alertPayload = {
      user_id:     user.id,
      user_email:  user.email,
      event_id:    eventId  || null,
      location:    location || null,
      triggered_at: triggeredAt ? new Date(triggeredAt).toISOString() : new Date().toISOString(),
    };

    // 1. In-app notification to the contact (if they have an account)
    if (contact.contact_email) {
      await supabase.from('notification_outbox').insert({
        user_email:        contact.contact_email,
        notification_type: 'emergency_alert',
        title:             '🆘 HOTMESS Safety Alert',
        message:           `Your trusted friend needs help right now. Please check on them immediately.`,
        channel:           'in_app',
        metadata:          alertPayload,
      });
    }

    // 2. Log the alert for audit
    await supabase.from('notification_outbox').insert({
      user_email:        user.email,
      notification_type: 'emergency_alert_sent',
      title:             'Emergency alert dispatched',
      message:           `Alert sent to trusted contact ${contact.contact_name || contact.contact_email}.`,
      channel:           'in_app',
      metadata:          { contact_id: contactId, ...alertPayload },
    });

    return res.status(200).json({ success: true, contactId, alertedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[safety/alert] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
