/**
 * ProfileMediaStack — the swipeable photo surface inside the profile shell.
 *
 * Bible §2 (Profile Media Physics) + §1 (Drag System) implementation.
 *
 * Behaviour summary — see ../../lib/ghosted/physics.ts for all constants:
 *   - Hero image 100% width, next image peeks 11/8/6px on the right edge
 *   - swipe-x via useGestureRouter; horizontal-locked, no fullscreen escape
 *   - First-image lock 600ms on first view — swipe-x rejected before timer
 *   - Spring commit on release past 35% distance OR velocity > 0.6 px/ms
 *   - Rubber-band 0.30 elastic at first / last image
 *   - object-fit: cover, object-position: center 35% (per market lessons)
 *   - Touch-action: pan-x — disables iOS pinch / safari image-action
 *
 * States: idle / dragging-x / peeking-next / transitioning / locked-after-mutual
 *
 * NOTE: This is the Phase A scaffold. Full spring physics integration via
 * Framer Motion is wired but spring values come from physics.ts constants,
 * NOT from inline tuning. Engineers do NOT modify spring numbers here.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useAnimation } from 'framer-motion'
import useGestureRouter, { GestureEvent } from '@/hooks/useGestureRouter'
import {
  SPRING_PRIMARY, SPRING_RUBBER, THRESHOLDS, IMAGE_STACK,
} from '@/lib/ghosted/physics'

export type StackState = 'idle' | 'dragging-x' | 'peeking-next' | 'transitioning' | 'locked-after-mutual'

export interface ProfileMediaStackProps {
  images:            string[]
  isMutual?:         boolean
  /** Recovery state — softens the gold border per bible Part 7. */
  softBorder?:       boolean
  onIndexChange?:    (i: number) => void
  className?:        string
  /** Aspect ratio of the card — bible default 9:13 portrait */
  aspect?:           string
}

function pickPeekPx(viewportWidth: number): number {
  if (viewportWidth >= 390) return IMAGE_STACK.edgePeekPx.wide
  if (viewportWidth >= 360) return IMAGE_STACK.edgePeekPx.narrow
  return IMAGE_STACK.edgePeekPx.floor
}

export function ProfileMediaStack({
  images, isMutual = false, softBorder = false, onIndexChange, className = '', aspect = '9 / 13',
}: ProfileMediaStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex]      = useState(0)
  const [state, setState]      = useState<StackState>('idle')
  const [containerW, setContainerW] = useState(0)
  const [lockExpired, setLockExpired] = useState(false)
  const x = useMotionValue(0)
  const controls = useAnimation()

  const peekPx = useMemo(() => pickPeekPx(typeof window !== 'undefined' ? window.innerWidth : 414), [])
  const cardWidth = containerW || 1

  // First-image lock — 600ms after mount, swipe-x is rejected
  useEffect(() => {
    const t = setTimeout(() => setLockExpired(true), IMAGE_STACK.firstImageLockMs)
    return () => clearTimeout(t)
  }, [])

  // Measure container width for distance-fraction calculations
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerW(el.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const canGoNext = index < images.length - 1
  const canGoPrev = index > 0

  const commitTo = async (target: number, fromX: number) => {
    setState('transitioning')
    await controls.start({
      x: 0,
      transition: {
        type: 'spring',
        stiffness: SPRING_PRIMARY.tension,
        damping: SPRING_PRIMARY.friction,
        mass: SPRING_PRIMARY.mass,
      },
    })
    x.set(0)
    setIndex(target)
    setState(isMutual ? 'locked-after-mutual' : 'idle')
    onIndexChange?.(target)
  }

  const rubberBackToZero = async () => {
    setState('transitioning')
    await controls.start({
      x: 0,
      transition: {
        type: 'spring',
        stiffness: SPRING_RUBBER.tension,
        damping: SPRING_RUBBER.friction,
        mass: SPRING_RUBBER.mass,
      },
    })
    setState(isMutual ? 'locked-after-mutual' : 'idle')
  }

  // Live drag tracking
  const onDrag = (delta: { x: number; y: number }, kind: string | null) => {
    if (kind !== 'swipe-x-left' && kind !== 'swipe-x-right') return
    // First-image lock guard
    if (!lockExpired) return
    // Apply boundary rubber on first/last image
    let dx = delta.x
    if ((dx < 0 && !canGoNext) || (dx > 0 && !canGoPrev)) {
      dx = dx * THRESHOLDS.swipeX.boundaryElastic
    }
    x.set(dx)
    setState(Math.abs(dx) / cardWidth > 0.18 ? 'peeking-next' : 'dragging-x')
  }

  const onGesture = (e: GestureEvent) => {
    if (e.kind === 'swipe-x-left' || e.kind === 'swipe-x-right') {
      if (!lockExpired) { rubberBackToZero(); return }
      const dx        = e.deltaPx.x
      const ratio     = Math.abs(dx) / cardWidth
      const vAbs      = Math.abs(e.velocityPxMs.x)
      const wantsNext = dx < 0
      const wantsPrev = dx > 0
      const passDistance = ratio > THRESHOLDS.swipeX.distance
      const passVelocity = vAbs > THRESHOLDS.swipeX.velocity

      if (passDistance || passVelocity) {
        if (wantsNext && canGoNext)  return commitTo(index + 1, dx)
        if (wantsPrev && canGoPrev)  return commitTo(index - 1, dx)
      }
      return rubberBackToZero()
    }
    if (e.kind === 'cancelled') return rubberBackToZero()
  }

  useGestureRouter(containerRef, { onGesture, onDrag, enabled: true })

  const currentSrc = images[index] || images[0]
  const nextSrc    = images[index + 1]
  const prevSrc    = images[index - 1]

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-black ${className}`}
      style={{
        aspectRatio: aspect,
        touchAction: 'pan-x',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      role="region"
      aria-label={`Image ${index + 1} of ${images.length}`}
    >
      {prevSrc && (
        <img
          src={prevSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 35%',
            transform: `translateX(calc(-100% + ${peekPx}px))`,
            filter: 'brightness(0.85)',
          }}
        />
      )}

      <motion.img
        src={currentSrc}
        alt=""
        draggable={false}
        animate={controls}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 35%',
          x,
          pointerEvents: 'none',
        }}
      />

      {nextSrc && (
        <motion.img
          src={nextSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 35%',
            transform: `translateX(calc(100% - ${peekPx}px))`,
            scale: IMAGE_STACK.parallax.nextTrack,
            transformOrigin: 'left center',
            pointerEvents: 'none',
            opacity: state === 'peeking-next' ? 1 : 0.7,
          }}
        />
      )}

      {/* Page indicators — VERTICAL column on the RIGHT edge of the photo.
          Phil 2026-05-13 (third pass): top-mounted horizontal dashes kept
          getting eaten by sheet chrome (drag pip, safe-area inset, back
          button hover). Moving them to the right edge solves the whole
          class of "top is busy" problems — and naturally subsumes the
          old 1×24px pull handle that hinted "more this way".

          5 dashes stacked vertically, centered on the photo height. Active
          segment is taller + full gold + soft glow. Inactive segments are
          shorter + dim white with subtle drop-shadow for legibility on any
          background. Tappable to jump. */}
      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Photo selector"
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            zIndex: 11,
            pointerEvents: 'auto',
          }}
        >
          {images.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={active}
                aria-label={`Go to photo ${i + 1} of ${images.length}`}
                onClick={() => {
                  if (i === index || state === 'transitioning') return;
                  if (!lockExpired && i !== 0) return;
                  setState('transitioning');
                  setIndex(i);
                  onIndexChange?.(i);
                  x.set(0);
                  setState(isMutual ? 'locked-after-mutual' : 'idle');
                }}
                style={{
                  width: active ? 4 : 3,
                  height: active ? 18 : 12,
                  borderRadius: 2,
                  background: active
                    ? '#C8962C'
                    : 'rgba(255,255,255,0.52)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'background 200ms ease, height 200ms ease, width 200ms ease',
                  boxShadow: active
                    ? '0 0 10px rgba(200,150,44,0.60)'
                    : '0 0 3px rgba(0,0,0,0.60)',
                }}
              />
            );
          })}
        </div>
      )}

      {(isMutual || softBorder) && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            border: softBorder
              ? '1px solid rgba(200,150,44,0.30)'
              : '1.5px solid #C8962C',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

export default ProfileMediaStack
