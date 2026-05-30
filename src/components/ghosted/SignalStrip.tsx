/**
 * SignalStrip — ambient transmission strip for the Ghosted home.
 *
 * Phil exec review 2026-05-13: the previous TrackPlayer at the top of
 * /ghosted dominated the emotional space and read as "the primary
 * product." That's wrong. Ghosted owns the emotional center; the
 * audio surface should feel like intercepted broadcast — transmission,
 * interference, signal — never feature-weight media.
 *
 * Design language:
 *   - 44px row, gold underline at 16% alpha
 *   - 9px eyebrow (SIGNAL · LIVE) at 38% alpha
 *   - 11px track + artist in one human line
 *   - tiny gold play/pause on the right (no waveform thumb, no
 *     scrub bar, no expand button — the strip is non-interactive
 *     beyond play/pause)
 *   - 12 micro-bars on the left animate when playing (one tiny
 *     waveform tick, gold, low amplitude) — never replace the bars
 *     with cover art
 */

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { motion } from 'framer-motion'

export interface SignalStripProps {
  src:        string
  title:      string
  artist?:    string
  /** Optional eyebrow label override — defaults to "Signal · Live". */
  eyebrow?:   string
  className?: string
}

export function SignalStrip({
  src, title, artist, eyebrow = 'Signal · Live', className = '',
}: SignalStripProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)
    el.addEventListener('play',  onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('play',  onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) void el.play().catch(() => { /* user gesture required, ignore */ })
    else el.pause()
  }

  return (
    <div
      role="region"
      aria-label="HOTMESS signal transmission"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 44,
        padding: '0 14px',
        borderTop:    '0.5px solid rgba(200,150,44,0.10)',
        borderBottom: '0.5px solid rgba(200,150,44,0.16)',
        background: 'rgba(200,150,44,0.02)',
      }}
    >
      <audio ref={audioRef} src={src} preload="none" />

      {/* Micro waveform — 12 bars, gold low-amp, animates only when playing */}
      <div
        aria-hidden
        style={{ display: 'flex', alignItems: 'center', gap: 1.5, width: 36, height: 14 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            style={{
              display: 'inline-block',
              width: 1,
              background: 'rgba(200,150,44,0.55)',
              borderRadius: 0.5,
            }}
            initial={{ height: 3 }}
            animate={{ height: playing ? [3, 5 + ((i * 7) % 7), 3] : 3 }}
            transition={{
              duration: playing ? 0.7 + ((i * 13) % 8) / 10 : 0,
              repeat: playing ? Infinity : 0,
              delay: (i % 5) * 0.07,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Two-line metadata: eyebrow + track */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: 8.5,
            letterSpacing: '0.32em',
            color: 'rgba(255,255,255,0.38)',
            fontWeight: 600,
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(200,150,44,0.78)',
            fontWeight: 500,
            letterSpacing: '0.02em',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}{artist ? ` · ${artist}` : ''}
        </span>
      </div>

      {/* Tiny play/pause — no scrub, no expand, no cover art */}
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause signal' : 'Play signal'}
        style={{
          width: 22, height: 22,
          borderRadius: '50%',
          background: 'transparent',
          border: '0.5px solid rgba(200,150,44,0.45)',
          color: 'rgba(200,150,44,0.85)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {playing
          ? <Pause size={10} strokeWidth={2} />
          : <Play size={10} strokeWidth={2} style={{ marginLeft: 1 }} />}
      </button>
    </div>
  )
}

export default SignalStrip
