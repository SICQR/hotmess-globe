/**
 * POST /api/meetpoint/found
 * Chunk 05 — Meet Flow
 *
 * Called when user taps FOUND ✓
 * 1. Updates meet_sessions: status=found, met_at=now, silence_until=now+90s
 * 2. Writes meet_outcomes: outcome_type=found
 * 3. Queues AA compute trigger (type: aa_met_trigger) → AA system reads this
 * 4. Queues Land Time aftercare prompt for 4hrs if Care flag enabled
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const SILENCE_SECONDS = 90;
const LAND_TIME_HOURS = 4;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });

  try {
    const now = new Date();
    const silenceUntil = new Date(now.getTime() + SILENCE_SECONDS * 1000).toISOString();

    // 1. Update meet_session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('meet_sessions')
      .update({
        status: 'found',
        met_at: now.toISOString(),
        silence_until: silenceUntil,
        updated_at: now.toISOString(),
      })
      .eq('id', session_id)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    // 2. Write meet_outcome
    await supabaseAdmin.from('meet_outcomes').insert({
      session_id,
      user_id: user.id,
      outcome_type: 'found',
    });

    // 3. Queue AA compute trigger
    await supabaseAdmin.from('notification_outbox').insert({
      user_id: user.id,
      type: 'aa_met_trigger',
      status: 'queued',
      payload: {
        session_id,
        met_at: now.toISOString(),
        partner_id: session.user_a_id === user.id ? session.user_b_id : session.user_a_id,
      },
    });

    // 4. Queue Land Time aftercare prompt (4hr) if user has active user_session
    const landAt = new Date(now.getTime() + LAND_TIME_HOURS * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('notification_outbox').insert({
      user_id: user.id,
      type: 'care_land_time_prompt',
      status: 'queued',
      payload: {
        session_id,
        prompt_at: landAt,
        source: 'meet_found',
      },
    });

    return res.status(200).json({
      ok: true,
      met_at: now.toISOString(),
      silence_until: silenceUntil,
      aa_triggered: true,
      land_time_prompt_at: landAt,
    });
  } catch (err) {
    console.error('[meetpoint/found]', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
