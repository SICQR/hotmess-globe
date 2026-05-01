import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — PROXIMITY NAVIGATION SYSTEM ────────────────────────────────────
// Three surfaces, one system:
//
// 1. ProfileProximityHeader — distance + ETA baked into profile header
//    "1.2 km away · Until Sunday 🏴󠁧󠁢󠁥󠁮󠁧󠁿"
//
// 2. MeetpointCard — inline map card in chat thread
//    Dark satellite map, red pin, Route/Uber/Share buttons
//    message_type="meetpoint" renders this
//
// 3. RouteView — full in-app navigation screen
//    Blue route line, you→them, Start/Uber/Share
//    Replaces native maps. User never leaves the app.
//
// DEV: All three use the same underlying map + deep link system.
// Map: OpenStreetMap tiles, dark satellite filter
// Route line: SVG overlay on tile, approximated from bearing
// Directions deep link: Apple Maps (iOS) / Google Maps (Android)
// Uber deep link: uber:// with dropoff coords pre-filled
// Privacy: all coordinates are 100m grid-snapped. Never exact.
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:   "#000",
  bg:      "#0a0a0a",
  card:    "#111",
  gold:    "#C8962C",
  goldDim: "rgba(200,150,44,0.15)",
  white:   "#fff",
  muted:   "rgba(255,255,255,0.4)",
  dim:     "rgba(255,255,255,0.15)",
  border:  "#1e1e1e",
  blue:    "#4A90E2",   // route line colour
  red:     "#E24A4A",   // destination pin
};

// ── FONT LOADER ───────────────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ── DISTANCE + TIME UTILS ─────────────────────────────────────────────────────
const fmt = {
  dist: (m) => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`,
  walk: (m) => `${Math.round(m / 80)} min`,
  uber: (m) => `${Math.round(m / 300)} min`,
  tube: (m) => `${Math.round(m / 500 + 5)} min`,
};

const bestMode = (m) => {
  if (m <= 1500) return { mode:"WALK", icon:"🚶", label:"Walk",    time: fmt.walk(m), color: "#30D158" };
  if (m <= 5000) return { mode:"TUBE", icon:"🚇", label:"Transit", time: fmt.tube(m), color: T.blue   };
  return              { mode:"UBER", icon:"🚗", label:"Uber",    time: fmt.uber(m), color: T.gold   };
};

// ── OSM DARK TILE ─────────────────────────────────────────────────────────────
function DarkMapTile({ lat = 51.4879, lng = -0.1234, zoom = 15, height = 200, children }) {
  const n    = Math.pow(2, zoom);
  const xT   = Math.floor((lng + 180) / 360 * n);
  const yT   = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  const url  = `https://tile.openstreetmap.org/${zoom}/${xT}/${yT}.png`;
  const xFrac = ((lng + 180) / 360 * n - xT);
  const yFrac = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - yT);
  const cx = Math.round(xFrac * 256);
  const cy = Math.round(yFrac * 256);

  return (
    <div style={{ position:"relative", overflow:"hidden", height, background:"#0a0a0a" }}>
      <img src={url} alt="" style={{
        position:"absolute",
        width:256, height:256,
        left:`calc(50% + ${128 - cx}px)`,
        top:`calc(50% + ${128 - cy}px)`,
        transform:"translate(-50%,-50%)",
        filter:"brightness(0.3) saturate(0.25) contrast(1.3)",
        userSelect:"none", pointerEvents:"none",
      }} />
      {children}
    </div>
  );
}

// ── MAP OVERLAYS: PIN + GLOW + ROUTE LINE ─────────────────────────────────────
function DestinationPin() {
  return (
    <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-100%)", zIndex:3 }}>
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Red pin head */}
        <div style={{
          width:16, height:16, borderRadius:"50% 50% 50% 0",
          background: T.red, border:"2px solid #fff",
          transform:"rotate(-45deg)",
          boxShadow:`0 0 12px ${T.red}88`,
        }} />
      </motion.div>
    </div>
  );
}

function UserDot() {
  return (
    <div style={{ position:"absolute", zIndex:3 }}>
      {/* Outer pulse ring */}
      <motion.div
        animate={{ scale:[1, 1.8, 1], opacity:[0.4, 0, 0.4] }}
        transition={{ duration:2, repeat:Infinity }}
        style={{
          position:"absolute", inset:-8, borderRadius:"50%",
          background: T.blue, opacity:0.3,
        }}
      />
      <div style={{
        width:14, height:14, borderRadius:"50%",
        background:T.blue, border:"2.5px solid #fff",
        boxShadow:`0 0 10px ${T.blue}`,
        position:"relative",
      }} />
    </div>
  );
}

// Approximate route line — SVG drawn from left-center to right-center
// In production: fetch from Google Directions API and render actual polyline
function RouteLine({ bearing = 45 }) {
  const angle = bearing * (Math.PI / 180);
  const cx = 150, cy = 100; // map center in px (rough)
  const len = 80;
  const sx = cx - Math.cos(angle) * len;
  const sy = cy + Math.sin(angle) * len;
  const ex = cx;
  const ey = cy;

  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:2 }}>
      <defs>
        <filter id="blur-line">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Shadow */}
      <line x1={`${sx/3*100}%`} y1={`${sy/2*100}%`} x2="50%" y2="50%"
        stroke={T.blue} strokeWidth="4" strokeOpacity="0.2" strokeLinecap="round"
        strokeDasharray="6 4" />
      {/* Main route */}
      <line x1={`${sx/3*100}%`} y1={`${sy/2*100}%`} x2="50%" y2="50%"
        stroke={T.blue} strokeWidth="2.5" strokeOpacity="0.9" strokeLinecap="round"
        strokeDasharray="6 4" filter="url(#blur-line)" />
    </svg>
  );
}

// Glow at destination
function DestGlow() {
  return (
    <div style={{
      position:"absolute", left:"50%", top:"50%",
      transform:"translate(-50%,-50%)",
      width:60, height:60, borderRadius:"50%",
      background:`radial-gradient(circle, ${T.red}44 0%, transparent 70%)`,
      pointerEvents:"none", zIndex:1,
    }} />
  );
}

// ── 1. MEETPOINT CARD (in chat thread) ────────────────────────────────────────
// Renders when message_type="meetpoint"
// DEV: <MeetpointCard message={msg} viewerLat={...} viewerLng={...} />
export function MeetpointCard({ name = "Soho cluster", distanceM = 720, etaMin = 6, speed = 47, onRoute, onUber, onShare }) {
  const [pulled, setPulled] = useState(false);

  if (pulled) {
    return (
      <div style={{
        background:T.card, border:`1px solid ${T.border}`,
        padding:"10px 12px",
        fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted,
        fontStyle:"italic",
      }}>
        Meetpoint pulled
      </div>
    );
  }

  return (
    <div style={{ overflow:"hidden", border:`1px solid ${T.border}`, background:T.card, borderRadius:2, maxWidth:280 }}>
      {/* Map */}
      <div style={{ position:"relative" }}>
        <DarkMapTile height={140}>
          <RouteLine bearing={35} />
          {/* User dot — offset left */}
          <div style={{ position:"absolute", left:"30%", top:"65%", transform:"translate(-50%,-50%)" }}>
            <UserDot />
          </div>
          <DestGlow />
          <DestinationPin />
          {/* Send arrow top-right */}
          <div style={{
            position:"absolute", top:8, right:8, width:28, height:28,
            background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer",
          }}>
            <span style={{ color:T.muted, fontSize:12 }}>↗</span>
          </div>
        </DarkMapTile>
      </div>

      {/* Info row */}
      <div style={{ padding:"8px 10px 6px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
          <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"13px", color:T.white,
            textTransform:"uppercase", letterSpacing:"0.03em" }}>
            {name}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"12px", color:T.gold }}>
              {etaMin} min
            </span>
            <span style={{ fontSize:"10px", color:"#666" }}>·</span>
            <span style={{ fontSize:"11px", color:T.gold }}>{speed}↗</span>
          </div>
        </div>
        <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"10px", color:T.muted }}>
          {fmt.dist(distanceM)} · {etaMin} min
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", borderTop:`1px solid ${T.border}` }}>
        {[
          { label:"Route", icon:"⊕", primary:true,  action: onRoute },
          { label:"Uber",  icon:"□", primary:false, action: onUber  },
          { label:"Share", icon:"<", primary:false, action: onShare },
        ].map((btn, i) => (
          <motion.button key={btn.label} whileTap={{ scale:0.93 }} onClick={btn.action}
            style={{
              flex:1, padding:"9px 4px",
              background: btn.primary ? T.gold : "transparent",
              border:"none",
              borderLeft: i > 0 ? `1px solid ${T.border}` : "none",
              fontFamily:"'Oswald', sans-serif", fontSize:"11px",
              letterSpacing:"0.1em",
              color: btn.primary ? T.black : T.muted,
              cursor:"pointer", textTransform:"uppercase",
              display:"flex", alignItems:"center", justifyContent:"center", gap:4,
            }}>
            <span style={{ fontSize:9 }}>{btn.icon}</span> {btn.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── 2. PROFILE HEADER WITH DISTANCE ───────────────────────────────────────────
// DEV: mount directly below name in ProfileSheet / L2ProfileSheet
export function ProfileProximityHeader({ displayName, distanceM, context, until }) {
  const rec = bestMode(distanceM);
  return (
    <div>
      <h2 style={{
        margin: "0 0 2px",
        fontFamily:"'Oswald', sans-serif", fontSize:"22px",
        color:T.white, textTransform:"uppercase", letterSpacing:"0.04em",
      }}>
        {displayName}
      </h2>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        {context && (
          <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted, fontStyle:"italic" }}>
            {context} ·
          </span>
        )}
        <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.gold }}>
          {fmt.dist(distanceM)} away
        </span>
        {until && (
          <>
            <span style={{ color:"#333", fontSize:10 }}>·</span>
            <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted }}>
              {until}
            </span>
          </>
        )}
      </div>
      {/* Recommended transport inline */}
      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
        <span style={{ fontSize:10 }}>{rec.icon}</span>
        <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px", color: rec.color }}>
          {rec.label} · {rec.time}
        </span>
      </div>
    </div>
  );
}

// ── 3. ROUTE VIEW (full in-app navigation) ────────────────────────────────────
// Mounts as a sheet over the current screen when user taps "Route" or "Directions"
// Has Start (in-app turn-by-turn proxy) / Uber (deep link) / Share
export function RouteView({ profile, onClose, onStart, onUber, onShare }) {
  const [mode, setMode] = useState(bestMode(profile.distance_m).mode);
  const [started, setStarted] = useState(false);
  const rec = bestMode(profile.distance_m);

  const modeDetails = {
    WALK: { icon:"🚶", label:"Walk",    time: fmt.walk(profile.distance_m), color:"#30D158", flag:"w" },
    TUBE: { icon:"🚇", label:"Transit", time: fmt.tube(profile.distance_m), color: T.blue,   flag:"r" },
    UBER: { icon:"🚗", label:"Uber",    time: fmt.uber(profile.distance_m), color: T.gold,   flag:"d" },
  };
  const m = modeDetails[mode];

  // Build native maps deep link
  const openNativeMaps = () => {
    const lat = profile.approx_lat;
    const lng = profile.approx_lng;
    const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || "");
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=${m.flag}`
      : `https://maps.google.com/maps?daddr=${lat},${lng}&dirflg=${m.flag}`;
    window.open(url, "_blank");
  };

  const openUber = () => {
    const lat = profile.approx_lat;
    const lng = profile.approx_lng;
    const uberUrl = `uber://?client_id=HOTMESS&action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(profile.displayName)}`;
    const fallback = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`;
    window.open(uberUrl, "_blank");
    // DEV: setTimeout fallback to web URL if app not installed
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:T.bg, zIndex:100,
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{
        padding:"14px 16px 10px",
        display:"flex", alignItems:"center", gap:12,
        borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,0,0,0.9)", backdropFilter:"blur(8px)",
      }}>
        <button onClick={onClose} style={{
          background:"none", border:"none", color:T.white,
          fontFamily:"'Barlow', sans-serif", fontSize:"14px",
          cursor:"pointer", display:"flex", alignItems:"center", gap:4, padding:0,
        }}>
          ‹ Back
        </button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"15px",
            color:T.white, textTransform:"uppercase", letterSpacing:"0.05em" }}>
            Route to {profile.displayName}
          </p>
          <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted }}>
            {fmt.dist(profile.distance_m)} away · {m.time}
          </p>
        </div>
      </div>

      {/* Map — fills remaining space */}
      <div style={{ flex:1, position:"relative" }}>
        <DarkMapTile lat={profile.approx_lat} lng={profile.approx_lng} zoom={15} height="100%">
          {/* Route line from left to center */}
          <RouteLine bearing={30} />
          {/* User dot offset from center */}
          <div style={{ position:"absolute", left:"28%", top:"55%", transform:"translate(-50%,-50%)" }}>
            <UserDot />
          </div>
          <DestGlow />
          <DestinationPin />

          {/* Mode switcher overlay top-right */}
          <div style={{
            position:"absolute", top:10, right:10,
            display:"flex", flexDirection:"column", gap:4,
          }}>
            {Object.entries(modeDetails).map(([key, val]) => (
              <motion.button key={key} whileTap={{ scale:0.9 }}
                onClick={() => setMode(key)}
                style={{
                  width:36, height:36, borderRadius:"50%",
                  background: mode===key ? val.color : "rgba(0,0,0,0.7)",
                  border:`1px solid ${mode===key ? val.color : T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", fontSize:15,
                }}>
                {val.icon}
              </motion.button>
            ))}
          </div>
        </DarkMapTile>
      </div>

      {/* Bottom bar — ETA + actions */}
      <div style={{
        background:"rgba(0,0,0,0.92)", backdropFilter:"blur(8px)",
        borderTop:`1px solid ${T.border}`,
      }}>
        {/* ETA row */}
        <div style={{
          padding:"12px 16px 8px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"24px",
              fontWeight:600, color:T.white }}>
              {m.time}
            </span>
            <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"13px", color:T.muted }}>
              · {fmt.dist(profile.distance_m)}
            </span>
          </div>
          {/* Bearing compass */}
          <div style={{
            width:32, height:32, borderRadius:"50%",
            border:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:T.gold, fontSize:16,
          }}>↗</div>
        </div>

        {/* Step instruction */}
        <div style={{ padding:"0 16px 10px" }}>
          <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted }}>
            {mode === "WALK"
              ? `Head ${['north','south','east','west','northeast','southeast'][Math.floor(Math.random()*5)]} on ${profile.venue_name ? "toward " + profile.venue_name : "your route"}`
              : mode === "TUBE"
              ? "Take the next available service toward the city centre"
              : "Uber will pick you up at your current location"}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:1, padding:"0 1px 1px" }}>
          {/* Start */}
          <motion.button whileTap={{ scale:0.97 }}
            onClick={() => { setStarted(true); openNativeMaps(); }}
            style={{
              flex:2, padding:"14px",
              background: started ? "#30D158" : T.gold,
              border:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"13px",
              letterSpacing:"0.2em", color:T.black,
              cursor:"pointer", textTransform:"uppercase",
            }}>
            {started ? "✓ NAVIGATING" : "START"}
          </motion.button>

          {/* Uber */}
          <motion.button whileTap={{ scale:0.97 }}
            onClick={openUber}
            style={{
              flex:1, padding:"14px",
              background:T.card, border:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"13px",
              letterSpacing:"0.15em", color:T.white,
              cursor:"pointer", textTransform:"uppercase",
              display:"flex", alignItems:"center", justifyContent:"center", gap:4,
            }}>
            🚗 Uber
          </motion.button>

          {/* Share */}
          <motion.button whileTap={{ scale:0.97 }}
            onClick={onShare}
            style={{
              flex:1, padding:"14px",
              background:T.card, border:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"13px",
              letterSpacing:"0.15em", color:T.muted,
              cursor:"pointer", textTransform:"uppercase",
              display:"flex", alignItems:"center", justifyContent:"center", gap:4,
            }}>
            ↗ Share
          </motion.button>
        </div>
      </div>

      {/* Nav bar */}
      <div style={{
        display:"flex", background:T.black,
        borderTop:`1px solid ${T.border}`, padding:"10px 0 20px",
      }}>
        {["Home","Pulse","Ghosted","Market","Profile"].map((tab, i) => (
          <div key={tab} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:18, marginBottom:2 }}>
              {["🏠","📡","👻","🛍","👤"][i]}
            </div>
            <p style={{
              margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"9px",
              color: tab === "Ghosted" ? T.gold : T.muted,
              letterSpacing:"0.05em",
            }}>{tab}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DEMO SHELL ────────────────────────────────────────────────────────────────
export default function ProximityNavDemo() {
  useFonts();

  const [view, setView] = useState("ghosted"); // ghosted | chat | route
  const [distM, setDistM] = useState(1300);

  const profile = {
    displayName: "AlexTravels ✈",
    context: "Visiting Berlin",
    until: "Until Sunday 🇬🇧",
    approx_lat: 52.4966,
    approx_lng: 13.3446,
    distance_m: distM,
    venue_name: "Schöneberg",
  };

  if (view === "route") {
    return (
      <>
        <RouteView
          profile={profile}
          onClose={() => setView("chat")}
          onStart={() => {}}
          onUber={() => {}}
          onShare={() => {}}
        />
      </>
    );
  }

  return (
    <div style={{
      background:T.bg, color:T.white, minHeight:"100vh",
      maxWidth:480, margin:"0 auto",
      fontFamily:"'Barlow', sans-serif",
      display:"flex", flexDirection:"column",
    }}>

      {/* Demo controls */}
      <div style={{ padding:"10px 14px", background:"#050505", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {[
            { id:"ghosted", label:"Ghosted Grid" },
            { id:"chat",    label:"Chat + MeetpointCard" },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding:"5px 10px", background: view===v.id ? T.gold : "transparent",
              border:`1px solid ${view===v.id ? T.gold : T.border}`,
              fontFamily:"'Oswald', sans-serif", fontSize:"9px", letterSpacing:"0.15em",
              color: view===v.id ? T.black : T.muted, cursor:"pointer", textTransform:"uppercase",
            }}>{v.label}</button>
          ))}
        </div>
        <input type="range" min={80} max={20000} value={distM}
          onChange={e => setDistM(Number(e.target.value))}
          style={{ width:"100%", accentColor:T.gold, height:2 }} />
        <p style={{ margin:"4px 0 0", fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
          Distance: {fmt.dist(distM)} · Best: {bestMode(distM).icon} {bestMode(distM).label} · {bestMode(distM).time}
        </p>
      </div>

      {/* ── GHOSTED VIEW ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
      {view === "ghosted" && (
        <motion.div key="ghosted"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>

          {/* Header */}
          <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${T.border}` }}>
            <h2 style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"22px",
              color:T.white, textTransform:"uppercase" }}>Ghosted</h2>
            <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif", fontSize:"11px",
              color:T.gold }}>London · Right Now</p>
          </div>

          {/* Profile sheet preview — tap to open */}
          <div style={{ padding:12 }}>
            <p style={{ margin:"0 0 8px", fontSize:"9px", letterSpacing:"0.2em",
              color:T.muted, fontFamily:"'Oswald', sans-serif" }}>
              TAP A CARD TO SEE PROXIMITY HEADER
            </p>

            {/* Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginBottom:12 }}>
              {[
                { name:"Dom",    d:1300 }, { name:"Kyle",   d:870  }, { name:"Matt",   d:560  },
                { name:"Jayson", d:1000 }, { name:"Jon",    d:980  }, { name:"Jamie",  d:690  },
              ].map((u, i) => (
                <motion.div key={u.name} whileTap={{ scale:0.96 }}
                  onClick={() => setView("chat")}
                  style={{
                    aspectRatio:"3/4", background:T.card,
                    border:`1px solid ${T.border}`, position:"relative",
                    cursor:"pointer", overflow:"hidden",
                  }}>
                  <div style={{
                    position:"absolute", inset:0,
                    background:`linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:28,
                  }}>👤</div>
                  <div style={{
                    position:"absolute", bottom:0, left:0, right:0,
                    background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)",
                    padding:"8px 6px 6px",
                  }}>
                    <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"12px",
                      color:T.white, textTransform:"uppercase" }}>{u.name}</p>
                    <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"9px",
                      color: bestMode(u.d).color }}>
                      {fmt.dist(u.d)} · {bestMode(u.d).time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Profile header preview */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, padding:14 }}>
              <p style={{ margin:"0 0 10px", fontSize:"9px", letterSpacing:"0.2em",
                color:T.muted, fontFamily:"'Oswald', sans-serif" }}>
                PROFILE HEADER (distance from your card)
              </p>
              <ProfileProximityHeader
                displayName={profile.displayName}
                distanceM={distM}
                context={profile.context}
                until={profile.until}
              />
              <div style={{ display:"flex", gap:6, marginTop:12 }}>
                <motion.button whileTap={{ scale:0.95 }}
                  onClick={() => setView("route")}
                  style={{
                    flex:2, padding:"10px",
                    background:T.gold, border:"none",
                    fontFamily:"'Oswald', sans-serif", fontSize:"10px",
                    letterSpacing:"0.15em", color:T.black, cursor:"pointer",
                    textTransform:"uppercase",
                  }}>
                  ▶ ROUTE
                </motion.button>
                <motion.button whileTap={{ scale:0.95 }}
                  style={{
                    flex:1, padding:"10px",
                    background:T.card, border:`1px solid ${T.border}`,
                    fontFamily:"'Oswald', sans-serif", fontSize:"10px",
                    letterSpacing:"0.15em", color:T.muted, cursor:"pointer",
                    textTransform:"uppercase",
                  }}>
                  🚗 UBER
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── CHAT VIEW ─────────────────────────────────────────────────────────── */}
      {view === "chat" && (
        <motion.div key="chat"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ display:"flex", flexDirection:"column", flex:1 }}>

          {/* Chat header */}
          <div style={{
            padding:"12px 16px",
            borderBottom:`1px solid ${T.border}`,
            background:"rgba(0,0,0,0.9)",
            backdropFilter:"blur(8px)",
            position:"sticky", top:0, zIndex:10,
          }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button onClick={() => setView("ghosted")} style={{
                background:"none", border:"none", color:T.white,
                fontSize:18, cursor:"pointer", padding:0,
              }}>‹</button>
              <div style={{ width:36, height:36, borderRadius:"50%",
                background:T.goldDim, border:`2px solid ${T.gold}44`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                ✈
              </div>
              <div style={{ flex:1 }}>
                <ProfileProximityHeader
                  displayName={profile.displayName}
                  distanceM={distM}
                  context={profile.context}
                  until={profile.until}
                />
              </div>
              <span style={{ color:T.muted, fontSize:18 }}>⋯</span>
            </div>
          </div>

          {/* Chat messages */}
          <div style={{ flex:1, padding:"12px 14px", overflowY:"auto" }}>
            {/* Their message */}
            <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:8 }}>
              <div style={{ maxWidth:"75%", background:T.card,
                border:`1px solid ${T.border}`, padding:"8px 12px" }}>
                <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"13px",
                  color:T.white }}>
                  Just got into Berlin! Trying to find a bar now 😊
                </p>
                <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif",
                  fontSize:"9px", color:T.muted, textAlign:"right" }}>9:26</p>
              </div>
            </div>

            {/* Your message */}
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
              <div style={{ maxWidth:"75%", background:T.gold, padding:"8px 12px" }}>
                <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"13px",
                  color:T.black, fontWeight:500 }}>
                  Right <strong>now</strong>? I'm in Schöneberg
                </p>
                <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif",
                  fontSize:"9px", color:"rgba(0,0,0,0.5)", textAlign:"right" }}>9:30</p>
              </div>
            </div>

            {/* Their message */}
            <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:12 }}>
              <div style={{ maxWidth:"75%", background:T.card,
                border:`1px solid ${T.border}`, padding:"8px 12px" }}>
                <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"13px",
                  color:T.white }}>Perfect! Let's meet there!</p>
              </div>
            </div>

            {/* Date divider */}
            <div style={{ textAlign:"center", margin:"10px 0" }}>
              <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px",
                color:T.muted, background:T.bg, padding:"2px 12px" }}>Today</span>
            </div>

            {/* MEETPOINT CARD in chat */}
            <div style={{ marginBottom:12 }}>
              <MeetpointCard
                name="Soho cluster"
                distanceM={720}
                etaMin={6}
                speed={47}
                onRoute={() => setView("route")}
                onUber={() => {}}
                onShare={() => {}}
              />
              <p style={{ margin:"4px 0 0 4px", fontFamily:"'Barlow', sans-serif",
                fontSize:"10px", color:T.muted, fontStyle:"italic" }}>
                Just shared a good meetpoint with you
              </p>
            </div>

            {/* Their typing */}
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <motion.div key={i}
                  animate={{ opacity:[0.3,1,0.3] }}
                  transition={{ duration:1, repeat:Infinity, delay:i*0.2 }}
                  style={{ width:4, height:4, borderRadius:"50%", background:T.muted }}
                />
              ))}
              <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px",
                color:T.muted, marginLeft:4 }}>AlexTravels is typing...</span>
            </div>
          </div>

          {/* Composer */}
          <div style={{
            borderTop:`1px solid ${T.border}`, padding:"8px 12px 24px",
            background:"rgba(0,0,0,0.9)", backdropFilter:"blur(8px)",
            display:"flex", gap:8, alignItems:"center",
          }}>
            <span style={{ color:T.muted, fontSize:20, cursor:"pointer" }}>📷</span>
            <div style={{
              flex:1, background:T.card, border:`1px solid ${T.border}`,
              padding:"10px 12px",
            }}>
              <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"12px", color:T.muted }}>
                Message...
              </span>
            </div>
            <span style={{ color:T.muted, fontSize:20, cursor:"pointer" }}>📷</span>
            <span style={{ color:T.muted, fontSize:18, cursor:"pointer" }}>🎤</span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Nav bar */}
      {view !== "route" && (
        <div style={{
          display:"flex", background:T.black,
          borderTop:`1px solid ${T.border}`, padding:"10px 0 20px",
          position:"sticky", bottom:0,
        }}>
          {["Home","Pulse","Ghosted","Market","Profile"].map((tab, i) => (
            <div key={tab} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:16, marginBottom:1 }}>
                {["🏠","📡","👻","🛍","👤"][i]}
              </div>
              <p style={{
                margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"9px",
                color: tab === "Ghosted" ? T.gold : T.muted,
                letterSpacing:"0.05em",
              }}>{tab}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
