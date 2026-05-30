import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS — CARE DRESSED AS KINK ───────────────────────────────────────────
// The safety system that feels like confidence.
//
// Seven surfaces — none use the word "safety":
//
// 1. BACKUP    (trusted contacts)        → "Who's got you tonight?"
// 2. GET OUT   (SOS)                     → hold 3s. one tap. done.
// 3. COVER     (fake call)               → "Need cover? Tap."
// 4. LAND TIME (check-in timer)          → "What time are you landing?"
// 5. CLEAN EXIT(data clear + logout)     → "Exit clean."
// 6. HOW DID IT LAND (post-meet nudge)   → 4hrs after meet trigger
// 7. PEOPLE WHO GET IT (resources)       → quiet card. no panic.
//
// DEV:
// Get Out: fires email to backup contacts (Resend) + starts Cover + clears session
// Land Time: writes to user_sessions.land_time. cron checks it. texts backup if missed.
// Clean Exit: clears localStorage, Supabase session, right_now_status, chat cache
// Cover: starts a fake call via Web Audio API or device vibration pattern
// Backup: writes to profiles.backup_contacts (array, max 2)
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:  "#000",
  dim:    "#080808",
  card:   "#0d0d0d",
  gold:   "#C8962C",
  goldDim:"rgba(200,150,44,0.12)",
  white:  "#fff",
  muted:  "rgba(255,255,255,0.35)",
  border: "#1a1a1a",
  green:  "#30D158",
  red:    "#FF3B30",
};

// ── FONTS ─────────────────────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ── CONFIRMATION FLASH ────────────────────────────────────────────────────────
// Brief gold confirmation. Never a wall of text.
function ConfirmFlash({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0 }}
      style={{
        position:"fixed", inset:0, zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"rgba(0,0,0,0.85)", backdropFilter:"blur(10px)",
        pointerEvents:"none",
      }}>
      <motion.p
        animate={{ scale:[1, 1.04, 1] }}
        transition={{ duration:0.6 }}
        style={{
          fontFamily:"'Oswald', sans-serif",
          fontSize:"36px", fontWeight:700,
          color:T.gold, textTransform:"uppercase",
          letterSpacing:"0.04em", textAlign:"center",
        }}>
        {text}
      </motion.p>
    </motion.div>
  );
}

// ── 1. BACKUP ─────────────────────────────────────────────────────────────────
function BackupSetup({ onDone }) {
  const [contacts, setContacts] = useState(["", ""]);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!contacts[0]) return;
    setSaved(true);
    // DEV: supabase.from('profiles').update({ backup_contacts: contacts.filter(Boolean) })
    setTimeout(onDone, 1400);
  };

  if (saved) return (
    <AnimatePresence>
      <ConfirmFlash text="Backed." onDone={onDone} />
    </AnimatePresence>
  );

  return (
    <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
      transition={{ type:"spring", damping:28, stiffness:280 }}
      style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:T.dim, borderTop:`1px solid ${T.border}`,
        borderRadius:"18px 18px 0 0", padding:"20px 16px 40px",
        maxWidth:480, margin:"0 auto",
      }}>
      <div style={{ width:36, height:3, background:"#222", borderRadius:2, margin:"0 auto 20px" }} />

      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>BACKUP</p>
      <h2 style={{ margin:"0 0 6px", fontSize:"26px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase", letterSpacing:"0.03em" }}>
        Who's got you tonight?
      </h2>
      <p style={{ margin:"0 0 20px", fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
        They'll hear from us if you don't land.
      </p>

      {contacts.map((c, i) => (
        <input key={i}
          value={c}
          onChange={e => setContacts(prev => prev.map((x,j) => j===i ? e.target.value : x))}
          placeholder={i===0 ? "Backup 1 (name or number)" : "Backup 2 — optional"}
          style={{
            width:"100%", marginBottom:8,
            background:T.card, border:`1px solid ${T.border}`,
            padding:"12px 14px", color:T.white,
            fontFamily:"'Barlow', sans-serif", fontSize:"13px",
            outline:"none", boxSizing:"border-box",
          }}
        />
      ))}

      <motion.button whileTap={{ scale:0.96 }} onClick={save}
        style={{
          width:"100%", padding:"14px",
          background: contacts[0] ? T.gold : "#1a1a1a",
          border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"12px",
          letterSpacing:"0.2em", color: contacts[0] ? T.black : "#333",
          cursor: contacts[0] ? "pointer" : "default", textTransform:"uppercase",
          marginTop:4,
        }}>
        SET MY BACKUP
      </motion.button>
    </motion.div>
  );
}

// ── 2. GET OUT ────────────────────────────────────────────────────────────────
// Gesture: hold 3 seconds. Or tap from the hidden profile button.
function GetOut({ onDone }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fired, setFired] = useState(false);
  const intervalRef = useRef(null);

  const startHold = () => {
    setHolding(true);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(intervalRef.current);
          setFired(true);
          // DEV: POST /api/safety/get-out → emails backup contacts, starts cover, clears session
          setTimeout(onDone, 2000);
          return 100;
        }
        return p + 4;
      });
    }, 120);
  };

  const stopHold = () => {
    if (!fired) { setHolding(false); setProgress(0); clearInterval(intervalRef.current); }
  };

  if (fired) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ position:"fixed", inset:0, zIndex:200, background:"#000",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:12 }}>
      <motion.p initial={{ scale:0.8 }} animate={{ scale:1 }}
        style={{ fontFamily:"'Oswald', sans-serif", fontSize:"42px",
          color:T.gold, textTransform:"uppercase", letterSpacing:"0.04em", margin:0 }}>
        Done.
      </motion.p>
      <p style={{ fontFamily:"'Barlow', sans-serif", fontSize:"12px",
        color:T.muted, fontStyle:"italic", margin:0 }}>
        Your people know.
      </p>
    </motion.div>
  );

  return (
    <div style={{ padding:"48px 16px 32px", display:"flex",
      flexDirection:"column", alignItems:"center", gap:16 }}>
      <p style={{ margin:0, fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>GET OUT</p>
      <p style={{ margin:0, fontSize:"22px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase", textAlign:"center", letterSpacing:"0.03em" }}>
        Hold to fire everything.
      </p>
      <p style={{ margin:0, fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic", textAlign:"center" }}>
        Backup notified. Cover starts. Session clears.
      </p>

      {/* Hold button */}
      <motion.div
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        style={{
          width:120, height:120, borderRadius:"50%",
          border:`2px solid ${holding ? T.gold : T.border}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", position:"relative", overflow:"hidden",
          userSelect:"none",
        }}>
        {/* Progress ring fill */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          transform:"rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="56" fill="none" stroke={T.gold}
            strokeWidth="2" strokeDasharray={`${progress * 3.52} 352`}
            strokeLinecap="round" />
        </svg>
        <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"14px",
          color: holding ? T.gold : T.muted, letterSpacing:"0.1em",
          textTransform:"uppercase", position:"relative", zIndex:1 }}>
          {holding ? `${Math.round(progress)}%` : "HOLD"}
        </p>
      </motion.div>

      <p style={{ margin:0, fontSize:"10px", color:"#333",
        fontFamily:"'Barlow', sans-serif" }}>
        or tap once to trigger immediately
      </p>
      <motion.button whileTap={{ scale:0.95 }}
        onClick={() => { setFired(true); setTimeout(onDone, 2000); }}
        style={{
          padding:"10px 24px", background:"transparent",
          border:`1px solid ${T.border}`,
          fontFamily:"'Oswald', sans-serif", fontSize:"10px",
          letterSpacing:"0.2em", color:T.muted, cursor:"pointer",
          textTransform:"uppercase",
        }}>
        GET OUT NOW
      </motion.button>
    </div>
  );
}

// ── 3. COVER ──────────────────────────────────────────────────────────────────
function Cover({ onDone }) {
  const [calling, setCalling] = useState(false);
  const [callerName, setCallerName] = useState("Dean");

  const startCover = () => {
    setCalling(true);
    // DEV: start fake call via Web Audio API or trigger device vibration pattern
    // No call log entry created anywhere
    setTimeout(() => { setCalling(false); onDone(); }, 8000);
  };

  if (calling) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ position:"fixed", inset:0, zIndex:200,
        background:"#0a0a14", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <motion.div
        animate={{ scale:[1, 1.15, 1] }}
        transition={{ duration:1.5, repeat:Infinity }}
        style={{ width:72, height:72, borderRadius:"50%",
          background:"#1a1a2e", border:`2px solid ${T.gold}44`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
        📞
      </motion.div>
      <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"28px",
        color:T.white, textTransform:"uppercase" }}>{callerName} calling</p>
      <p style={{ margin:0, fontFamily:"'Barlow', sans-serif", fontSize:"12px",
        color:T.muted, fontStyle:"italic" }}>Incoming...</p>
      <div style={{ display:"flex", gap:40, marginTop:12 }}>
        <motion.button whileTap={{ scale:0.9 }}
          onClick={onDone}
          style={{ width:56, height:56, borderRadius:"50%",
            background:"#CC3333", border:"none", cursor:"pointer", fontSize:20 }}>
          ✕
        </motion.button>
        <motion.button whileTap={{ scale:0.9 }}
          onClick={onDone}
          style={{ width:56, height:56, borderRadius:"50%",
            background:"#30D158", border:"none", cursor:"pointer", fontSize:20 }}>
          ✓
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <div style={{ padding:"48px 16px 32px", textAlign:"center" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>COVER</p>
      <h2 style={{ margin:"0 0 8px", fontSize:"26px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase" }}>
        Need cover?
      </h2>
      <p style={{ margin:"0 0 24px", fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
        We'll call you in 10 seconds. No log. No trace.
      </p>

      <p style={{ margin:"0 0 8px", fontSize:"9px", letterSpacing:"0.2em",
        color:T.muted, fontFamily:"'Barlow', sans-serif" }}>CALLER NAME</p>
      <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:24 }}>
        {["Dean", "Mum", "Work", "Doctor"].map(name => (
          <button key={name} onClick={() => setCallerName(name)}
            style={{
              padding:"6px 12px", background: callerName===name ? T.goldDim : "transparent",
              border:`1px solid ${callerName===name ? T.gold : T.border}`,
              fontFamily:"'Barlow', sans-serif", fontSize:"11px",
              color: callerName===name ? T.gold : T.muted, cursor:"pointer",
            }}>{name}</button>
        ))}
      </div>

      <motion.button whileTap={{ scale:0.95 }} onClick={startCover}
        style={{
          padding:"14px 40px", background:T.gold, border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"12px",
          letterSpacing:"0.2em", color:T.black, cursor:"pointer",
          textTransform:"uppercase",
        }}>
        SET ME UP
      </motion.button>
    </div>
  );
}

// ── 4. LAND TIME ──────────────────────────────────────────────────────────────
function LandTime({ onDone }) {
  const [selected, setSelected] = useState("2am");
  const [set, setSet] = useState(false);

  const times = ["1am", "2am", "3am", "4am", "Sunrise", "Custom"];

  if (set) return (
    <AnimatePresence>
      <ConfirmFlash text={`Landing ${selected}.`} onDone={onDone} />
    </AnimatePresence>
  );

  return (
    <div style={{ padding:"48px 16px 32px" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>LAND TIME</p>
      <h2 style={{ margin:"0 0 8px", fontSize:"26px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase" }}>
        What time are you landing?
      </h2>
      <p style={{ margin:"0 0 24px", fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
        If you don't check in, we quietly let your backup know.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:24 }}>
        {times.map(t => (
          <motion.button key={t} whileTap={{ scale:0.95 }}
            onClick={() => setSelected(t)}
            style={{
              padding:"12px 8px",
              background: selected===t ? T.goldDim : T.card,
              border:`1px solid ${selected===t ? T.gold : T.border}`,
              fontFamily:"'Oswald', sans-serif", fontSize:"14px",
              letterSpacing:"0.05em",
              color: selected===t ? T.gold : T.muted,
              cursor:"pointer", textTransform:"uppercase",
            }}>
            {t}
          </motion.button>
        ))}
      </div>

      <motion.button whileTap={{ scale:0.96 }}
        onClick={() => setSet(true)}
        style={{
          width:"100%", padding:"14px", background:T.gold, border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"12px",
          letterSpacing:"0.2em", color:T.black, cursor:"pointer",
          textTransform:"uppercase",
        }}>
        LANDING {selected.toUpperCase()}
      </motion.button>
    </div>
  );
}

// ── 5. CLEAN EXIT ─────────────────────────────────────────────────────────────
function CleanExit({ onDone }) {
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(false);

  const exit = () => {
    setClearing(true);
    // DEV: clear localStorage, Supabase session, right_now_status, chat cache
    // supabase.from('right_now_status').delete().eq('user_id', userId)
    // supabase.auth.signOut()
    setTimeout(() => { setDone(true); setTimeout(onDone, 1500); }, 1200);
  };

  if (done) return <AnimatePresence><ConfirmFlash text="Gone." onDone={onDone} /></AnimatePresence>;

  return (
    <div style={{ padding:"48px 16px 32px", textAlign:"center" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.3em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>CLEAN EXIT</p>
      <h2 style={{ margin:"0 0 8px", fontSize:"26px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase" }}>
        Exit clean.
      </h2>
      <p style={{ margin:"0 0 32px", fontSize:"11px", color:T.muted,
        fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
        Session cleared. No trace.
      </p>

      {clearing ? (
        <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1, repeat:Infinity }}>
          <p style={{ fontFamily:"'Barlow', sans-serif", fontSize:"12px", color:T.gold }}>
            Clearing...
          </p>
        </motion.div>
      ) : (
        <motion.button whileTap={{ scale:0.95 }} onClick={exit}
          style={{
            padding:"14px 40px", background:"transparent",
            border:`1px solid ${T.gold}`,
            fontFamily:"'Oswald', sans-serif", fontSize:"12px",
            letterSpacing:"0.2em", color:T.gold, cursor:"pointer",
            textTransform:"uppercase",
          }}>
          EXIT CLEAN
        </motion.button>
      )}
    </div>
  );
}

// ── 6. HOW DID IT LAND ────────────────────────────────────────────────────────
// Appears 4hrs after confirmed meet. One gentle line in HomeMode.
function LandCheck({ onDone }) {
  const [answered, setAnswered] = useState(null);
  const [showResources, setShowResources] = useState(false);

  const respond = (ans) => {
    setAnswered(ans);
    if (ans === "well") setTimeout(onDone, 1500);
    else setShowResources(true);
    // DEV: write meet_outcomes table for analytics (anonymised)
  };

  if (answered === "well") return (
    <AnimatePresence><ConfirmFlash text="Good. Rest up." onDone={onDone} /></AnimatePresence>
  );

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ padding:"24px 16px" }}>
      <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.2em",
        color:T.gold, fontFamily:"'Oswald', sans-serif" }}>LAND CHECK</p>
      <h2 style={{ margin:"0 0 16px", fontSize:"22px", fontFamily:"'Oswald', sans-serif",
        color:T.white, textTransform:"uppercase" }}>
        How did it land?
      </h2>

      {!answered && (
        <div style={{ display:"flex", gap:8 }}>
          <motion.button whileTap={{ scale:0.95 }} onClick={() => respond("well")}
            style={{
              flex:1, padding:"12px",
              background:T.goldDim, border:`1px solid ${T.gold}`,
              fontFamily:"'Oswald', sans-serif", fontSize:"11px",
              letterSpacing:"0.15em", color:T.gold,
              cursor:"pointer", textTransform:"uppercase",
            }}>
            WELL
          </motion.button>
          <motion.button whileTap={{ scale:0.95 }} onClick={() => respond("complicated")}
            style={{
              flex:1, padding:"12px",
              background:"transparent", border:`1px solid ${T.border}`,
              fontFamily:"'Oswald', sans-serif", fontSize:"11px",
              letterSpacing:"0.15em", color:T.muted,
              cursor:"pointer", textTransform:"uppercase",
            }}>
            COULD HAVE BEEN BETTER
          </motion.button>
        </div>
      )}

      {showResources && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
          <p style={{ margin:"12px 0 16px", fontSize:"11px", color:T.muted,
            fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
            Want to talk to someone?
          </p>
          {[
            { name:"Switchboard", note:"Talk to someone who gets it. Any hour.", tel:"0300 330 0630" },
            { name:"Galop", note:"For when it got complicated.", tel:"0800 999 5428" },
            { name:"Samaritans", note:"When the night feels too heavy.", tel:"116 123" },
          ].map(r => (
            <div key={r.name} style={{ padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"13px",
                color:T.white, textTransform:"uppercase" }}>{r.name}</p>
              <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif",
                fontSize:"10px", color:T.muted, fontStyle:"italic" }}>{r.note}</p>
              <p style={{ margin:"2px 0 0", fontFamily:"'Barlow', sans-serif",
                fontSize:"10px", color:T.gold }}>{r.tel}</p>
            </div>
          ))}
          <motion.button whileTap={{ scale:0.95 }} onClick={onDone}
            style={{ marginTop:16, width:"100%", padding:"12px",
              background:"transparent", border:`1px solid ${T.border}`,
              fontFamily:"'Oswald', sans-serif", fontSize:"10px",
              letterSpacing:"0.2em", color:T.muted, cursor:"pointer",
              textTransform:"uppercase" }}>
            CLOSE
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── DEMO SHELL ────────────────────────────────────────────────────────────────
export default function CareAsKink() {
  useFonts();
  const [active, setActive] = useState(null);
  const [confirmed, setConfirmed] = useState({});

  const surfaces = [
    { id:"backup",    label:"BACKUP",      sub:"Who's got you tonight?",     icon:"👥" },
    { id:"cover",     label:"COVER",       sub:"Need cover? Tap.",            icon:"📞" },
    { id:"landtime",  label:"LAND TIME",   sub:"What time are you landing?",  icon:"🕐" },
    { id:"getout",    label:"GET OUT",     sub:"Hold to fire everything.",    icon:"⚡" },
    { id:"cleanexit", label:"CLEAN EXIT",  sub:"Session cleared. No trace.",  icon:"◻" },
    { id:"landcheck", label:"LAND CHECK",  sub:"How did it land?",            icon:"✓"  },
  ];

  const done = (id) => {
    setConfirmed(prev => ({ ...prev, [id]: true }));
    setActive(null);
  };

  return (
    <div style={{
      background:T.dim, color:T.white, minHeight:"100vh",
      maxWidth:480, margin:"0 auto",
      fontFamily:"'Barlow', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${T.border}` }}>
        <p style={{ margin:"0 0 2px", fontSize:"9px", letterSpacing:"0.3em",
          color:T.gold, fontFamily:"'Oswald', sans-serif" }}>
          CARE DRESSED AS KINK
        </p>
        <h1 style={{ margin:0, fontSize:"28px", fontFamily:"'Oswald', sans-serif",
          color:T.white, textTransform:"uppercase", letterSpacing:"0.02em" }}>
          You're covered.
        </h1>
        <p style={{ margin:"4px 0 0", fontSize:"11px", color:T.muted,
          fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
          The system is quiet. You run the play.
        </p>
      </div>

      {/* Surface cards */}
      <div style={{ padding:"8px 0" }}>
        {surfaces.map((s, i) => (
          <motion.div key={s.id}
            initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
            transition={{ delay:i * 0.06 }}
            onClick={() => setActive(s.id)}
            style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px", borderBottom:`1px solid ${T.border}`,
              cursor:"pointer", background: confirmed[s.id] ? `${T.gold}06` : "transparent",
            }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{s.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <p style={{ margin:0, fontFamily:"'Oswald', sans-serif",
                  fontSize:"13px", color:T.white, textTransform:"uppercase",
                  letterSpacing:"0.08em" }}>
                  {s.label}
                </p>
                {confirmed[s.id] && (
                  <span style={{ fontSize:"9px", color:T.gold,
                    fontFamily:"'Barlow', sans-serif" }}>SET</span>
                )}
              </div>
              <p style={{ margin:"1px 0 0", fontFamily:"'Barlow', sans-serif",
                fontSize:"10px", color:T.muted, fontStyle:"italic" }}>
                {s.sub}
              </p>
            </div>
            <span style={{ color:T.border, fontSize:18 }}>›</span>
          </motion.div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{ padding:"14px 16px", margin:"8px 0",
        background:T.card, border:`1px solid ${T.border}`, marginLeft:16, marginRight:16 }}>
        <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.2em",
          color:T.muted, fontFamily:"'Oswald', sans-serif" }}>YOUR STATUS</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {[
            { key:"backup",    label:"BACKED",   set: confirmed.backup },
            { key:"landtime",  label:"TIMED",    set: confirmed.landtime },
            { key:"cover",     label:"COVERED",  set: confirmed.cover },
          ].map(s => (
            <div key={s.key} style={{
              padding:"4px 10px",
              background: s.set ? `${T.gold}15` : "transparent",
              border:`1px solid ${s.set ? T.gold : T.border}`,
            }}>
              <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"9px",
                letterSpacing:"0.15em", color: s.set ? T.gold : "#333",
                textTransform:"uppercase" }}>
                {s.label}
              </span>
            </div>
          ))}
          <div style={{
            padding:"4px 10px",
            background:`${T.gold}15`, border:`1px solid ${T.gold}`,
          }}>
            <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"9px",
              letterSpacing:"0.15em", color:T.gold, textTransform:"uppercase" }}>
              PREPARED
            </span>
          </div>
        </div>
      </div>

      {/* Sheet overlay */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setActive(null)}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:80 }} />
            <motion.div
              initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
              transition={{ type:"spring", damping:28, stiffness:280 }}
              style={{
                position:"fixed", bottom:0, left:0, right:0, zIndex:90,
                background:T.dim, borderTop:`1px solid ${T.border}`,
                borderRadius:"18px 18px 0 0",
                maxWidth:480, margin:"0 auto",
              }}>
              <div style={{ width:36, height:3, background:"#222",
                borderRadius:2, margin:"12px auto 0" }} />

              {active === "backup"    && <BackupSetup onDone={() => done("backup")} />}
              {active === "getout"    && <GetOut onDone={() => done("getout")} />}
              {active === "cover"     && <Cover onDone={() => done("cover")} />}
              {active === "landtime"  && <LandTime onDone={() => done("landtime")} />}
              {active === "cleanexit" && <CleanExit onDone={() => done("cleanexit")} />}
              {active === "landcheck" && <LandCheck onDone={() => done("landcheck")} />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
