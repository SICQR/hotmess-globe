/**
 * GhostedCard — single profile card in the Ghosted grid.
 *
 * Phil exec review 2026-05-13: this is scanning encrypted nightlife
 * signals, not browsing profiles. Presence is DETECTED not announced,
 * mutuality is quietly dangerous not celebrated, fallback art is
 * obscured silhouette not letters.
 *
 * ┌──────────────────┐
 * │  [Photo 4:5]   ° │  ← online dot — 6px, low-saturation, inset
 * │                   │
 * │  Name · ✓         │  ← 13px bold, verified
 * │  340m near Eagle  │  ← one human line, merged distance + place
 * └──────────────────┘
 *
 * Mutual = +0.5px gold edge + tiny gold glyph in corner.
 * Boo'd = tiny dim gold glyph in corner.
 * No "MATCH" / "BOO" text labels — those read dating-app reward.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Ghost } from 'lucide-react';
import {
  BEACON_GLYPHS,
  type BeaconCategory,
} from '@/components/globe/beaconGlyphs';
// signalStrengthFromMeters import removed — replaced with travelTime.personDefaultCue
// per Phil brief 2026-05-26 Phase 2 (bucketed walk-only cue, no signal jargon).
import { personDefaultCue } from '@/lib/travelTime';
// Phil 2026-06-03 Samui — Ghosted grid revival. Shared recency + FRESH
// vocabulary so the inbox row and the grid card speak the same language.
import { recencyLabel, isFreshProfile } from '@/lib/identity/recencyLabel';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Beacon overlay descriptor for a Ghosted card. Populated by
 * `useGhostedGrid` when the card's user has at least one active beacon.
 *
 *  - `category` — resolved hero category (gym/club/sauna/...), or null
 *    for legacy beacons whose `beacon_category` doesn't map to one of the
 *    9 hero glyphs (e.g. 'user' rows). null renders a neutral gold ring.
 *  - `color` — pre-resolved ring/badge tint so the card doesn't have to
 *    re-derive it.
 *  - `venue` — beacon title (used in the "LIVE @ Soho test beacon" line).
 *  - `lat`/`lng` — beacon coords for the tap-to-fly nav-state.
 *  - `lifecycle` — 'active' = bright ring, 'decaying' = dim ring + FADING
 *    label. Stale beacons aren't returned by the query so no 'stale'
 *    branch is needed here.
 */
export interface GhostedBeaconBadge {
  beaconId: string;
  category: BeaconCategory | null;
  color: string;
  venue: string | null;
  lat: number | null;
  lng: number | null;
  lifecycle: 'active' | 'decaying';
}

export interface GhostedCardProps {
  id: string;
  name: string;
  avatarUrl: string | null;
  distanceM: number | null;
  isOnline: boolean;
  isVerified: boolean;
  contextType: 'nearby' | 'venue' | 'radio' | 'moving' | 'live';
  contextLabel: string;
  vibe: string | null;
  intent: string | null;
  /** User email for boo state lookups */
  email?: string | null;
  /** Whether current user has boo'd this person */
  isBood?: boolean;
  /** Whether this is a mutual boo (both boo'd each other) */
  isMutual?: boolean;
  /** Looking-for tags surfaced on the card. Up to 3 rendered; rest truncated.
   *  Doctrine (Brief 03): no popularity metrics; intent surface only. */
  lookingFor?: string[] | null;
  /** Active beacon overlay — when set, the card renders a coloured ring,
   *  a category glyph badge, a LIVE label, and tap-to-fly navigates to
   *  /pulse with the beacon coords in route state (mirrors PR #423). */
  beacon?: GhostedBeaconBadge | null;
  /** This user has an active profile_bump boost — surfaces an outer gold
   *  glow distinct from the beacon ring. Sort-to-top is handled upstream
   *  in GhostedMode; this prop is purely visual affordance. */
  isBoosted?: boolean;
  /** Phil 2026-06-03 — counterpart last_seen ISO. Used to render the
   *  recency fallback line (ACTIVE NOW / EARLIER / TODAY / THIS WEEK) when
   *  distance is unavailable so quiet hours don't read as dead. Also
   *  hardens the online dot — pulse only fires for genuine ACTIVE_NOW. */
  lastSeenISO?: string | null;
  /** Phil 2026-06-03 — counterpart profile created_at ISO. Drives the
   *  FRESH corner pill for accounts under 14 days old (beta calibration).
   *  Adds variation across cards without needing presence data. */
  createdAtISO?: string | null;
  /** Phil 2026-06-03 Vitality Slice 1 — beacon halo bleed. When the
   *  counterpart has no beacon of their own BUT is geo-close (≤200m) to
   *  one of the live curated beacons (Vauxhall chemsex hub, 56 Dean St,
   *  Antidote, etc.), this carries the beacon category for ambient ring
   *  tinting. Reads as "this person is near something happening" — the
   *  single biggest unlock for environmental atmosphere on the grid. */
  beaconHaloCategory?: string | null;
  beaconHaloColor?: string | null;
}

interface GhostedCardComponentProps extends GhostedCardProps {
  index: number;
  onTap: (id: string) => void;
}

// ── Intent ring colours (rings only, not CTAs) ──────────────────────────────

const INTENT_RING: Record<string, string> = {
  hookup: '#FF5500',
  hang: '#00C2E0',
  explore: '#A899D8',
};

// ── Component ────────────────────────────────────────────────────────────────

function GhostedCardInner({
  id,
  name,
  avatarUrl,
  distanceM,
  isOnline,
  isVerified,
  contextType,
  contextLabel,
  vibe,
  intent,
  isBood,
  isMutual,
  lookingFor,
  beacon,
  isBoosted,
  lastSeenISO,
  createdAtISO,
  beaconHaloCategory,
  beaconHaloColor,
  index,
  onTap,
}: GhostedCardComponentProps) {
  const intentColor = intent ? INTENT_RING[intent] : undefined;
  // Card tap = open profile. Always. (Grindr/Sniffies/Scruff parity —
  // tapping a person opens their preview/profile, never reroutes the user
  // away from the discovery surface.) The "find on map" flyTo was making
  // every card with a beacon — i.e. all of them — jump straight to /pulse
  // and bypass the profile entirely. Tap-to-fly belongs on the beacon
  // ring/badge as a secondary action, not on the whole card body.
  const handleTap = () => {
    onTap(id);
  };

  // Resolve the category glyph for the corner badge. When the beacon's
  // category didn't resolve to one of the 9 hero glyphs (e.g. legacy
  // beacon_category='user'), we render the ring only — no badge — and
  // let the "LIVE" label do the work.
  const beaconGlyph = beacon?.category ? BEACON_GLYPHS[beacon.category] : null;
  const beaconLabel = beacon
    ? (beacon.lifecycle === 'decaying'
        ? `FADING${beacon.venue ? ` @ ${beacon.venue}` : ''}`
        : (beacon.venue
            ? `LIVE @ ${beacon.venue}`
            : (beacon.category ? `LIVE · ${beacon.category.toUpperCase()}` : 'LIVE')))
    : null;
  const ringAlpha = beacon?.lifecycle === 'decaying' ? 0.55 : 0.95;

  // ── State Line — Phil 2026-06-03 Vitality Slice 1 ──────────────────────
  // PRODUCT RULING (locked same session):
  //   "State first. Distance last. Distance is the fallback, not the headline."
  //
  // Priority ladder (first matching wins the line's STATE; distance, when
  // available, attaches as a quiet suffix):
  //   1. ACTIVE NOW         (online green — strongest signal)
  //   2. NEAR A LIVE BEACON (gold — environmental pressure, halo) [#855 wires]
  //   3. LOOKING            (gold — intent surface)
  //   4. FRESH              (cream — new profile)
  //   5. EARLIER TONIGHT    (cream/72)
  //   6. TODAY              (cream/55)
  //   7. THIS WEEK          (cream/40)
  //   8. distance only      (white/50 — only when nothing else is true)
  //
  // Forbidden: rendering the distance "< 5 min away" cue as a headline
  // when a stronger signal applies. The bucketed walk cue (personDefaultCue)
  // is now relegated to a suffix or, when alone, the eighth-rank line.
  const distanceSuffix = (distanceM != null && Number.isFinite(distanceM) && distanceM <= 30000)
    ? personDefaultCue(distanceM)
    : null;
  const recency = recencyLabel(lastSeenISO);
  const isFresh = isFreshProfile(createdAtISO);
  const hasLookingFor = Array.isArray(lookingFor) && lookingFor.length > 0;

  // Compose the state line. {label, color, dot, suffix} — `dot` is the
  // colour of the prefix pip (null = no dot). The eighth-rank fallback
  // returns just the distance line with no STATE word, no dot.
  let stateLabel: string | null = null;
  let stateColor: string = 'rgba(255,255,255,0.55)';
  let stateDotColor: string | null = null;
  let bareLine: string | null = null;

  if (isOnline) {
    stateLabel = 'ACTIVE NOW';
    stateColor = '#30D158';
    stateDotColor = '#30D158';
  } else if (beaconHaloColor && !beacon) {
    // Beacon halo — set when a profile is geo-close to a curated/other
    // beacon (passed in by useGhostedGrid in PR #855). Reads as
    // environmental pressure.
    stateLabel = 'NEAR A LIVE BEACON';
    stateColor = beaconHaloColor;
    stateDotColor = beaconHaloColor;
  } else if (hasLookingFor) {
    stateLabel = 'LOOKING';
    stateColor = '#C8962C';
    stateDotColor = '#C8962C';
  } else if (isFresh) {
    stateLabel = 'FRESH';
    stateColor = 'rgba(245,238,220,0.92)';
    stateDotColor = null; // FRESH reads as label, not a live pulse
  } else if (recency.band === 'EARLIER') {
    stateLabel = 'EARLIER TONIGHT';
    stateColor = 'rgba(245,238,220,0.72)';
  } else if (recency.band === 'TODAY') {
    stateLabel = 'TODAY';
    stateColor = 'rgba(245,238,220,0.55)';
  } else if (recency.band === 'THIS_WEEK') {
    stateLabel = 'THIS WEEK';
    stateColor = 'rgba(245,238,220,0.40)';
  } else if (distanceSuffix) {
    // Eighth rank — pure distance, no STATE label, no dot. Sentence case,
    // softer styling so it reads as fallback not headline.
    bareLine = distanceSuffix;
  }

  return (
    <motion.button
      className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#C8962C]/50"
      style={(() => {
        // Phil 2026-06-03 Vitality Slice 2 — signal density weight.
        // Count emitted signals to drive opacity / scale / glow. The grid stops
        // reading as identical rectangles when loud cards literally radiate
        // and quiet cards recede. Three bands:
        //   loud   (>=3 signals) — full opacity + slight scale-up + soft warm glow
        //   medium (1-2 signals) — neutral
        //   quiet  (0 signals)   — opacity 0.65 — silhouette / dead cards fade
        // Halo bleed COUNTS as a signal — that's the whole point of
        // environmental warmth; cards near a beacon should read warmer.
        const signalScore =
          (isOnline ? 1 : 0) +
          (beacon ? 1 : 0) +
          (beaconHaloColor ? 1 : 0) +
          (isMutual ? 1 : 0) +
          (createdAtISO && isFreshProfile(createdAtISO) ? 1 : 0) +
          (Array.isArray(lookingFor) && lookingFor.length > 0 ? 1 : 0) +
          (recencyLabel(lastSeenISO).isLive ? 1 : 0);
        const weight: 'loud' | 'medium' | 'quiet' =
          signalScore >= 3 ? 'loud' : signalScore >= 1 ? 'medium' : 'quiet';

        // Beacon ring stacks ON TOP of the mutual-boo inset edge.
        // 2px inset glow in the beacon's category colour reads as "live signal"
        // without crowding the photo. Decaying state drops opacity to 0.55 so
        // the eye still groups the card with live cards but registers fade.
        const shadows: string[] = [];

        // Phil 2026-06-03 — Beacon halo bleed. When the card sits ≤200m from
        // a live beacon (and doesn't own one itself), render a thin outer
        // ring tinted to the beacon's category colour. Subtle — 1.5px,
        // ~45% alpha, no glow. Reads as ambient environmental warmth, not as
        // ownership. This is the move that ties the grid to the room.
        if (beaconHaloColor && !beacon) {
          shadows.push(`0 0 0 1px ${beaconHaloColor}66`);
          shadows.push(`0 0 10px ${beaconHaloColor}26`);
        }

        if (beacon) {
          const c = beacon.color;
          shadows.push(`inset 0 0 0 2px ${c}`);
          if (beacon.lifecycle === 'active') {
            shadows.push(`0 0 12px ${c}55`);
          }
        }
        if (isMutual) {
          shadows.push('inset 0 0 0 0.5px rgba(200,150,44,0.55)');
        }
        if (isBoosted) {
          // Outer gold glow — separate from beacon ring (which is inset).
          // Reads as "promoted" without imitating beacon liveness or boo.
          shadows.push('0 0 0 1.5px rgba(200,150,44,0.85)');
          shadows.push('0 0 14px rgba(200,150,44,0.45)');
        }

        // Weight-driven warm glow on loud cards. Subtle gold halo on the
        // OUTSIDE so the loud card pulls forward visually without imitating
        // any single signal's colour.
        if (weight === 'loud') {
          shadows.push('0 0 18px rgba(200,150,44,0.18)');
        }

        // CRITICAL FIX 2026-06-03 — `opacity` MUST NOT be set in inline
        // style on this motion.button. Framer-motion's `initial={{ opacity:
        // 0 }} -> animate={{ opacity: 1 }}` animation treats an explicit
        // style.opacity as a static value, suppresses the enter animation,
        // and the card stays at opacity 0. Result: invisible grid (verified
        // on the #856 preview).
        //
        // Weight-driven opacity (quiet cards fade) needs to be passed through
        // framer-motion's animate prop, not inline style. Deferred to the
        // next iteration. For now, the LOUD card gold glow is doing the
        // weight work — that's added via boxShadow which doesn't collide
        // with framer-motion.
        //
        // Note also: weight-driven SCALE was considered but framer-motion's
        // whileTap={scale: 0.97} composes badly with a CSS transform on the
        // same element. Loud cards pull forward via the warm gold glow;
        // quiet card fade is deferred.
        return shadows.length ? {
          boxShadow: shadows.join(', '),
          transition: 'box-shadow 220ms ease',
        } : undefined;
      })()}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.25 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleTap}
      aria-label={
        beacon
          ? `${name} is live${beacon.venue ? ` at ${beacon.venue}` : ''} — tap to fly to the beacon`
          : `View ${name}'s profile`
      }
    >
      {/* Photo or obscured silhouette — never initials, never placeholder.
          Ambient believability per Phil's hierarchy directive. */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 42%, #1a1410 0%, #0d0a08 55%, #050405 100%)',
          }}
          aria-hidden="true"
        >
          {/* Soft body mass — blurred low-light silhouette */}
          <div
            style={{
              position: 'absolute',
              top: '32%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '55%',
              height: '54%',
              borderRadius: '46% 46% 32% 32%',
              background: 'rgba(255,255,255,0.025)',
              filter: 'blur(10px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '24%',
              height: '24%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      )}

      {/* Gradient overlay at bottom for text legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      />

      {/* Presence — louder, pulsing, only when genuinely online.
          Phil 2026-06-03 Samui — old dot was 6px @ 55% alpha, invisible to
          the user. Bumped to 9px @ 95%, soft pulse animation, broader glow.
          Hard requirement Phil set: pulse fires ONLY when truly online —
          never simulate liveness when the substrate is quiet. */}
      {isOnline && (
        <motion.span
          className="absolute rounded-full"
          style={{
            top: 9, right: 9,
            width: 9, height: 9,
            background: '#30D158',
            boxShadow: '0 0 8px rgba(48,209,88,0.65), 0 0 0 1.5px rgba(5,5,7,0.55)',
          }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          aria-label="Online"
        />
      )}

      {/* FRESH corner pill removed Phil 2026-06-03 — FRESH is now rank 4 in
          the StateLine ladder so it reads as state (under the name), not as
          a separate corner tag. Avoids double-render and keeps the corner
          quiet for online dot + mutual/boo glyphs only. */}

      {/* Mutual / Boo — tiny corner glyph, no loud labels. Mutual gets the
          inset gold edge (set on the motion.button). */}
      {(isMutual || isBood) && (
        <span
          className="absolute"
          style={{
            top: 10, left: 10,
            opacity: isMutual ? 0.95 : 0.45,
          }}
          aria-label={isMutual ? 'Mutual' : 'Booed'}
        >
          <Ghost size={11} strokeWidth={1.6} color="#C8962C" />
        </span>
      )}

      {/* Intent ring indicator (thin border at top) */}
      {intentColor && (
        <div
          className="absolute top-0 inset-x-0 h-0.5"
          style={{ backgroundColor: intentColor }}
        />
      )}

      {/* Beacon glyph badge — bottom-RIGHT of the avatar. One per card,
          rendered only when the user has at least one active beacon AND the
          category resolved to one of the 9 hero glyphs. The colour matches
          the inset ring above so the two read as one signal. */}
      {beacon && beaconGlyph && (
        <span
          className="absolute z-[2] flex items-center justify-center rounded-full"
          style={{
            bottom: 6,
            right: 6,
            width: 22,
            height: 22,
            background: 'rgba(5,5,7,0.92)',
            border: `1.5px solid ${beacon.color}`,
            color: beacon.color,
            boxShadow: beacon.lifecycle === 'active'
              ? `0 0 6px ${beacon.color}88`
              : undefined,
          }}
          aria-hidden="true"
        >
          {/* Inline SVG glyph from the hero set (viewBox -32 -32 64 64,
              currentColor). Render at 12px so it fits inside the 22px disc. */}
          <span
            className="block"
            style={{ width: 14, height: 14 }}
            dangerouslySetInnerHTML={{
              __html: beaconGlyph.svg.replace(
                'width="64" height="64"',
                'width="14" height="14"',
              ),
            }}
          />
        </span>
      )}

            {/* Text content — name + single merged proximity line. */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-2 flex flex-col gap-0.5">
        {/* Name row */}
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-medium text-white truncate leading-tight">
            {name}
          </span>
          {isVerified && (
            <BadgeCheck className="w-3 h-3 flex-shrink-0 text-[#C8962C]" />
          )}
        </div>

        {/* LIVE label — beacon state reads BEFORE proximity. Decaying
            beacons render "FADING ..." in dimmer copy. Active beacons get
            a tiny pulsing dot in the category colour. */}
        {beaconLabel && (
          <span
            className="text-[10px] font-black tracking-[0.08em] uppercase truncate leading-tight flex items-center gap-1"
            style={{
              color: beacon!.lifecycle === 'active' ? beacon!.color : `${beacon!.color}99`,
            }}
          >
            <motion.span
              aria-hidden="true"
              className="inline-block rounded-full flex-shrink-0"
              style={{
                width: 5,
                height: 5,
                background: beacon!.color,
                boxShadow: beacon!.lifecycle === 'active'
                  ? `0 0 4px ${beacon!.color}`
                  : undefined,
              }}
              animate={
                beacon!.lifecycle === 'active'
                  ? { opacity: [0.55, 1, 0.55] }
                  : { opacity: 0.5 }
              }
              transition={
                beacon!.lifecycle === 'active'
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0 }
              }
            />
            <span className="truncate">{beaconLabel}</span>
          </span>
        )}

        {/* Looking-for tags — up to 3 chips. Brief 03 doctrine: intent surface
            not popularity. Tags rendered with dashed border per brief. */}
        {Array.isArray(lookingFor) && lookingFor.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
            {lookingFor.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] text-white/70"
                style={{
                  border: '1px dashed rgba(255,255,255,0.20)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* StateLine — Phil 2026-06-03 Vitality Slice 1. Priority ladder:
            STATE first (caps), distance suffix only when present. The
            eighth-rank fallback is bare distance in sentence case (the only
            place "< 5 min away" survives). Doctrine: D17 no silent
            affordance, D35 caps for state words, distance never the
            headline when a stronger signal exists.

            Beacon LIVE has its own dedicated line above this (rendered
            earlier in the card body) — we don't re-emit it here. */}
        {!beaconLabel && stateLabel && (
          <span
            className="text-[10px] font-black tracking-[0.10em] uppercase leading-tight flex items-center gap-1 truncate"
            style={{ color: stateColor }}
            aria-label={`State: ${stateLabel}${distanceSuffix ? ' — ' + distanceSuffix : ''}`}
          >
            {stateDotColor && (
              <span
                aria-hidden="true"
                className="inline-block rounded-full flex-shrink-0"
                style={{
                  width: 4,
                  height: 4,
                  background: stateDotColor,
                  boxShadow: `0 0 3px ${stateDotColor}`,
                }}
              />
            )}
            <span className="truncate">
              {stateLabel}
              {distanceSuffix && (
                <span
                  className="ml-1.5 font-medium normal-case tracking-normal"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  {distanceSuffix}
                </span>
              )}
            </span>
          </span>
        )}

        {/* Bare distance line — rank 8 fallback. Only renders when no other
            state applies. Sentence case, soft white. This is the only path
            "< 5 min away" can headline a card. */}
        {!beaconLabel && !stateLabel && bareLine && (
          <span className="text-[11px] text-white/50 truncate leading-tight flex items-center gap-1">
            {contextType === 'moving' && (
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
                style={{ color: 'rgba(200,150,44,0.55)' }}
              >
                &rarr;
              </motion.span>
            )}
            {bareLine}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export const GhostedCard = memo(GhostedCardInner);
export default GhostedCard;

