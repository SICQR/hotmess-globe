/**
 * IntentLayer — the upward-drag choreography that reveals secondary actions
 * beneath the profile photo without ever competing with BOO.
 *
 * Bible §4 implementation. State machine:
 *   dormant → priming → armed → committed → retract → dormant
 *
 * BOO remains centered, gold, full-size at every stage. Actions reveal
 * beneath/around it; they never replace it.
 *
 * Physics: SPRING_PRIMARY for commit, SPRING_RUBBER for retract. Hero
 * compression scale 1 → 0.85 (armed) → 0.65 (committed), origin top-center.
 *
 * Closing the profile (parent-driven) collapses intent to dormant. State
 * does NOT persist across opens.
 */

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useAnimation, useTransform } from 'framer-motion'
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
  hero:             ReactNode
  primary:          ReactNode
  actions:          IntentAction[]
  state?:           IntentState
  onStateChange?:   (s: IntentState) => void
  /** Optional override of card height for fraction calculation */
  cardHeight?:      number
  className?:       string
}

export function IntentLayer({
  hero, primary, actions, onStateChange, className = '',
}: IntentLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<IntentState>('dormant')
  const [containerH, setContainerH] = useState(0)
  const y = useMotionValue(0)
  const controls = useAnimation()

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
  const heroScale = useTransform(y, (raw) => {
    const drag = Math.max(0, -raw)
    const frac = Math.min(drag / cardH, INTENT.maxDrag)
    if (frac < INTENT.armedFrom) return 1
    if (frac < INTENT.commitAt) {
      const t = (frac - INTENT.armedFrom) / (INTENT.commitAt - INTENT.armedFrom)
      return 1 - t * (1 - INTENT.heroScaleAtArmed)
    }
    return INTENT.heroScaleAtArmed - (frac - INTENT.commitAt) * (INTENT.heroScaleAtArmed - INTENT.heroScaleAtCommit)
  })
  const actionsOpacity = useTransform(y, (raw) => {
    const drag = Math.max(0, -raw)
    const frac = Math.min(drag / cardH, INTENT.maxDrag)
    if (frac < INTENT.primingFrom) return 0
    if (frac < INTENT.armedFrom) {
      return (frac - INTENT.primingFrom) / (INTENT.armedFrom - INTENT.primingFrom) * 0.4
    }
    return 0.4 + Math.min(1, (frac - INTENT.armedFrom) / (INTENT.commitAt - INTENT.armedFrom)) * 0.6
  })

  const commitToArmed = async () => {
    setS('committed')
    await controls.start({
      y: -cardH * INTENT.commitAt,
      transition: {
        type: 'spring',
        stiffness: SPRING_PRIMARY.tension,
        damping: SPRING_PRIMARY.friction,
        mass: SPRING_PRIMARY.mass,
      },
    })
  }

  const retractToDormant = async () => {
    setS('retracting')
    await controls.start({
      y: 0,
      transition: {
        type: 'spring',
        stiffness: SPRING_RUBBER.tension,
        damping: SPRING_RUBBER.friction,
        mass: SPRING_RUBBER.mass,
      },
    })
    setS('dormant')
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

  return (
    <div
      ref={ref}
      className={`relative flex flex-col ${className}`}
      style={{
        touchAction: 'pan-x pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          scale: heroScale,
          transformOrigin: 'top center',
          flex: '1 1 auto',
          minHeight: 0,
        }}
        animate={controls}
      >
        {hero}
      </motion.div>

      <motion.div
        style={{
          y,
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          padding: '14px 14px 18px',
          background: 'linear-gradient(to top, rgba(5,5,7,0.98) 50%, transparent 100%)',
        }}
        animate={controls}
      >
        {primary}
        <motion.div
          style={{
            opacity: actionsOpacity,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginTop: 10,
            pointerEvents: state === 'committed' ? 'auto' : 'none',
          }}
        >
          {actions.slice(0, 8).map((a) => (
            <button
              key={a.id}
              onClick={a.onTap}
              aria-label={a.label}
              style={{
                padding: '8px 6px',
                borderRadius: 3,
                background: a.tone === 'danger' ? 'rgba(255,80,80,0.06)' : 'rgba(200,150,44,0.06)',
                border: a.tone === 'danger' ? '0.5px solid rgba(255,80,80,0.18)' : '0.5px solid rgba(200,150,44,0.18)',
                color: a.tone === 'danger' ? '#ff6060' : '#C8962C',
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
              <span style={{ fontSize: 14, lineHeight: 1 }}>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default IntentLayer
