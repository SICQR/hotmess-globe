/**
 * useRecoveryState — surfaces the 2 Phase A recovery triggers for a profile.
 *
 * Bible Part 7 + Phil exec review 2026-05-13. SCOPE LOCKED to two triggers:
 *
 *   1. meetup_completed   — viewer + profile completed a meetup recently.
 *                            Reads from `meetups` table (stub returns false
 *                            until the meetup state machine lands).
 *   2. location_revoked   — relationship is mutual, but the profile owner
 *                            has location_consent === false. They opted out
 *                            of sharing; offer a re-share CTA.
 *
 * EXPLICITLY OUT OF SCOPE for v0.1:
 *   - 4am check-ins
 *   - Sunday morning anything
 *   - "Home safe?" prompts
 *   - Any ambient care surface beyond the 2 mechanical triggers above.
 *
 * The gate is mechanical legibility. Both triggers map to a clear user
 * action ("we met" / "they stopped sharing"). Once we see how those two
 * read in production, ambient care can expand from there.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/components/utils/supabaseClient'

export interface RecoveryTriggers {
  meetup_completed:  boolean
  location_revoked:  boolean
  /** ISO timestamp of the most recent completed meetup, if any. */
  meetup_completed_at?: string | null
}

export interface UseRecoveryStateOpts {
  /** Viewer's auth user id. Null when signed out. */
  viewerId:        string | null
  /** Profile being viewed. */
  profileId:       string | null
  /** Current relationship state for this profile pairing. */
  relationship:    'none' | 'i_booed_them' | 'they_booed_me' | 'mutual' | 'expired' | 'blocked'
  /** Profile owner's location_consent flag. */
  ownerLocationConsent?: boolean | null
  /** Gate (v6 flag) — when false the hook is a no-op. */
  enabled:         boolean
}

const EMPTY: RecoveryTriggers = {
  meetup_completed:    false,
  location_revoked:    false,
  meetup_completed_at: null,
}

/** Window during which a completed meetup still surfaces a care card. */
const MEETUP_RECENT_DAYS = 7

export function useRecoveryState({
  viewerId, profileId, relationship, ownerLocationConsent, enabled,
}: UseRecoveryStateOpts): RecoveryTriggers {
  const [triggers, setTriggers] = useState<RecoveryTriggers>(EMPTY)

  // ── location_revoked — synchronous against props ──────────────────────
  const locationRevoked =
    (relationship === 'mutual' || relationship === 'expired') &&
    ownerLocationConsent === false

  useEffect(() => {
    if (!enabled || !viewerId || !profileId) {
      setTriggers(EMPTY)
      return
    }

    // location_revoked composes from current props (no async needed)
    let cancelled = false

    // meetup_completed — query the meetups table. The table may not exist
    // yet (state machine pending); we degrade gracefully to false.
    const checkMeetup = async () => {
      try {
        const sinceIso = new Date(
          Date.now() - MEETUP_RECENT_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString()
        const { data, error } = await supabase
          .from('meetups')
          .select('id, completed_at, state')
          .eq('state', 'completed')
          .gte('completed_at', sinceIso)
          .or(`and(viewer_id.eq.${viewerId},other_id.eq.${profileId}),and(viewer_id.eq.${profileId},other_id.eq.${viewerId})`)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        if (error) {
          // 42P01 = table does not exist. Expected pre-state-machine.
          setTriggers({
            meetup_completed:    false,
            location_revoked:    locationRevoked,
            meetup_completed_at: null,
          })
          return
        }
        setTriggers({
          meetup_completed:    !!data?.completed_at,
          location_revoked:    locationRevoked,
          meetup_completed_at: data?.completed_at ?? null,
        })
      } catch {
        if (cancelled) return
        setTriggers({
          meetup_completed:    false,
          location_revoked:    locationRevoked,
          meetup_completed_at: null,
        })
      }
    }

    void checkMeetup()
    return () => { cancelled = true }
  }, [enabled, viewerId, profileId, relationship, ownerLocationConsent, locationRevoked])

  return triggers
}

export default useRecoveryState
