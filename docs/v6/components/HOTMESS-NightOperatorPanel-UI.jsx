import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS NIGHT OPERATOR PANEL ──────────────────────────────────────────────
// Real-time control surface for venue operators and promoters during a night.
// Runs live: push signals, advance event states, redirect crowd flow,
// manage density, issue incentive beacons, kill switches.
//
// DEV integration notes inline throughout.
// Access: membership_tier IN ('PROMOTER','VENUE') OR admin role
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:  "#000",
  white:  "#fff",
  gold:   "#C8962C",
  orange: "#CF3A10",
  red:    "#FF3B30",
  green:  "#34C759",
  dim:    "#0a0a0a",
  card:   "#0d0d0d",
  border: "#1a1a1a",
  muted:  "rgba(255,255,255,0.3)",
  warn:   "#FF9500",
};

// ── MOCK LIVE STATE ────────────────────────────────────────────────────────────
// DEV: all from Supabase realtime subscriptions + polling
const useLiveState = () => {
  const [state, setState] = useState({
    eventName:    "MESS @ EAGLE",
    venue:        "Eagle London, Vauxhall",
    momentum:     "LIVE",
    clusterSize:  34,
    rsvpCount:    89,
    scanCount:    41,
    attendance:   "41 / 89",
    goTaps:       12,
    beaconsActive: 3,
    beaconLimit:  5,
    radioLive:    true,
    radioShow:    "HOTMESS Nights",
    dropLive:     false,
    systemBeaconActive: false,
    zones: [
      { id:"main",   label:"Main Floor",  signal:"busy",   intensity:0.9,  count:28 },
      { id:"dark",   label:"Dark Room",   signal:"active", intensity:0.7,  count:8  },
      { id:"bar",    label:"Bar",         signal:"quiet",  intensity:0.3,  count:4  },
      { id:"smoke",  label:"Smoking",     signal:"empty",  intensity:0.1,  count:1  },
    ],
    recentActivity: [
      { time:"23:41", type:"scan",    text:"41st ticket scanned" },
      { time:"23:38", type:"boo",     text:"3 mutual Boos in 5 min" },
      { time:"23:35", type:"peak",    text:"Cluster hit 30 — PEAK state" },
      { time:"23:29", type:"rsvp",    text:"12 new RSVPs" },
      { time:"23:22", type:"drop",    text:"Smash Daddys drop ended" },
    ],
  });

  // Simulate live cluster growth
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => ({ ...s, clusterSize: Math.min(s.clusterSize + Math.floor(Math.random()*2), 60) }));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return [state, setState];
};

// ── FONT LOADER ────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;1,300&family=Barlow+Condensed:wght@300;400;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── LIVE CLOCK ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"13px",
      color:T.muted, letterSpacing:"0.1em", fontVariantNumeric:"tabular-nums" }}>
      {time.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}
    </span>
  );
}

// ── PULSE DOT ─────────────────────────────────────────────────────────────────
function PulseDot({ color = T.gold, size = 6 }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:size, height:size }}>
      <motion.span
        animate={{ scale:[1,2,1], opacity:[0.6,0,0.6] }}
        transition={{ duration:1.8, repeat:Infinity }}
        style={{ position:"absolute", inset:0, borderRadius:"50%", background:color }}
      />
      <span style={{ width:size, height:size, borderRadius:"50%", background:color, position:"relative" }} />
    </span>
  );
}

// ── MOMENTUM BADGE ────────────────────────────────────────────────────────────
function MomentumBadge({ state }) {
  const cfg = {
    UPCOMING:     { color:T.muted,  label:"UPCOMING" },
    STARTING:     { color:T.warn,   label:"STARTING" },
    LIVE:         { color:T.gold,   label:"LIVE" },
    PEAK:         { color:T.red,    label:"PEAK" },
    "WINDING DOWN":{ color:T.muted, label:"WINDING DOWN" },
  }[state] || { color:T.muted, label:state };

  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"2px 8px", border:`1px solid ${cfg.color}44`,
      background:`${cfg.color}11`,
      fontFamily:"'Oswald', sans-serif", fontSize:"9px",
      letterSpacing:"0.2em", color:cfg.color,
    }}>
      <PulseDot color={cfg.color} size={5} />
      {cfg.label}
    </span>
  );
}

// ── INTENSITY BAR ─────────────────────────────────────────────────────────────
function IntensityBar({ value, color = T.gold, height = 4 }) {
  return (
    <div style={{ height, background:"#1a1a1a", flex:1, overflow:"hidden" }}>
      <motion.div
        animate={{ width:`${value * 100}%` }}
        transition={{ duration:0.8, ease:"easeOut" }}
        style={{ height:"100%", background:color }}
      />
    </div>
  );
}

// ── STAT TILE ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color = T.white, pulse = false }) {
  return (
    <div style={{
      background:T.card, border:`1px solid ${T.border}`,
      padding:"12px 14px", flex:1,
    }}>
      <p style={{ margin:"0 0 2px", fontSize:"8px", letterSpacing:"0.2em",
        color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
        {label}
      </p>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        {pulse && <PulseDot color={color} size={5} />}
        <span style={{ fontSize:"24px", fontFamily:"'Oswald', sans-serif",
          color, lineHeight:1, letterSpacing:"-0.01em" }}>
          {value}
        </span>
      </div>
      {sub && <p style={{ margin:"2px 0 0", fontSize:"9px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>{sub}</p>}
    </div>
  );
}

// ── ACTION BUTTON ─────────────────────────────────────────────────────────────
function ActionBtn({ label, sub, color = T.gold, danger = false, onClick, disabled = false }) {
  const [fired, setFired] = useState(false);
  const handleClick = () => {
    if (disabled || fired) return;
    if (danger) {
      if (!window.confirm(`Confirm: ${label}?`)) return;
    }
    setFired(true);
    onClick?.();
    setTimeout(() => setFired(false), 3000);
  };
  return (
    <motion.button
      onClick={handleClick}
      whileTap={!disabled ? { scale:0.95 } : {}}
      style={{
        width:"100%", padding:"10px 12px", textAlign:"left",
        background: fired ? `${color}18` : "transparent",
        border:`1px solid ${fired ? color : disabled ? "#1a1a1a" : "#2a2a2a"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition:"border 0.2s, background 0.2s",
      }}
    >
      <p style={{ margin:0, fontFamily:"'Oswald', sans-serif", fontSize:"11px",
        letterSpacing:"0.1em", color: fired ? color : danger ? T.red : T.white,
        textTransform:"uppercase" }}>
        {fired ? "✓ DONE" : label}
      </p>
      {sub && <p style={{ margin:"1px 0 0", fontSize:"9px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>{sub}</p>}
    </motion.button>
  );
}

// ── ZONE PANEL ────────────────────────────────────────────────────────────────
function ZonePanel({ zones, onZoneUpdate }) {
  const signalColor = { busy:"#CF3A10", active:T.gold, quiet:T.muted, empty:"#333" };
  return (
    <div>
      <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
        color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
        MICRO-ZONES
      </p>
      {zones.map(z => (
        <div key={z.id} style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"8px 0", borderBottom:`1px solid ${T.border}`,
        }}>
          <div style={{ width:8, height:8, borderRadius:"50%",
            background: signalColor[z.signal] || T.muted, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <span style={{ fontSize:"10px", color:T.white,
                fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.05em" }}>
                {z.label}
              </span>
              <span style={{ fontSize:"9px", color:T.muted,
                fontFamily:"'Barlow', sans-serif" }}>
                {z.count} here
              </span>
            </div>
            <IntensityBar value={z.intensity} color={signalColor[z.signal] || T.gold} height={3} />
          </div>
          {/* Quick signal update */}
          <select
            value={z.signal}
            onChange={e => onZoneUpdate(z.id, e.target.value)}
            style={{
              background:"#111", border:"1px solid #222",
              color:T.muted, fontSize:"8px", padding:"2px 4px",
              fontFamily:"'Barlow Condensed', sans-serif", cursor:"pointer",
            }}
          >
            {["busy","active","quiet","empty"].map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
function ActivityFeed({ items }) {
  const typeColor = { scan:T.green, boo:T.gold, peak:T.red, rsvp:T.gold, drop:T.orange };
  return (
    <div>
      <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
        color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
        ACTIVITY
      </p>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }}
          transition={{ delay:i*0.05 }}
          style={{ display:"flex", gap:8, padding:"5px 0",
            borderBottom:`1px solid ${T.border}`, alignItems:"center" }}
        >
          <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
            background: typeColor[item.type] || T.muted }} />
          <span style={{ flex:1, fontSize:"10px", color:T.muted,
            fontFamily:"'Barlow', sans-serif" }}>
            {item.text}
          </span>
          <span style={{ fontSize:"9px", color:"#333",
            fontFamily:"'Barlow', sans-serif", flexShrink:0 }}>
            {item.time}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── BEACON CONTROLS ───────────────────────────────────────────────────────────
// DEV: each action calls Supabase insert/update on beacons table
//      beacon_category="venue", owner_id=venue_id, status="active"
function BeaconControls({ beaconsActive, beaconLimit }) {
  const [dropped, setDropped] = useState([]);
  const canDrop = beaconsActive + dropped.length < beaconLimit;

  const dropBeacon = (type, label) => {
    if (!canDrop) return;
    setDropped(d => [...d, { type, label, time: new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) }]);
    // DEV: supabase.from('beacons').insert({
    //   beacon_category: "venue", type, title: label,
    //   owner_id: venueId, status: "active",
    //   ends_at: new Date(Date.now() + 4*3600000),
    //   intensity: 0.85
    // })
  };

  const expireBeacon = (i) => {
    setDropped(d => d.filter((_,idx) => idx !== i));
    // DEV: supabase.from('beacons').update({ status:"expired" }).eq('id', beaconId)
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <p style={{ margin:0, fontSize:"8px", letterSpacing:"0.25em",
          color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
          VENUE BEACONS
        </p>
        <span style={{ fontSize:"9px", color: canDrop ? T.gold : T.red,
          fontFamily:"'Barlow Condensed', sans-serif" }}>
          {beaconsActive + dropped.length} / {beaconLimit}
        </span>
      </div>

      {/* Active session beacons */}
      {dropped.map((b, i) => (
        <div key={i} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"6px 8px", background:"#111", marginBottom:4, border:`1px solid ${T.border}`,
        }}>
          <div>
            <span style={{ fontSize:"9px", color:T.gold, fontFamily:"'Oswald', sans-serif",
              letterSpacing:"0.1em" }}>{b.label.toUpperCase()}</span>
            <span style={{ fontSize:"8px", color:T.muted, marginLeft:8,
              fontFamily:"'Barlow', sans-serif" }}>{b.time}</span>
          </div>
          <button onClick={() => expireBeacon(i)} style={{
            background:"transparent", border:"1px solid #333",
            padding:"2px 6px", fontSize:"8px", color:T.muted, cursor:"pointer",
            fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.1em",
          }}>
            EXPIRE
          </button>
        </div>
      ))}

      {/* Quick drop buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
        {[
          ["Queue short","EVENT"], ["Dark room open","SOCIAL"],
          ["Bar open","MARKET"],   ["DJ set live","RADIO"],
        ].map(([label, type]) => (
          <button key={label} onClick={() => dropBeacon(type, label)}
            disabled={!canDrop}
            style={{
              padding:"7px 8px", background:"transparent",
              border:`1px solid ${canDrop ? "#2a2a2a" : "#111"}`,
              fontSize:"9px", color: canDrop ? T.white : "#333",
              fontFamily:"'Barlow Condensed', sans-serif",
              letterSpacing:"0.08em", cursor: canDrop ? "pointer" : "not-allowed",
              textAlign:"center",
            }}>
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MOMENTUM CONTROL ──────────────────────────────────────────────────────────
// DEV: writes to beacons table (kind="event") intensity + updates a metadata field
//      for momentum state
function MomentumControl({ current, onChange }) {
  const states = ["UPCOMING","STARTING","LIVE","PEAK","WINDING DOWN"];
  const currentIdx = states.indexOf(current);

  return (
    <div>
      <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
        color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
        EVENT MOMENTUM
      </p>
      <div style={{ display:"flex", gap:2 }}>
        {states.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          const color = s === "PEAK" ? T.red : s === "STARTING" ? T.warn : T.gold;
          return (
            <button key={s} onClick={() => onChange(s)}
              style={{
                flex:1, padding:"6px 2px", background:"transparent",
                border:`1px solid ${isCurrent ? color : "#1a1a1a"}`,
                cursor:"pointer",
                background: isCurrent ? `${color}18` : "transparent",
              }}>
              <p style={{ margin:0, fontSize:"7px", letterSpacing:"0.1em",
                fontFamily:"'Barlow Condensed', sans-serif", textTransform:"uppercase",
                color: isCurrent ? color : isPast ? "#333" : "#444",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", padding:"0 2px",
              }}>
                {s}
              </p>
            </button>
          );
        })}
      </div>
      <p style={{ margin:"6px 0 0", fontSize:"9px", color:T.muted,
        fontFamily:"'Barlow', sans-serif" }}>
        Advancing state increases globe beacon intensity
        {/* DEV: supabase.from('beacons').update({ intensity: momentumIntensity[state] }).eq('id', eventBeaconId) */}
      </p>
    </div>
  );
}

// ── KILL SWITCHES ─────────────────────────────────────────────────────────────
// DEV: writes to safety_switches table. Checked by API middleware.
function KillSwitches() {
  const [switches, setSwitches] = useState({
    beacons: false, messaging: false, ghosted: false,
  });
  const toggle = (key) => {
    const next = !switches[key];
    setSwitches(s => ({ ...s, [key]: next }));
    // DEV: supabase.from('safety_switches').upsert({ key, active: next, set_by: userId })
  };
  return (
    <div>
      <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
        color:T.red, fontFamily:"'Barlow Condensed', sans-serif" }}>
        KILL SWITCHES
      </p>
      {[
        { key:"ghosted",  label:"Ghosted Grid",  sub:"Hides all nearby users" },
        { key:"beacons",  label:"Beacon Drops",  sub:"Prevents new drops" },
        { key:"messaging",label:"New Messages",  sub:"Blocks new threads" },
      ].map(sw => (
        <div key={sw.key} style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 0", borderBottom:`1px solid ${T.border}`,
        }}>
          <div>
            <p style={{ margin:0, fontSize:"10px", color: switches[sw.key] ? T.red : T.white,
              fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.05em" }}>
              {sw.label}
            </p>
            <p style={{ margin:0, fontSize:"8px", color:T.muted,
              fontFamily:"'Barlow', sans-serif" }}>{sw.sub}</p>
          </div>
          <button onClick={() => toggle(sw.key)} style={{
            width:44, height:24, borderRadius:12,
            background: switches[sw.key] ? T.red : "#1a1a1a",
            border:`1px solid ${switches[sw.key] ? T.red : "#2a2a2a"}`,
            cursor:"pointer", position:"relative", transition:"all 0.2s",
          }}>
            <motion.div
              animate={{ x: switches[sw.key] ? 20 : 2 }}
              transition={{ type:"spring", stiffness:500, damping:30 }}
              style={{ position:"absolute", top:2, width:18, height:18,
                borderRadius:"50%", background:T.white }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── ROOT PANEL ─────────────────────────────────────────────────────────────────
export default function NightOperatorPanel() {
  const [liveState, setLiveState] = useLiveState();
  const [tab, setTab] = useState("live");

  const updateZone = (id, signal) => {
    setLiveState(s => ({
      ...s,
      zones: s.zones.map(z => z.id === id ? { ...z, signal } : z),
    }));
    // DEV: supabase.from('beacons').update({ title: signal }).eq('venue_id', venueId).eq('zone_id', id)
  };

  const advanceMomentum = (state) => {
    setLiveState(s => ({ ...s, momentum: state }));
    // DEV: see MomentumControl comment above
  };

  const pushSystemBeacon = () => {
    setLiveState(s => ({ ...s, systemBeaconActive: true }));
    // DEV: supabase.from('beacons').insert({
    //   beacon_category:"system", type:"SOCIAL", title:"Something's happening here",
    //   geo_lat: venue.lat, geo_lng: venue.lng, intensity:1.0,
    //   ends_at: new Date(Date.now() + 7200000), status:"active"
    // })
  };

  const tabs = [
    { id:"live",    label:"LIVE" },
    { id:"beacons", label:"SIGNALS" },
    { id:"zones",   label:"ZONES" },
    { id:"control", label:"CONTROL" },
  ];

  return (
    <>
      <FontLoader />
      <div style={{
        background:T.black, color:T.white, minHeight:"100vh",
        maxWidth:480, margin:"0 auto", fontFamily:"'Barlow', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding:"12px 16px",
          background:"rgba(0,0,0,0.95)", backdropFilter:"blur(12px)",
          borderBottom:`1px solid ${T.border}`,
          position:"sticky", top:0, zIndex:50,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <PulseDot color={T.red} size={6} />
              <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"11px",
                letterSpacing:"0.25em", color:T.white, textTransform:"uppercase" }}>
                OPERATOR
              </span>
            </div>
            <LiveClock />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ margin:0, fontSize:"14px", fontFamily:"'Oswald', sans-serif",
                color:T.white, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                {liveState.eventName}
              </p>
              <p style={{ margin:0, fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
                {liveState.venue}
              </p>
            </div>
            <MomentumBadge state={liveState.momentum} />
          </div>
        </div>

        {/* Tab strip */}
        <div style={{
          display:"flex", background:T.dim, borderBottom:`1px solid ${T.border}`,
          position:"sticky", top:69, zIndex:49,
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:"10px 0",
              background:"transparent", border:"none",
              fontFamily:"'Oswald', sans-serif", fontSize:"9px",
              letterSpacing:"0.18em", textTransform:"uppercase",
              color: tab === t.id ? T.gold : "#333",
              borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
              cursor:"pointer",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.15 }}>

            {/* ─── LIVE TAB ─── */}
            {tab === "live" && (
              <div style={{ padding:16 }}>
                {/* Stats row */}
                <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                  <StatTile label="IN ROOM"  value={liveState.scanCount}    color={T.green} pulse />
                  <StatTile label="RSVP"     value={liveState.rsvpCount}    color={T.gold} />
                  <StatTile label="CLUSTER"  value={liveState.clusterSize}
                    color={liveState.clusterSize > 30 ? T.red : T.gold} pulse={liveState.clusterSize > 30} />
                </div>
                <div style={{ display:"flex", gap:4, marginBottom:16 }}>
                  <StatTile label="GO TAPS"  value={liveState.goTaps}       color={T.white} />
                  <StatTile label="BEACONS"  value={`${liveState.beaconsActive}/${liveState.beaconLimit}`} color={T.gold} />
                  <StatTile label="RADIO"    value={liveState.radioLive ? "LIVE" : "OFF"}
                    color={liveState.radioLive ? T.green : T.muted} pulse={liveState.radioLive} />
                </div>

                {/* Momentum control */}
                <div style={{ marginBottom:16, padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <MomentumControl current={liveState.momentum} onChange={advanceMomentum} />
                </div>

                {/* System beacon push */}
                <div style={{ marginBottom:16, padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
                    color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    SYSTEM SIGNAL
                  </p>
                  <ActionBtn
                    label={liveState.systemBeaconActive ? "System beacon live" : "Push system beacon"}
                    sub={liveState.systemBeaconActive ? '"Something\'s happening here" — visible on Globe' : "Amplifies venue on Globe for 2 hours"}
                    color={liveState.systemBeaconActive ? T.green : T.gold}
                    disabled={liveState.systemBeaconActive}
                    onClick={pushSystemBeacon}
                  />
                </div>

                {/* Activity feed */}
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <ActivityFeed items={liveState.recentActivity} />
                </div>
              </div>
            )}

            {/* ─── SIGNALS TAB ─── */}
            {tab === "beacons" && (
              <div style={{ padding:16 }}>
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}`, marginBottom:4 }}>
                  <BeaconControls
                    beaconsActive={liveState.beaconsActive}
                    beaconLimit={liveState.beaconLimit}
                  />
                </div>
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
                    color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    INCENTIVE BEACON
                  </p>
                  <ActionBtn label="Drop: Free drink on check-in"
                    sub="Requires Tier 2+ · Redeemable at bar · Platform fee applies"
                    color={T.gold}
                    onClick={() => console.log("DEV: create incentive beacon with reward metadata")} />
                  <div style={{ height:4 }} />
                  <ActionBtn label="Drop: Queue skip active"
                    sub="Shows in Ghosted signal line · 30min duration"
                    color={T.gold}
                    onClick={() => console.log("DEV: create queue skip beacon")} />
                </div>
              </div>
            )}

            {/* ─── ZONES TAB ─── */}
            {tab === "zones" && (
              <div style={{ padding:16 }}>
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <ZonePanel zones={liveState.zones} onZoneUpdate={updateZone} />
                </div>
                <div style={{ marginTop:4, padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ margin:"0 0 4px", fontSize:"8px", letterSpacing:"0.25em",
                    color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    CROWD REDIRECT
                  </p>
                  <p style={{ margin:"0 0 10px", fontSize:"10px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
                    Drop a directional beacon to redirect crowd flow between zones
                  </p>
                  <ActionBtn label="Signal: Move to main floor"
                    sub="Drops system beacon near bar pointing to main" color={T.warn}
                    onClick={() => console.log("DEV: directional system beacon")} />
                  <div style={{ height:4 }} />
                  <ActionBtn label="Signal: Dark room is open"
                    sub="Notifies nearby Ghosted users · 45min signal" color={T.warn}
                    onClick={() => console.log("DEV: zone open signal")} />
                </div>
              </div>
            )}

            {/* ─── CONTROL TAB ─── */}
            {tab === "control" && (
              <div style={{ padding:16 }}>
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}`, marginBottom:4 }}>
                  <KillSwitches />
                </div>
                <div style={{ padding:14, background:T.card, border:`1px solid ${T.border}` }}>
                  <p style={{ margin:"0 0 8px", fontSize:"8px", letterSpacing:"0.25em",
                    color:T.muted, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    EMERGENCY ACTIONS
                  </p>
                  <ActionBtn label="SOS broadcast" danger
                    sub="Sends safety alert to all users in venue · Cannot be undone"
                    color={T.red}
                    onClick={() => console.log("DEV: safety broadcast to venue users")} />
                  <div style={{ height:4 }} />
                  <ActionBtn label="End event now" danger
                    sub="Sets event to WINDING DOWN · Clears all active beacons"
                    color={T.red}
                    onClick={() => advanceMomentum("WINDING DOWN")} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={{ height:40 }} />
      </div>
    </>
  );
}
