/**
 * IntentLayer — pressure-sensitive intent surface for the profile shell.
 *
 * Bible §4 + Phil exec review 2026-05-13 constraints:
 *
 *   - The profile LOOSENS OPEN — it does NOT slide a sheet upward.
 *   - The HERO compresses under drag (top-center origin) so its lower edge
 *     drifts upward, freeing space at the bottom.
 *   - BOO is ANCHORED. It never translates. It never shrinks. Ever.
 *   - Secondary actions fade through in the freed space — they never rival
 *     BOO and are visually subordinate (smaller, dimmer, lower-contrast).
 *   - Drag is continuous. Opacity + scale curves are pressure-sensitive,
 *     not modal on/off snaps.
 *
 * State machine (still useful for analytics + haptics):
 *   dormant → priming → armed → committed → retracting → dormant
 *
 * `committed` is the rest state at INTENT.commitAt drag fraction — actions
 * are fully readable, BOO still anchored. Dragging down past
 * THRESHOLDS.dragDownIntent.distance retracts.
 */

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import useGestureRouter, { GestureEvent } from '@/hooks/useGestureRouter'
import { SPRING_PRIMARY, SPRING_RUBBER, INTENT, THRESHOLDS } from '@/lib/ghosted/physics'

export type IntentState = 'dormant' | 'priming' | 'armed' | 'committed' | 'retracting'

export interface IntentAction {
  id:    string
  label: string
  icon:  ReactNode
  tone?: 'default' | 'danger'
  onTap: () => void
}

export interface IntentLayerProps {
  /** The photo/media surface that compresses — passed as children. */
  children:         ReactNode
  /** BOO — anchored, never shrinks, never translates. */
  primary:          ReactNode
  /** Up to 4 secondary actions revealed in the freed space. */
  actions:          IntentAction[]
  state?:           IntentState
  onStateChange?:   (s: IntentState) => void
  className?:       string
}

export function IntentLayer({
  children, primary, actions, onStateChange, className = '',
}: IntentLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<IntentState>('dormant')
  const [containerH, setContainerH] = useState(0)
  /**
   * One source of truth for the drag offset. Negative values = upward drag.
   * Hero scale + actions opacity both useTransform off this. Springs animate
   * this motion value directly via framer-motion's `animate()` so no DOM
   * element ever translates — BOO stays anchored as a matter of construction.
   */
  const y = useMotionValue(0)

  const setS = useCallback((s: IntentState) => {
    setState(s)
    onStateChange?.(s)
  }, [onStateChange])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setContainerH(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cardH = containerH || 1

  // Hero compresses top-center → lower edge drifts upward → space appears
  // below for the action layer to fade through. Continuous, pressure-sensitive.
  const heroScale = useTransform(y, (raw) => {
    const drag = Math.max(0, -raw)
    const frac = Math.min(drag / cardH, INTENT.maxDrag)
    if (frac < INTENT.primingFrom) return 1
    if (frac < INTENT.armedFrom) {
      // Pre-armed: gentle compression starts at primingFrom
      const t = (frac - INTENT.primingFrom) / (INTENT.armedFrom - INTENT.primingFrom)
      return 1 - t * (1 - INTENT.heroScaleAtArmed) * 0.45
    }
    if (frac < INTENT.commitAt) {
      const t = (frac - INTENT.armedFrom) / (INTENT.commitAt - INTENT.armedFrom)
      return 1 - t * (1 - INTENT.heroScaleAtArmed)
    }
    const t = Math.min(1, (frac - INTENT.commitAt) / (INTENT.maxDrag - INTENT.commitAt))
    return INTENT.heroScaleAtArmed - t * (INTENT.heroScaleAtArmed - INTENT.heroScaleAtCommit)
  })

  // Actions fade through. 0.0 at dormant, ~0.35 at armed, 1.0 by commit.
  const actionsOpacity = useTransform(y, (raw) => {
    const drag = Math.max(0, -raw)
    const frac = Math.min(drag / cardH, INTENT.maxDrag)
    if (frac < INTENT.primingFrom) return 0
    if (frac < INTENT.armedFrom) {
      return ((frac - INTENT.primingFrom) / (INTENT.armedFrom - INTENT.primingFrom)) * 0.35
    }
    return 0.35 + Math.min(1, (frac - INTENT.armedFrom) / (INTENT.commitAt - INTENT.armedFrom)) * 0.65
  })

  // Actions sit in space freed by hero compression. Tiny lift only — they
  // do NOT slide as a sheet. Pure opacity reveal is the dominant feel.
  const actionsLift = useTransform(y, (raw) => {
    const drag = Math.max(0, -raw)
    const frac = Math.min(drag / cardH, INTENT.maxDrag)
    if (frac < INTENT.primingFrom) return 6
    return Math.max(0, 6 - (frac - INTENT.primingFrom) * 18)
  })

  // ── Spring the motion value, never the DOM. BOO stays anchored. ────────
  const commitToArmed = () => {
    setS('committed')
    animate(y, -cardH * INTENT.commitAt, {
      type:      'spring',
      stiffness: SPRING_PRIMARY.tension,
      damping:   SPRING_PRIMARY.friction,
      mass:      SPRING_PRIMARY.mass,
    })
  }

  const retractToDormant = () => {
    setS('retracting')
    animate(y, 0, {
      type:      'spring',
      stiffness: SPRING_RUBBER.tension,
      damping:   SPRING_RUBBER.friction,
      mass:      SPRING_RUBBER.mass,
      onComplete: () => setS('dormant'),
    })
  }

  const onDrag = (delta: { x: number; y: number }, kind: string | null) => {
    if (kind !== 'drag-up' && kind !== 'drag-down') return
    if (state === 'committed') {
      const dy = delta.y
      const fromCommit = -cardH * INTENT.commitAt + dy
      const clamped = Math.max(-cardH * INTENT.maxDrag, Math.min(0, fromCommit))
      y.set(clamped)
      return
    }
    let dy = delta.y
    if (dy < 0) {
      const absDy = -dy
      if (absDy > cardH * INTENT.maxDrag) {
        dy = -cardH * INTENT.maxDrag - (absDy - cardH * INTENT.maxDrag) * THRESHOLDS.dragUp.boundaryElastic
      }
    }
    if (dy > 0 && state === 'dormant') {
      y.set(0)
      return
    }
    y.set(dy)
    const drag = Math.max(0, -dy)
    const frac = drag / cardH
    if      (frac < INTENT.primingFrom)  setS('dormant')
    else if (frac < INTENT.armedFrom)    setS('priming')
    else                                  setS('armed')
  }

  const onGesture = (e: GestureEvent) => {
    if (state === 'committed') {
      if (e.kind === 'drag-down') {
        const dy = e.deltaPx.y
        const ratio = dy / cardH
        const passDistance = ratio > THRESHOLDS.dragDownIntent.distance
        const passVelocity = e.velocityPxMs.y > THRESHOLDS.dragDownIntent.velocity
        if (passDistance || passVelocity) return retractToDormant()
        return commitToArmed()
      }
      return commitToArmed()
    }
    if (e.kind === 'drag-up') {
      const dy = -e.deltaPx.y
      const ratio = dy / cardH
      const vUp   = -e.velocityPxMs.y
      if (ratio > INTENT.commitAt || vUp > THRESHOLDS.dragUp.velocity) {
        return commitToArmed()
      }
      return retractToDormant()
    }
    if (e.kind === 'drag-down' || e.kind === 'cancelled') {
      return retractToDormant()
    }
  }

  useGestureRouter(ref, { onGesture, onDrag, enabled: true })

  // Cap at 4 visible — no utility overload above the fold.
  const visible = actions.slice(0, 4)

  return (
    <div
      ref={ref}
      className={`flex flex-col ${className}`}
      style={{
        touchAction: 'pan-x pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Photo subregion — hero compresses inside, actions fade in the
          freed space at the bottom of this subregion. */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{
            scale: heroScale,
            transformOrigin: 'top center',
          }}
        >
          {children}
        </motion.div>

        {/* Secondary actions — fade through in the space hero compression
            uncovers. Pointer-events activate at committed so dormant taps
            still pass through to the photo (e.g. tap-to-next-image). */}
        <motion.div
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            opacity: actionsOpacity,
            y: actionsLift,
            padding: '0 14px 12px',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(visible.length, 1)}, 1fr)`,
            gap: 6,
            pointerEvents: state === 'committed' ? 'auto' : 'none',
          }}
        >
          {visible.map((a) => (
            <button
              key={a.id}
              onClick={a.onTap}
              aria-label={a.label}
              style={{
                padding: '7px 6px',
                borderRadius: 2,
                background: a.tone === 'danger'
                  ? 'rgba(255,80,80,0.05)'
                  : 'rgba(200,150,44,0.04)',
                border: a.tone === 'danger'
                  ? '0.5px solid rgba(255,80,80,0.16)'
                  : '0.5px solid rgba(200,150,44,0.14)',
                color: a.tone === 'danger' ? '#ff6060' : 'rgba(200,150,44,0.78)',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.75 }}>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* BOO subregion — anchored as a flex sibling BELOW the photo. Always
          visible. Never translates, never shrinks. Receives taps in every
          state because pressing BOO is the only thing that never feels
          wrong. */}
      <div style={{ flexShrink: 0, padding: '10px 14px 14px', pointerEvents: 'auto' }}>
        {primary}
      </div>
    </div>
  )
}

export default IntentLayer
