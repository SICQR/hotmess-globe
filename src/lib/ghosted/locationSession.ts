/**
 * ghosted_location_sessions — temp, mutual-gated, expirable location shares
 *
 * Phil's exec doctrine 2026-05-20:
 *   "Ghosted location sharing:
 *     - mutual Boo required
 *     - temporary session only
 *     - expiry timer required
 *     - no permanent coordinates stored in chat history
 *     - revoke anytime"
 *
 * Coordinates live in this table (with hard expiry + revocation), NOT in
 * the chat message body. The chat message references the session by id;
 * once expired or revoked, the recipient sees "Location expired" instead
 * of a map.
 */
import { supabase } from '@/components/utils/supabaseClient';
import { safeInsert } from '@/lib/safeInsert';
import { logConsentBlock } from '@/lib/consent/telemetry';

export const DEFAULT_LOCATION_TTL_MIN = 15;

export type GhostedLocationSessionRow = {
  id: string;
  thread_id: string;
  sharer_id: string;
  recipient_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  [key: string]: unknown;
};

export interface CreateLocationSessionArgs {
  threadId: string;
  sharerId: string;
  recipientId: string;
  lat: number;
  lng: number;
  accuracyM?: number | null;
  ttlMinutes?: number;
}

const ALLOWED_COLUMNS = [
  'thread_id', 'sharer_id', 'recipient_id', 'lat', 'lng',
  'accuracy_m', 'expires_at',
] as const;

export async function createLocationSession(args: CreateLocationSessionArgs) {
  const ttl = Math.max(1, Math.min(180, args.ttlMinutes ?? DEFAULT_LOCATION_TTL_MIN));
  const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();

  const res = await safeInsert<GhostedLocationSessionRow>(
    'ghosted_location_sessions',
    ALLOWED_COLUMNS,
    {
      thread_id: args.threadId,
      sharer_id: args.sharerId,
      recipient_id: args.recipientId,
      lat: args.lat,
      lng: args.lng,
      accuracy_m: args.accuracyM ?? null,
      expires_at: expiresAt,
    },
  );

  if (!res.ok) {
    // Server rejection — likely RLS denial (no mutual). Log it.
    void logConsentBlock({
      userId: args.sharerId,
      targetId: args.recipientId,
      action: 'share_location',
      reason: res.error?.toLowerCase().includes('row-level') ? 'rls_denied' : 'silent_fail',
      context: { table: 'ghosted_location_sessions', error: res.error },
    });
  }

  return res;
}

export async function revokeLocationSession(sessionId: string, sharerId: string) {
  const { error } = await supabase
    .from('ghosted_location_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('sharer_id', sharerId);

  if (error) {
    void logConsentBlock({
      userId: sharerId,
      action: 'permission_denied',
      reason: 'rls_denied',
      context: { table: 'ghosted_location_sessions', op: 'revoke', error: error.message },
    });
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
