/**
 * useProfileDwell — instrumentation for the Ghosted controlled-reveal theory.
 *
 * Per Phil's Phase A exec review (2026-05-13), profile dwell progression is
 * THE calibration metric. Not retention. Not DAU. We need to know whether
 * the weighted swipe + first-image lock is increasing exploration or
 * suppressing it, and whether BOO conversion correlates with image depth.
 *
 * Events fired (via /api/analytics/track):
 *   profile_open            on mount
 *   profile_image_view      on every index advance (new index, dwell on previous)
 *   profile_boo_at_index    when user calls trackBoo()
 *   profile_drag_up_attempt when user calls trackDragUp(state)
 *   profile_close           on unmount (max index reached, total dwell, per-image dwell)
 *
 * Gating dependency: this hook must be live before v6_ghosted_loop is
 * flipped beyond Phil's account.
 */

import { useCallback, useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

export interface UseProfileDwellOpts {
  /** Stable profile UUID being viewed. Required for event correlation. */
  profileId:     string | null
  /** Current image index in ProfileMediaStack. */
  currentIndex:  number
  /** Total number of photos in the stack (for dwell-per-image normalisation). */
  totalImages:   number
  /** True while the profile sheet is mounted/visible. */
  isOpen:        boolean
  /** Whether the v6 loop is active for this session (gates all telemetry). */
  v6Enabled:     boolean
}

export interface ProfileDwellApi {
  /** Fire when user taps BOO — records image depth at conversion. */
  trackBoo:        (mutual: boolean) => void
  /** Fire when intent-layer drag-up enters a new state (priming/armed/committed). */
  trackDragUp:     (state: 'priming' | 'armed' | 'committed' | 'cancelled') => void
}

export function useProfileDwell({
  profileId, currentIndex, totalImages, isOpen, v6Enabled,
}: UseProfileDwellOpts): ProfileDwellApi {
  const openedAtRef        = useRef<number | null>(null)
  const lastChangeAtRef    = useRef<number | null>(null)
  const lastIndexRef       = useRef<number>(0)
  const maxIndexRef        = useRef<number>(0)
  const dwellPerImageRef   = useRef<Record<number, number>>({})
  const firedOpenRef       = useRef<boolean>(false)
  const firedCloseRef      = useRef<boolean>(false)
  const firedFirstSwipeRef = useRef<boolean>(false)
  const firstSwipeMsRef    = useRef<number | null>(null)

  // ── Lifecycle: open + close ────────────────────────────────────────────
  useEffect(() => {
    if (!v6Enabled || !isOpen || !profileId) return
    if (firedOpenRef.current) return
    firedOpenRef.current        = true
    firedCloseRef.current       = false
    firedFirstSwipeRef.current  = false
    firstSwipeMsRef.current     = null
    const now = performance.now()
    openedAtRef.current     = now
    lastChangeAtRef.current = now
    lastIndexRef.current    = 0
    maxIndexRef.current     = 0
    dwellPerImageRef.current = {}
    track('profile_open', 'ghosted', profileId, undefined, {
      profile_id:   profileId,
      total_images: totalImages,
    })

    return () => {
      // Fire close on unmount, exactly once
      if (firedCloseRef.current) return
      firedCloseRef.current = true
      const closedAt   = performance.now()
      const openedAt   = openedAtRef.current   ?? closedAt
      const lastChange = lastChangeAtRef.current ?? closedAt
      // Credit final image dwell
      const finalDwell = Math.round(closedAt - lastChange)
      dwellPerImageRef.current[lastIndexRef.current] =
        (dwellPerImageRef.current[lastIndexRef.current] ?? 0) + finalDwell
      const totalDwell = Math.round(closedAt - openedAt)
      track('profile_close', 'ghosted', profileId, totalDwell, {
        profile_id:           profileId,
        max_index_reached:    maxIndexRef.current,
        total_images:         totalImages,
        total_dwell_ms:       totalDwell,
        dwell_per_image:      dwellPerImageRef.current,
        completion_pct:       totalImages > 0
          ? Math.round((maxIndexRef.current + 1) / totalImages * 100)
          : 0,
        time_to_first_swipe_ms: firstSwipeMsRef.current,
        ever_swiped:            firedFirstSwipeRef.current,
      })
      firedOpenRef.current = false
    }
  // We want this effect to run only when isOpen flips to true (or profileId
  // changes). Deliberately leaving totalImages out to keep the open event
  // single-fire — totalImages can drift as photos preload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v6Enabled, isOpen, profileId])

  // ── Index advance tracking ─────────────────────────────────────────────
  useEffect(() => {
    if (!v6Enabled || !isOpen || !profileId) return
    if (currentIndex === lastIndexRef.current) return

    const now = performance.now()
    const prevIndex = lastIndexRef.current
    const dwellOnPrev = Math.round(now - (lastChangeAtRef.current ?? now))

    dwellPerImageRef.current[prevIndex] =
      (dwellPerImageRef.current[prevIndex] ?? 0) + dwellOnPrev

    lastIndexRef.current     = currentIndex
    lastChangeAtRef.current  = now
    if (currentIndex > maxIndexRef.current) maxIndexRef.current = currentIndex

    track('profile_image_view', 'ghosted', profileId, currentIndex, {
      profile_id:        profileId,
      previous_index:    prevIndex,
      new_index:         currentIndex,
      dwell_on_prev_ms:  dwellOnPrev,
      total_images:      totalImages,
    })

    // Hidden metric — fires once per session, on the FIRST swipe away from
    // image 0. Surfaces whether the first-image lock pauses users naturally
    // or pushes them to instantly escape. Phil exec review 2026-05-13.
    if (!firedFirstSwipeRef.current && prevIndex === 0 && currentIndex !== 0) {
      firedFirstSwipeRef.current = true
      const openedAt   = openedAtRef.current ?? now
      const elapsedMs  = Math.round(now - openedAt)
      firstSwipeMsRef.current = elapsedMs
      track('profile_first_swipe', 'ghosted', profileId, elapsedMs, {
        profile_id:    profileId,
        elapsed_ms:    elapsedMs,
        direction:     currentIndex > 0 ? 'forward' : 'backward',
        total_images:  totalImages,
      })
    }
  }, [currentIndex, v6Enabled, isOpen, profileId, totalImages])

  // ── Public API ─────────────────────────────────────────────────────────
  const trackBoo = useCallback((mutual: boolean) => {
    if (!v6Enabled || !profileId) return
    track('profile_boo_at_index', 'ghosted', profileId, lastIndexRef.current, {
      profile_id:       profileId,
      image_index:      lastIndexRef.current,
      max_index_seen:   maxIndexRef.current,
      total_images:     totalImages,
      resulted_mutual:  mutual,
    })
  }, [v6Enabled, profileId, totalImages])

  const trackDragUp = useCallback((state: 'priming' | 'armed' | 'committed' | 'cancelled') => {
    if (!v6Enabled || !profileId) return
    track('profile_drag_up_attempt', 'ghosted', profileId, undefined, {
      profile_id:    profileId,
      drag_state:    state,
      image_index:   lastIndexRef.current,
    })
  }, [v6Enabled, profileId])

  return { trackBoo, trackDragUp }
}

export default useProfileDwell
