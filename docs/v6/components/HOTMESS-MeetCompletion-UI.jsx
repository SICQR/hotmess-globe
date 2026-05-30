import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — MEET COMPLETION SYSTEM ─────────────────────────────────────────
// Phase 1: suggest → commit → move → arrive → confirm
//
// Feature 1: MEETPOINT AUTO-SUGGESTION
//   Reads both users' right_now_status. If same venue → suggest that venue.
//   If no shared venue → suggest geographic midpoint.
//   One tap to confirm. No manual pin drop required.
//   DEV: POST /api/meetpoint/suggest with { thread_id, user_a_id, user_b_id }
//
// Feature 3: LIVE DUAL MOVEMENT DOTS
//   Both users' dots update every 10s AFTER both tap "I'm on my way".
//   Before that: approximate pins only. No tracking.
//   DEV: reads public_movement_presence table. Supabase Realtime subscription.
//   Privacy: positions snapped to 50m grid during movement. Never sub-50m until
//   arrival confirmation fires.
//
// Feature 1b: ARRIVAL CONFIRMATION LOOP
//   When both users within 50m of meetpoint AND both have active movement session:
//   → auto-sends "You're both here." to chat thread
//   → fires arrival banner (4s, full screen)
//   → emitPulse() at meetpoint location
//   → Globe: creates arrival beacon (kind="meet", intensity 1.0, expires 20min)
//   DEV: checked every 10s in movement polling loop. Server-side RPC preferred.
//
// GLOBE INTEGRATION (all phases):
//   Every movement event writes a globe signal:
//   "I'm on my way" → emitPulse(type="en_route", lat, lng, intensity 0.7)
//   Arrival confirmation → createBeacon(kind="meet", lat, lng, intensity 1.0)
//   Finding Each Other flash → emitPulse(type="proximity_flash", intensity 0.5)
//   All three appear as live signals on the Globe for the city.
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:"#000", bg:"#080808", card:"#0f0f0f", card2:"#141414",
  gold:"#C8962C", goldDim:"rgba(200,150,44,0.12)", goldBright:"#E0AA38",
  white:"#fff", muted:"rgba(255,255,255,0.38)", dim:"rgba(255,255,255,0.12)",
  border:"#1c1c1c", blue:"#4A90E2", red:"#E24A4A", green:"#30D158",
  orange:"#FF6B2B", purple:"#9B59B6",
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
const fmtDist = m => m < 1000 ? `${Math.round(m/10)*10} m` : `${(m/1000).toFixed(1)} km`;
const fmtEta  = m => `${Math.max(1, Math.round(m/80))} min`;
const haversine = (lat1,lng1,lat2,lng2) => {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

// ── MOCK LOCATION STATE ───────────────────────────────────────────────────────
// DEV: replace with real GPS + public_movement_presence Realtime subscription
const VIEWER = { lat:52.4940, lng:13.3420, name:"You" };
const THEM    = { lat:52.4982, lng:13.3461, name:"AlexTravels ✈" };
const MEETPOINT = { lat:52.4966, lng:13.3446, name:"Soho cluster", venue:"Schöneberg" };

// ── LIVE MOVEMENT SIMULATION ──────────────────────────────────────────────────
// DEV: replace with Supabase Realtime on public_movement_presence
function useLiveMovement(enabled) {
  const [youPos, setYouPos] = useState(VIEWER);
  const [themPos, setThemPos] = useState(THEM);
  const [youDist, setYouDist] = useState(haversine(VIEWER.lat,VIEWER.lng,MEETPOINT.lat,MEETPOINT.lng));
  const [themDist, setThemDist] = useState(haversine(THEM.lat,THEM.lng,MEETPOINT.lat,MEETPOINT.lng));
  const [arrived, setArrived] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      // Simulate both users moving toward meetpoint
      setYouPos(p => {
        const next = {
          lat: p.lat + (MEETPOINT.lat - p.lat) * 0.08,
          lng: p.lng + (MEETPOINT.lng - p.lng) * 0.08,
        };
        const d = haversine(next.lat, next.lng, MEETPOINT.lat, MEETPOINT.lng);
        setYouDist(d);
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
        return next;
      });
      setThemPos(p => {
        const next = {
          lat: p.lat + (MEETPOINT.lat - p.lat) * 0.07,
          lng: p.lng + (MEETPOINT.lng - p.lng) * 0.07,
        };
        const d = haversine(next.lat, next.lng, MEETPOINT.lat, MEETPOINT.lng);
        setThemDist(d);
        return next;
      });
    }, 2500); // demo speed — DEV: 10s
    return () => clearInterval(id);
  }, [enabled]);

  // Arrival check (upgrade #1b)
  useEffect(() => {
    if (!enabled || arrived) return;
    if (youDist < 50 && themDist < 50) {
      setArrived(true);
      // DEV: createBeacon(kind="meet", lat:MEETPOINT.lat, lng:MEETPOINT.lng, intensity:1.0, expires:20min)
      // DEV: emitPulse(type="arrival", lat, lng)
      // DEV: send_message(threadId, { type:"both_here" })
    }
  }, [youDist, themDist, enabled, arrived]);

  return { youPos, themPos, youDist, themDist, arrived, flash };
}

// ── OSM DARK TILE ─────────────────────────────────────────────────────────────
function DarkMapTile({ centerLat, centerLng, zoom=15, height=200, children }) {
  const n=Math.pow(2,zoom);
  const xT=Math.floor((centerLng+180)/360*n);
  const yT=Math.floor((1-Math.log(Math.tan(centerLat*Math.PI/180)+1/Math.cos(centerLat*Math.PI/180))/Math.PI)/2*n);
  const xF=((centerLng+180)/360*n-xT);
  const yF=((1-Math.log(Math.tan(centerLat*Math.PI/180)+1/Math.cos(centerLat*Math.PI/180))/Math.PI)/2*n-yT);
  const cx=Math.round(xF*256), cy=Math.round(yF*256);
  return (
    <div style={{position:"relative",overflow:"hidden",height,background:"#060606"}}>
      <img src={`https://tile.openstreetmap.org/${zoom}/${xT}/${yT}.png`} alt=""
        style={{position:"absolute",width:256,height:256,
          left:`calc(50% + ${128-cx}px)`,top:`calc(50% + ${128-cy}px)`,
          transform:"translate(-50%,-50%)",
          filter:"brightness(0.28) saturate(0.2) contrast(1.4)",pointerEvents:"none"}} />
      {children}
    </div>
  );
}

// Convert lat/lng delta to pixel offset on tile
function latLngToPixel(lat,lng,centerLat,centerLng,zoom,tileSize=256) {
  const n=Math.pow(2,zoom);
  const toX = l => (l+180)/360*n*tileSize;
  const toY = l => (1-Math.log(Math.tan(l*Math.PI/180)+1/Math.cos(l*Math.PI/180))/Math.PI)/2*n*tileSize;
  const cx=toX(centerLng), cy=toY(centerLat);
  const px=toX(lng)-cx, py=toY(lat)-cy;
  return { x:50+px/4, y:50+py/4 }; // simplified mapping to %, adjust per zoom
}

// ── MAP MARKERS ───────────────────────────────────────────────────────────────
function YouDot({ x="30%", y="60%", moving=false }) {
  return (
    <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-50%)",zIndex:5}}>
      {moving && (
        <motion.div animate={{scale:[1,2,1],opacity:[0.3,0,0.3]}}
          transition={{duration:2,repeat:Infinity}}
          style={{position:"absolute",inset:-8,borderRadius:"50%",background:T.blue}} />
      )}
      <div style={{width:13,height:13,borderRadius:"50%",background:T.blue,
        border:"2.5px solid #fff",boxShadow:`0 0 10px ${T.blue}`,position:"relative"}} />
      <div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",
        background:"rgba(0,0,0,0.75)",padding:"1px 4px",whiteSpace:"nowrap",
        fontFamily:"'Barlow',sans-serif",fontSize:"7px",color:T.blue,letterSpacing:"0.05em"}}>
        YOU
      </div>
    </div>
  );
}

function ThemDot({ x="70%", y="35%", moving=false }) {
  return (
    <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-50%)",zIndex:5}}>
      {moving && (
        <motion.div animate={{scale:[1,2,1],opacity:[0.3,0,0.3]}}
          transition={{duration:2,repeat:Infinity,delay:0.5}}
          style={{position:"absolute",inset:-8,borderRadius:"50%",background:T.orange}} />
      )}
      <div style={{width:13,height:13,borderRadius:"50%",background:T.orange,
        border:"2.5px solid #fff",boxShadow:`0 0 10px ${T.orange}`,position:"relative"}} />
      <div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",
        background:"rgba(0,0,0,0.75)",padding:"1px 4px",whiteSpace:"nowrap",
        fontFamily:"'Barlow',sans-serif",fontSize:"7px",color:T.orange,letterSpacing:"0.05em"}}>
        THEM
      </div>
    </div>
  );
}

function MeetpointPin({ x="50%", y="48%", pulsing=false }) {
  return (
    <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",zIndex:4}}>
      {pulsing && (
        <motion.div animate={{scale:[1,2.5,1],opacity:[0.4,0,0.4]}}
          transition={{duration:1.8,repeat:Infinity}}
          style={{position:"absolute",inset:-12,borderRadius:"50%",
            background:T.gold,pointerEvents:"none"}} />
      )}
      <motion.div animate={pulsing?{y:[0,-4,0]}:{y:0}}
        transition={{duration:1.5,repeat:Infinity,ease:"easeInOut"}}>
        <div style={{width:14,height:14,borderRadius:"50% 50% 50% 0",transform:"rotate(-45deg)",
          background:T.gold,border:"2px solid #fff",boxShadow:`0 0 14px ${T.gold}88`}} />
      </motion.div>
      <div style={{position:"absolute",top:-22,left:"50%",transform:"translateX(-50%)",
        background:`${T.gold}22`,border:`1px solid ${T.gold}55`,padding:"1px 6px",whiteSpace:"nowrap",
        fontFamily:"'Barlow',sans-serif",fontSize:"7px",color:T.gold,letterSpacing:"0.05em"}}>
        MEETPOINT
      </div>
    </div>
  );
}

function RouteSVG({ fromX, fromY, toX, toY, color=T.blue }) {
  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:3}}>
      <defs>
        <filter id={`glow-${color.slice(1)}`}>
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <line x1={fromX} y1={fromY} x2={toX} y2={toY}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="7 5" strokeOpacity="0.85"
        filter={`url(#glow-${color.slice(1)})`} />
    </svg>
  );
}

// ── MEETPOINT AUTO-SUGGESTION CARD (Feature 4) ────────────────────────────────
function MeetpointSuggestion({ venue, distFromYou, onConfirm, onDismiss }) {
  return (
    <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}}
      style={{
        background:T.card2, border:`1px solid ${T.gold}55`,
        overflow:"hidden",
      }}>
      {/* Map preview */}
      <DarkMapTile centerLat={MEETPOINT.lat} centerLng={MEETPOINT.lng} zoom={15} height={110}>
        <MeetpointPin pulsing />
        <YouDot x="32%" y="65%" />
        <ThemDot x="68%" y="32%" />
        <RouteSVG fromX="32%" fromY="65%" toX="50%" toY="48%" color={T.blue} />
        <RouteSVG fromX="68%" fromY="32%" toX="50%" toY="48%" color={T.orange} />
      </DarkMapTile>

      <div style={{padding:"10px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div>
            <p style={{margin:0,fontSize:"8px",letterSpacing:"0.25em",color:T.gold,
              fontFamily:"'Oswald',sans-serif"}}>SUGGESTED MEETPOINT</p>
            <p style={{margin:"2px 0 0",fontFamily:"'Oswald',sans-serif",fontSize:"16px",
              color:T.white,textTransform:"uppercase",letterSpacing:"0.03em"}}>{venue}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"13px",color:T.gold}}>
              {fmtDist(distFromYou)}
            </p>
            <p style={{margin:0,fontFamily:"'Barlow',sans-serif",fontSize:"9px",color:T.muted}}>
              {fmtEta(distFromYou)} walk
            </p>
          </div>
        </div>
        <p style={{margin:"0 0 10px",fontFamily:"'Barlow',sans-serif",fontSize:"10px",
          color:T.muted,fontStyle:"italic"}}>
          You're both nearby — this is a good place to meet.
          {/* DEV: copy changes based on suggestion source:
              - same venue → "You're both at {venue}"
              - midpoint → "Halfway between you both"
              - user's venue → "They can come to you" */}
        </p>
        <div style={{display:"flex",gap:6}}>
          <motion.button whileTap={{scale:0.96}} onClick={onConfirm}
            style={{flex:2,padding:"10px",background:T.gold,border:"none",
              fontFamily:"'Oswald',sans-serif",fontSize:"10px",letterSpacing:"0.18em",
              color:T.black,cursor:"pointer",textTransform:"uppercase"}}>
            MEET HERE
          </motion.button>
          <motion.button whileTap={{scale:0.96}} onClick={onDismiss}
            style={{flex:1,padding:"10px",background:"transparent",border:`1px solid ${T.border}`,
              fontFamily:"'Oswald',sans-serif",fontSize:"10px",letterSpacing:"0.1em",
              color:T.muted,cursor:"pointer",textTransform:"uppercase"}}>
            CHANGE
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── LIVE MOVEMENT MAP (full route view with both dots) ────────────────────────
function LiveMovementMap({ youPos, themPos, youDist, themDist, flash, arrived }) {
  const center = MEETPOINT;
  return (
    <DarkMapTile centerLat={center.lat} centerLng={center.lng} zoom={16} height="100%">
      {/* Routes */}
      <RouteSVG fromX="28%" fromY="62%" toX="50%" toY="46%" color={T.blue} />
      <RouteSVG fromX="72%" fromY="30%" toX="50%" toY="46%" color={T.orange} />

      {/* Meetpoint */}
      <MeetpointPin x="50%" y="46%" pulsing={!arrived} />

      {/* Both user dots — live updating */}
      <YouDot x="28%" y="62%" moving={true} />
      <ThemDot x="72%" y="30%" moving={true} />

      {/* Globe signal indicator */}
      <div style={{position:"absolute",top:8,left:8,
        display:"flex",alignItems:"center",gap:5,
        background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",
        padding:"3px 8px",border:`1px solid ${T.gold}33`}}>
        <motion.div animate={{scale:[1,1.6,1],opacity:[0.6,1,0.6]}}
          transition={{duration:2,repeat:Infinity}}
          style={{width:5,height:5,borderRadius:"50%",background:T.gold}} />
        <span style={{fontFamily:"'Barlow',sans-serif",fontSize:"8px",
          color:T.gold,letterSpacing:"0.1em"}}>
          MEET SESSION ACTIVE
          {/* DEV GLOBE RULE — 4 signals only, never live position:
              EN_ROUTE: once on mutual commit (emitPulse, city-level, intensity 0.7)
              MEETPOINT: once on confirm (createBeacon kind="meet", intensity 0.8)
              ARRIVAL: once on <50m (emitPulse type="arrival", intensity 1.0)
              MET: once on loop close (emitPulse type="met", intensity 0.6)
              NEVER: live path, exact coords, 10s position updates.
              Movement stays in private meet session (public_movement_presence) only. */}
        </span>
      </div>

      {/* Distance counters */}
      <div style={{position:"absolute",bottom:8,left:8,right:8,
        display:"flex",justifyContent:"space-between"}}>
        <motion.div animate={{borderColor: flash ? T.blue : T.border}}
          style={{padding:"3px 8px",background:"rgba(0,0,0,0.75)",
            border:`1px solid ${T.border}`,transition:"border-color 0.3s"}}>
          <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"10px",
            color:T.blue,letterSpacing:"0.08em"}}>{fmtDist(youDist)}</p>
          <p style={{margin:0,fontFamily:"'Barlow',sans-serif",fontSize:"8px",color:T.muted}}>
            you from meet
          </p>
        </motion.div>
        <motion.div style={{padding:"3px 8px",background:"rgba(0,0,0,0.75)",
          border:`1px solid ${T.border}`}}>
          <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"10px",
            color:T.orange,letterSpacing:"0.08em"}}>{fmtDist(themDist)}</p>
          <p style={{margin:0,fontFamily:"'Barlow',sans-serif",fontSize:"8px",color:T.muted}}>
            them from meet
          </p>
        </motion.div>
      </div>
    </DarkMapTile>
  );
}

// ── ARRIVAL BANNER ────────────────────────────────────────────────────────────
function ArrivalBanner({ name, onDismiss, onFindMode }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:"fixed",inset:0,zIndex:200,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:"rgba(0,0,0,0.92)",backdropFilter:"blur(12px)"}}>

      {/* Pulse rings */}
      {[1,2,3].map(i => (
        <motion.div key={i}
          animate={{scale:[0.8,2.5],opacity:[0.5,0]}}
          transition={{duration:1.8,repeat:Infinity,delay:i*0.4,ease:"easeOut"}}
          style={{position:"absolute",width:120,height:120,borderRadius:"50%",
            border:`2px solid ${T.gold}`,pointerEvents:"none"}} />
      ))}

      <motion.div
        initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{type:"spring",stiffness:200,damping:20}}
        style={{textAlign:"center",position:"relative",zIndex:1}}>
        <p style={{margin:"0 0 8px",fontFamily:"'Oswald',sans-serif",fontSize:"60px",
          fontWeight:700,color:T.gold,lineHeight:1,letterSpacing:"-0.02em"}}>
          You're<br/>both here.
        </p>
        <p style={{margin:"0 0 32px",fontFamily:"'Barlow',sans-serif",
          fontSize:"12px",color:T.muted,fontStyle:"italic"}}>
          Loop closed.
          {/* DEV: emitPulse + createBeacon(kind="meet") already fired */}
        </p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <motion.button whileTap={{scale:0.95}} onClick={onFindMode}
            style={{padding:"12px 24px",background:"transparent",
              border:`1px solid ${T.gold}`,
              fontFamily:"'Oswald',sans-serif",fontSize:"10px",
              letterSpacing:"0.2em",color:T.gold,cursor:"pointer",
              textTransform:"uppercase"}}>
            CAN'T FIND THEM
          </motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={onDismiss}
            style={{padding:"12px 24px",background:T.gold,border:"none",
              fontFamily:"'Oswald',sans-serif",fontSize:"10px",
              letterSpacing:"0.2em",color:T.black,cursor:"pointer",
              textTransform:"uppercase"}}>
            FOUND ✓
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── FINDING EACH OTHER MODE (Phase 2 preview) ─────────────────────────────────
function FindingEachOtherMode({ name, onFlash, onFound, onClose }) {
  const [flashed, setFlashed] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const handleFlash = () => {
    setFlashed(true);
    setCountdown(120);
    onFlash?.();
    // DEV:
    // send_message(threadId, { type:"proximity_flash", lat: EXACT_GPS_LAT, lng: EXACT_GPS_LNG })
    // emitPulse(type="proximity_flash", lat, lng, intensity:0.5)
    // expires_at: now + 2min. Never persists. One-time send.
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { setFlashed(false); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
      style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.88)",
        backdropFilter:"blur(10px)",
        display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:24,maxWidth:480,margin:"0 auto"}}>

      <button onClick={onClose}
        style={{position:"absolute",top:20,right:20,background:"none",border:"none",
          color:T.muted,cursor:"pointer",fontSize:20}}>×</button>

      <p style={{margin:"0 0 8px",fontFamily:"'Oswald',sans-serif",fontSize:"22px",
        color:T.white,textTransform:"uppercase",textAlign:"center",letterSpacing:"0.05em"}}>
        Finding each other
      </p>
      <p style={{margin:"0 0 28px",fontFamily:"'Barlow',sans-serif",
        fontSize:"11px",color:T.muted,textAlign:"center",fontStyle:"italic"}}>
        You're both nearby. Send your exact location once — it expires in 2 minutes.
      </p>

      {/* Flash button */}
      <motion.button whileTap={{scale:0.95}} onClick={handleFlash}
        disabled={flashed}
        animate={flashed ? {} : {
          boxShadow:[`0 0 0px ${T.gold}00`,`0 0 24px ${T.gold}88`,`0 0 0px ${T.gold}00`]
        }}
        transition={{duration:1.8,repeat:Infinity}}
        style={{
          width:140,height:140,borderRadius:"50%",
          background:flashed ? `${T.green}22` : T.goldDim,
          border:`2px solid ${flashed ? T.green : T.gold}`,
          cursor:flashed?"default":"pointer",
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:6,marginBottom:24,
        }}>
        <span style={{fontSize:32}}>📍</span>
        <span style={{fontFamily:"'Oswald',sans-serif",fontSize:"11px",
          letterSpacing:"0.15em",color:flashed?T.green:T.gold,textTransform:"uppercase"}}>
          {flashed ? "SENT" : "FLASH"}
        </span>
        {countdown !== null && (
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:"9px",color:T.muted}}>
            expires in {countdown}s
          </span>
        )}
      </motion.button>

      {flashed && (
        <motion.p initial={{opacity:0}} animate={{opacity:1}}
          style={{margin:"0 0 20px",fontFamily:"'Barlow',sans-serif",
            fontSize:"10px",color:T.green,textAlign:"center"}}>
          {name} can now see your exact location for 2 minutes.<br/>
          It will not be stored.
          {/* DEV: Globe shows proximity_flash pulse at this location. One-time signal. */}
        </motion.p>
      )}

      <motion.button whileTap={{scale:0.95}} onClick={onFound}
        style={{width:"100%",padding:"14px",background:T.gold,border:"none",
          fontFamily:"'Oswald',sans-serif",fontSize:"11px",
          letterSpacing:"0.2em",color:T.black,cursor:"pointer",textTransform:"uppercase"}}>
        WE FOUND EACH OTHER ✓
      </motion.button>
    </motion.div>
  );
}

// ── GLOBE SIGNAL SIDEBAR (shows what's emitting to Globe) ────────────────────
function GlobeSignalLog({ events }) {
  if (!events.length) return null;
  return (
    <div style={{position:"fixed",top:60,right:8,zIndex:50,
      display:"flex",flexDirection:"column",gap:4,maxWidth:140}}>
      {events.slice(-3).map((e,i) => (
        <motion.div key={e.id}
          initial={{x:60,opacity:0}} animate={{x:0,opacity:1}}
          exit={{opacity:0}} transition={{delay:i*0.1}}
          style={{padding:"4px 8px",background:"rgba(0,0,0,0.85)",
            border:`1px solid ${T.gold}44`,backdropFilter:"blur(4px)"}}>
          <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"8px",
            color:T.gold,letterSpacing:"0.15em",textTransform:"uppercase"}}>{e.type}</p>
          <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
            fontSize:"8px",color:T.muted}}>{e.note}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function MeetCompletionSystem() {
  useFonts();

  const [phase, setPhase] = useState("suggest"); // suggest | moving | arrival | finding | done
  const [bothCommitted, setBothCommitted] = useState(false);
  const [globeLog, setGlobeLog] = useState([]);
  const [messages, setMessages] = useState([
    { id:1, from:"them", type:"text", text:"Perfect! Let's meet there!", time:"9:30" },
  ]);

  // Globe: 4 aggregated signals per meet session. Never live movement path.
  // EN_ROUTE / MEETPOINT / ARRIVAL / MET only. Each fires once.
  const emitGlobeSignal = (type, note) => {
    setGlobeLog(prev => [...prev, { id:Date.now(), type, note }]);
  };

  const { youPos, themPos, youDist, themDist, arrived, flash } = useLiveMovement(
    phase === "moving"
  );

  // Arrival detection
  useEffect(() => {
    if (arrived && phase === "moving") {
      setPhase("arrival");
      setMessages(prev => [...prev,
        { id:Date.now(), from:"system", type:"both_here", time:"now" }
      ]);
      emitGlobeSignal("MEET BEACON", "Arrival confirmed");
    }
  }, [arrived, phase]);

  const handleConfirmMeetpoint = () => {
    setMessages(prev => [...prev,
      { id:Date.now(), from:"me", type:"meetpoint_confirmed",
        text:`Meetpoint set: ${MEETPOINT.name}`, time:"9:31" }
    ]);
    setPhase("moving");
    setBothCommitted(true);
    emitGlobeSignal("EN ROUTE", "Both users moving");
    // DEV: POST /api/meetpoint/create + send_message(threadId, {type:"meetpoint"})
    // DEV: emitPulse(type="en_route", lat, lng, intensity:0.7)
  };

  const handleFlash = () => {
    // Flash is NOT emitted to Globe — thread-only. No beacon. No pulse. Privacy-critical.
    setMessages(prev => [...prev,
      { id:Date.now(), from:"me", type:"flash", time:"now" }
    ]);
  };

  const handleFound = () => {
    setPhase("done");
    setMessages(prev => [...prev,
      { id:Date.now(), from:"system", type:"found", time:"now" }
    ]);
    emitGlobeSignal("MET", "Loop complete");
  };

  return (
    <div style={{ background:T.bg, color:T.white, minHeight:"100vh",
      maxWidth:480, margin:"0 auto", fontFamily:"'Barlow',sans-serif",
      display:"flex", flexDirection:"column", position:"relative" }}>

      {/* Globe signal log */}
      <AnimatePresence>
        <GlobeSignalLog events={globeLog} />
      </AnimatePresence>

      {/* Phase indicator */}
      <div style={{padding:"10px 14px 8px", background:"#050505",
        borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:4}}>
          {["suggest","moving","arrival","done"].map((p,i) => (
            <div key={p} style={{flex:1,height:2,borderRadius:1,
              background:["suggest","moving","arrival","done"].indexOf(phase)>=i
                ? T.gold : T.border,transition:"background 0.4s"}} />
          ))}
        </div>
        <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"9px",
          letterSpacing:"0.2em",color:T.gold,textTransform:"uppercase"}}>
          {phase==="suggest"?"1 · AUTO-SUGGEST MEETPOINT"
           :phase==="moving"?"2 · BOTH MOVING · LIVE TRACKING"
           :phase==="arrival"?"3 · ARRIVAL CONFIRMED"
           :"LOOP COMPLETE"}
        </p>
      </div>

      {/* Chat header */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,0,0,0.92)",backdropFilter:"blur(8px)",
        position:"sticky",top:0,zIndex:30}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:34,height:34,borderRadius:"50%",
            background:"rgba(200,150,44,0.15)",border:`2px solid ${T.gold}44`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✈</div>
          <div style={{flex:1}}>
            <span style={{fontFamily:"'Oswald',sans-serif",fontSize:"15px",
              color:T.white,textTransform:"uppercase",letterSpacing:"0.04em"}}>
              AlexTravels ✈
            </span>
            <p style={{margin:0,fontFamily:"'Barlow',sans-serif",fontSize:"10px",
              color:T.muted}}>
              Visiting Berlin ·{" "}
              <span style={{color:T.gold}}>
                {phase==="moving"?fmtDist(themDist)+" away":"1.3 km away"}
              </span>
              {" "}· Until Sunday 🇬🇧
            </p>
          </div>
          {phase==="moving" && (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <motion.div animate={{scale:[1,1.5,1]}} transition={{duration:1.2,repeat:Infinity}}
                style={{width:6,height:6,borderRadius:"50%",background:T.green}} />
              <span style={{fontFamily:"'Barlow',sans-serif",fontSize:"9px",color:T.green}}>
                moving
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Live map — shown while moving */}
        {phase === "moving" && (
          <div style={{height:220,position:"relative"}}>
            <LiveMovementMap
              youPos={youPos} themPos={themPos}
              youDist={youDist} themDist={themDist}
              flash={flash} arrived={arrived}
            />
            {/* ETA strip below map */}
            <div style={{
              display:"flex",justifyContent:"space-around",
              padding:"8px 16px",background:"rgba(0,0,0,0.9)",
              borderBottom:`1px solid ${T.border}`,
            }}>
              <div style={{textAlign:"center"}}>
                <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"18px",
                  color:T.blue,fontVariantNumeric:"tabular-nums"}}>
                  {fmtDist(youDist)}
                </p>
                <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                  fontSize:"9px",color:T.muted}}>you from meet</p>
              </div>
              <div style={{width:1,background:T.border}} />
              <div style={{textAlign:"center"}}>
                <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"18px",
                  color:T.orange,fontVariantNumeric:"tabular-nums"}}>
                  {fmtDist(themDist)}
                </p>
                <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                  fontSize:"9px",color:T.muted}}>them from meet</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div style={{flex:1,padding:"10px 14px",overflowY:"auto",
          display:"flex",flexDirection:"column",gap:8}}>

          {messages.map(msg => {
            if (msg.type === "text") {
              const isMe = msg.from === "me";
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"75%",padding:"8px 12px",
                    background:isMe?T.gold:T.card,
                    border:isMe?"none":`1px solid ${T.border}`}}>
                    <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                      fontSize:"13px",color:isMe?T.black:T.white}}>{msg.text}</p>
                    <p style={{margin:"2px 0 0",fontFamily:"'Barlow',sans-serif",
                      fontSize:"9px",color:isMe?"rgba(0,0,0,0.4)":T.dim,textAlign:"right"}}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.type === "meetpoint_confirmed") {
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:"center"}}>
                  <div style={{padding:"4px 12px",background:`${T.gold}15`,
                    border:`1px solid ${T.gold}44`}}>
                    <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                      fontSize:"10px",color:T.gold}}>
                      📍 {msg.text}
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.type === "both_here") {
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:"center",margin:"4px 0"}}>
                  <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
                    style={{padding:"8px 16px",background:`${T.gold}15`,
                      border:`2px solid ${T.gold}`,textAlign:"center"}}>
                    <p style={{margin:0,fontFamily:"'Oswald',sans-serif",fontSize:"16px",
                      color:T.gold,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                      You're both here.
                    </p>
                    <p style={{margin:"2px 0 0",fontFamily:"'Barlow',sans-serif",
                      fontSize:"9px",color:T.muted}}>Loop closed.</p>
                  </motion.div>
                </div>
              );
            }

            if (msg.type === "flash") {
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:"flex-end"}}>
                  <div style={{padding:"6px 10px",background:`${T.green}15`,
                    border:`1px solid ${T.green}44`}}>
                    <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                      fontSize:"10px",color:T.green}}>
                      📍 Exact location sent · expires 2 min
                    </p>
                  </div>
                </div>
              );
            }

            if (msg.type === "found") {
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:"center"}}>
                  <div style={{padding:"6px 12px",background:`${T.green}15`,
                    border:`1px solid ${T.green}44`}}>
                    <p style={{margin:0,fontFamily:"'Barlow',sans-serif",
                      fontSize:"10px",color:T.green}}>✓ Met. Loop complete.</p>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Auto-suggestion card */}
          {phase === "suggest" && (
            <MeetpointSuggestion
              venue={MEETPOINT.name}
              distFromYou={haversine(VIEWER.lat,VIEWER.lng,MEETPOINT.lat,MEETPOINT.lng)}
              onConfirm={handleConfirmMeetpoint}
              onDismiss={() => {}}
            />
          )}

          {/* Phase done */}
          {phase === "done" && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              style={{textAlign:"center",padding:"24px 0"}}>
              <p style={{fontFamily:"'Oswald',sans-serif",fontSize:"28px",
                color:T.gold,textTransform:"uppercase",margin:"0 0 4px"}}>
                Meet complete.
              </p>
              <p style={{fontFamily:"'Barlow',sans-serif",fontSize:"11px",
                color:T.muted,fontStyle:"italic"}}>
                suggest → commit → move → arrive → found
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Arrival confirmation banner */}
      <AnimatePresence>
        {phase === "arrival" && (
          <ArrivalBanner
            name="AlexTravels"
            onDismiss={() => setPhase("done")}
            onFindMode={() => setPhase("finding")}
          />
        )}
      </AnimatePresence>

      {/* Finding each other mode */}
      <AnimatePresence>
        {phase === "finding" && (
          <FindingEachOtherMode
            name="AlexTravels"
            onFlash={handleFlash}
            onFound={handleFound}
            onClose={() => setPhase("arrival")}
          />
        )}
      </AnimatePresence>

      {/* Composer */}
      <div style={{borderTop:`1px solid ${T.border}`,padding:"8px 12px 24px",
        background:"rgba(0,0,0,0.92)",display:"flex",gap:8,alignItems:"center"}}>
        <span style={{color:T.muted,fontSize:18,cursor:"pointer"}}>📷</span>
        <div style={{flex:1,background:T.card,border:`1px solid ${T.border}`,padding:"10px 12px"}}>
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:"12px",color:T.muted}}>
            Message...
          </span>
        </div>
        <span style={{color:T.muted,fontSize:16,cursor:"pointer"}}>🎤</span>
      </div>

      {/* Nav */}
      <div style={{display:"flex",background:T.black,
        borderTop:`1px solid ${T.border}`,padding:"10px 0 20px"}}>
        {["Home","Pulse","Ghosted","Market","Profile"].map((tab,i) => (
          <div key={tab} style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:15,marginBottom:1}}>{["🏠","📡","👻","🛍","👤"][i]}</div>
            <p style={{margin:0,fontFamily:"'Barlow',sans-serif",fontSize:"9px",
              color:tab==="Ghosted"?T.gold:T.muted,letterSpacing:"0.05em"}}>{tab}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
