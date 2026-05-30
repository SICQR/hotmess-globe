/**
 * RecoveryStateCard — small care surface that appears on a profile when
 * one of the v0.1 recovery triggers fires.
 *
 * Bible Part 7 + Phil exec review 2026-05-13. Two variants only:
 *
 *   - 'meetup_completed' — soft gold, "Catch up with {name}?"
 *   - 'location_revoked' — soft gold, "They paused location"
 *
 * Tone: subdued, ambient, optional. The card does NOT demand action.
 * Single soft CTA, no exclamation marks, no urgency, no animation
 * tricks. Care reads as care, not as friction.
 *
 * Visual language: 0.5px gold border at 30% opacity, 1.2px line-height,
 * 11px eyebrow with wide letterspacing, 14px primary copy.
 */

import { ReactNode } from 'react'
import { MapPin, Coffee } from 'lucide-react'

export type RecoveryVariant = 'meetup_completed' | 'location_revoked'

export interface RecoveryStateCardProps {
  variant:      RecoveryVariant
  /** Display name of the other person (first name, not full handle). */
  theirName:    string
  /** Primary CTA — typically opens chat or re-share flow. */
  onAction:     () => void
  /** Optional dismiss — hides the card for this session. */
  onDismiss?:   () => void
  className?:   string
}

interface Copy {
  eyebrow:  string
  title:    string
  sub:      string
  cta:      string
  icon:     ReactNode
}

function copyFor(variant: RecoveryVariant, theirName: string): Copy {
  // Restraint per Phil exec review 2026-05-13 — "the spell breaks the moment
  // it notices too much." Single line, no narration, no soft-explanation
  // sub-copy, no "no pressure" because saying that adds pressure.
  if (variant === 'meetup_completed') {
    return {
      eyebrow: '',
      title:   `Catch up with ${theirName}?`,
      sub:     '',
      cta:     'Message',
      icon:    <Coffee size={16} strokeWidth={1.6} color="#C8962C" />,
    }
  }
  return {
    eyebrow: '',
    title:   `${theirName} paused location.`,
    sub:     '',
    cta:     'Ask',
    icon:    <MapPin size={16} strokeWidth={1.6} color="#C8962C" />,
  }
}

export function RecoveryStateCard({
  variant, theirName, onAction, onDismiss, className = '',
}: RecoveryStateCardProps) {
  const c = copyFor(variant, theirName.split(/[\s_]/)[0] || theirName)

  return (
    <div
      role="region"
      aria-label={c.title}
      className={className}
      style={{
        position: 'relative',
        margin: '8px 16px 0',
        padding: '14px 14px 12px 44px',
        background: 'rgba(200,150,44,0.04)',
        border: '0.5px solid rgba(200,150,44,0.30)',
        borderRadius: 2,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 14, top: 14,
          width: 22, height: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {c.icon}
      </span>

      {c.eyebrow ? (
        <span
          style={{
            display: 'block',
            fontSize: 9,
            letterSpacing: '0.34em',
            color: 'rgba(200,150,44,0.78)',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {c.eyebrow}
        </span>
      ) : null}

      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: '#F5F5F7',
          fontWeight: 500,
          lineHeight: 1.35,
        }}
      >
        {c.title}
      </p>
      {c.sub ? (
        <p
          style={{
            margin: '4px 0 10px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.4,
          }}
        >
          {c.sub}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={onAction}
          style={{
            padding: '8px 16px',
            background: 'rgba(200,150,44,0.10)',
            border: '0.5px solid rgba(200,150,44,0.45)',
            color: '#C8962C',
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {c.cta}
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        )}
      </div>
    </div>
  )
}

export default RecoveryStateCard
