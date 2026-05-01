/**
 * src/lib/analytics.ts — Chunk 17c
 *
 * Client-side analytics helper. Fire-and-forget POST to /api/analytics/track.
 * Never blocks rendering. Never throws to callers.
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('signup', 'onboarding', 'google_oauth');
 *   track('flag_exposure', 'flags', undefined, undefined, { flag_key: 'v6_aa_system' });
 */

export interface TrackEvent {
  event_name:  string;
  category?:   string;
  label?:      string;
  value?:      number;
  properties?: Record<string, unknown>;
}

/**
 * track — send a single analytics event.
 * Errors are swallowed — analytics must never disrupt user flow.
 */
export function track(
  event_name: string,
  category?:  string,
  label?:     string,
  value?:     number,
  properties?: Record<string, unknown>,
): void {
  const payload: TrackEvent = { event_name, category, label, value, properties };

  // Best-effort POST — no await, no catch bubbling
  fetch('/api/analytics/track', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    // keepalive allows the request to outlive page unload
    keepalive: true,
  }).catch(() => { /* swallow — analytics must not disrupt UX */ });
}

/**
 * trackOnce — send an event only once per session per key.
 * Useful for flag_exposure and first_* events to avoid flooding.
 */
const _sent = new Set<string>();

export function trackOnce(
  dedupeKey:   string,
  event_name:  string,
  category?:   string,
  label?:      string,
  value?:      number,
  properties?: Record<string, unknown>,
): void {
  if (_sent.has(dedupeKey)) return;
  _sent.add(dedupeKey);
  track(event_name, category, label, value, properties);
}
