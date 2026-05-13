/**
 * api/analytics/track.js — Chunk 17c
 *
 * Receives client-side analytics events and inserts into analytics_events.
 * Accepts anonymous events (user_id resolved from JWT if present).
 *
 * POST /api/analytics/track
 * Body: { event_name, category?, label?, value?, properties? }
 */

import { createClient } from '@supabase/supabase-js';

// 2026-05-13: env var fallback chain. The original module read only
// NEXT_PUBLIC_SUPABASE_URL — a Next.js convention. HOTMESS is a Vite app,
// so that var is undefined in Vercel's serverless function env. Result:
// createClient received an undefined URL, every insert failed, and the
// endpoint returned 200 anyway because it's designed to swallow analytics
// errors. ~100% of telemetry has been silently dropped since this shipped.
// SUPABASE_URL is the Vercel-set canonical var.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (SUPABASE_URL && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  if (!supabase) {
    // Misconfigured env — surface in logs rather than swallow silently.
    // Still 200 to client so analytics never breaks UX.
    console.error('[analytics/track] supabase client unavailable — check SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
    return res.status(200).json({ ok: true, sink: 'disabled' });
  }

  const { event_name, category, label, value, properties } = req.body ?? {};

  if (!event_name || typeof event_name !== 'string') {
    return res.status(400).json({ error: 'event_name required' });
  }

  // Optionally resolve user from JWT — anonymous events are allowed
  let userId = null;
  const authHeader = req.headers['authorization'] ?? '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (jwt) {
    const { data: { user } } = await supabase.auth.getUser(jwt).catch(() => ({ data: { user: null } }));
    userId = user?.id ?? null;
  }

  const row = {
    event_name,
    category:   category ?? null,
    label:      label ?? null,
    value:      typeof value === 'number' ? value : null,
    properties: properties ?? null,
    user_id:    userId,
    path:       req.headers['referer'] ?? null,
    user_agent: req.headers['user-agent'] ?? null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('analytics_events').insert(row);

  if (error) {
    // Log but return 200 — client should never retry analytics
    console.error('[analytics/track] insert error:', error.message, { event_name });
    return res.status(200).json({ ok: true, sink: 'error' });
  }

  return res.status(200).json({ ok: true });
}
