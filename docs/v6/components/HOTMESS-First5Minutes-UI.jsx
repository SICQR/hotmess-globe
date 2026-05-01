import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — FIRST 5 MINUTES EXPERIENCE FLOW ────────────────────────────────
// Simulates the 12 moments from cold open to meet trigger.
// Each screen = one moment. Tapping advances through the arc.
// DEV: each screen maps to a real BootGuard state or product moment.
// Use this as a reference for the exact feel of each transition.
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:  "#000",
  dim:    "#080808",
  card:   "#0d0d0d",
  gold:   "#C8962C",
  white:  "#fff",
  muted:  "rgba(255,255,255,0.35)",
  green:  "#30D158",
  red:    "#FF3B30",
  border: "#1a1a1a",
};

// ── FONT LOADER ────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── ANIMATED GLOBE (CSS-only lightweight) ────────────────────────────────────
function GlobeBackground({ intensity = 1 }) {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", zIndex:0 }}>
      {/* Radial glow centre */}
      <motion.div
        animate={{ scale:[1, 1.08, 1], opacity:[0.15 * intensity, 0.25 * intensity, 0.15 * intensity] }}
        transition={{ duration:4, repeat:Infinity, ease:"easeInOut" }}
        style={{
          position:"absolute", top:"30%", left:"50%", transform:"translateX(-50%)",
          width:280, height:280, borderRadius:"50%",
          background:`radial-gradient(circle, ${T.gold} 0%, transparent 70%)`,
          filter:"blur(60px)",
        }}
      />
      {/* Orbit ring 1 */}
      <motion.div
        animate={{ rotate:360 }}
        transition={{ duration:20, repeat:Infinity, ease:"linear" }}
        style={{
          position:"absolute", top:"15%", left:"50%", transform:"translateX(-50%)",
          width:320, height:320, borderRadius:"50%",
          border:`1px solid ${T.gold}22`,
        }}
      />
      {/* Orbit ring 2 */}
      <motion.div
        animate={{ rotate:-360 }}
        transition={{ duration:34, repeat:Infinity, ease:"linear" }}
        style={{
          position:"absolute", top:"10%", left:"50%", transform:"translateX(-50%)",
          width:400, height:400, borderRadius:"50%",
          border:`1px solid ${T.gold}11`,
        }}
      />
      {/* Presence dots */}
      {[
        { x:"20%", y:"35%", d:3.1 }, { x:"75%", y:"28%", d:2.4 },
        { x:"60%", y:"55%", d:4.2 }, { x:"30%", y:"62%", d:2.8 },
        { x:"82%", y:"48%", d:1.9 },
      ].map((dot, i) => (
        <motion.div key={i}
          animate={{ opacity:[0.3, 0.9, 0.3], scale:[0.8, 1.2, 0.8] }}
          transition={{ duration:dot.d, repeat:Infinity, delay:i*0.7, ease:"easeInOut" }}
          style={{
            position:"absolute", left:dot.x, top:dot.y,
            width:4, height:4, borderRadius:"50%", background:T.gold,
          }}
        />
      ))}
    </div>
  );
}

// ── WAVEFORM BARS ─────────────────────────────────────────────────────────────
function Waveform({ playing = true, color = T.gold, bars = 5 }) {
  return (
    <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:16 }}>
      {Array.from({length:bars}, (_, i) => (
        <motion.div key={i}
          animate={playing ? { height:[4, 8+i*2, 4, 12, 4] } : { height:4 }}
          transition={{ duration:0.7 + i*0.1, repeat:playing ? Infinity : 0, ease:"easeInOut" }}
          style={{ width:2.5, background:color, borderRadius:1 }}
        />
      ))}
    </div>
  );
}

// ── PULSE DOT ─────────────────────────────────────────────────────────────────
function PulseDot({ color = T.gold, size = 6 }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:size, height:size }}>
      <motion.span
        animate={{ scale:[1,2.2,1], opacity:[0.7,0,0.7] }}
        transition={{ duration:1.8, repeat:Infinity }}
        style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:0.4 }}
      />
      <span style={{ width:size, height:size, borderRadius:"50%", background:color, position:"relative" }} />
    </span>
  );
}

// ── GHOSTED CARD MOCK ─────────────────────────────────────────────────────────
function GhostedCard({ name, signal, dist, delay = 0, onBoo }) {
  const [bood, setBood] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleBoo = () => {
    setFlash(true);
    setTimeout(() => { setFlash(false); setBood(true); }, 300);
    onBoo?.();
  };

  return (
    <motion.div
      initial={{ opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.35 }}
      style={{
        background:T.card, border:`1px solid ${flash ? T.gold : T.border}`,
        padding:"12px", display:"flex", alignItems:"center", gap:12,
        boxShadow: flash ? `0 0 0 2px ${T.gold}66` : "none",
        transition:"border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width:44, height:44, borderRadius:"50%",
        border:`2px solid ${bood ? T.gold : "#222"}`,
        background:"#111", display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0, overflow:"hidden",
        transition:"border-color 0.3s",
      }}>
        <span style={{ fontSize:18 }}>👤</span>
      </div>
      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:"14px", fontFamily:"'Oswald', sans-serif",
          color:T.white, textTransform:"uppercase", letterSpacing:"0.03em" }}>{name}</p>
        <p style={{ margin:"1px 0 0", fontSize:"10px", color:T.gold,
          fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>{signal}</p>
        <p style={{ margin:"1px 0 0", fontSize:"9px", color:T.muted,
          fontFamily:"'Barlow', sans-serif" }}>{dist}</p>
      </div>
      {/* Boo button */}
      <motion.button
        whileTap={{ scale:0.88 }}
        onClick={handleBoo}
        style={{
          width:36, height:36, borderRadius:"50%", flexShrink:0,
          background: bood ? `${T.gold}22` : "transparent",
          border:`1px solid ${bood ? T.gold : "#333"}`,
          cursor:"pointer", color: bood ? T.gold : T.muted,
          fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
        }}
      >
        {bood ? "✓" : "👻"}
      </motion.button>
    </motion.div>
  );
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

function ScreenColdOpen({ onNext }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    setTimeout(() => setCount(67), 1200); // Simulate right_now_status COUNT
  }, []);

  return (
    <div style={{ position:"relative", height:"100%", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <GlobeBackground />
      <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
        <motion.h1
          initial={{ opacity:0, scale:0.94 }}
          animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.8, ease:[0.25,0.1,0.25,1] }}
          style={{ margin:"0 0 4px", fontSize:"52px", fontFamily:"'Oswald', sans-serif",
            fontWeight:700, color:T.white, letterSpacing:"-0.01em" }}>
          HOTMESS
        </motion.h1>
        <motion.p
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}
          style={{ margin:"0 0 24px", fontSize:"14px", color:T.gold,
            fontFamily:"'Barlow', sans-serif", letterSpacing:"0.1em" }}>
          London. Tonight.
        </motion.p>
        <AnimatePresence>
          {count && (
            <motion.p
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              style={{ margin:"0 0 40px", fontSize:"11px", color:T.muted,
                fontFamily:"'Barlow', sans-serif", letterSpacing:"0.05em" }}>
              <PulseDot color={T.gold} size={5} />
              <span style={{ marginLeft:6 }}>{count} men live right now.</span>
            </motion.p>
          )}
        </AnimatePresence>
        {count && (
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.3 }}
            style={{ position:"absolute", bottom:24, left:16, right:16 }}>
            <button onClick={onNext} style={{
              width:"100%", padding:"14px",
              background:T.gold, border:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"12px",
              letterSpacing:"0.2em", color:T.black, cursor:"pointer",
              textTransform:"uppercase",
            }}>
              JOIN THE NIGHT
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ScreenAuth({ onNext }) {
  return (
    <div style={{ position:"relative", height:"100%", display:"flex",
      flexDirection:"column", justifyContent:"flex-end", padding:"0 16px 48px" }}>
      <GlobeBackground intensity={0.6} />
      <motion.div
        initial={{ y:"100%" }} animate={{ y:0 }}
        transition={{ type:"spring", damping:28, stiffness:260 }}
        style={{ position:"relative", zIndex:1 }}>
        <p style={{ margin:"0 0 8px", fontSize:"28px", fontFamily:"'Oswald', sans-serif",
          color:T.white, textTransform:"uppercase", lineHeight:1.1 }}>
          Join the night.
        </p>
        <p style={{ margin:"0 0 20px", fontSize:"11px", color:T.muted,
          fontFamily:"'Barlow', sans-serif" }}>
          18+ · Consent first · Care always.
        </p>
        {["🍎  Continue with Apple","G  Continue with Google"].map((label, i) => (
          <motion.button key={label} whileTap={{ scale:0.97 }} onClick={onNext}
            style={{
              width:"100%", padding:"13px", marginBottom:8,
              background: i===0 ? T.white : "transparent",
              border:`1px solid ${i===0 ? T.white : "#333"}`,
              fontFamily:"'Barlow', sans-serif", fontSize:"12px",
              color: i===0 ? T.black : T.white, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
            {label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

function ScreenAge({ onNext }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ padding:"48px 16px 24px" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>AGE GATE</p>
      <h2 style={{ margin:"0 0 32px", fontSize:"32px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase", lineHeight:1.1 }}>
        How old<br/>are you?
      </h2>
      {["18–24","25–32","33–40","41+"].map(age => (
        <button key={age} onClick={() => { setSelected(age); setTimeout(onNext, 400); }}
          style={{
            width:"100%", padding:"12px 16px", marginBottom:6,
            background: selected===age ? `${T.gold}22` : T.card,
            border:`1px solid ${selected===age ? T.gold : T.border}`,
            fontFamily:"'Oswald', sans-serif", fontSize:"14px",
            color: selected===age ? T.gold : T.white,
            cursor:"pointer", textAlign:"left", letterSpacing:"0.05em",
          }}>
          {age}
        </button>
      ))}
    </div>
  );
}

function ScreenName({ onNext }) {
  const [name, setName] = useState("");
  return (
    <div style={{ padding:"48px 16px 24px" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>QUICK SETUP</p>
      <h2 style={{ margin:"0 0 8px", fontSize:"30px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase", lineHeight:1.1 }}>
        What do people<br/>call you?
      </h2>
      <p style={{ margin:"0 0 24px", fontSize:"10px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>
        GPS is finding your area in the background.
      </p>
      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="your name..."
        style={{
          width:"100%", background:T.card, border:`1px solid ${T.border}`,
          padding:"12px 14px", color:T.white,
          fontFamily:"'Barlow', sans-serif", fontSize:"16px", outline:"none",
          marginBottom:12, boxSizing:"border-box",
        }}
      />
      <button onClick={onNext} style={{
        width:"100%", padding:"13px",
        background:T.gold, border:"none",
        fontFamily:"'Oswald', sans-serif", fontSize:"12px",
        letterSpacing:"0.2em", color:T.black, cursor:"pointer", textTransform:"uppercase",
      }}>
        {name ? `I'M ${name.toUpperCase()}` : "SKIP → AUTO NAME"}
      </button>
    </div>
  );
}

function ScreenSound({ onNext }) {
  return (
    <div style={{ padding:"48px 16px 24px", display:"flex",
      flexDirection:"column", alignItems:"center", textAlign:"center" }}>
      <motion.div
        animate={{ scale:[1, 1.1, 1] }}
        transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}
        style={{
          width:72, height:72, borderRadius:"50%", marginBottom:24,
          background:`${T.gold}15`, border:`2px solid ${T.gold}44`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
        <span style={{ fontSize:28 }}>🎧</span>
      </motion.div>
      <p style={{ margin:"0 0 4px", fontSize:"11px", letterSpacing:"0.2em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>DIAL-A-DADDY IS LIVE</p>
      <h2 style={{ margin:"0 0 8px", fontSize:"28px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase", lineHeight:1.1 }}>
        Turn on<br/>the sound?
      </h2>
      <p style={{ margin:"0 0 32px", fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
        HOTMESS Radio plays live during your session.
      </p>
      <button onClick={onNext} style={{
        width:"100%", padding:"14px",
        background:T.gold, border:"none",
        fontFamily:"'Oswald', sans-serif", fontSize:"12px",
        letterSpacing:"0.2em", color:T.black, cursor:"pointer",
        textTransform:"uppercase", marginBottom:10,
      }}>
        YES, TURN IT ON
      </button>
      <button onClick={onNext} style={{
        background:"transparent", border:"none",
        fontFamily:"'Barlow', sans-serif", fontSize:"11px",
        color:T.muted, cursor:"pointer",
      }}>
        not now
      </button>
    </div>
  );
}

function ScreenGhosted({ onBoo }) {
  const [signal, setSignal] = useState(0);
  const signals = [
    "3 guys are live within 200m",
    "Someone just looked at you",
    "Right now isn't later",
  ];
  useEffect(() => {
    const id = setInterval(() => setSignal(s => (s + 1) % signals.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding:"0 0 16px" }}>
      {/* Active Signal Layer */}
      <div style={{ padding:"14px 16px 12px", borderBottom:`1px solid ${T.border}` }}>
        <AnimatePresence mode="wait">
          <motion.p key={signal}
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-4 }} transition={{ duration:0.3 }}
            style={{ margin:0, fontSize:"15px", fontFamily:"'Oswald', sans-serif",
              color:T.white, letterSpacing:"0.02em" }}>
            {signals[signal]}
          </motion.p>
        </AnimatePresence>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
          <Waveform playing bars={4} />
          <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
            Dial-A-Daddy · HOTMESS Radio
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding:"8px 8px 0", display:"flex", flexDirection:"column", gap:6 }}>
        <GhostedCard name="MASC_MESS" signal="At Eagle · Listening" dist="0.3km" delay={0.1} onBoo={onBoo} />
        <GhostedCard name="CIRCUIT_LAD" signal="Moving in 8 min · Right Now" dist="0.6km" delay={0.2} />
        <GhostedCard name="BRUNOKNIGHT" signal="At Eagle · Tonight" dist="1.1km" delay={0.3} />
      </div>
    </div>
  );
}

function ScreenMatch({ onSend }) {
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const starters = ["Boo'd you. 😏", "Now what?", "Hey"];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (sent) return (
    <div style={{ padding:"48px 16px", textAlign:"center" }}>
      <motion.p initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }}
        style={{ fontSize:"32px", fontFamily:"'Oswald', sans-serif", color:T.gold,
          textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 8px" }}>
        Message sent.
      </motion.p>
      <p style={{ fontSize:"12px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
        Chat thread is open.
      </p>
      <motion.button whileTap={{ scale:0.95 }} onClick={onSend}
        style={{ marginTop:24, padding:"12px 32px", background:T.gold, border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"11px", letterSpacing:"0.2em",
          color:T.black, cursor:"pointer", textTransform:"uppercase" }}>
        OPEN CHAT →
      </motion.button>
    </div>
  );

  return (
    <div style={{ position:"relative", height:"100%", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"24px 16px" }}>
      {/* Match avatars */}
      <div style={{ display:"flex", alignItems:"center", gap:-12, marginBottom:20 }}>
        {["👤","👤"].map((avatar, i) => (
          <motion.div key={i}
            initial={{ x: i===0 ? -40 : 40, opacity:0 }}
            animate={{ x:0, opacity:1 }}
            transition={{ delay:0.2 + i*0.1, type:"spring" }}
            style={{
              width:60, height:60, borderRadius:"50%",
              background:`${T.gold}22`, border:`2px solid ${T.gold}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24, marginLeft: i===1 ? -12 : 0,
            }}>
            {avatar}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {step >= 1 && (
          <motion.p initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            style={{ margin:"0 0 4px", fontSize:"32px", fontFamily:"'Oswald', sans-serif",
              color:T.gold, textTransform:"uppercase", letterSpacing:"0.02em" }}>
            You matched.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Starters */}
      <AnimatePresence>
        {step >= 2 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            style={{ width:"100%", marginTop:20 }}>
            <p style={{ margin:"0 0 8px", fontSize:"9px", letterSpacing:"0.2em",
              color:T.muted, fontFamily:"'Barlow', sans-serif", textAlign:"center" }}>
              TAP TO PRE-FILL
            </p>
            {starters.map((s, i) => (
              <motion.button key={s} whileTap={{ scale:0.96 }}
                onClick={() => setSent(true)}
                initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:i * 0.08 }}
                style={{
                  width:"100%", padding:"10px 14px", marginBottom:6,
                  background:"transparent", border:`1px solid ${T.border}`,
                  fontFamily:"'Barlow', sans-serif", fontSize:"12px",
                  color:T.white, cursor:"pointer", textAlign:"left",
                }}>
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse CTA */}
      {step >= 2 && (
        <motion.button whileTap={{ scale:0.95 }}
          animate={{ boxShadow:[`0 0 0px ${T.gold}00`,`0 0 18px ${T.gold}66`,`0 0 0px ${T.gold}00`] }}
          transition={{ duration:1.8, repeat:Infinity }}
          onClick={() => setSent(true)}
          style={{
            width:"100%", marginTop:8, padding:"13px",
            background:T.gold, border:"none",
            fontFamily:"'Oswald', sans-serif", fontSize:"11px",
            letterSpacing:"0.2em", color:T.black, cursor:"pointer", textTransform:"uppercase",
          }}>
          SEND A MESSAGE
        </motion.button>
      )}
    </div>
  );
}

function ScreenChat({ onMeetTrigger }) {
  const msgs = [
    { from:"them", text:"Boo'd you back 👻", time:"22:31" },
    { from:"me",   text:"Boo'd you. 😏",     time:"22:31" },
    { from:"them", text:"now what?",           time:"22:32" },
  ];
  const [showTrigger, setShowTrigger] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowTrigger(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:`${T.gold}22`,
          border:`1px solid ${T.gold}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          👤
        </div>
        <div>
          <p style={{ margin:0, fontSize:"13px", fontFamily:"'Oswald', sans-serif",
            color:T.white, textTransform:"uppercase" }}>MASC_MESS</p>
          <p style={{ margin:0, fontSize:"9px", color:T.green,
            fontFamily:"'Barlow', sans-serif" }}>Active now</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, padding:"12px 16px", overflowY:"auto" }}>
        {msgs.map((m, i) => (
          <motion.div key={i}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:i * 0.3 }}
            style={{
              display:"flex", justifyContent: m.from==="me" ? "flex-end" : "flex-start",
              marginBottom:6,
            }}>
            <div style={{
              padding:"8px 12px", maxWidth:"70%",
              background: m.from==="me" ? T.gold : T.card,
              border: m.from!=="me" ? `1px solid ${T.border}` : "none",
            }}>
              <p style={{ margin:0, fontSize:"12px",
                fontFamily:"'Barlow', sans-serif",
                color: m.from==="me" ? T.black : T.white }}>
                {m.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Meet Trigger */}
      <AnimatePresence>
        {showTrigger && (
          <motion.div
            initial={{ y:60, opacity:0 }} animate={{ y:0, opacity:1 }}
            exit={{ y:60, opacity:0 }}
            transition={{ type:"spring", damping:25, stiffness:280 }}
            style={{
              margin:"0 8px 8px",
              padding:"12px 14px",
              background:`${T.gold}11`,
              border:`1px solid ${T.gold}44`,
              borderTop:`2px solid ${T.gold}`,
            }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <p style={{ margin:0, fontSize:"9px", letterSpacing:"0.2em",
                  color:T.gold, fontFamily:"'Oswald', sans-serif" }}>MEET TRIGGER</p>
                <p style={{ margin:"2px 0 0", fontSize:"12px", color:T.white,
                  fontFamily:"'Barlow', sans-serif" }}>You're both at Eagle.</p>
              </div>
              <PulseDot color={T.gold} size={6} />
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["Share Location","Drop Pin"].map(label => (
                <button key={label} style={{
                  flex:1, padding:"7px 4px",
                  background:"transparent", border:`1px solid ${T.border}`,
                  fontFamily:"'Oswald', sans-serif", fontSize:"9px",
                  letterSpacing:"0.1em", color:T.muted, cursor:"pointer", textTransform:"uppercase",
                }}>{label}</button>
              ))}
              <motion.button
                whileTap={{ scale:0.95 }}
                onClick={onMeetTrigger}
                style={{
                  flex:1, padding:"7px 4px",
                  background:T.gold, border:"none",
                  fontFamily:"'Oswald', sans-serif", fontSize:"9px",
                  letterSpacing:"0.1em", color:T.black, cursor:"pointer", textTransform:"uppercase",
                }}>
                I'M HERE
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer */}
      <div style={{ padding:"8px 16px 16px", borderTop:`1px solid ${T.border}`,
        display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ flex:1, background:T.card, border:`1px solid ${T.border}`,
          padding:"10px 12px" }}>
          <span style={{ fontSize:"12px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
            say something...
          </span>
        </div>
        <button style={{ background:T.gold, border:"none", width:36, height:36,
          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
          fontSize:14 }}>▶</button>
      </div>
    </div>
  );
}

function ScreenArrival() {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <motion.div
        initial={{ scale:0.5, opacity:0 }}
        animate={{ scale:1, opacity:1 }}
        transition={{ type:"spring", stiffness:200, damping:20 }}>
        <p style={{ margin:"0 0 8px", fontSize:"64px", fontFamily:"'Oswald', sans-serif",
          fontWeight:700, color:T.gold, textTransform:"uppercase",
          letterSpacing:"-0.02em", textAlign:"center", lineHeight:1 }}>
          You're<br/>both here.
        </p>
      </motion.div>
      <motion.p
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
        style={{ margin:"16px 0 0", fontSize:"11px", color:T.muted,
          fontFamily:"'Barlow', sans-serif", textAlign:"center", fontStyle:"italic" }}>
        Loop closed. 4 minutes 22 seconds.
      </motion.p>
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
const SCREEN_LABELS = [
  "0:00 Cold Open","0:08 Auth","0:20 Age","0:35 Name",
  "0:50 Sound","1:00 Ghosted","1:30 Match","2:30 Chat","5:00 Here",
];

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function First5Minutes() {
  const [screen, setScreen] = useState(0);
  const next = () => setScreen(s => Math.min(s + 1, SCREEN_LABELS.length - 1));

  const screens = [
    <ScreenColdOpen onNext={next} />,
    <ScreenAuth onNext={next} />,
    <ScreenAge onNext={next} />,
    <ScreenName onNext={next} />,
    <ScreenSound onNext={next} />,
    <ScreenGhosted onBoo={next} />,
    <ScreenMatch onSend={next} />,
    <ScreenChat onMeetTrigger={next} />,
    <ScreenArrival />,
  ];

  return (
    <>
      <FontLoader />
      <div style={{
        background:T.black, color:T.white, height:"100vh",
        maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column",
        fontFamily:"'Barlow', sans-serif", overflow:"hidden",
      }}>
        {/* Progress */}
        <div style={{ padding:"8px 12px", borderBottom:`1px solid ${T.border}`,
          flexShrink:0, display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ display:"flex", gap:2 }}>
            {SCREEN_LABELS.map((_, i) => (
              <div key={i} onClick={() => setScreen(i)} style={{
                flex:1, height:2, borderRadius:1, cursor:"pointer",
                background: i <= screen ? T.gold : T.border,
                transition:"background 0.3s",
              }} />
            ))}
          </div>
          <p style={{ margin:0, fontSize:"9px", color:T.muted,
            fontFamily:"'Barlow', sans-serif", letterSpacing:"0.1em" }}>
            {SCREEN_LABELS[screen]}
          </p>
        </div>

        {/* Screen content */}
        <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
          <AnimatePresence mode="wait">
            <motion.div key={screen}
              initial={{ opacity:0, x:20 }}
              animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:-20 }}
              transition={{ duration:0.22, ease:"easeOut" }}
              style={{ position:"absolute", inset:0, overflowY:"auto" }}>
              {screens[screen]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav hint */}
        {screen < SCREEN_LABELS.length - 1 && screen !== 5 && screen !== 6 && screen !== 7 && (
          <div style={{ padding:"8px 16px 16px", flexShrink:0, textAlign:"center" }}>
            <p style={{ margin:0, fontSize:"8px", color:"#222",
              fontFamily:"'Barlow', sans-serif", letterSpacing:"0.1em" }}>
              TAP PROGRESS BAR TO JUMP · INTERACT TO ADVANCE
            </p>
          </div>
        )}
      </div>
    </>
  );
}
