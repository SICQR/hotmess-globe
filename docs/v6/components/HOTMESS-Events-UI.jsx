import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS EVENTS — LIVE MOMENTS ENGINE ─────────────────────────────────────
// Replaces passive Tonight/This Week/All tabs with NOW / SOON / LATER
// Primary action is GO (opens GhostedOverlay), not RSVP
// All DEV integration notes inline
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black: "#000",
  white: "#fff",
  gold:  "#C8962C",
  dim:   "#0a0a0a",
  card:  "#0d0d0d",
  muted: "rgba(255,255,255,0.35)",
  now:   "#C8962C",   // gold — live now
  soon:  "#CF3A10",   // orange — urgency
  later: "#4a4a4a",   // grey — future
  peak:  "#FF3B30",   // red — PEAK state
};

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// DEV: replace with Supabase query on beacons table where kind="event"
// Filter by tab: NOW = event_date < now AND ends_at > now
//               SOON = event_date between now and now+3h
//               LATER = event_date > now+3h
const now = new Date();
const mins = (n) => new Date(now.getTime() + n * 60000);

const EVENTS = {
  now: [
    {
      id: 1, title: "BOOTY BASS", venue: "Vauxhall Tavern",
      started: 22, rsvpCount: 47, liveSignal: "getting loud",
      momentum: "PEAK", intensity: 1.0,
      img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
      dist: "0.3km", tag: "STARTED 22 MIN AGO", hasScan: false,
    },
    {
      id: 2, title: "DARK ROOM", venue: "Eagle London",
      started: 45, rsvpCount: 28, liveSignal: "busy",
      momentum: "LIVE", intensity: 0.8,
      img: "https://images.unsplash.com/photo-1574236170880-fbe15c34b8e3?w=800&q=80",
      dist: "1.1km", tag: "LIVE NOW", hasScan: true,
    },
  ],
  soon: [
    {
      id: 3, title: "MESS @ FABRIC", venue: "Fabric, Farringdon",
      startsIn: 38, rsvpCount: 124, liveSignal: null,
      momentum: "STARTING", intensity: 0.65,
      img: "https://images.unsplash.com/photo-1550586929-7e6f24e4aa0a?w=800&q=80",
      dist: "2.4km", tag: "STARTS IN 38 MIN",
    },
    {
      id: 4, title: "CIRCUIT NIGHT", venue: "Heaven, Charing Cross",
      startsIn: 95, rsvpCount: 61, liveSignal: null,
      momentum: "UPCOMING", intensity: 0.55,
      img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
      dist: "3.2km", tag: "STARTS IN 1H 35M",
    },
  ],
  later: [
    {
      id: 5, title: "SMASH DADDYS LIVE", venue: "Moth Club",
      startsIn: 300, rsvpCount: 89, liveSignal: null,
      momentum: "UPCOMING", intensity: 0.4,
      img: "https://images.unsplash.com/photo-1501386761578-eaa54b292158?w=800&q=80",
      dist: "4.1km", tag: "SAT 11PM",
    },
  ],
};

// ── MOMENTUM COLOURS ──────────────────────────────────────────────────────────
const momentumColor = (state) => ({
  UPCOMING: T.muted,
  STARTING: T.soon,
  LIVE: T.gold,
  PEAK: T.peak,
  "WINDING DOWN": T.later,
})[state] || T.gold;

// ── LIVE PULSE DOT ────────────────────────────────────────────────────────────
function PulseDot({ color = T.gold, size = 6 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size }}>
      <motion.span
        animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: color, opacity: 0.4,
        }}
      />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, position: "relative" }} />
    </span>
  );
}

// ── TIMING TAG ────────────────────────────────────────────────────────────────
function TimingTag({ text, momentum }) {
  const color = momentumColor(momentum);
  return (
    <div style={{
      position: "absolute", top: 10, left: 10, zIndex: 2,
      display: "flex", alignItems: "center", gap: 5,
      background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
      border: `1px solid ${color}44`, padding: "3px 8px",
    }}>
      {(momentum === "LIVE" || momentum === "PEAK") && <PulseDot color={color} />}
      <span style={{
        fontSize: "9px", letterSpacing: "0.18em", color,
        fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
      }}>
        {text}
      </span>
    </div>
  );
}

// ── RSVP COUNT BADGE ─────────────────────────────────────────────────────────
function RSVPBadge({ count, momentum }) {
  return (
    <span style={{
      fontSize: "9px", color: T.muted,
      fontFamily: "'Barlow', sans-serif", letterSpacing: "0.08em",
    }}>
      {count} going
      {momentum === "PEAK" && (
        <span style={{ color: T.peak, marginLeft: 4 }}>· PEAK</span>
      )}
    </span>
  );
}

// ── INTENSITY BAR ─────────────────────────────────────────────────────────────
// Visually reflects globe beacon intensity for this event
function IntensityBar({ value, color }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 12 }}>
      {[0.25, 0.5, 0.75, 1.0].map((threshold, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 1,
          height: 5 + i * 2,
          background: value >= threshold ? color : "#222",
          transition: "background 0.4s",
        }} />
      ))}
    </div>
  );
}

// ── EVENT CARD (LIVE EDITORIAL) ───────────────────────────────────────────────
function EventCard({ event, isNow, onGo, onRsvp }) {
  const [rsvpd, setRsvpd] = useState(false);
  const [tapped, setTapped] = useState(false);
  const mc = momentumColor(event.momentum);

  const handleRsvp = (e) => {
    e.stopPropagation();
    setRsvpd(true);
    onRsvp?.(event);
    // DEV: supabase upsert to event_rsvps + emitPulse() + set profiles.rsvp_event_id
  };

  const handleGo = (e) => {
    e.stopPropagation();
    onGo?.(event);
    // DEV: setGhostedContext({ mode:"venue", venue_id, event_id, filter:"going_or_nearby" })
    //      then openGhostedOverlay()
  };

  return (
    <motion.div
      onClick={() => { setTapped(!tapped); onGo?.(event); }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: "relative", marginBottom: 2, overflow: "hidden",
        cursor: "pointer", background: T.card,
        border: event.momentum === "PEAK" ? `1px solid ${T.peak}33` : "1px solid transparent",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: isNow ? 300 : 220 }}>
        <img
          src={event.img} alt={event.title}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: `brightness(${event.momentum === "PEAK" ? 0.5 : 0.4}) contrast(1.1)`,
          }}
        />

        {/* PEAK pulse overlay */}
        {event.momentum === "PEAK" && (
          <motion.div
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: `radial-gradient(ellipse at 50% 50%, ${T.peak} 0%, transparent 70%)`,
            }}
          />
        )}

        <TimingTag text={event.tag} momentum={event.momentum} />

        {/* Bottom gradient + info */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
          padding: "20px 14px 14px",
        }}>
          {/* Live signal + intensity */}
          {event.liveSignal && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <IntensityBar value={event.intensity} color={mc} />
              <span style={{ fontSize: "10px", color: mc, fontFamily: "'Barlow', sans-serif", fontStyle: "italic" }}>
                {event.liveSignal}
              </span>
            </div>
          )}

          <h3 style={{
            margin: "0 0 2px", fontSize: isNow ? "28px" : "22px", lineHeight: 1,
            fontFamily: "'Oswald', sans-serif", color: T.white,
            textTransform: "uppercase", letterSpacing: "0.02em",
          }}>
            {event.title}
          </h3>
          <p style={{ margin: "0 0 8px", fontSize: "11px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
            {event.venue} · {event.dist}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <RSVPBadge count={event.rsvpCount} momentum={event.momentum} />
            <div style={{ display: "flex", gap: 6 }}>
              {/* RSVP button — secondary */}
              <motion.button
                onClick={handleRsvp}
                whileTap={{ scale: 0.93 }}
                style={{
                  padding: "7px 14px",
                  background: rsvpd ? `${T.gold}22` : "transparent",
                  border: `1px solid ${rsvpd ? T.gold : "#333"}`,
                  fontSize: "10px", fontFamily: "'Oswald', sans-serif",
                  letterSpacing: "0.15em", color: rsvpd ? T.gold : T.muted,
                  cursor: "pointer", textTransform: "uppercase",
                }}
              >
                {rsvpd ? "✓ RSVP" : "RSVP"}
              </motion.button>

              {/* GO button — primary for NOW/SOON */}
              {(isNow || event.momentum === "STARTING") && (
                <motion.button
                  onClick={handleGo}
                  whileTap={{ scale: 0.93 }}
                  animate={event.momentum === "PEAK" ? {
                    boxShadow: [`0 0 0px ${T.peak}00`, `0 0 16px ${T.peak}88`, `0 0 0px ${T.peak}00`],
                  } : {}}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{
                    padding: "7px 18px",
                    background: event.momentum === "PEAK" ? T.peak : T.gold,
                    border: "none",
                    fontSize: "10px", fontFamily: "'Oswald', sans-serif",
                    letterSpacing: "0.15em", color: T.black,
                    cursor: "pointer", textTransform: "uppercase", fontWeight: 700,
                  }}
                >
                  GO
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── TAB STRIP ─────────────────────────────────────────────────────────────────
function TabStrip({ active, onChange, counts }) {
  const tabs = [
    { id: "now",   label: "NOW",   color: T.gold },
    { id: "soon",  label: "SOON",  color: T.soon },
    { id: "later", label: "LATER", color: T.muted },
  ];
  return (
    <div style={{
      display: "flex", background: T.black,
      borderBottom: "1px solid #1a1a1a",
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: "13px 0",
            background: "transparent", border: "none",
            fontFamily: "'Oswald', sans-serif", fontSize: "11px",
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: active === t.id ? t.color : "#333",
            borderBottom: active === t.id ? `2px solid ${t.color}` : "2px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}
        >
          {t.id === "now" && counts.now > 0 && <PulseDot color={t.color} size={5} />}
          {t.label}
          {counts[t.id] > 0 && (
            <span style={{
              fontSize: "8px", background: active === t.id ? t.color : "#1a1a1a",
              color: active === t.id ? T.black : "#555",
              padding: "0 4px", borderRadius: 2,
              fontFamily: "'Barlow', sans-serif",
            }}>
              {counts[t.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyNow() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "32px", marginBottom: 8 }}>◌</p>
      <p style={{
        fontFamily: "'Oswald', sans-serif", fontSize: "18px",
        color: T.white, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px",
      }}>
        Nothing live right now.
      </p>
      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: "12px", color: T.muted, fontStyle: "italic" }}>
        Check SOON for what's starting.
      </p>
    </div>
  );
}

// ── GHOSTED OVERLAY PREVIEW ───────────────────────────────────────────────────
// DEV: replace with actual GhostedOverlay component
// setGhostedContext({ mode:"venue", venue_id, event_id }) before opening
function GhostedPreview({ event, onClose }) {
  if (!event) return null;
  // Mock people going to this event
  const peeps = ["@circuit_lad","@masc_mess","@brunoknight","@darkroom_dan"];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 60 }}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#0d0d0d", borderTop: `1px solid #1a1a1a`,
          borderRadius: "18px 18px 0 0", padding: "20px 16px 40px",
          maxHeight: "70vh", overflowY: "auto",
        }}
      >
        <div style={{ width: 36, height: 3, background: "#222", borderRadius: 2, margin: "0 auto 20px" }} />
        <p style={{ margin: "0 0 2px", fontSize: "9px", letterSpacing: "0.2em", color: T.gold, fontFamily: "'Oswald', sans-serif" }}>
          PEOPLE AT
        </p>
        <h3 style={{
          margin: "0 0 4px", fontSize: "22px", fontFamily: "'Oswald', sans-serif",
          color: T.white, textTransform: "uppercase",
        }}>
          {event.venue}
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "11px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
          {event.rsvpCount} going · {event.dist} away
        </p>
        {/* Mock profile grid — DEV: render actual GhostedCards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {peeps.map(p => (
            <div key={p} style={{
              background: "#111", padding: "12px 8px", textAlign: "center",
              border: "1px solid #1a1a1a",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "#222",
                margin: "0 auto 6px", border: `2px solid ${T.gold}44`,
              }} />
              <p style={{ margin: 0, fontSize: "9px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>{p}</p>
              <p style={{ margin: "2px 0 0", fontSize: "8px", color: T.gold, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.1em" }}>
                GOING
              </p>
            </div>
          ))}
        </div>
        <button style={{
          width: "100%", marginTop: 16, padding: "12px",
          background: T.gold, border: "none",
          fontFamily: "'Oswald', sans-serif", fontSize: "11px",
          letterSpacing: "0.2em", color: T.black, cursor: "pointer", textTransform: "uppercase",
        }}>
          OPEN GHOSTED HERE
        </button>
        {/* DEV: above button calls openGhostedOverlay() with event venue context */}
      </motion.div>
    </motion.div>
  );
}

// ── FONT LOADER ────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function HotmessEvents() {
  const [tab, setTab] = useState("now");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const counts = {
    now:   EVENTS.now.length,
    soon:  EVENTS.soon.length,
    later: EVENTS.later.length,
  };

  const events = EVENTS[tab] || [];

  const handleGo = (event) => {
    setSelectedEvent(event);
    // DEV: setGhostedContext({ mode:"venue", venue_id: event.venue_id, event_id: event.id })
    //      openGhostedOverlay()
  };

  const handleRsvp = (event) => {
    // DEV:
    // supabase.from('event_rsvps').upsert({ user_id, event_id: event.id })
    // emitPulse({ type:'event_rsvp', lat: event.lat, lng: event.lng })
    // supabase.from('profiles').update({ rsvp_event_id: event.id, rsvp_event_name: event.title })
    console.log("[HOTMESS Events] RSVP:", event.title);
  };

  return (
    <>
      <FontLoader />
      <div style={{
        background: T.black, color: T.white, minHeight: "100vh",
        maxWidth: 480, margin: "0 auto", fontFamily: "'Barlow', sans-serif",
        position: "relative",
      }}>

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #111",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 16px",
        }}>
          <span style={{
            fontFamily: "'Oswald', sans-serif", fontSize: "14px",
            letterSpacing: "0.2em", color: T.white, textTransform: "uppercase",
          }}>
            EVENTS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PulseDot color={T.gold} size={5} />
            <span style={{ fontSize: "10px", color: T.muted, fontFamily: "'Barlow', sans-serif" }}>
              {counts.now} live now
            </span>
          </div>
        </div>

        {/* Tab strip — sticky */}
        <div style={{ position: "sticky", top: 53, zIndex: 39, background: T.black }}>
          <TabStrip active={tab} onChange={setTab} counts={counts} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {events.length === 0 ? (
              <EmptyNow />
            ) : (
              <div style={{ padding: "2px" }}>
                {events.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isNow={tab === "now"}
                    onGo={handleGo}
                    onRsvp={handleRsvp}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* FAB — create event */}
        {/* DEV: opens event creation sheet (organiser only) */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          style={{
            position: "fixed", bottom: 100, right: 16, zIndex: 30,
            width: 48, height: 48, borderRadius: "50%",
            background: T.gold, border: "none", cursor: "pointer",
            fontFamily: "'Oswald', sans-serif", fontSize: "22px", color: T.black,
            boxShadow: `0 4px 20px ${T.gold}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          +
        </motion.button>

        {/* Ghosted bridge overlay */}
        <AnimatePresence>
          {selectedEvent && (
            <GhostedPreview event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          )}
        </AnimatePresence>

        <div style={{ height: 100 }} />
      </div>
    </>
  );
}
