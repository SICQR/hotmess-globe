/**
 * ProximityNavV2 — v6 Chunk 08
 *
 * Exports:
 *   MeetpointCardV2      — chat bubble for message_type="meetpoint"
 *   MovementStatusCard   — chat bubble for message_type="movement_update"
 *   RouteViewV2          — full-screen route / commit sheet
 *   ProximityNavProvider — flag gate; wrap wherever proximity nav is used
 *
 * Flag: v6_proximity_nav_v2
 * Imports: useV6Flag as useFlag, supabase from correct paths
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useV6Flag as useFlag } from '@/hooks/useV6Flag';
import {
  useLiveDistance,
  useMutualMovement,
  useProximityCommit,
  bestMode,
  fmtDist,
} from '@/hooks/useProximityNav';

// ── Colours ──────────────────────────────────────────────────────────────────
const T = {
  bg:      '#0a0a0a',
  card:    '#111',
  gold:    '#C8962C',
  goldDim: 'rgba(200,150,44,0.12)',
  white:   '#fff',
  muted:   'rgba(255,255,255,0.38)',
  dim:     'rgba(255,255,255,0.12)',
  border:  '#1e1e1e',
  blue:    '#4A90E2',
  red:     '#E24A4A',
  green:   '#30D158',
  black:   '#000',
};

// ── OSM dark map tile ─────────────────────────────────────────────────────────
function DarkMapTile({ lat = 51.5074, lng = -0.1278, zoom = 15, height = 160, children }) {
  const n   = Math.pow(2, zoom);
  const xT  = Math.floor((lng + 180) / 360 * n);
  const yT  = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  const url = `https://tile.openstreetmap.org/${zoom}/${xT}/${yT}.png`;
  const xF  = (lng + 180) / 360 * n - xT;
  const yF  = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - yT;
  const cx  = Math.round(xF * 256);
  const cy  = Math.round(yF * 256);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', height, background: '#080808' }}>
      <img
        src={url}
        alt=""
        style={{
          position: 'absolute', width: 256, height: 256,
          left: `calc(50% + ${128 - cx}px)`, top: `calc(50% + ${128 - cy}px)`,
          transform: 'translate(-50%,-50%)',
          filter: 'brightness(0.28) saturate(0.2) contrast(1.35)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

// Map overlays
function DestPin() {
  return (
    <div style={{ position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-100%)', zIndex: 4 }}>
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          background: T.red, border: '2.5px solid #fff',
          boxShadow: `0 0 14px ${T.red}99`,
        }} />
      </motion.div>
    </div>
  );
}

function YouDot({ offsetLeft = '32%' }) {
  return (
    <div style={{ position: 'absolute', left: offsetLeft, top: '58%', transform: 'translate(-50%,-50%)', zIndex: 4 }}>
      <motion.div
        animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: T.blue }}
      />
      <div style={{
        width: 13, height: 13, borderRadius: '50%',
        background: T.blue, border: '2.5px solid #fff',
        boxShadow: `0 0 10px ${T.blue}`, position: 'relative',
      }} />
    </div>
  );
}

function RouteLine() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
      <defs>
        <filter id="prox-glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <line x1="32%" y1="58%" x2="50%" y2="44%"
        stroke={T.blue} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="7 5" strokeOpacity="0.85"
        filter="url(#prox-glow)" />
    </svg>
  );
}

function DestGlow() {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '44%',
      transform: 'translate(-50%,-50%)',
      width: 56, height: 56, borderRadius: '50%',
      background: `radial-gradient(circle, ${T.red}44 0%, transparent 70%)`,
      zIndex: 2, pointerEvents: 'none',
    }} />
  );
}

// ── Mutual movement badge ─────────────────────────────────────────────────────
function MutualMovementBadge({ theyAreMoving, theirEtaMin }) {
  if (!theyAreMoving && !theirEtaMin) return null;
  const label = theyAreMoving && theirEtaMin
    ? `They're ${theirEtaMin} min away · moving`
    : theyAreMoving
    ? "You're both moving"
    : `They're ${theirEtaMin} min away`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px',
        background: `${T.green}12`, border: `1px solid ${T.green}44`,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, flexShrink: 0 }}
      />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: T.green, fontStyle: 'italic' }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── MovementStatusCard — message_type="movement_update" ───────────────────────
export function MovementStatusCard({ name, etaMin, distanceM, isIncoming }) {
  return (
    <div style={{
      maxWidth: 240,
      background: `${T.green}0d`, border: `1px solid ${T.green}33`,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <motion.div
        animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: 16 }}
      >🚶</motion.div>
      <div>
        <p style={{
          margin: 0, fontSize: 12,
          color: T.green, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {isIncoming ? `${name} is on the way` : 'On my way'}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 10, color: T.muted }}>
          {fmtDist(distanceM)} · {etaMin} min
        </p>
      </div>
    </div>
  );
}

// ── MeetpointCardV2 — message_type="meetpoint" ────────────────────────────────
export function MeetpointCardV2({ name, distanceM, etaMin, matchUserId, onRoute }) {
  const flagEnabled = useFlag('v6_proximity_nav_v2');
  const { theyAreMoving, theirEtaMin } = useMutualMovement(matchUserId);
  const mode = bestMode(distanceM);

  if (!flagEnabled) {
    // Fallback to simple card if flag off
    return (
      <div style={{ padding: '10px 12px', background: T.card, border: `1px solid ${T.border}`, maxWidth: 280 }}>
        <p style={{ margin: 0, fontSize: 12, color: T.white }}>{name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: T.muted }}>{fmtDist(distanceM)} · {etaMin} min</p>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden', border: `1px solid ${T.border}`, background: T.card, maxWidth: 280 }}>
      {/* Map */}
      <div style={{ position: 'relative' }}>
        <DarkMapTile height={138}>
          <RouteLine />
          <YouDot offsetLeft="30%" />
          <DestGlow />
          <DestPin />
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <span style={{ color: T.muted, fontSize: 11 }}>↗</span>
          </div>
        </DarkMapTile>
        {/* Mutual movement badge overlaid at map bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <MutualMovementBadge theyAreMoving={theyAreMoving} theirEtaMin={theirEtaMin} />
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: '8px 10px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
          <span style={{ fontSize: 13, color: T.white, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {name}
          </span>
          <span style={{ fontSize: 12, color: T.gold }}>
            {etaMin} min · {mode.icon}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: T.muted }}>
          {fmtDist(distanceM)} · {mode.label}
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
        {[
          { label: 'Route', primary: true,  onClick: onRoute },
          { label: 'Uber',  primary: false, onClick: () => {} },
          { label: 'Share', primary: false, onClick: () => {} },
        ].map((btn, i) => (
          <motion.button
            key={btn.label}
            whileTap={{ scale: 0.93 }}
            onClick={btn.onClick}
            style={{
              flex: 1, padding: '9px 4px',
              background: btn.primary ? T.gold : 'transparent',
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
              fontSize: 10, letterSpacing: '0.1em',
              color: btn.primary ? T.black : T.muted,
              cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            {btn.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── RouteViewV2 — full-screen navigation + commit ─────────────────────────────
export function RouteViewV2({ profile, threadId, onClose, onCommitted }) {
  const flagEnabled = useFlag('v6_proximity_nav_v2');
  const [mode, setMode] = useState(bestMode(profile.distance_m).mode);
  const [showHNH, setShowHNH] = useState(false);

  const { committed, committing, commit } = useProximityCommit(threadId);
  const { distM, shrinking } = useLiveDistance(profile.distance_m, committed);
  const { theyAreMoving } = useMutualMovement(profile.id);

  if (!flagEnabled) return null;

  const modes = {
    WALK: { icon: '🚶', label: 'Walk',    eta: `${Math.max(1, Math.round(distM / 80))} min`,    color: T.green, flag: 'w' },
    TUBE: { icon: '🚇', label: 'Transit', eta: `${Math.round(distM / 500 + 4)} min`,             color: T.blue,  flag: 'r' },
    UBER: { icon: '🚗', label: 'Uber',    eta: `${Math.max(1, Math.round(distM / 300))} min`,   color: T.gold,  flag: 'd' },
  };
  const m = modes[mode];

  const handleOnMyWay = async () => {
    const etaMin = parseInt(m.eta);
    await commit({ etaMin, distM });
    setTimeout(() => setShowHNH(true), 1200);
    onCommitted?.({ etaMin, distM });
  };

  const handleStart = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${m.flag}`
      : `https://maps.google.com/maps?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${m.flag}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, zIndex: 100,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${T.border}`,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: T.white, fontSize: 14, cursor: 'pointer', padding: 0 }}
        >
          ‹ Back
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, color: T.white, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Route to {profile.displayName}
          </p>
          <motion.p
            animate={{ color: shrinking ? T.green : T.muted }}
            transition={{ duration: 0.4 }}
            style={{ margin: 0, fontSize: 11 }}
          >
            {fmtDist(distM)} away · {m.eta}
            {shrinking && <span style={{ marginLeft: 4, fontSize: 9, color: T.green }}>↓ closer</span>}
          </motion.p>
        </div>
        {committed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
            <span style={{ fontSize: 9, color: T.green }}>moving</span>
          </motion.div>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <DarkMapTile lat={profile.approx_lat} lng={profile.approx_lng} zoom={15} height="100%">
          <RouteLine />
          <YouDot offsetLeft="28%" />
          <DestGlow />
          <DestPin />
          {/* Mode pills */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(modes).map(([key, val]) => (
              <motion.button key={key} whileTap={{ scale: 0.88 }} onClick={() => setMode(key)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: mode === key ? val.color : 'rgba(0,0,0,0.72)',
                  border: `1px solid ${mode === key ? val.color : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 15,
                }}>
                {val.icon}
              </motion.button>
            ))}
          </div>
          {/* Their dot once committed */}
          {committed && theyAreMoving && (
            <div style={{ position: 'absolute', right: '28%', top: '35%', transform: 'translate(50%,-50%)' }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: T.red, border: '2px solid #fff',
                boxShadow: `0 0 8px ${T.red}88`,
              }} />
            </div>
          )}
        </DarkMapTile>
      </div>

      {/* Bottom panel */}
      <div style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(8px)', borderTop: `1px solid ${T.border}` }}>
        {/* ETA row */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <motion.span
              key={m.eta}
              initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{ fontSize: 26, fontWeight: 600, color: committed ? T.green : T.white }}
            >
              {m.eta}
            </motion.span>
            <motion.span
              animate={{ color: shrinking ? T.green : T.muted }}
              style={{ fontSize: 13 }}
            >
              · {fmtDist(distM)}
            </motion.span>
          </div>
          <span style={{ color: T.gold, fontSize: 18 }}>↗</span>
        </div>

        {/* Mode hint */}
        <div style={{ padding: '0 16px 8px' }}>
          <p style={{ margin: 0, fontSize: 11, color: T.muted }}>
            {mode === 'WALK' ? `Head toward ${profile.venue_name || 'destination'}`
              : mode === 'TUBE' ? 'Take the next available service'
              : 'Uber will pick you up here'}
          </p>
        </div>

        {/* HNH "Be ready" — appears 1.2s after commit */}
        <AnimatePresence>
          {showHNH && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                margin: '0 16px 8px', padding: '10px 12px',
                background: T.goldDim, border: `1px solid ${T.gold}44`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 9, letterSpacing: '0.2em', color: T.gold }}>HNH MESS</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: T.white }}>Be ready.</p>
                </div>
                <motion.button whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '6px 14px', background: T.gold, border: 'none',
                    fontSize: 10, letterSpacing: '0.15em',
                    color: T.black, cursor: 'pointer', textTransform: 'uppercase',
                  }}>
                  Handle it
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 1, padding: '0 1px 1px' }}>
          {!committed ? (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleOnMyWay} disabled={committing}
                style={{
                  flex: 2, padding: 14,
                  background: committing ? T.muted : T.gold, border: 'none',
                  fontSize: 12, letterSpacing: '0.18em', color: T.black,
                  cursor: committing ? 'not-allowed' : 'pointer', textTransform: 'uppercase',
                }}>
                {committing ? '...' : "I'M ON MY WAY"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => window.open('uber://?action=setPickup', '_blank', 'noopener,noreferrer')}
                style={{
                  flex: 1, padding: 14, background: T.card, border: 'none',
                  fontSize: 11, letterSpacing: '0.1em', color: T.muted,
                  cursor: 'pointer', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                🚗 Uber
              </motion.button>
            </>
          ) : (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleStart}
                style={{
                  flex: 2, padding: 14,
                  background: T.green, border: 'none',
                  fontSize: 12, letterSpacing: '0.18em', color: T.black,
                  cursor: 'pointer', textTransform: 'uppercase',
                }}>
                START NAVIGATION
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: 14, background: T.card, border: 'none',
                  fontSize: 11, letterSpacing: '0.1em', color: T.muted,
                  cursor: 'pointer', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                ↗ Share
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Flag gate wrapper ─────────────────────────────────────────────────────────
export default function ProximityNavProvider({ children }) {
  const enabled = useFlag('v6_proximity_nav_v2');
  if (!enabled) return children ?? null;
  return children ?? null;
}
