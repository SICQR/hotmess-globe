import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — PROXIMITY NAVIGATION v2 ────────────────────────────────────────
// Five upgrades from v1:
// 1. Mutual movement state — "They're 4 min away" / "You're both moving"
//    DEV: reads from public_movement_presence table (bearing, speed, eta_seconds)
//
// 2. "I'm on my way" commit before Start
//    DEV: writes profiles.movement_state="en_route" + emitPulse()
//         fires send_message({ type:"on_my_way", eta_min }) to chat thread
//
// 3. Chat injection — "On my way · 6 min" message type
//    Other user sees: "Alex is 6 min away" in their thread
//    DEV: message_type="movement_update", rendered as MovementStatusCard
//
// 4. Live distance decay — updates every 10s, subtle count-down animation
//    DEV: re-queries haversine(viewer GPS, profile approx_location) on interval
//
// 5. HNH "Be ready" shown AFTER "I'm on my way" tap — not before
//    DEV: conditional render on movement_state="en_route"
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black: "#000", bg: "#0a0a0a", card: "#111",
  gold: "#C8962C", goldDim: "rgba(200,150,44,0.12)",
  white: "#fff", muted: "rgba(255,255,255,0.38)",
  dim: "rgba(255,255,255,0.12)", border: "#1e1e1e",
  blue: "#4A90E2", red: "#E24A4A", green: "#30D158",
  orange: "#FF6B2B",
};

// ── FONTS ─────────────────────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmtDist = (m) => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
const fmtWalk = (m) => `${Math.max(1, Math.round(m / 80))} min`;
const fmtUber = (m) => `${Math.max(1, Math.round(m / 300))} min`;
const bestMode = (m) => {
  if (m <= 1500) return { mode:"WALK", icon:"🚶", label:"Walk",    eta: fmtWalk(m), color: T.green };
  if (m <= 6000) return { mode:"TUBE", icon:"🚇", label:"Transit", eta: `${Math.round(m/500+4)} min`, color: T.blue };
  return              { mode:"UBER", icon:"🚗", label:"Uber",    eta: fmtUber(m), color: T.gold };
};

// ── LIVE DISTANCE HOOK (upgrade #4) ──────────────────────────────────────────
// DEV: replace simulation with real GPS query + haversine every 10s
function useLiveDistance(initialM, isMoving = false) {
  const [distM, setDistM] = useState(initialM);
  const [shrinking, setShrinking] = useState(false);

  useEffect(() => {
    if (!isMoving) return;
    const id = setInterval(() => {
      setDistM(prev => {
        const next = Math.max(40, prev - Math.floor(Math.random() * 12 + 8));
        setShrinking(true);
        setTimeout(() => setShrinking(false), 600);
        return next;
      });
    }, 4000); // simulate 4s for demo (DEV: 10–15s in production)
    return () => clearInterval(id);
  }, [isMoving]);

  return { distM, shrinking };
}

// ── MAP TILE ──────────────────────────────────────────────────────────────────
function DarkMapTile({ lat = 52.497, lng = 13.344, zoom = 15, height = 180, children }) {
  const n = Math.pow(2, zoom);
  const xT = Math.floor((lng + 180) / 360 * n);
  const yT = Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * n);
  const url = `https://tile.openstreetmap.org/${zoom}/${xT}/${yT}.png`;
  const xF = ((lng + 180) / 360 * n - xT);
  const yF = ((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * n - yT);
  const cx = Math.round(xF * 256), cy = Math.round(yF * 256);

  return (
    <div style={{ position:"relative", overflow:"hidden", height, background:"#080808" }}>
      <img src={url} alt="" style={{
        position:"absolute", width:256, height:256,
        left:`calc(50% + ${128-cx}px)`, top:`calc(50% + ${128-cy}px)`,
        transform:"translate(-50%,-50%)",
        filter:"brightness(0.28) saturate(0.2) contrast(1.35)",
        pointerEvents:"none",
      }} />
      {children}
    </div>
  );
}

// Map overlays
function DestPin() {
  return (
    <div style={{ position:"absolute", left:"50%", top:"44%", transform:"translate(-50%,-100%)", zIndex:4 }}>
      <motion.div animate={{ y:[0,-3,0] }} transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}>
        <div style={{
          width:14, height:14, borderRadius:"50% 50% 50% 0", transform:"rotate(-45deg)",
          background:T.red, border:"2.5px solid #fff", boxShadow:`0 0 14px ${T.red}99`,
        }} />
      </motion.div>
      <div style={{ width:1, height:6, background:T.red, margin:"0 auto", display:"block" }} />
    </div>
  );
}

function YouDot({ offsetLeft = "32%" }) {
  return (
    <div style={{ position:"absolute", left:offsetLeft, top:"58%", transform:"translate(-50%,-50%)", zIndex:4 }}>
      <motion.div animate={{ scale:[1,1.9,1], opacity:[0.35,0,0.35] }} transition={{ duration:2.2, repeat:Infinity }}
        style={{ position:"absolute", inset:-8, borderRadius:"50%", background:T.blue }} />
      <div style={{ width:13, height:13, borderRadius:"50%", background:T.blue,
        border:"2.5px solid #fff", boxShadow:`0 0 10px ${T.blue}`, position:"relative" }} />
    </div>
  );
}

function RouteLine() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:3 }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <line x1="32%" y1="58%" x2="50%" y2="44%"
        stroke={T.blue} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="7 5" strokeOpacity="0.85" filter="url(#glow)" />
    </svg>
  );
}

function DestGlow() {
  return (
    <div style={{ position:"absolute", left:"50%", top:"44%", transform:"translate(-50%,-50%)",
      width:56, height:56, borderRadius:"50%",
      background:`radial-gradient(circle, ${T.red}44 0%, transparent 70%)`, zIndex:2, pointerEvents:"none" }} />
  );
}

// ── MUTUAL MOVEMENT CARD (upgrade #1) ────────────────────────────────────────
// DEV: reads public_movement_presence for the other user
// Shows their movement state in real time
function MutualMovementBadge({ theirEta, theyAreMoving }) {
  if (!theyAreMoving && !theirEta) return null;
  return (
    <motion.div
      initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"5px 10px",
        background:`${T.green}12`, border:`1px solid ${T.green}44`,
      }}>
      <motion.div
        animate={{ scale:[1,1.4,1] }} transition={{ duration:1.5, repeat:Infinity }}
        style={{ width:5, height:5, borderRadius:"50%", background:T.green, flexShrink:0 }}
      />
      <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px",
        color:T.green, fontStyle:"italic" }}>
        {theyAreMoving && theirEta
          ? `They're ${theirEta} away · moving`
          : theyAreMoving
          ? "You're both moving"
          : `They're ${theirEta} away`}
      </span>
    </motion.div>
  );
}

// ── MOVEMENT STATUS CARD in chat (upgrade #3) ────────────────────────────────
// Renders when message_type="movement_update"
// DEV: inject into thread when onMyWay fires
function MovementStatusCard({ name, etaMin, distanceM, isIncoming }) {
  return (
    <div style={{
      maxWidth: 240,
      background:`${T.green}0d`, border:`1px solid ${T.green}33`,
      padding:"8px 12px",
      display:"flex", alignItems:"center", gap:10,
    }}>
      <motion.div animate={{ x:[0,3,0] }} transition={{ duration:1.5, repeat:Infinity }}
        style={{ fontSize:16 }}>🚶</motion.div>
      <div>
        <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"12px",
          color:T.green, textTransform:"uppercase", letterSpacing:"0.05em" }}>
          {isIncoming ? `${name} is on the way` : "On my way"}
        </p>
        <p style={{ margin:"1px 0 0", fontFamily:"'Barlow', sans-serif",
          fontSize:"10px", color:T.muted }}>
          {fmtDist(distanceM)} · {etaMin} min
        </p>
      </div>
    </div>
  );
}

// ── MEETPOINT CARD (chat bubble) ─────────────────────────────────────────────
function MeetpointCard({ name, distanceM, etaMin, speed, theyAreMoving, theirEta, onRoute }) {
  return (
    <div style={{ overflow:"hidden", border:`1px solid ${T.border}`, background:T.card, maxWidth:280 }}>
      {/* Map */}
      <div style={{ position:"relative" }}>
        <DarkMapTile height={138}>
          <RouteLine />
          <YouDot offsetLeft="30%" />
          <DestGlow />
          <DestPin />
          <div style={{ position:"absolute", top:8, right:8, width:26, height:26,
            background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)",
            borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer" }}>
            <span style={{ color:T.muted, fontSize:11 }}>↗</span>
          </div>
        </DarkMapTile>

        {/* Mutual movement badge overlaid on map bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0 }}>
          <MutualMovementBadge theyAreMoving={theyAreMoving} theirEta={theirEta} />
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:"8px 10px 6px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:1 }}>
          <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"13px",
            color:T.white, textTransform:"uppercase", letterSpacing:"0.03em" }}>{name}</span>
          <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"12px", color:T.gold }}>
            {etaMin} min · {speed}↗
          </span>
        </div>
        <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"10px", color:T.muted }}>
          {fmtDist(distanceM)} · {etaMin} min
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display:"flex", borderTop:`1px solid ${T.border}` }}>
        {[
          { label:"Route", primary:true,  onClick: onRoute },
          { label:"Uber",  primary:false, onClick: ()=>{} },
          { label:"Share", primary:false, onClick: ()=>{} },
        ].map((btn, i) => (
          <motion.button key={btn.label} whileTap={{ scale:0.93 }} onClick={btn.onClick}
            style={{
              flex:1, padding:"9px 4px", background:btn.primary ? T.gold : "transparent",
              border:"none", borderLeft:i>0?`1px solid ${T.border}`:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"10px", letterSpacing:"0.1em",
              color:btn.primary ? T.black : T.muted, cursor:"pointer", textTransform:"uppercase",
            }}>
            {btn.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── ROUTE VIEW (full screen) ─────────────────────────────────────────────────
function RouteView({ profile, onClose, onOnMyWay }) {
  const [committed, setCommitted] = useState(false);
  const [showHNH, setShowHNH] = useState(false);
  const [mode, setMode] = useState(bestMode(profile.distance_m).mode);
  const { distM, shrinking } = useLiveDistance(profile.distance_m, committed);

  const modes = {
    WALK: { icon:"🚶", label:"Walk",    eta: fmtWalk(distM), color:T.green, flag:"w" },
    TUBE: { icon:"🚇", label:"Transit", eta: `${Math.round(distM/500+4)} min`, color:T.blue,  flag:"r" },
    UBER: { icon:"🚗", label:"Uber",    eta: fmtUber(distM), color:T.gold,  flag:"d" },
  };
  const m = modes[mode];

  const handleOnMyWay = () => {
    setCommitted(true);
    setTimeout(() => setShowHNH(true), 1200); // HNH appears 1.2s after commit (upgrade #5)
    onOnMyWay?.({ etaMin: parseInt(m.eta), distM });
    // DEV:
    // supabase.from('profiles').update({ movement_state:'en_route', movement_eta_min: parseInt(m.eta) })
    // send_message(threadId, { type:'movement_update', eta_min: parseInt(m.eta), dist_m: distM })
    // emitPulse({ type:'en_route', lat, lng })
  };

  const handleStart = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || "");
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${m.flag}`
      : `https://maps.google.com/maps?daddr=${profile.approx_lat},${profile.approx_lng}&dirflg=${m.flag}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ position:"fixed", inset:0, background:T.bg, zIndex:100,
      display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ padding:"14px 16px 10px", display:"flex", alignItems:"center", gap:12,
        borderBottom:`1px solid ${T.border}`, background:"rgba(0,0,0,0.92)", backdropFilter:"blur(8px)" }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:T.white,
          fontFamily:"'Barlow', sans-serif", fontSize:"14px", cursor:"pointer", padding:0 }}>
          ‹ Back
        </button>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"15px",
            color:T.white, textTransform:"uppercase", letterSpacing:"0.05em" }}>
            Route to {profile.displayName}
          </p>
          {/* Live distance decay (upgrade #4) */}
          <motion.p
            animate={{ color: shrinking ? T.green : T.muted }}
            transition={{ duration:0.4 }}
            style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"11px" }}>
            {fmtDist(distM)} away · {m.eta}
            {shrinking && <span style={{ marginLeft:4, fontSize:9, color:T.green }}>↓ getting closer</span>}
          </motion.p>
        </div>
        {/* Mutual movement badge (upgrade #1) */}
        {committed && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ display:"flex", alignItems:"center", gap:4 }}>
            <motion.div animate={{ scale:[1,1.4,1] }} transition={{ duration:1.2, repeat:Infinity }}
              style={{ width:6, height:6, borderRadius:"50%", background:T.green }} />
            <span style={{ fontSize:"9px", color:T.green, fontFamily:"'Barlow', sans-serif" }}>moving</span>
          </motion.div>
        )}
      </div>

      {/* Map */}
      <div style={{ flex:1, position:"relative" }}>
        <DarkMapTile lat={profile.approx_lat} lng={profile.approx_lng} zoom={15} height="100%">
          <RouteLine />
          <YouDot offsetLeft="28%" />
          <DestGlow />
          <DestPin />
          {/* Mode pills top-right */}
          <div style={{ position:"absolute", top:10, right:10,
            display:"flex", flexDirection:"column", gap:4 }}>
            {Object.entries(modes).map(([key, val]) => (
              <motion.button key={key} whileTap={{ scale:0.88 }} onClick={() => setMode(key)}
                style={{
                  width:36, height:36, borderRadius:"50%",
                  background: mode===key ? val.color : "rgba(0,0,0,0.72)",
                  border:`1px solid ${mode===key ? val.color : T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", fontSize:15,
                }}>
                {val.icon}
              </motion.button>
            ))}
          </div>
          {/* If committed: show their position too */}
          {committed && (
            <div style={{ position:"absolute", right:"28%", top:"35%",
              transform:"translate(50%,-50%)" }}>
              <div style={{ width:10, height:10, borderRadius:"50%",
                background:T.red, border:"2px solid #fff",
                boxShadow:`0 0 8px ${T.red}88` }} />
            </div>
          )}
        </DarkMapTile>
      </div>

      {/* Bottom panel */}
      <div style={{ background:"rgba(0,0,0,0.94)", backdropFilter:"blur(8px)",
        borderTop:`1px solid ${T.border}` }}>

        {/* ETA row with live decay */}
        <div style={{ padding:"12px 16px 8px", display:"flex",
          justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <motion.span
              key={m.eta}
              initial={{ y:-8, opacity:0 }} animate={{ y:0, opacity:1 }}
              style={{ fontFamily:"'Oswald', sans-serif", fontSize:"26px",
                fontWeight:600, color:committed ? T.green : T.white }}>
              {m.eta}
            </motion.span>
            <motion.span
              key={fmtDist(distM)}
              animate={{ color: shrinking ? T.green : T.muted }}
              style={{ fontFamily:"'Barlow', sans-serif", fontSize:"13px" }}>
              · {fmtDist(distM)}
            </motion.span>
          </div>
          <span style={{ color:T.gold, fontSize:18 }}>↗</span>
        </div>

        {/* Step hint */}
        <div style={{ padding:"0 16px 8px" }}>
          <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted }}>
            {mode==="WALK" ? `Head toward ${profile.venue_name || "destination"}` :
             mode==="TUBE" ? "Take the next available service" :
             "Uber will pick you up here"}
          </p>
        </div>

        {/* HNH "Be ready" — appears after commit (upgrade #5) */}
        <AnimatePresence>
          {showHNH && (
            <motion.div
              initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
              exit={{ height:0, opacity:0 }} transition={{ duration:0.35 }}
              style={{ overflow:"hidden" }}>
              <div style={{ margin:"0 16px 8px", padding:"10px 12px",
                background:T.goldDim, border:`1px solid ${T.gold}44`,
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:"9px", letterSpacing:"0.2em",
                    color:T.gold, fontFamily:"'Oswald', sans-serif" }}>HNH MESS</p>
                  <p style={{ margin:"1px 0 0", fontSize:"12px",
                    fontFamily:"'Barlow', sans-serif", color:T.white }}>
                    Be ready.
                  </p>
                </div>
                <motion.button whileTap={{ scale:0.95 }}
                  style={{ padding:"6px 14px", background:T.gold, border:"none",
                    fontFamily:"'Oswald', sans-serif", fontSize:"10px", letterSpacing:"0.15em",
                    color:T.black, cursor:"pointer", textTransform:"uppercase" }}>
                  Handle it
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:1, padding:"0 1px 1px" }}>
          {!committed ? (
            /* Step 1: I'm on my way (upgrade #2) */
            <>
              <motion.button whileTap={{ scale:0.97 }} onClick={handleOnMyWay}
                style={{
                  flex:2, padding:"14px",
                  background:T.gold, border:"none",
                  fontFamily:"'Oswald', sans-serif", fontSize:"12px",
                  letterSpacing:"0.18em", color:T.black,
                  cursor:"pointer", textTransform:"uppercase",
                }}>
                I'M ON MY WAY
              </motion.button>
              <motion.button whileTap={{ scale:0.97 }}
                onClick={() => { window.open(`uber://?action=setPickup`, "_blank"); }}
                style={{
                  flex:1, padding:"14px", background:T.card, border:"none",
                  fontFamily:"'Oswald', sans-serif", fontSize:"11px",
                  letterSpacing:"0.1em", color:T.muted,
                  cursor:"pointer", textTransform:"uppercase",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                }}>
                🚗 Uber
              </motion.button>
            </>
          ) : (
            /* Step 2: Start navigation (opens native maps) */
            <>
              <motion.button whileTap={{ scale:0.97 }} onClick={handleStart}
                style={{
                  flex:2, padding:"14px",
                  background:T.green, border:"none",
                  fontFamily:"'Oswald', sans-serif", fontSize:"12px",
                  letterSpacing:"0.18em", color:T.black,
                  cursor:"pointer", textTransform:"uppercase",
                }}>
                START NAVIGATION
              </motion.button>
              <motion.button whileTap={{ scale:0.97 }}
                style={{
                  flex:1, padding:"14px", background:T.card, border:"none",
                  fontFamily:"'Oswald', sans-serif", fontSize:"11px",
                  letterSpacing:"0.1em", color:T.muted,
                  cursor:"pointer", textTransform:"uppercase",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                }}>
                ↗ Share
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Nav bar */}
      <div style={{ display:"flex", background:T.black,
        borderTop:`1px solid ${T.border}`, padding:"10px 0 20px" }}>
        {["Home","Pulse","Ghosted","Market","Profile"].map((tab,i) => (
          <div key={tab} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:16, marginBottom:1 }}>
              {["🏠","📡","👻","🛍","👤"][i]}
            </div>
            <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"9px",
              color:tab==="Ghosted"?T.gold:T.muted, letterSpacing:"0.05em" }}>{tab}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DEMO ──────────────────────────────────────────────────────────────────────
export default function ProximityNavV2() {
  useFonts();
  const [view, setView] = useState("chat");
  const [distM, setDistM] = useState(1300);
  const [messages, setMessages] = useState([
    { id:1, from:"them", type:"text", text:"Just got into Berlin! Trying to find a bar now 😊", time:"9:26" },
    { id:2, from:"me",   type:"text", text:"Right now? I'm in Schöneberg", time:"9:30", highlight:true },
    { id:3, from:"them", type:"text", text:"Perfect! Let's meet there!", time:"9:30" },
    { id:4, from:"system", type:"meetpoint", name:"Soho cluster", distM:720, etaMin:6, speed:47, time:"9:32" },
  ]);
  const [theyAreMoving, setTheyAreMoving] = useState(false);
  const [theirEta, setTheirEta] = useState(null);

  const profile = {
    displayName:"AlexTravels ✈", context:"Visiting Berlin",
    until:"Until Sunday 🇬🇧",
    approx_lat:52.4966, approx_lng:13.3446,
    distance_m: distM, venue_name:"Schöneberg",
  };

  const rec = bestMode(distM);

  const handleOnMyWay = ({ etaMin }) => {
    // Inject "On my way" message into chat thread (upgrade #3)
    setMessages(prev => [...prev, {
      id: Date.now(), from:"me", type:"movement_update",
      etaMin, distM, time: new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
    }]);
    // Simulate them also starting to move
    setTimeout(() => {
      setTheyAreMoving(true);
      setTheirEta(`${etaMin - 1} min`);
      setMessages(prev => [...prev, {
        id: Date.now()+1, from:"them", type:"movement_update",
        etaMin: etaMin - 1, distM: distM - 80,
        time: new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
      }]);
    }, 2000);
    setView("chat");
  };

  if (view === "route") {
    return <RouteView profile={profile} onClose={() => setView("chat")} onOnMyWay={handleOnMyWay} />;
  }

  return (
    <div style={{ background:T.bg, color:T.white, minHeight:"100vh", maxWidth:480, margin:"0 auto",
      fontFamily:"'Barlow', sans-serif", display:"flex", flexDirection:"column" }}>

      {/* Distance slider */}
      <div style={{ padding:"10px 14px 8px", background:"#050505",
        borderBottom:`1px solid ${T.border}` }}>
        <input type="range" min={80} max={12000} value={distM}
          onChange={e => setDistM(Number(e.target.value))}
          style={{ width:"100%", accentColor:T.gold, height:2 }} />
        <p style={{ margin:"3px 0 0", fontSize:"9px", color:T.muted,
          fontFamily:"'Barlow', sans-serif" }}>
          {fmtDist(distM)} · {rec.icon} {rec.label} recommended · {rec.eta}
        </p>
      </div>

      {/* Chat header — distance in header (from screenshots) */}
      <div style={{ padding:"11px 14px 10px", borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,0,0,0.92)", backdropFilter:"blur(8px)",
        position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ width:36, height:36, borderRadius:"50%",
            background:T.goldDim, border:`2px solid ${T.gold}44`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✈</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"16px",
                color:T.white, textTransform:"uppercase" }}>
                {profile.displayName}
              </span>
            </div>
            {/* Distance in header — matches screenshot exactly */}
            <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"11px", color:T.muted }}>
              {profile.context} · <span style={{ color:T.gold }}>{fmtDist(distM)}</span> · {profile.until}
            </p>
          </div>
          <span style={{ color:T.muted, fontSize:18 }}>⋯</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, padding:"12px 14px 8px", overflowY:"auto",
        display:"flex", flexDirection:"column", gap:8 }}>

        {messages.map(msg => {
          if (msg.type === "text") {
            const isMe = msg.from === "me";
            return (
              <div key={msg.id} style={{ display:"flex",
                justifyContent:isMe?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"75%", padding:"8px 12px",
                  background: msg.highlight ? T.gold : isMe ? "#1a1a1a" : T.card,
                  border: msg.highlight ? "none" : `1px solid ${T.border}`,
                }}>
                  <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"13px",
                    color: msg.highlight ? T.black : T.white,
                    fontWeight: msg.highlight ? 500 : 400 }}>
                    {msg.highlight
                      ? <><strong>Right now?</strong> I'm in Schöneberg</>
                      : msg.text}
                  </p>
                  <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif",
                    fontSize:"9px", color:msg.highlight?"rgba(0,0,0,0.45)":T.dim,
                    textAlign:"right" }}>{msg.time}</p>
                </div>
              </div>
            );
          }

          if (msg.type === "meetpoint") {
            return (
              <div key={msg.id}>
                {/* Date divider */}
                <div style={{ textAlign:"center", margin:"4px 0 8px" }}>
                  <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px",
                    color:T.muted, padding:"2px 12px" }}>Today</span>
                </div>
                <MeetpointCard
                  name={msg.name} distanceM={msg.distM}
                  etaMin={msg.etaMin} speed={msg.speed}
                  theyAreMoving={theyAreMoving} theirEta={theirEta}
                  onRoute={() => setView("route")}
                />
                <p style={{ margin:"4px 0 0 4px", fontFamily:"'Barlow', sans-serif",
                  fontSize:"10px", color:T.muted, fontStyle:"italic" }}>
                  Just shared a good meetpoint with you
                </p>
              </div>
            );
          }

          if (msg.type === "movement_update") {
            const isMe = msg.from === "me";
            return (
              <div key={msg.id} style={{ display:"flex",
                justifyContent:isMe?"flex-end":"flex-start" }}>
                <MovementStatusCard
                  name={profile.displayName}
                  etaMin={msg.etaMin}
                  distanceM={msg.distM}
                  isIncoming={!isMe}
                />
              </div>
            );
          }
          return null;
        })}

        {/* Typing indicator */}
        <div style={{ display:"flex", gap:3, alignItems:"center" }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity:[0.3,1,0.3] }}
              transition={{ duration:1, repeat:Infinity, delay:i*0.2 }}
              style={{ width:4, height:4, borderRadius:"50%", background:T.muted }} />
          ))}
          <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"10px",
            color:T.muted, marginLeft:4 }}>
            {profile.displayName.split(" ")[0]} is typing...
          </span>
        </div>
      </div>

      {/* Composer */}
      <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 12px 24px",
        background:"rgba(0,0,0,0.92)", backdropFilter:"blur(8px)",
        display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ color:T.muted, fontSize:20, cursor:"pointer" }}>📷</span>
        <div style={{ flex:1, background:T.card, border:`1px solid ${T.border}`, padding:"10px 12px" }}>
          <span style={{ fontFamily:"'Barlow', sans-serif", fontSize:"12px", color:T.muted }}>
            Message...
          </span>
        </div>
        <span style={{ color:T.muted, fontSize:20, cursor:"pointer" }}>📷</span>
        <span style={{ color:T.muted, fontSize:18, cursor:"pointer" }}>🎤</span>
      </div>

      {/* Nav bar */}
      <div style={{ display:"flex", background:T.black,
        borderTop:`1px solid ${T.border}`, padding:"10px 0 20px" }}>
        {["Home","Pulse","Ghosted","Market","Profile"].map((tab,i) => (
          <div key={tab} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:16, marginBottom:1 }}>
              {["🏠","📡","👻","🛍","👤"][i]}
            </div>
            <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"9px",
              color:tab==="Ghosted"?T.gold:T.muted, letterSpacing:"0.05em" }}>{tab}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
