/**
 * MutualStateOverlay — the 900ms takeover when relationship flips to mutual.
 *
 * Bible §1 motion budget. Plays exactly once per relationship transition;
 * never replays on re-render. Closing returns control to the profile shell
 * with the mutual border armed (handled by ProfileMediaStack via `isMutual`).
 *
 * Choreography:
 *   t=0      backdrop starts darkening + blurring
 *   t=60     outer gold ring expands from 0% → 100%
 *   t=80     inner gold ring expands from 0% → 100%
 *   t=120    ghost glyph scales 0 → 1
 *   t=280    backdrop reaches 0.86 opacity + 8px blur
 *   t=360    eyebrow ("MUTUAL") fades + types in
 *   t=420    outer ring lands
 *   t=440    inner ring lands
 *   t=480    glyph lands
 *   t=540    sub-line ("you and {them} both said boo") fades in
 *   t=660    CTAs slide up from below
 *   t=860    CTAs settle
 *   t=900    full settle — overlay accepts taps
 *
 * One-shot motion only. No looping, no breathing animation — that lives in
 * the dormant card border state, not here.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ghost, MessageCircle, X } from 'lucide-react'

export interface MutualStateOverlayProps {
  /** Controls mount + entrance. Parent must keep this true for ≥900ms. */
  open:        boolean
  /** Display name of the other person — first name or username. */
  theirName:   string
  /** Avatar to anchor the reveal (defaults to glyph if missing). */
  theirAvatar?: string | null
  /** When the user taps Message; closes overlay then routes to chat. */
  onMessage:   () => void
  /** When the user taps Close — overlay collapses, mutual border stays. */
  onDismiss:   () => void
}

export function MutualStateOverlay({
  open, theirName, theirAvatar, onMessage, onDismiss,
}: MutualStateOverlayProps) {
  // Stamp the start time the first time the overlay opens, so any rerenders
  // do not retrigger the timeline. We reset only when the parent unmounts.
  const [seq, setSeq] = useState(0)
  useEffect(() => { if (open) setSeq(s => s + 1) }, [open])

  const firstName = useMemo(() => theirName.split(/[\s_]/)[0] || theirName, [theirName])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={`mutual-${seq}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Mutual with ${firstName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.24 } }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          {/* ── Backdrop: blur + darken to 0.86 over 280ms ───────────────── */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 0.86, backdropFilter: 'blur(8px)' }}
            exit={{    opacity: 0,   backdropFilter: 'blur(0px)', transition: { duration: 0.20 } }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: 'absolute', inset: 0,
              background: '#050507',
              // backdropFilter is animated above for the blur effect
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* ── Concentric rings + glyph stack ───────────────────────────── */}
          <div
            style={{
              position: 'relative',
              width: 200, height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer ring — 60ms delay, 360ms duration, lands at 420ms */}
            <motion.span
              aria-hidden
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ duration: 0.36, delay: 0.06, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                position: 'absolute',
                width: 200, height: 200,
                borderRadius: '50%',
                border: '1.5px solid #C8962C',
                boxShadow: '0 0 60px rgba(200,150,44,0.18)',
              }}
            />
            {/* Inner ring — 80ms delay, 360ms duration, lands at 440ms */}
            <motion.span
              aria-hidden
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ duration: 0.36, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                position: 'absolute',
                width: 140, height: 140,
                borderRadius: '50%',
                border: '1px solid rgba(200,150,44,0.55)',
              }}
            />
            {/* Glyph — 120ms delay, 360ms duration, lands at 480ms */}
            <motion.div
              initial={{ scale: 0,   opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ duration: 0.36, delay: 0.12, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                width: 96, height: 96,
                borderRadius: '50%',
                background: '#0B0B0F',
                border: '1px solid rgba(200,150,44,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {theirAvatar ? (
                <img
                  src={theirAvatar}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Ghost size={42} color="#C8962C" strokeWidth={1.4} />
              )}
            </motion.div>
          </div>

          {/* ── Eyebrow — 360ms delay, 300ms fade, lands at 660ms ────────── */}
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.30, delay: 0.36, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: '0.38em',
              color: '#C8962C',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Mutual
          </motion.span>

          {/* ── Sub-line — 540ms delay, 200ms fade, lands at 740ms ───────── */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.20, delay: 0.54, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              marginTop: 10,
              fontSize: 15,
              color: '#F5F5F7',
              fontWeight: 500,
              letterSpacing: '0.01em',
              textAlign: 'center',
              padding: '0 28px',
              maxWidth: 320,
            }}
          >
            You and {firstName} both said boo.
          </motion.p>

          {/* ── CTAs — 660ms delay, 200ms slide, settle at 860ms ─────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.20, delay: 0.66, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <button
              onClick={onMessage}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 2,
                background: '#C8962C',
                color: '#0B0B0F',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                border: '0.5px solid rgba(200,150,44,0.5)',
                cursor: 'pointer',
              }}
            >
              <MessageCircle size={14} strokeWidth={2.4} />
              Message
            </button>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MutualStateOverlay
