import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS NIGHT OPERATOR PANEL ─────────────────────────────────────────────
// Real-time control surface for running a night.
// Two operator roles: PLATFORM ADMIN (full control) and VENUE OPERATOR (venue-scoped).
//
// What this panel does:
// - Push system beacons to redirect crowd flow
// - Manually advance event momentum states (LIVE → PEAK → WINDING DOWN)
// - Activate incentive beacons (free drink, queue skip)
// - Kill switch: disable beacon drops, messaging, purchases
// - Monitor density: cluster size, RSVP vs actual attendance
// - Send WhatsApp broadcast to RSVPs
//
// DEV integration:
// - All actions call admin API routes with Bearer token (admin role)
// - Reads live from Supabase: beacons, event_rsvps, right_now_status, safety_switches
// - Real-time updates via Supabase Realtime subscriptions
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:    "#000",
  dim:      "#080808",
  card:     "#0d0d0d",
  border:   "#1a1a1a",
  gold:     "#C8962C",
  red:      "#FF3B30",
  orange:   "#CF3A10",
  green:    "#30D158",
  blue:     "#0A84FF",
  white:    "#fff",
  muted:    "rgba(255,255,255,0.35)",
  danger:   "#FF3B30",
};

// ── MOCK LIVE STATE ───────────────────────────────────────────────────────────
// DEV: replace with Supabase queries + Realtime subscriptions
const useLiveState = () => {
  const [state, setState] = useState({
    activeEvent: {
      id: "evt_001",
      title: "BOOTY BASS",
      venue: "Vauxhall Tavern",
      momentum: "LIVE",
      intensity: 0.78,
      rsvpCount: 47,
      scanCount: 23,
      clusterSize: 31,
      startedMinsAgo: 42,
    },
    beacons: [
      { id:"b1", title:"Main floor open", type:"SOCIAL", intensity:0.9, momentum:"NEW",  active:true },
      { id:"b2", title:"Bar queue short",  type:"EVENT",  intensity:0.6, momentum:"ACTIVE", active:true },
      { id:"b3", title:"Cloakroom open",  type:"MARKET", intensity:0.4, momentum:"DECAYING", active:true },
    ],
    safetySwitch: {
      beaconDrops:   true,
      messaging:     true,
      purchases:     true,
      globePeople:   true,
    },
    density: {
      london: { heat: 88, events: 3, rightNow: 67 },
      berlin: { heat: 71, events: 1, rightNow: 22 },
    },
    recentActions: [
      { ts:"22:14", action:"Pushed system beacon: Dark room open", by:"admin" },
      { ts:"21:58", action:"Advanced BOOTY BASS → LIVE", by:"admin" },
      { ts:"21:30", action:"Activated queue-skip incentive", by:"eagle_venue" },
    ],
  });
  // DEV: useEffect with supabase.channel().on('postgres_changes', ...).subscribe()
  return [state, setState];
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function PulseDot({ color = T.green, size = 6 }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:size, height:size }}>
      <motion.span
        animate={{ scale:[1, 2, 1], opacity:[0.7, 0, 0.7] }}
        transition={{ duration:2, repeat:Infinity }}
        style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:0.4 }}
      />
      <span style={{ width:size, height:size, borderRadius:"50%", background:color }} />
    </span>
  );
}

function StatPill({ label, value, color = T.muted, accent }) {
  return (
    <div style={{
      padding:"8px 12px", background:T.card, border:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:64,
    }}>
      <span style={{ fontSize:"18px", fontFamily:"'Oswald', sans-serif",
        color: accent || T.white, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize:"8px", letterSpacing:"0.15em", color, fontFamily:"'Barlow', sans-serif",
        textTransform:"uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ padding:"14px 16px 8px", borderBottom:`1px solid ${T.border}` }}>
      <p style={{ margin:0, fontSize:"9px", letterSpacing:"0.25em", color:T.gold,
        fontFamily:"'Oswald', sans-serif", textTransform:"uppercase" }}>{title}</p>
      {sub && <p style={{ margin:"2px 0 0", fontSize:"10px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>{sub}</p>}
    </div>
  );
}

function ActionButton({ label, color = T.gold, danger, onClick, small }) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 800); onClick?.(); }}
      style={{
        background: pressed ? (danger ? T.danger : color) : "transparent",
        border: `1px solid ${danger ? T.danger : color}`,
        padding: small ? "5px 10px" : "8px 14px",
        fontFamily:"'Oswald', sans-serif",
        fontSize: small ? "9px" : "10px",
        letterSpacing:"0.15em", color: pressed ? T.black : (danger ? T.danger : color),
        cursor:"pointer", textTransform:"uppercase", transition:"all 0.15s",
        width: small ? "auto" : "100%",
      }}
    >
      {pressed ? "✓ DONE" : label}
    </motion.button>
  );
}

// ── MOMENTUM CONTROL ──────────────────────────────────────────────────────────
const MOMENTUM_STATES = ["UPCOMING","STARTING","LIVE","PEAK","WINDING DOWN"];
const momentumColor = (s) => ({
  UPCOMING:"#4a4a4a", STARTING:T.orange, LIVE:T.gold, PEAK:T.red, "WINDING DOWN":"#666",
})[s] || T.muted;

function MomentumControl({ event, onAdvance, onForce }) {
  const currentIdx = MOMENTUM_STATES.indexOf(event.momentum);
  return (
    <div style={{ padding:"12px 16px" }}>
      {/* Current state */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <PulseDot color={momentumColor(event.momentum)} />
        <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"14px",
          color:momentumColor(event.momentum), letterSpacing:"0.05em" }}>
          {event.momentum}
        </span>
        <span style={{ fontSize:"10px", color:T.muted, fontFamily:"'Barlow', sans-serif",
          marginLeft:"auto" }}>
          {event.startedMinsAgo}min in · {event.clusterSize} at venue
        </span>
      </div>

      {/* State pipeline */}
      <div style={{ display:"flex", gap:3, marginBottom:12 }}>
        {MOMENTUM_STATES.map((s, i) => (
          <div key={s} style={{
            flex:1, height:3, borderRadius:1,
            background: i <= currentIdx ? momentumColor(s) : T.border,
            transition:"background 0.3s",
          }} />
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:4, marginBottom:12 }}>
        <StatPill label="RSVP" value={event.rsvpCount} accent={T.gold} />
        <StatPill label="SCANNED" value={event.scanCount} accent={T.green} />
        <StatPill label="AT VENUE" value={event.clusterSize} accent={T.blue} />
        <StatPill label="INTENSITY" value={`${Math.round(event.intensity*100)}%`} accent={momentumColor(event.momentum)} />
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:6 }}>
        <ActionButton
          label={`→ ${MOMENTUM_STATES[currentIdx+1] || "ENDED"}`}
          onClick={onAdvance}
          color={currentIdx < MOMENTUM_STATES.length-1 ? momentumColor(MOMENTUM_STATES[currentIdx+1]) : T.muted}
        />
        <ActionButton label="FORCE PEAK" color={T.red} danger onClick={() => onForce("PEAK")} small />
      </div>
      {/* DEV: onAdvance calls supabase.from('beacons').update({ momentum_state, intensity })
               .eq('id', event.beacon_id) using service role */}
    </div>
  );
}

// ── BEACON MANAGER ────────────────────────────────────────────────────────────
function BeaconRow({ beacon, onExpire, onBoost }) {
  const mc = momentumColor(beacon.momentum);
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
      borderBottom:`1px solid ${T.border}`,
      opacity: beacon.active ? 1 : 0.4,
    }}>
      <PulseDot color={mc} size={5} />
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:"12px", fontFamily:"'Oswald', sans-serif",
          color:T.white, textTransform:"uppercase", overflow:"hidden",
          whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
          {beacon.title}
        </p>
        <p style={{ margin:"1px 0 0", fontSize:"9px", color:T.muted,
          fontFamily:"'Barlow', sans-serif" }}>
          {beacon.type} · {beacon.momentum} · {Math.round(beacon.intensity*100)}%
        </p>
      </div>
      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
        <ActionButton label="BOOST" onClick={onBoost} small color={T.gold} />
        <ActionButton label="EXPIRE" onClick={onExpire} small danger />
      </div>
    </div>
  );
}

// Push new system beacon form
function PushBeaconForm({ onPush }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("SOCIAL");
  return (
    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ display:"flex", gap:6, marginBottom:6 }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Beacon copy..."
          style={{
            flex:1, background:T.card, border:`1px solid ${T.border}`,
            padding:"8px 10px", color:T.white, fontFamily:"'Barlow', sans-serif",
            fontSize:"11px", outline:"none",
          }}
        />
        <select value={type} onChange={e => setType(e.target.value)} style={{
          background:T.card, border:`1px solid ${T.border}`, color:T.muted,
          fontFamily:"'Barlow', sans-serif", fontSize:"10px", padding:"0 6px",
        }}>
          {["SOCIAL","EVENT","MARKET","SAFETY"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <ActionButton
        label={title ? `PUSH: "${title}"` : "PUSH SYSTEM BEACON"}
        onClick={() => { if(title) { onPush({ title, type }); setTitle(""); } }}
        color={title ? T.gold : T.muted}
      />
      {/* DEV: calls supabase.from('beacons').insert({ type, title, beacon_category:'system',
               status:'active', intensity:1.0, starts_at:now, ends_at:now+2h }) */}
    </div>
  );
}

// ── KILL SWITCHES ─────────────────────────────────────────────────────────────
function KillSwitches({ switches, onToggle }) {
  const items = [
    { key:"beaconDrops",  label:"BEACON DROPS",  icon:"◈" },
    { key:"messaging",    label:"MESSAGING",     icon:"◉" },
    { key:"purchases",    label:"PURCHASES",     icon:"◎" },
    { key:"globePeople",  label:"GLOBE PEOPLE",  icon:"◯" },
  ];
  return (
    <div>
      {items.map(({ key, label, icon }) => {
        const active = switches[key];
        return (
          <div key={key} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"11px 16px", borderBottom:`1px solid ${T.border}`,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:"12px", color: active ? T.green : T.danger }}>
                {icon}
              </span>
              <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"11px",
                letterSpacing:"0.1em", color:active ? T.white : T.danger,
                textTransform:"uppercase" }}>
                {label}
              </span>
            </div>
            <motion.button
              whileTap={{ scale:0.9 }}
              onClick={() => onToggle(key)}
              style={{
                width:48, height:26, borderRadius:13,
                background: active ? T.green : "#1a1a1a",
                border: `1px solid ${active ? T.green : T.border}`,
                cursor:"pointer", position:"relative", transition:"background 0.2s",
              }}
            >
              <motion.div
                animate={{ x: active ? 22 : 2 }}
                transition={{ type:"spring", stiffness:500, damping:30 }}
                style={{ position:"absolute", top:2, width:20, height:20,
                  borderRadius:"50%", background:T.white }}
              />
            </motion.button>
          </div>
        );
      })}
      {/* DEV: onToggle calls POST /api/admin/safety-switch with { feature: key, enabled: !current } */}
    </div>
  );
}

// ── DENSITY MONITOR ───────────────────────────────────────────────────────────
function DensityBar({ label, heat, events, rightNow }) {
  return (
    <div style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"11px",
          color:T.white, letterSpacing:"0.08em" }}>
          {label}
        </span>
        <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
          {rightNow} live · {events} events
        </span>
      </div>
      <div style={{ height:4, background:T.border, borderRadius:2, overflow:"hidden" }}>
        <motion.div
          animate={{ width:`${heat}%` }}
          transition={{ duration:0.6 }}
          style={{ height:"100%", background:heat > 80 ? T.red : heat > 60 ? T.gold : T.green,
            borderRadius:2 }}
        />
      </div>
    </div>
  );
}

// ── INCENTIVE BEACONS ─────────────────────────────────────────────────────────
const INCENTIVES = [
  { id:"free_drink",  label:"FREE DRINK on check-in",    duration:"2h", cost:"£0 (venue absorbs)" },
  { id:"queue_skip",  label:"QUEUE SKIP on check-in",    duration:"1h", cost:"£0" },
  { id:"discount",    label:"20% BAR DISCOUNT",          duration:"30m", cost:"—" },
];

function IncentivePanel({ onActivate }) {
  const [active, setActive] = useState(null);
  return (
    <div>
      {INCENTIVES.map(inc => (
        <div key={inc.id} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"10px 16px", borderBottom:`1px solid ${T.border}`,
          background: active === inc.id ? `${T.gold}08` : "transparent",
        }}>
          <div>
            <p style={{ margin:0, fontSize:"11px", fontFamily:"'Oswald', sans-serif",
              color: active===inc.id ? T.gold : T.white, textTransform:"uppercase",
              letterSpacing:"0.05em" }}>{inc.label}</p>
            <p style={{ margin:"1px 0 0", fontSize:"9px", color:T.muted,
              fontFamily:"'Barlow', sans-serif" }}>{inc.duration} · {inc.cost}</p>
          </div>
          <ActionButton
            label={active===inc.id ? "ACTIVE" : "ACTIVATE"}
            small
            color={active===inc.id ? T.green : T.gold}
            onClick={() => { setActive(inc.id); onActivate?.(inc); }}
          />
        </div>
      ))}
      {/* DEV: onActivate calls supabase.from('beacons').insert({ type:'MARKET',
               beacon_category:'system', title: incentive text, intensity:1, ends_at:now+duration,
               metadata: { incentive_type: inc.id, redemption_count: 0 } }) */}
    </div>
  );
}

// ── ACTION LOG ────────────────────────────────────────────────────────────────
function ActionLog({ actions }) {
  return (
    <div>
      {actions.map((a, i) => (
        <div key={i} style={{
          display:"flex", gap:10, padding:"8px 16px",
          borderBottom:`1px solid ${T.border}`, opacity: 1 - i*0.15,
        }}>
          <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif",
            flexShrink:0, paddingTop:2 }}>{a.ts}</span>
          <span style={{ fontSize:"10px", color:T.white, fontFamily:"'Barlow', sans-serif",
            flex:1 }}>{a.action}</span>
          <span style={{ fontSize:"8px", color:T.gold, fontFamily:"'Barlow', sans-serif",
            flexShrink:0 }}>{a.by}</span>
        </div>
      ))}
    </div>
  );
}

// ── WHATSAPP BROADCAST ────────────────────────────────────────────────────────
function BroadcastPanel({ rsvpCount, onSend }) {
  const [msg, setMsg] = useState("");
  const presets = [
    "Dark room open — come through",
    "Queue short right now — good time to arrive",
    "Still going strong — don't leave yet",
    "Last hour. Make it count.",
  ];
  return (
    <div style={{ padding:"12px 16px" }}>
      <p style={{ margin:"0 0 8px", fontSize:"9px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>
        Sends to {rsvpCount} RSVPs via WhatsApp Business API
      </p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
        {presets.map(preset => (
          <button key={preset} onClick={() => setMsg(preset)} style={{
            background:T.card, border:`1px solid ${T.border}`,
            padding:"4px 8px", fontSize:"9px",
            fontFamily:"'Barlow', sans-serif", color:T.muted, cursor:"pointer",
            borderRadius:2, textAlign:"left",
          }}>
            {preset}
          </button>
        ))}
      </div>
      <textarea
        value={msg} onChange={e => setMsg(e.target.value)}
        placeholder="Custom message..."
        rows={2}
        style={{
          width:"100%", background:T.card, border:`1px solid ${T.border}`,
          padding:"8px 10px", color:T.white, fontFamily:"'Barlow', sans-serif",
          fontSize:"11px", outline:"none", resize:"none", marginBottom:6,
          boxSizing:"border-box",
        }}
      />
      <ActionButton
        label={msg ? `SEND TO ${rsvpCount} RSVPs` : "TYPE MESSAGE FIRST"}
        color={msg ? T.gold : T.muted}
        onClick={() => msg && onSend?.(msg)}
      />
      {/* DEV: onSend calls POST /api/whatsapp/broadcast with { event_id, message: msg }
               which sends to all users in event_rsvps via WhatsApp Business API */}
    </div>
  );
}

// ── FONT LOADER ───────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Barlow:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── ROOT PANEL ────────────────────────────────────────────────────────────────
export default function NightOperatorPanel() {
  const [state, setState] = useLiveState();
  const [activeSection, setActiveSection] = useState("event");
  const [actionLog, setActionLog] = useState(state.recentActions);

  const log = (action) => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
    setActionLog(prev => [{ ts, action, by:"operator" }, ...prev.slice(0,9)]);
  };

  const handleAdvanceMomentum = () => {
    const states = ["UPCOMING","STARTING","LIVE","PEAK","WINDING DOWN"];
    const idx = states.indexOf(state.activeEvent.momentum);
    if (idx < states.length - 1) {
      const next = states[idx + 1];
      setState(s => ({ ...s, activeEvent: { ...s.activeEvent, momentum: next } }));
      log(`Advanced ${state.activeEvent.title} → ${next}`);
    }
  };

  const handleKillSwitch = (key) => {
    setState(s => ({
      ...s, safetySwitch: { ...s.safetySwitch, [key]: !s.safetySwitch[key] }
    }));
    const newVal = !state.safetySwitch[key];
    log(`${newVal ? "Enabled" : "DISABLED"} ${key}`);
  };

  const handlePushBeacon = ({ title, type }) => {
    setState(s => ({
      ...s,
      beacons: [{ id: `b${Date.now()}`, title, type, intensity:1.0, momentum:"NEW", active:true }, ...s.beacons],
    }));
    log(`Pushed system beacon: ${title}`);
  };

  const sections = [
    { id:"event",     label:"EVENT"    },
    { id:"beacons",   label:"BEACONS"  },
    { id:"density",   label:"DENSITY"  },
    { id:"incentive", label:"PERKS"    },
    { id:"broadcast", label:"SEND"     },
    { id:"kill",      label:"SWITCHES" },
    { id:"log",       label:"LOG"      },
  ];

  return (
    <>
      <FontLoader />
      <div style={{
        background:T.black, color:T.white, minHeight:"100vh",
        maxWidth:480, margin:"0 auto", fontFamily:"'Barlow', sans-serif",
      }}>

        {/* Top bar */}
        <div style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(0,0,0,0.95)", backdropFilter:"blur(12px)",
          borderBottom:`1px solid ${T.border}`,
          padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <p style={{ margin:0, fontSize:"8px", letterSpacing:"0.3em",
              color:T.gold, fontFamily:"'Oswald', sans-serif" }}>
              OPERATOR PANEL
            </p>
            <p style={{ margin:0, fontSize:"13px", fontFamily:"'Oswald', sans-serif",
              color:T.white, letterSpacing:"0.05em", textTransform:"uppercase" }}>
              {state.activeEvent.title}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <PulseDot color={T.green} size={5} />
            <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
              LIVE
            </span>
          </div>
        </div>

        {/* Section nav */}
        <div style={{
          display:"flex", overflowX:"auto", gap:0,
          borderBottom:`1px solid ${T.border}`,
          background:T.dim,
          scrollbarWidth:"none",
          position:"sticky", top:57, zIndex:40,
        }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              flexShrink:0, padding:"10px 14px",
              background:"transparent", border:"none",
              borderBottom: activeSection===s.id ? `2px solid ${T.gold}` : "2px solid transparent",
              fontFamily:"'Oswald', sans-serif", fontSize:"9px",
              letterSpacing:"0.18em", color: activeSection===s.id ? T.gold : "#333",
              cursor:"pointer", textTransform:"uppercase",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeSection}
            initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:0.15 }}>

            {activeSection === "event" && (
              <>
                <SectionHeader
                  title="Event Momentum"
                  sub={`${state.activeEvent.venue} · ${state.activeEvent.startedMinsAgo}min ago`}
                />
                <MomentumControl
                  event={state.activeEvent}
                  onAdvance={handleAdvanceMomentum}
                  onForce={(state_) => {
                    setState(s => ({ ...s, activeEvent: { ...s.activeEvent, momentum: state_ } }));
                    log(`Forced ${state.activeEvent.title} → ${state_}`);
                  }}
                />
              </>
            )}

            {activeSection === "beacons" && (
              <>
                <SectionHeader title="System Beacons" sub="Push signals to redirect crowd flow" />
                <PushBeaconForm onPush={handlePushBeacon} />
                {state.beacons.map(b => (
                  <BeaconRow key={b.id} beacon={b}
                    onExpire={() => {
                      setState(s => ({...s, beacons: s.beacons.filter(x => x.id !== b.id)}));
                      log(`Expired beacon: ${b.title}`);
                    }}
                    onBoost={() => {
                      setState(s => ({...s, beacons: s.beacons.map(x => x.id===b.id ? {...x, intensity:1.0, momentum:"NEW"} : x)}));
                      log(`Boosted beacon: ${b.title}`);
                    }}
                  />
                ))}
              </>
            )}

            {activeSection === "density" && (
              <>
                <SectionHeader title="City Density" sub="Live from globe heat tiles" />
                {Object.entries(state.density).map(([city, d]) => (
                  <DensityBar key={city}
                    label={city.toUpperCase()} heat={d.heat} events={d.events} rightNow={d.rightNow}
                  />
                ))}
                <div style={{ padding:"14px 16px" }}>
                  <p style={{ margin:0, fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif",
                    lineHeight:1.5 }}>
                    Heat: globe tile intensity (0-100).<br/>
                    Right Now: active right_now_status count.<br/>
                    Events: active beacons kind="event".<br/>
                    Source: night_pulse_realtime view + right_now_status.
                  </p>
                </div>
              </>
            )}

            {activeSection === "incentive" && (
              <>
                <SectionHeader title="Incentive Beacons" sub="Attach rewards to check-ins" />
                <IncentivePanel onActivate={(inc) => log(`Activated incentive: ${inc.label}`)} />
              </>
            )}

            {activeSection === "broadcast" && (
              <>
                <SectionHeader title="WhatsApp Broadcast"
                  sub={`Send to ${state.activeEvent.rsvpCount} RSVPs for ${state.activeEvent.title}`} />
                <BroadcastPanel
                  rsvpCount={state.activeEvent.rsvpCount}
                  onSend={(msg) => log(`Broadcast sent: "${msg.substring(0,30)}..."`)}
                />
              </>
            )}

            {activeSection === "kill" && (
              <>
                <SectionHeader
                  title="Safety Switches"
                  sub="Platform-wide kill switches. Applied immediately."
                />
                <div style={{ padding:"10px 16px", background:`${T.danger}11`,
                  borderBottom:`1px solid ${T.danger}33` }}>
                  <p style={{ margin:0, fontSize:"9px", color:T.danger,
                    fontFamily:"'Barlow', sans-serif", lineHeight:1.5 }}>
                    Disabling any switch affects ALL users immediately.<br/>
                    Use only for safety incidents or maintenance.
                  </p>
                </div>
                <KillSwitches switches={state.safetySwitch} onToggle={handleKillSwitch} />
              </>
            )}

            {activeSection === "log" && (
              <>
                <SectionHeader title="Action Log" sub="Last 10 operator actions this session" />
                <ActionLog actions={actionLog} />
              </>
            )}

          </motion.div>
        </AnimatePresence>

        <div style={{ height:40 }} />
      </div>
    </>
  );
}
