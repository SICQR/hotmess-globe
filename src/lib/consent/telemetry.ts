/**
 * consent telemetry — append-only log of blocked / failed consent events
 *
 * Phil's exec doctrine 2026-05-20: "Add telemetry for blocked non-mutual
 * interaction attempts, expired location sessions, silent insert failures,
 * permission-denied cases."
 *
 * Fire-and-forget. Never throws. Never blocks UI. RLS scopes writes to
 * `user_id = auth.uid()`.
 */
import { supabase } from '@/components/utils/supabaseClient';

export type ConsentBlockAction =
  | 'message'
  | 'share_location'
  | 'meet'
  | 'uber'
  | 'suggest_stop'
  | 'silent_insert_fail'
  | 'permission_denied'
  | 'location_session_expired';

export type ConsentBlockReason =
  | 'no_mutual_boo'
  | 'expired'
  | 'revoked'
  | 'silent_fail'
  | 'rls_denied'
  | 'other';

export interface LogConsentBlockArgs {
  userId: string;
  targetId?: string | null;
  action: ConsentBlockAction;
  reason: ConsentBlockReason;
  context?: Record<string, unknown>;
}

export async function logConsentBlock({
  userId,
  targetId,
  action,
  reason,
  context,
}: LogConsentBlockArgs): Promise<void> {
  try {
    await supabase.from('consent_blocks').insert({
      user_id: userId,
      target_id: targetId ?? null,
      action_type: action,
      reason,
      context: context ?? {},
    });
  } catch (err) {
    // Telemetry must never break the user flow.
    if (typeof console !== 'undefined') {
      console.warn('[consent_blocks] log failed', err);
    }
  }
}
