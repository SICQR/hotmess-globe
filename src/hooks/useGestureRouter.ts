/**
 * useGestureRouter — Ghosted's conflict-resolved gesture taxonomy.
 *
 * Implements §1.1 + §1.4 of the interaction bible. Disambiguates
 * swipe-x / drag-up / drag-down / tap / long-press on a single touch
 * stream so consumers (ProfileMediaStack, IntentLayer) never have to
 * unwind overlapping gestures themselves.
 *
 * Contract: one gesture per touch, decided in the first 100ms,
 * locked for the duration. Diagonal-1:1 for ≥1s = tap-cancel, silent.
 */

import { useEffect, useRef, RefObject } from 'react'

export type GestureKind =
  | 'swipe-x-left'
  | 'swipe-x-right'
  | 'drag-up'
  | 'drag-down'
  | 'tap'
  | 'long-press'
  | 'cancelled'

export interface GestureEvent {
  kind:      GestureKind
  durationMs: number
  deltaPx:    { x: number; y: number }
  velocityPxMs: { x: number; y: number }
  startedAt:  number
}

export interface GestureRouterOpts {
  onGesture:        (e: GestureEvent) => void
  onDrag?:          (delta: { x: number; y: number }, kind: GestureKind | null) => void
  /** Hold threshold for long-press, default 480ms per bible */
  longPressMs?:     number
  /** Tap max duration, default 200ms */
  tapMs?:           number
  /** Tap max travel, default 4px */
  tapTravelPx?:     number
  /** Decision window in ms — direction must declare itself within this */
  decisionMs?:      number
  /** Ratio that locks a gesture as horizontal or vertical (1.5 per bible) */
  lockRatio?:       number
  /** Diagonal cancel — if neither ratio is met for this long, cancel */
  diagonalCancelMs?: number
  enabled?:         boolean
}

const DEFAULTS = {
  longPressMs:     480,
  tapMs:           200,
  tapTravelPx:     4,
  decisionMs:      100,
  lockRatio:       1.5,
  diagonalCancelMs: 1000,
}

interface RouterState {
  startTime:  number
  startX:     number
  startY:     number
  lastX:      number
  lastY:      number
  lockedKind: 'horizontal' | 'vertical' | null
  longPressTimer: ReturnType<typeof setTimeout> | null
  diagonalTimer:  ReturnType<typeof setTimeout> | null
  cancelled:  boolean
}

export function useGestureRouter<T extends HTMLElement>(
  targetRef: RefObject<T>,
  opts: GestureRouterOpts,
): void {
  const cfg = { ...DEFAULTS, ...opts }
  const stateRef = useRef<RouterState | null>(null)
  const optsRef  = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    const el = targetRef.current
    if (!el || cfg.enabled === false) return

    const onStart = (clientX: number, clientY: number) => {
      const t = performance.now()
      const prev = stateRef.current
      if (prev?.longPressTimer)  clearTimeout(prev.longPressTimer)
      if (prev?.diagonalTimer)   clearTimeout(prev.diagonalTimer)

      const s: RouterState = {
        startTime: t, startX: clientX, startY: clientY,
        lastX:     clientX, lastY: clientY,
        lockedKind: null,
        longPressTimer: null,
        diagonalTimer:  null,
        cancelled: false,
      }

      s.longPressTimer = setTimeout(() => {
        if (!stateRef.current) return
        const cur = stateRef.current
        const traveled = Math.hypot(cur.lastX - cur.startX, cur.lastY - cur.startY)
        if (cur.lockedKind === null && traveled < cfg.tapTravelPx) {
          cur.cancelled = true
          fireGesture('long-press', cur, performance.now())
        }
      }, cfg.longPressMs)

      s.diagonalTimer = setTimeout(() => {
        if (!stateRef.current || stateRef.current.lockedKind) return
        const cur = stateRef.current
        cur.cancelled = true
        fireGesture('cancelled', cur, performance.now())
      }, cfg.diagonalCancelMs)

      stateRef.current = s
    }

    const onMove = (clientX: number, clientY: number) => {
      const s = stateRef.current
      if (!s || s.cancelled) return
      s.lastX = clientX
      s.lastY = clientY

      const dx = clientX - s.startX
      const dy = clientY - s.startY
      const absX = Math.abs(dx), absY = Math.abs(dy)
      const since = performance.now() - s.startTime

      if (s.lockedKind === null && since > cfg.decisionMs) {
        if (absX > 0 && absX / Math.max(absY, 0.0001) > cfg.lockRatio) {
          s.lockedKind = 'horizontal'
          if (s.longPressTimer)  clearTimeout(s.longPressTimer)
          if (s.diagonalTimer)   clearTimeout(s.diagonalTimer)
        } else if (absY > 0 && absY / Math.max(absX, 0.0001) > cfg.lockRatio) {
          s.lockedKind = 'vertical'
          if (s.longPressTimer)  clearTimeout(s.longPressTimer)
          if (s.diagonalTimer)   clearTimeout(s.diagonalTimer)
        }
      }

      if (optsRef.current.onDrag) {
        const interimKind: GestureKind | null =
          s.lockedKind === 'horizontal' ? (dx < 0 ? 'swipe-x-left' : 'swipe-x-right')
          : s.lockedKind === 'vertical' ? (dy < 0 ? 'drag-up' : 'drag-down')
          : null
        optsRef.current.onDrag({ x: dx, y: dy }, interimKind)
      }
    }

    const onEnd = () => {
      const s = stateRef.current
      if (!s) return
      stateRef.current = null
      if (s.longPressTimer) clearTimeout(s.longPressTimer)
      if (s.diagonalTimer)  clearTimeout(s.diagonalTimer)
      if (s.cancelled) return

      const now = performance.now()
      const dx = s.lastX - s.startX
      const dy = s.lastY - s.startY
      const absX = Math.abs(dx), absY = Math.abs(dy)
      const duration = now - s.startTime

      if (s.lockedKind === null) {
        // Never locked into a direction — was it a tap?
        if (duration <= cfg.tapMs && Math.hypot(dx, dy) <= cfg.tapTravelPx) {
          fireGesture('tap', s, now)
        } else {
          fireGesture('cancelled', s, now)
        }
        return
      }

      if (s.lockedKind === 'horizontal') {
        fireGesture(dx < 0 ? 'swipe-x-left' : 'swipe-x-right', s, now)
      } else {
        fireGesture(dy < 0 ? 'drag-up' : 'drag-down', s, now)
      }
    }

    const fireGesture = (kind: GestureKind, s: RouterState, now: number) => {
      const duration = now - s.startTime
      const dx = s.lastX - s.startX
      const dy = s.lastY - s.startY
      optsRef.current.onGesture({
        kind,
        durationMs: duration,
        deltaPx: { x: dx, y: dy },
        velocityPxMs: {
          x: duration > 0 ? dx / duration : 0,
          y: duration > 0 ? dy / duration : 0,
        },
        startedAt: s.startTime,
      })
    }

    const touchStart = (e: TouchEvent) => { const t = e.touches[0]; if (t) onStart(t.clientX, t.clientY) }
    const touchMove  = (e: TouchEvent) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY) }
    const touchEnd   = (_e: TouchEvent) => onEnd()
    const pointerDown = (e: PointerEvent) => onStart(e.clientX, e.clientY)
    const pointerMove = (e: PointerEvent) => { if ((e.buttons & 1) || e.pressure > 0) onMove(e.clientX, e.clientY) }
    const pointerUp   = (_e: PointerEvent) => onEnd()

    el.addEventListener('touchstart',   touchStart,   { passive: true })
    el.addEventListener('touchmove',    touchMove,    { passive: true })
    el.addEventListener('touchend',     touchEnd,     { passive: true })
    el.addEventListener('touchcancel',  touchEnd,     { passive: true })
    el.addEventListener('pointerdown',  pointerDown)
    el.addEventListener('pointermove',  pointerMove)
    el.addEventListener('pointerup',    pointerUp)
    el.addEventListener('pointercancel', pointerUp)

    return () => {
      el.removeEventListener('touchstart',   touchStart)
      el.removeEventListener('touchmove',    touchMove)
      el.removeEventListener('touchend',     touchEnd)
      el.removeEventListener('touchcancel',  touchEnd)
      el.removeEventListener('pointerdown',  pointerDown)
      el.removeEventListener('pointermove',  pointerMove)
      el.removeEventListener('pointerup',    pointerUp)
      el.removeEventListener('pointercancel', pointerUp)
      const s = stateRef.current
      if (s?.longPressTimer)  clearTimeout(s.longPressTimer)
      if (s?.diagonalTimer)   clearTimeout(s.diagonalTimer)
      stateRef.current = null
    }
  }, [targetRef, cfg.enabled, cfg.longPressMs, cfg.tapMs, cfg.tapTravelPx, cfg.decisionMs, cfg.lockRatio, cfg.diagonalCancelMs])
}

export default useGestureRouter
