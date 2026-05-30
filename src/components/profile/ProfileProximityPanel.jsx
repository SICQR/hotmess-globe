/**
 * ProfileProximityPanel — v6 Chunk 11
 *
 * Mounts on profile open (L2ProfileSheet), below avatar/identity, above bio.
 * Shows distance + best transport recommendation + OSM map tile.
 * Directions opens an inline route sheet before handing off to native Maps.
 * Uber fires a deep link.
 *
 * Props:
 *   distanceM   — haversine metres, pre-computed by L2ProfileSheet
 *   approxLat   — 100m grid-snapped profile latitude  (NEVER exact)
 *   approxLng   — 100m grid-snapped profile longitude (NEVER exact)
 *   venueName   — optional "Last seen at X" context
 *   displayName — used in route sheet heading
 *
 * Privacy: location passed here is APPROXIMATE (100m grid snap). Never exact.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  black:  '#000000',
  dim:    '#080808',
  card:   '#0d0d0d',
  gold:   '#C8962C',
  white:  '#FFFFFF',
  muted:  'rgba(255,255,255,0.35)',
  green:  '#30D158',
  blue:   '#0A84FF',
  border: '#1a1a1a',
};

// ── TRANSPORT RULES ───────────────────────────────────────────────────────────
const TRANSPORT_RULES = [
  { maxM: 1500,     mode: 'WALK', icon: '🚶', label: 'Walk', time: (m) => `${Math.round(m / 80)} min`,  color: T.green },
  { maxM: 5000,     mode: 'TUBE', icon: '🚇', label: 'Tube', time: (m) => `${Math.round(m / 400)} min`, color: T.blue  },
  { maxM: Infinity, mode: 'UBER', icon: '🚗', label: 'Uber', time: (m) => `${Math.round(m / 250)} min`, color: T.gold  },
];

const ALL_MODES = [
  { mode: 'WALK', icon: '🚶', label: 'Walk', time: (m) => `${Math.round(m / 80)} min`,  color: T.green },
  { mode: 'TUBE', icon: '🚇', label: 'Tube', time: (m) => `${Math.round(m / 400)} min`, color: T.blue  },
  { mode: 'UBER', icon: '🚗', label: 'Uber', time: (m) => `${Math.round(m / 250)} min`, color: T.gold  },
];

function getTransport(distanceM) {
  return TRANSPORT_RULES.find(r => distanceM <= r.maxM) || TRANSPORT_RULES[TRANSPORT_RULES.length - 1];
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

// ── OSM MAP TILE ──────────────────────────────────────────────────────────────
function MapTile({ lat, lng, zoom = 15, distanceM }) {
  const n = Math.pow(2, zoom);
  const xTile = Math.floor((lng + 180) / 360 * n);
  const yTile = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n
  );
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;

  const tileSize = 256;
  const xFrac = (lng + 180) / 360 * n - xTile;
  const yFrac = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - yTile;
  const pinX  = Math.round(xFrac * tileSize);
  const pinY  = Math.round(yFrac * tileSize);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', height: 160, background: '#111' }}>
      <img
        src={tileUrl}
        alt="map"
        style={{
          position: 'absolute',
          width: tileSize, height: tileSize,
          left: '50%', top: '50%',
          transform: `translate(calc(-50% + ${tileSize / 2 - pinX}px), calc(-50% + ${tileSize / 2 - pinY}px))`,
          filter: 'brightness(0.35) saturate(0.3) contrast(1.2)',
        }}
        onError={e => { e.target.style.display = 'none'; }}
      />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.gold}55 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Approximate radius ring */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 48, height: 48, borderRadius: '50%',
        border: `1px dashed ${T.gold}44`,
        pointerEvents: 'none',
      }} />

      {/* Pin */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: T.gold, border: `2px solid ${T.black}`,
          boxShadow: `0 0 8px ${T.gold}`,
        }} />
        <div style={{ width: 1, height: 8, background: T.gold }} />
      </div>

      {/* Approximate label */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: '8px', color: T.muted,
        fontFamily: "'Barlow', sans-serif", letterSpacing: '0.1em',
        background: 'rgba(0,0,0,0.6)', padding: '2px 6px',
      }}>
        APPROXIMATE LOCATION
      </div>

      {/* Distance pill */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        border: `1px solid ${T.gold}44`, padding: '3px 8px',
        fontSize: '11px', fontFamily: "'Oswald', sans-serif",
        color: T.gold, letterSpacing: '0.08em',
      }}>
        {formatDistance(distanceM)}
      </div>
    </div>
  );
}

// ── TRANSPORT PILL ────────────────────────────────────────────────────────────
function TransportPill({ mode, icon, label, time, color, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, padding: '8px 14px',
        background: active ? `${color}15` : 'transparent',
        border: `1px solid ${active ? color : T.border}`,
        cursor: 'pointer', flex: 1, transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{
        fontSize: '10px', fontFamily: "'Oswald', sans-serif",
        letterSpacing: '0.1em', color: active ? color : T.muted, textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{ fontSize: '9px', fontFamily: "'Barlow', sans-serif", color: active ? color : '#333' }}>
        {time}
      </span>
    </motion.button>
  );
}

// ── INLINE ROUTE EXPAND ───────────────────────────────────────────────────────
function InlineRouteExpand({ distanceM, approxLat, approxLng, displayName, mode, onOpenNative, onClose }) {
  const modeFlag  = mode === 'WALK' ? 'w' : mode === 'TUBE' ? 'r' : 'd';
  const modeLabel = mode === 'WALK' ? 'Walking route' : mode === 'TUBE' ? 'Transit route' : 'Driving route';
  const modeIcon  = mode === 'WALK' ? '🚶' : mode === 'TUBE' ? '🚇' : '🚗';
  const transport = getTransport(distanceM);

  const openNativeMaps = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${approxLat},${approxLng}&dirflg=${modeFlag}`
      : `https://maps.google.com/maps?daddr=${approxLat},${approxLng}&dirflg=${modeFlag}`;
    window.open(url, '_blank');
    onOpenNative?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 60 }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: T.dim, borderTop: `1px solid ${T.border}`,
          borderRadius: '18px 18px 0 0',
        }}
      >
        <div style={{ width: 36, height: 3, background: '#222', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Route header */}
        <div style={{
          padding: '14px 16px 10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: '9px', letterSpacing: '0.25em', color: T.gold,
              fontFamily: "'Oswald', sans-serif",
            }}>
              {modeIcon} {modeLabel.toUpperCase()}
            </p>
            <p style={{
              margin: '2px 0 0', fontSize: '18px',
              fontFamily: "'Oswald', sans-serif", color: T.white, textTransform: 'uppercase',
            }}>
              To {displayName}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '22px', fontFamily: "'Oswald', sans-serif", color: T.gold }}>
              {formatDistance(distanceM)}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
              {transport.time(distanceM)} away
            </p>
          </div>
        </div>

        <MapTile lat={approxLat} lng={approxLng} zoom={15} distanceM={distanceM} />

        {/* Open in native maps + close */}
        <div style={{ padding: '12px 16px 32px', display: 'flex', gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={openNativeMaps}
            style={{
              flex: 2, padding: '13px',
              background: T.gold, border: 'none',
              fontFamily: "'Oswald', sans-serif", fontSize: '11px',
              letterSpacing: '0.2em', color: T.black, cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            OPEN IN MAPS
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            style={{
              flex: 1, padding: '13px',
              background: 'transparent', border: `1px solid ${T.border}`,
              fontFamily: "'Oswald', sans-serif", fontSize: '11px',
              letterSpacing: '0.15em', color: T.muted, cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            CLOSE
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── PROFILE PROXIMITY PANEL ───────────────────────────────────────────────────
export function ProfileProximityPanel({ distanceM, approxLat, approxLng, venueName, displayName = '' }) {
  const transport     = getTransport(distanceM);
  const [mode, setMode]        = useState(transport.mode);
  const [showRoute, setShowRoute] = useState(false);

  const currentMode = ALL_MODES.find(m => m.mode === mode) || ALL_MODES[0];

  const openUber = () => {
    const fallback = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${approxLat}&dropoff[longitude]=${approxLng}&dropoff[nickname]=${encodeURIComponent(displayName)}`;
    const deepLink = `uber://?client_id=HOTMESS&action=setPickup&pickup=my_location&dropoff[latitude]=${approxLat}&dropoff[longitude]=${approxLng}&dropoff[nickname]=${encodeURIComponent(displayName)}`;
    // Try deep link first, fall back to web
    const tried = window.open(deepLink, '_blank');
    if (!tried) window.open(fallback, '_blank');
  };

  return (
    <>
      <div style={{ background: T.dim, border: `1px solid ${T.border}`, overflow: 'hidden', margin: '0 0 1px' }}>
        {/* Map — tap to expand route */}
        <div onClick={() => setShowRoute(true)} style={{ cursor: 'pointer' }}>
          <MapTile lat={approxLat} lng={approxLng} zoom={15} distanceM={distanceM} />
        </div>

        {/* Distance + recommended transport */}
        <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{
                margin: 0, fontSize: '9px', letterSpacing: '0.25em', color: T.muted,
                fontFamily: "'Oswald', sans-serif",
              }}>
                GET THERE
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span style={{
                  fontSize: '28px', fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700, color: T.white, letterSpacing: '-0.01em',
                }}>
                  {formatDistance(distanceM)}
                </span>
                <span style={{ fontSize: '11px', color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
                  away
                </span>
              </div>
            </div>
            {/* Recommended tag */}
            <div style={{
              padding: '4px 10px',
              background: `${transport.color}15`,
              border: `1px solid ${transport.color}44`,
            }}>
              <p style={{
                margin: 0, fontSize: '8px', letterSpacing: '0.2em',
                color: transport.color, fontFamily: "'Oswald', sans-serif",
              }}>
                {transport.icon} {transport.label.toUpperCase()} RECOMMENDED
              </p>
              <p style={{ margin: '1px 0 0', fontSize: '11px', color: T.white, fontFamily: "'Oswald', sans-serif" }}>
                {transport.time(distanceM)}
              </p>
            </div>
          </div>

          {venueName && (
            <p style={{
              margin: '6px 0 0', fontSize: '10px', color: T.muted,
              fontFamily: "'Barlow', sans-serif", fontStyle: 'italic',
            }}>
              Last seen at {venueName}
            </p>
          )}
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {ALL_MODES.map(m => (
            <TransportPill
              key={m.mode}
              mode={m.mode}
              icon={m.icon}
              label={m.label}
              time={m.time(distanceM)}
              color={m.color}
              active={mode === m.mode}
              onClick={() => setMode(m.mode)}
            />
          ))}
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', gap: 1 }}>
          {/* Directions */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRoute(true)}
            style={{
              flex: 1, padding: '12px',
              background: T.gold, border: 'none',
              fontFamily: "'Oswald', sans-serif", fontSize: '11px',
              letterSpacing: '0.2em', color: T.black, cursor: 'pointer', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            ▶ DIRECTIONS
          </motion.button>

          {/* Uber */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openUber}
            style={{
              flex: 1, padding: '12px',
              background: T.white, border: 'none',
              fontFamily: "'Oswald', sans-serif", fontSize: '11px',
              letterSpacing: '0.2em', color: T.black, cursor: 'pointer', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🚗 UBER
          </motion.button>
        </div>
      </div>

      {/* Inline route sheet */}
      <AnimatePresence>
        {showRoute && (
          <InlineRouteExpand
            distanceM={distanceM}
            approxLat={approxLat}
            approxLng={approxLng}
            displayName={displayName}
            mode={mode}
            onOpenNative={() => setShowRoute(false)}
            onClose={() => setShowRoute(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ProfileProximityPanel;
