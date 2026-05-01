import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — PROFILE PROXIMITY NAVIGATION ───────────────────────────────────
// Mounts on profile open. Shows immediately how far they are + best transport.
// No app switching. Directions opens inline map. Uber fires deep link.
//
// DEV INTEGRATION:
// Props: { profile, viewerLocation: { lat, lng } }
// Distance: computed from profile.last_known_lat/lng + viewer GPS
// Transport recommendation: derived from distance thresholds (see TRANSPORT_RULES)
// Directions: opens native maps via deep link (Apple Maps / Google Maps)
// Uber: fires Uber deep link with origin=viewer, destination=profile approx location
// Map tile: OpenStreetMap, same dark satellite style as MeetpointCard
// Privacy: profile location is APPROXIMATE (100m grid snap). Never exact.
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:  "#000",
  dim:    "#080808",
  card:   "#0d0d0d",
  gold:   "#C8962C",
  white:  "#fff",
  muted:  "rgba(255,255,255,0.35)",
  green:  "#30D158",
  blue:   "#0A84FF",
  border: "#1a1a1a",
  uber:   "#000000",
};

// ── TRANSPORT RULES ───────────────────────────────────────────────────────────
// DEV: derive recommendation from haversine distance
const TRANSPORT_RULES = [
  { maxM: 400,   mode: "WALK",   icon: "🚶", label: "Walk",  time: (m) => `${Math.round(m / 80)} min`,       color: T.green },
  { maxM: 1500,  mode: "WALK",   icon: "🚶", label: "Walk",  time: (m) => `${Math.round(m / 80)} min`,       color: T.green },
  { maxM: 5000,  mode: "TUBE",   icon: "🚇", label: "Tube",  time: (m) => `${Math.round(m / 400)} min`,      color: T.blue  },
  { maxM: 15000, mode: "UBER",   icon: "🚗", label: "Uber",  time: (m) => `${Math.round(m / 250)} min`,      color: T.gold  },
  { maxM: Infinity, mode: "UBER",icon: "🚗", label: "Uber",  time: (m) => `${Math.round(m / 250)} min`,      color: T.gold  },
];

const getTransport = (distanceM) => {
  return TRANSPORT_RULES.find(r => distanceM <= r.maxM) || TRANSPORT_RULES[TRANSPORT_RULES.length - 1];
};

const formatDistance = (m) => {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`;
  return `${(m / 1000).toFixed(1)}km`;
};

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// DEV: replace with real profile + viewer location from props
const MOCK_PROFILE = {
  id: "usr_001",
  displayName: "MASC_MESS",
  age: 28,
  avatar: null,
  distance_m: 340,         // from haversine(viewer, profile.approx_location)
  approx_lat: 51.4879,     // 100m grid-snapped. NEVER exact.
  approx_lng: -0.1234,
  venue_name: "Eagle London",
  right_now_status: { intent: "hookup", headline: "Right Now" },
  is_online: true,
  context_signal: "At Eagle · Listening",
};

// ── OSM MAP TILE (dark satellite style) ──────────────────────────────────────
// Same filter as MeetpointCard. Pure CSS — no extra library.
function MapTile({ lat, lng, zoom = 15, distanceM }) {
  // Convert lat/lng to OSM tile numbers
  const n = Math.pow(2, zoom);
  const xTile = Math.floor((lng + 180) / 360 * n);
  const yTile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;

  // Pixel offset of the point within the tile
  const tileSize = 256;
  const xFrac = ((lng + 180) / 360 * n - xTile);
  const yFrac = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - yTile);
  const pinX = Math.round(xFrac * tileSize);
  const pinY = Math.round(yFrac * tileSize);

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      height: 160, background: "#111",
    }}>
      {/* Map tile */}
      <img
        src={tileUrl}
        alt="map"
        style={{
          position: "absolute",
          width: tileSize, height: tileSize,
          left: "50%", top: "50%",
          transform: `translate(calc(-50% + ${tileSize/2 - pinX}px), calc(-50% + ${tileSize/2 - pinY}px))`,
          filter: "brightness(0.35) saturate(0.3) contrast(1.2)",
        }}
        onError={e => { e.target.style.display = "none"; }}
      />

      {/* Radial glow at pin */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${T.gold}55 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Approximate radius ring */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 48, height: 48, borderRadius: "50%",
        border: `1px dashed ${T.gold}44`,
        pointerEvents: "none",
      }} />

      {/* Pin */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: T.gold, border: `2px solid ${T.black}`,
          boxShadow: `0 0 8px ${T.gold}`,
        }} />
        <div style={{ width: 1, height: 8, background: T.gold }} />
      </div>

      {/* Approximate label */}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        fontSize: "8px", color: T.muted,
        fontFamily: "'Barlow', sans-serif", letterSpacing: "0.1em",
        background: "rgba(0,0,0,0.6)", padding: "2px 6px",
      }}>
        APPROXIMATE LOCATION
      </div>

      {/* Distance pill top-right */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        border: `1px solid ${T.gold}44`, padding: "3px 8px",
        fontSize: "11px", fontFamily: "'Oswald', sans-serif",
        color: T.gold, letterSpacing: "0.08em",
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
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, padding: "8px 14px",
        background: active ? `${color}15` : "transparent",
        border: `1px solid ${active ? color : T.border}`,
        cursor: "pointer", minWidth: 64, transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: "10px", fontFamily: "'Oswald', sans-serif",
        letterSpacing: "0.1em", color: active ? color : T.muted,
        textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "9px", fontFamily: "'Barlow', sans-serif",
        color: active ? color : "#333" }}>
        {time}
      </span>
    </motion.button>
  );
}

// ── CTA BUTTONS ───────────────────────────────────────────────────────────────
function DirectionsButton({ profile, mode, onClick }) {
  // DEV: deep link construction
  // Apple Maps: maps://maps.apple.com/?daddr={lat},{lng}&dirflg={d|w|r}
  // Google Maps: https://maps.google.com/maps?daddr={lat},{lng}&dirflg={d|w|r}
  // dirflg: d=driving, w=walking, r=transit
  // Use navigator.platform to detect iOS vs Android
  const modeFlag = mode === "WALK" ? "w" : mode === "TUBE" ? "r" : "d";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        // DEV: detect platform + open appropriate deep link
        // const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        // const url = isIOS
        //   ? `maps://maps.apple.com/?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${modeFlag}`
        //   : `https://maps.google.com/maps?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${modeFlag}`;
        // window.open(url, '_blank');
        onClick?.();
      }}
      style={{
        flex: 1, padding: "12px",
        background: T.gold, border: "none",
        fontFamily: "'Oswald', sans-serif", fontSize: "11px",
        letterSpacing: "0.2em", color: T.black,
        cursor: "pointer", textTransform: "uppercase",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      <span>▶</span> DIRECTIONS
    </motion.button>
  );
}

function UberButton({ profile, onClick }) {
  // DEV: Uber deep link
  // uber://? client_id={CLIENT_ID} &action=setPickup
  //   &pickup=my_location
  //   &dropoff[latitude]={approx_lat}
  //   &dropoff[longitude]={approx_lng}
  //   &dropoff[nickname]={displayName}
  // Fallback: https://m.uber.com/ul/?...
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        // DEV: window.open(uberDeepLink, '_blank');
        onClick?.();
      }}
      style={{
        flex: 1, padding: "12px",
        background: T.white, border: "none",
        fontFamily: "'Oswald', sans-serif", fontSize: "11px",
        letterSpacing: "0.2em", color: T.black,
        cursor: "pointer", textTransform: "uppercase",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      <span style={{ fontSize: 13 }}>🚗</span> UBER
    </motion.button>
  );
}

// ── INLINE MAP EXPAND ─────────────────────────────────────────────────────────
// Tapping Directions expands the map to full route view before opening native maps
function InlineRouteExpand({ profile, mode, onOpenNative, onClose }) {
  const modeLabel = mode === "WALK" ? "Walking route" : mode === "TUBE" ? "Transit route" : "Driving route";
  const modeIcon  = mode === "WALK" ? "🚶" : mode === "TUBE" ? "🚇" : "🚗";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 60 }}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: T.dim, borderTop: `1px solid ${T.border}`,
          borderRadius: "18px 18px 0 0",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 3, background: "#222", borderRadius: 2, margin: "12px auto 0" }} />

        {/* Route header */}
        <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "9px", letterSpacing: "0.25em", color: T.gold,
              fontFamily: "'Oswald', sans-serif" }}>{modeIcon} {modeLabel.toUpperCase()}</p>
            <p style={{ margin: "2px 0 0", fontSize: "18px", fontFamily: "'Oswald', sans-serif",
              color: T.white, textTransform: "uppercase" }}>
              To {profile.displayName}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: "22px", fontFamily: "'Oswald', sans-serif", color: T.gold }}>
              {formatDistance(profile.distance_m)}
            </p>
            <p style={{ margin: 0, fontSize: "10px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
              {getTransport(profile.distance_m).time(profile.distance_m)} away
            </p>
          </div>
        </div>

        {/* Map */}
        <MapTile lat={profile.approx_lat} lng={profile.approx_lng} zoom={15} distanceM={profile.distance_m} />

        {/* Route steps (mock — DEV: fetch from Google Directions API or show static) */}
        <div style={{ padding: "12px 16px" }}>
          {(mode === "WALK" ? [
            "Head south on Vauxhall Bridge Road",
            "Turn left onto Albert Embankment",
            "Eagle London is on your right",
          ] : mode === "TUBE" ? [
            "Take Victoria line southbound",
            "Alight Vauxhall (2 stops)",
            "5 min walk to Eagle",
          ] : [
            "Uber picks up at your location",
            "Drops off at Eagle London",
            "Vauxhall, London",
          ]).map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0",
              borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
              <span style={{ fontSize: "9px", color: T.gold, fontFamily: "'Oswald', sans-serif",
                paddingTop: 2, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: "11px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Open in native maps */}
        <div style={{ padding: "0 16px 32px", display: "flex", gap: 8 }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onOpenNative}
            style={{
              flex: 2, padding: "13px",
              background: T.gold, border: "none",
              fontFamily: "'Oswald', sans-serif", fontSize: "11px",
              letterSpacing: "0.2em", color: T.black, cursor: "pointer", textTransform: "uppercase",
            }}>
            OPEN IN MAPS
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onClose}
            style={{
              flex: 1, padding: "13px",
              background: "transparent", border: `1px solid ${T.border}`,
              fontFamily: "'Oswald', sans-serif", fontSize: "11px",
              letterSpacing: "0.15em", color: T.muted, cursor: "pointer", textTransform: "uppercase",
            }}>
            CLOSE
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── FONT LOADER ───────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── PROFILE PROXIMITY PANEL ───────────────────────────────────────────────────
// This is the component that mounts on profile open.
// DEV: render below the avatar/header block, above bio content.
function ProfileProximityPanel({ profile }) {
  const transport = getTransport(profile.distance_m);
  const [selectedMode, setSelectedMode] = useState(transport.mode);
  const [showRoute, setShowRoute] = useState(false);
  const [tapped, setTapped] = useState(null);

  const allModes = [
    { mode: "WALK",  icon: "🚶", label: "Walk",  time: (m) => `${Math.round(m / 80)} min`,  color: T.green },
    { mode: "TUBE",  icon: "🚇", label: "Tube",  time: (m) => `${Math.round(m / 400)} min`, color: T.blue  },
    { mode: "UBER",  icon: "🚗", label: "Uber",  time: (m) => `${Math.round(m / 250)} min`, color: T.gold  },
  ];

  const currentMode = allModes.find(m => m.mode === selectedMode) || allModes[0];

  return (
    <>
      <div style={{ background: T.dim, border: `1px solid ${T.border}`, overflow: "hidden" }}>

        {/* Map tile — always visible */}
        <div onClick={() => setShowRoute(true)} style={{ cursor: "pointer" }}>
          <MapTile
            lat={profile.approx_lat}
            lng={profile.approx_lng}
            zoom={15}
            distanceM={profile.distance_m}
          />
        </div>

        {/* Distance + recommended transport header */}
        <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: "9px", letterSpacing: "0.25em", color: T.muted,
                fontFamily: "'Oswald', sans-serif" }}>GET THERE</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: "28px", fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700, color: T.white, letterSpacing: "-0.01em" }}>
                  {formatDistance(profile.distance_m)}
                </span>
                <span style={{ fontSize: "11px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
                  away
                </span>
              </div>
            </div>
            {/* Recommended tag */}
            <div style={{
              padding: "4px 10px",
              background: `${transport.color}15`,
              border: `1px solid ${transport.color}44`,
            }}>
              <p style={{ margin: 0, fontSize: "8px", letterSpacing: "0.2em",
                color: transport.color, fontFamily: "'Oswald', sans-serif" }}>
                {transport.icon} {transport.label.toUpperCase()} RECOMMENDED
              </p>
              <p style={{ margin: "1px 0 0", fontSize: "11px", color: T.white,
                fontFamily: "'Oswald', sans-serif" }}>
                {transport.time(profile.distance_m)}
              </p>
            </div>
          </div>

          {/* Venue context if present */}
          {profile.venue_name && (
            <p style={{ margin: "6px 0 0", fontSize: "10px", color: T.muted,
              fontFamily: "'Barlow', sans-serif", fontStyle: "italic" }}>
              Last seen at {profile.venue_name}
            </p>
          )}
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}` }}>
          {allModes.map(m => (
            <TransportPill
              key={m.mode}
              {...m}
              active={selectedMode === m.mode}
              time={m.time(profile.distance_m)}
              onClick={() => setSelectedMode(m.mode)}
            />
          ))}
        </div>

        {/* Action CTAs */}
        <div style={{ display: "flex", gap: 1 }}>
          <DirectionsButton
            profile={profile}
            mode={selectedMode}
            onClick={() => setShowRoute(true)}
          />
          {selectedMode === "UBER" || transport.mode === "UBER" ? (
            <UberButton
              profile={profile}
              onClick={() => {
                setTapped("uber");
                // DEV: window.open(uberDeepLink, '_blank');
              }}
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setTapped("uber")}
              style={{
                flex: 1, padding: "12px",
                background: "transparent", border: `1px solid ${T.border}`,
                fontFamily: "'Oswald', sans-serif", fontSize: "10px",
                letterSpacing: "0.15em", color: T.muted,
                cursor: "pointer", textTransform: "uppercase",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 12 }}>🚗</span> UBER
            </motion.button>
          )}
        </div>
      </div>

      {/* Inline route expand sheet */}
      <AnimatePresence>
        {showRoute && (
          <InlineRouteExpand
            profile={profile}
            mode={selectedMode}
            onOpenNative={() => {
              // DEV: window.open(nativeMapsDeepLink, '_blank');
              setShowRoute(false);
            }}
            onClose={() => setShowRoute(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── DEMO SHELL ────────────────────────────────────────────────────────────────
// Shows the panel in context — simulates it mounted below a profile header
export default function ProfileProximityDemo() {
  const [distance, setDistance] = useState(340);
  const profile = { ...MOCK_PROFILE, distance_m: distance };

  return (
    <>
      <FontLoader />
      <div style={{
        background: T.black, color: T.white, minHeight: "100vh",
        maxWidth: 480, margin: "0 auto", fontFamily: "'Barlow', sans-serif",
      }}>

        {/* Simulated profile header */}
        <div style={{
          padding: "16px", borderBottom: `1px solid ${T.border}`,
          display: "flex", gap: 12, alignItems: "center",
          position: "sticky", top: 0, background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)", zIndex: 40,
        }}>
          <button style={{ background: "none", border: "none", color: T.muted,
            cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
          <div style={{ width: 40, height: 40, borderRadius: "50%",
            background: `${T.gold}22`, border: `2px solid ${T.gold}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            👤
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "14px", fontFamily: "'Oswald', sans-serif",
              color: T.white, textTransform: "uppercase" }}>{profile.displayName}</p>
            <p style={{ margin: 0, fontSize: "10px", color: T.gold,
              fontFamily: "'Barlow', sans-serif", fontStyle: "italic" }}>
              {profile.context_signal}
            </p>
          </div>
        </div>

        {/* Distance slider for demo */}
        <div style={{ padding: "12px 16px", background: T.dim, borderBottom: `1px solid ${T.border}` }}>
          <p style={{ margin: "0 0 6px", fontSize: "9px", letterSpacing: "0.2em",
            color: T.muted, fontFamily: "'Oswald', sans-serif" }}>
            DEMO: DRAG TO CHANGE DISTANCE ({formatDistance(distance)})
          </p>
          <input type="range" min={50} max={20000} value={distance}
            onChange={e => setDistance(Number(e.target.value))}
            style={{ width: "100%", accentColor: T.gold }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px",
            color: "#333", fontFamily: "'Barlow', sans-serif" }}>
            <span>50m (nearby)</span><span>20km (across city)</span>
          </div>
        </div>

        {/* THE COMPONENT */}
        <ProfileProximityPanel profile={profile} />

        {/* Rest of profile below */}
        <div style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "9px", letterSpacing: "0.25em",
            color: T.muted, fontFamily: "'Oswald', sans-serif" }}>PROFILE CONTENT BELOW</p>
          <div style={{ height: 200, background: T.card, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#222", fontFamily: "'Barlow', sans-serif", fontSize: 11 }}>
              bio, vibe, proof signals etc.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
