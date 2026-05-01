import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — MET STATE ───────────────────────────────────────────────────────
// The after-arrival layer. Does three things only:
// 1. CONFIRM  — "You met." System messages. Header state. Micro-presence dot.
// 2. PROTECT  — 90s silence window. Passive safety. Anomaly detection.
// 3. EXTEND   — "Still together?" at 3-5 min. "Take care." on leaving.
// Then: 4hr Land Check (handled in Care As Kink system).
//
// DEV:
// meet_sessions.met_at = now() on FOUND tap
// meet_sessions.silence_until = now() + 90s
// meet_sessions.extended = true on YES
// meet_sessions.closed_at = now() on LEAVING
// All notifications suppressed while now() < silence_until
// AI Layer: returns null if met_at exists and < 90s ago
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:"#000", bg:"#080808", card:"#0d0d0d",
  gold:"#C8962C", goldDim:"rgba(200,150,44,0.12)",
  white:"#fff", muted:"rgba(255,255,255,0.35)",
  border:"#1a1a1a", green:"#30D158",
};

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ── SILENCE WINDOW RING ───────────────────────────────────────────────────────
function SilenceRing({ secondsLeft }) {
  const pct = (secondsLeft / 90) * 100;
  const r = 16, circ = 2 * Math.PI * r;
  return (
    <div style={{ position:"relative", width:40, height:40,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}
        width={40} height={40}>
        <circle cx={20} cy={20} r={r} fill="none"
          stroke={T.border} strokeWidth={2} />
        <circle cx={20} cy={20} r={r} fill="none"
          stroke={T.gold} strokeWidth={2}
          strokeDasharray={`${pct/100*circ} ${circ}`}
          strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:"9px",
        color:T.gold, position:"relative" }}>
        {secondsLeft}
      </span>
    </div>
  );
}

// ── MET STATE CHAT THREAD ────────────────────────────────────────────────────
export default function MetStateUI() {
  useFonts();

  // Phase: transition | silence | active | extension | leaving | closed
  const [phase, setPhase] = useState("transition");
  const [silenceLeft, setSilenceLeft] = useState(90);
  const [headerState, setHeaderState] = useState("met-fresh"); // met-fresh | met-tonight
  const [showDot, setShowDot] = useState(true);
  const [safetyCheck, setSafetyCheck] = useState(false);
  const [extensionShown, setExtensionShown] = useState(false);
  const [messages, setMessages] = useState([
    { id:1, from:"them", type:"text",
      text:"On the dancefloor, left side near the speaker 🔊", time:"01:14" },
    { id:2, from:"system", type:"both_here", time:"01:21" },
    { id:3, from:"system", type:"met", time:"01:21" },
  ]);

  // Transition -> silence
  useEffect(() => {
    const t = setTimeout(() => setPhase("silence"), 800);
    return () => clearTimeout(t);
  }, []);

  // Silence countdown
  useEffect(() => {
    if (phase !== "silence") return;
    const id = setInterval(() => {
      setSilenceLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setPhase("active");
          return 0;
        }
        return s - 1;
      });
    }, 100); // sped up for demo — DEV: 1000ms
    return () => clearInterval(id);
  }, [phase]);

  // Header dot fades at 60s
  useEffect(() => {
    if (phase === "silence" && silenceLeft <= 40) setShowDot(false); // 40 = 60s in demo scale
    if (silenceLeft <= 20 && headerState === "met-fresh") setHeaderState("met-tonight");
  }, [silenceLeft, phase, headerState]);

  // Extension signal at ~3min (demo: 4s after active)
  useEffect(() => {
    if (phase !== "active" || extensionShown) return;
    const t = setTimeout(() => {
      setExtensionShown(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [phase, extensionShown]);

  const handleFound = () => {};
  const handleYes = () => {
    setMessages(prev => [...prev,
      { id:Date.now(), from:"system", type:"extended", time:"now" }
    ]);
    setExtensionShown(false);
    // DEV: meet_sessions.extended = true
  };

  const handleLeaving = () => {
    setMessages(prev => [...prev,
      { id:Date.now(), from:"system", type:"leaving", time:"now" }
    ]);
    setExtensionShown(false);
    setPhase("leaving");
    // DEV: meet_sessions.closed_at = now(). Clean Exit fires quietly.
    setTimeout(() => setPhase("closed"), 3000);
  };

  const handleSafetyYes = () => setSafetyCheck(false);
  const handleNeedHelp  = () => {
    setSafetyCheck(false);
    // DEV: open Care stack — Get Out / Switchboard / Galop
  };

  if (phase === "closed") return (
    <div style={{ background:T.black, minHeight:"100vh", maxWidth:480,
      margin:"0 auto", display:"flex", alignItems:"center",
      justifyContent:"center", flexDirection:"column", gap:8 }}>
      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }}
        style={{ fontFamily:"'Oswald',sans-serif", fontSize:"28px",
          color:T.gold, textTransform:"uppercase", margin:0 }}>
        Take care.
      </motion.p>
    </div>
  );

  return (
    <div style={{ background:T.bg, color:T.white, minHeight:"100vh",
      maxWidth:480, margin:"0 auto", fontFamily:"'Barlow',sans-serif",
      display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <div style={{ padding:"12px 14px 10px", borderBottom:`1px solid ${T.border}`,
        background:"rgba(0,0,0,0.92)", backdropFilter:"blur(8px)",
        position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ width:34, height:34, borderRadius:"50%",
            background:T.goldDim, border:`2px solid ${T.gold}44`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16 }}>✈</div>
          <div style={{ flex:1 }}>
            <span style={{ fontFamily:"'Oswald',sans-serif", fontSize:"15px",
              color:T.white, textTransform:"uppercase" }}>
              AlexTravels ✈
            </span>
            {/* Header state change */}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:1 }}>
              {showDot && (
                <motion.div animate={{ opacity:[0.5,1,0.5] }}
                  transition={{ duration:2, repeat:Infinity }}
                  style={{ width:5, height:5, borderRadius:"50%",
                    background:T.gold, flexShrink:0 }} />
              )}
              <motion.p
                key={headerState}
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ margin:0, fontFamily:"'Barlow',sans-serif",
                  fontSize:"10px", color: headerState==="met-fresh" ? T.gold : T.muted }}>
                {headerState === "met-fresh" ? "Both here · Met 0m ago" : "Met tonight"}
              </motion.p>
            </div>
          </div>

          {/* Silence ring */}
          {phase === "silence" && (
            <div style={{ display:"flex", flexDirection:"column",
              alignItems:"center", gap:2 }}>
              <SilenceRing secondsLeft={silenceLeft} />
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:"7px",
                color:"#222", letterSpacing:"0.1em" }}>SILENCE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div style={{ flex:1, padding:"10px 14px", overflowY:"auto",
        display:"flex", flexDirection:"column", gap:8 }}>

        {messages.map(msg => {
          if (msg.type === "text") {
            const isMe = msg.from === "me";
            return (
              <div key={msg.id} style={{ display:"flex",
                justifyContent:isMe?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"78%", padding:"8px 12px",
                  background:isMe?T.gold:T.card,
                  border:isMe?"none":`1px solid ${T.border}` }}>
                  <p style={{ margin:0, fontFamily:"'Barlow',sans-serif",
                    fontSize:"13px", color:isMe?T.black:T.white }}>
                    {msg.text}
                  </p>
                  <p style={{ margin:"2px 0 0", fontFamily:"'Barlow',sans-serif",
                    fontSize:"9px", color:isMe?"rgba(0,0,0,0.4)":T.muted,
                    textAlign:"right" }}>{msg.time}</p>
                </div>
              </div>
            );
          }

          // System: both_here
          if (msg.type === "both_here") return (
            <motion.div key={msg.id}
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:"center", padding:"6px 0" }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:"11px",
                color:T.muted, fontStyle:"italic" }}>
                You're both here.
              </span>
            </motion.div>
          );

          // System: met — the core message
          if (msg.type === "met") return (
            <motion.div key={msg.id}
              initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
              transition={{ delay:0.4, type:"spring", stiffness:200, damping:20 }}
              style={{ textAlign:"center", padding:"12px 0" }}>
              <p style={{ margin:0, fontFamily:"'Oswald',sans-serif",
                fontSize:"28px", fontWeight:700, color:T.gold,
                textTransform:"uppercase", letterSpacing:"0.04em" }}>
                You met.
              </p>
              {/* No timestamp. No explanation. */}
            </motion.div>
          );

          // System: extended
          if (msg.type === "extended") return (
            <div key={msg.id} style={{ textAlign:"center", padding:"4px 0" }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:"10px",
                color:T.muted, fontStyle:"italic" }}>Session continues.</span>
            </div>
          );

          // System: leaving
          if (msg.type === "leaving") return (
            <motion.div key={msg.id}
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:"center", padding:"12px 0" }}>
              <p style={{ margin:0, fontFamily:"'Oswald',sans-serif",
                fontSize:"22px", color:T.gold, textTransform:"uppercase" }}>
                Take care.
              </p>
            </motion.div>
          );

          return null;
        })}

        {/* Extension signal — appears after 3-5 min if user is in app */}
        <AnimatePresence>
          {extensionShown && phase === "active" && (
            <motion.div
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }}
              style={{ margin:"8px 0", padding:"12px 14px",
                background:T.card, border:`1px solid ${T.border}`,
                textAlign:"center" }}>
              <p style={{ margin:"0 0 10px", fontFamily:"'Oswald',sans-serif",
                fontSize:"16px", color:T.white, textTransform:"uppercase",
                letterSpacing:"0.04em" }}>
                Still together?
              </p>
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                <motion.button whileTap={{ scale:0.95 }} onClick={handleYes}
                  style={{ flex:1, padding:"10px",
                    background:T.goldDim, border:`1px solid ${T.gold}`,
                    fontFamily:"'Oswald',sans-serif", fontSize:"13px",
                    color:T.gold, cursor:"pointer",
                    textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  👍 Yes
                </motion.button>
                <motion.button whileTap={{ scale:0.95 }} onClick={handleLeaving}
                  style={{ flex:1, padding:"10px",
                    background:"transparent", border:`1px solid ${T.border}`,
                    fontFamily:"'Oswald',sans-serif", fontSize:"13px",
                    color:T.muted, cursor:"pointer",
                    textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  👋 Leaving
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Safety check — triggered by anomaly detection */}
        <AnimatePresence>
          {safetyCheck && (
            <motion.div
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }}
              style={{ margin:"8px 0", padding:"12px 14px",
                background:T.card, border:`1px solid ${T.border}`,
                textAlign:"center" }}>
              <p style={{ margin:"0 0 10px", fontFamily:"'Oswald',sans-serif",
                fontSize:"18px", color:T.white }}>You good?</p>
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                <motion.button whileTap={{ scale:0.95 }} onClick={handleSafetyYes}
                  style={{ flex:1, padding:"9px", background:T.goldDim,
                    border:`1px solid ${T.gold}`,
                    fontFamily:"'Oswald',sans-serif", fontSize:"11px",
                    color:T.gold, cursor:"pointer",
                    textTransform:"uppercase" }}>
                  👍 Yes
                </motion.button>
                <motion.button whileTap={{ scale:0.95 }} onClick={handleNeedHelp}
                  style={{ flex:1, padding:"9px", background:"transparent",
                    border:`1px solid ${T.border}`,
                    fontFamily:"'Oswald',sans-serif", fontSize:"11px",
                    color:T.muted, cursor:"pointer",
                    textTransform:"uppercase" }}>
                  Need help
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SILENCE WINDOW STATUS ── */}
      {phase === "silence" && (
        <div style={{ padding:"8px 14px", borderTop:`1px solid ${T.border}`,
          background:"rgba(0,0,0,0.9)", textAlign:"center" }}>
          <p style={{ margin:0, fontFamily:"'Barlow',sans-serif",
            fontSize:"9px", color:"#222", letterSpacing:"0.2em",
            textTransform:"uppercase" }}>
            {silenceLeft}s · silence window
          </p>
        </div>
      )}

      {/* ── COMPOSER — shown after silence, hidden on leaving ── */}
      {(phase === "active" || phase === "extension") && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 12px 24px",
          background:"rgba(0,0,0,0.92)", display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ color:T.muted, fontSize:18, cursor:"pointer" }}>📷</span>
          <div style={{ flex:1, background:T.card, border:`1px solid ${T.border}`,
            padding:"10px 12px" }}>
            <span style={{ fontFamily:"'Barlow',sans-serif",
              fontSize:"12px", color:T.muted }}>Message...</span>
          </div>
          <span style={{ color:T.muted, fontSize:16, cursor:"pointer" }}>🎤</span>
        </div>
      )}

      {/* ── DEMO CONTROLS ── */}
      <div style={{ padding:"10px 14px 24px", borderTop:`1px solid #111`,
        display:"flex", gap:6, flexWrap:"wrap" }}>
        <button onClick={() => setSafetyCheck(true)}
          style={{ padding:"5px 10px", background:"transparent",
            border:`1px solid ${T.border}`, fontFamily:"'Barlow',sans-serif",
            fontSize:"9px", color:T.muted, cursor:"pointer",
            letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Trigger "You good?"
        </button>
        <button onClick={() => setExtensionShown(true)}
          style={{ padding:"5px 10px", background:"transparent",
            border:`1px solid ${T.border}`, fontFamily:"'Barlow',sans-serif",
            fontSize:"9px", color:T.muted, cursor:"pointer",
            letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Trigger extension
        </button>
      </div>

      {/* ── NAV ── */}
      <div style={{ display:"flex", background:T.black,
        borderTop:`1px solid ${T.border}`, padding:"10px 0 20px" }}>
        {["Home","Pulse","Ghosted","Market","Profile"].map((tab,i) => (
          <div key={tab} style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:15, marginBottom:1 }}>
              {["🏠","📡","👻","🛍","👤"][i]}
            </div>
            <p style={{ margin:0, fontFamily:"'Barlow',sans-serif",
              fontSize:"9px", color:tab==="Ghosted"?T.gold:T.muted }}>
              {tab}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
