import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS MUSIC & RECORDS — EDITORIAL LABEL UI ──────────────────────────────
// Two labels: SMASH DADDYS + RAW CONVICT RECORDS
// Music = identity + atmosphere. Not a streaming interface.
// DEV integration notes inline throughout.
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  black:   "#000",
  white:   "#fff",
  gold:    "#C8962C",
  convict: "#E8E0D0",   // off-white — RAW CONVICT cold aesthetic
  raw:     "#1a1a1a",
  dim:     "#0a0a0a",
  muted:   "rgba(255,255,255,0.3)",
  card:    "#0d0d0d",
};

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// DEV: Smash Daddys → smash_daddys_releases table
//      RAW CONVICT → raw_convict_releases table (build this table per doc)
const SD_RELEASES = [
  {
    id:"SD013", cat:"SD013", title:"NIGHT DRIVER", artist:"Smash Daddys",
    released:"Mar 2026", type:"single", tag:"LATEST", playing: false,
    linked_event: { title:"MESS @ Fabric", venue:"Fabric", soon:true },
    img:"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
  },
  {
    id:"SD011", cat:"SD011", title:"DISSOLVE", artist:"Smash Daddys ft. PAPA BEAR",
    released:"Jan 2026", type:"single", tag:null, playing:false,
    img:"https://images.unsplash.com/photo-1574236170880-fbe15c34b8e3?w=600&q=80",
  },
  {
    id:"SD-EP01", cat:"SD-EP01", title:"MESS EP", artist:"Smash Daddys",
    released:"Oct 2025", type:"ep", tag:"EP", playing:false,
    img:"https://images.unsplash.com/photo-1550586929-7e6f24e4aa0a?w=600&q=80",
  },
  {
    id:"SD009", cat:"SD009", title:"CIRCUIT BEAST", artist:"Smash Daddys",
    released:"Aug 2025", type:"single", tag:null, playing:false,
    img:"https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80",
  },
];

const RC_RELEASES = [
  {
    id:"RC001", cat:"RC001", title:"CONVICT FREQUENCY", artist:"DJ CHAINS",
    released:"Feb 2026", type:"single", exclusive:true,
    img:"https://images.unsplash.com/photo-1501386761578-eaa54b292158?w=600&q=80",
  },
  {
    id:"RC002", cat:"RC002", title:"UNDERGROUND TRANSMISSION", artist:"RAWMASTER",
    released:"Nov 2025", type:"ep", exclusive:false,
    img:"https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
  },
];

// ── FONT LOADER ────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&family=Barlow+Condensed:wght@300;400;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

// ── MINI WAVEFORM (playing state indicator) ───────────────────────────────────
function MiniWaveform({ playing, color = T.gold }) {
  return (
    <div style={{ display:"flex", gap:2, alignItems:"flex-end", height:14 }}>
      {[3,6,10,7,4].map((h, i) => (
        <motion.div
          key={i}
          animate={playing ? { height: [h, h + 5, h - 2, h + 8, h] } : { height: h }}
          transition={{ duration: 0.6 + i * 0.1, repeat: playing ? Infinity : 0, ease:"easeInOut" }}
          style={{ width:2, background:color, borderRadius:1 }}
        />
      ))}
    </div>
  );
}

// ── TRACK PLAYER INLINE ────────────────────────────────────────────────────────
// DEV: in production this wraps MusicPlayerContext or local TrackPlayer
//      Uses localAudioCoordinator.claimLocalAudio() on play
function InlinePlayer({ release, accentColor = T.gold }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    // DEV: if useGlobalContext: globalPlayer.play({ ...release, preview_url: release.audio_url })
    //      else: claimLocalAudio(audioRef) + audio.play()
    if (next) {
      intervalRef.current = setInterval(() => setProgress(p => Math.min(p + 0.5, 100)), 300);
    } else {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0" }}>
      <motion.button
        onClick={toggle}
        whileTap={{ scale:0.88 }}
        style={{
          width:36, height:36, borderRadius:"50%",
          background: playing ? accentColor : "transparent",
          border:`1px solid ${playing ? accentColor : "#333"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0,
        }}
      >
        {playing
          ? <MiniWaveform playing color={T.black} />
          : <span style={{ fontSize:12, color:"#fff", marginLeft:2 }}>▶</span>
        }
      </motion.button>
      <div style={{ flex:1 }}>
        <div style={{ height:2, background:"#1a1a1a", borderRadius:1, overflow:"hidden" }}>
          <motion.div
            animate={{ width:`${progress}%` }}
            transition={{ duration:0.3 }}
            style={{ height:"100%", background:accentColor, borderRadius:1 }}
          />
        </div>
      </div>
      {playing && (
        <MiniWaveform playing color={accentColor} />
      )}
    </div>
  );
}

// ── LABEL TABS ────────────────────────────────────────────────────────────────
function LabelTabs({ active, onChange }) {
  return (
    <div style={{ display:"flex", background:T.black, borderBottom:"1px solid #111" }}>
      {[
        { id:"sd", label:"SMASH DADDYS", color:T.gold },
        { id:"rc", label:"RAW CONVICT", color:T.convict },
      ].map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex:1, padding:"13px 8px",
          background:"transparent", border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"10px",
          letterSpacing:"0.18em", color: active===t.id ? t.color : "#333",
          borderBottom: active===t.id ? `2px solid ${t.color}` : "2px solid transparent",
          cursor:"pointer", transition:"all 0.2s",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── SMASH DADDYS ENGINE ────────────────────────────────────────────────────────
function SmashDaddysEngine({ onReleaseTap }) {
  const latest = SD_RELEASES[0];
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div>
      {/* Hero — latest release feature */}
      <div style={{ position:"relative", overflow:"hidden" }}>
        <img
          src={latest.img} alt={latest.title}
          style={{ width:"100%", height:360, objectFit:"cover",
            filter:"brightness(0.35) contrast(1.2) saturate(0.7)" }}
        />
        {/* Grain */}
        <div style={{ position:"absolute", inset:0, opacity:0.06,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)" }} />

        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 20px" }}>
          {/* Catalogue number */}
          <p style={{ margin:"0 0 2px", fontSize:"9px", letterSpacing:"0.3em",
            color:T.gold, fontFamily:"'Barlow Condensed', sans-serif" }}>
            {latest.cat} · {latest.type.toUpperCase()} · {latest.released}
          </p>
          <h2 style={{ margin:"0 0 2px", fontSize:"42px", lineHeight:0.95,
            fontFamily:"'Oswald', sans-serif", fontWeight:700, color:T.white,
            textTransform:"uppercase", letterSpacing:"-0.01em" }}>
            {latest.title}
          </h2>
          <p style={{ margin:"0 0 12px", fontSize:"12px", color:T.muted,
            fontFamily:"'Barlow', sans-serif" }}>
            {latest.artist}
          </p>

          {/* Inline player on hero */}
          <InlinePlayer release={latest} accentColor={T.gold} />

          {/* Event bridge — "playing tonight" */}
          {latest.linked_event?.soon && (
            <motion.div
              initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
              style={{
                marginTop:8, padding:"8px 12px",
                background:`${T.gold}11`, border:`1px solid ${T.gold}33`,
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}
            >
              <div>
                <p style={{ margin:0, fontSize:"8px", letterSpacing:"0.2em",
                  color:T.gold, fontFamily:"'Oswald', sans-serif" }}>PLAYING TONIGHT</p>
                <p style={{ margin:"1px 0 0", fontSize:"10px", color:T.muted,
                  fontFamily:"'Barlow', sans-serif" }}>
                  {latest.linked_event.title} · {latest.linked_event.venue}
                </p>
              </div>
              <button style={{
                background:"transparent", border:`1px solid ${T.gold}`,
                padding:"5px 10px", fontSize:"9px",
                fontFamily:"'Oswald', sans-serif", letterSpacing:"0.15em",
                color:T.gold, cursor:"pointer", textTransform:"uppercase",
              }}>
                SEE THE NIGHT
                {/* DEV: navigate to EventsMode filtered to this event */}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Catalogue grid */}
      <div style={{ padding:"2px 0" }}>
        {/* Section heading */}
        <div style={{ padding:"16px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
          <span style={{ fontSize:"9px", letterSpacing:"0.25em", color:T.muted,
            fontFamily:"'Barlow Condensed', sans-serif" }}>
            CATALOGUE
          </span>
          <span style={{ fontSize:"8px", color:"#333", fontFamily:"'Barlow', sans-serif" }}>
            SD001–SD015 + EP01
          </span>
        </div>

        {SD_RELEASES.map((rel, i) => (
          <motion.div
            key={rel.id}
            onClick={() => onReleaseTap?.(rel)}
            whileTap={{ scale:0.98 }}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.06 }}
            style={{
              display:"flex", gap:12, padding:"12px 16px",
              borderBottom:"1px solid #0d0d0d", cursor:"pointer",
              background: rel.tag === "LATEST" ? "#0d0d0d" : "transparent",
            }}
          >
            <div style={{ position:"relative", flexShrink:0 }}>
              <img src={rel.img} alt={rel.title}
                style={{ width:52, height:52, objectFit:"cover", filter:"brightness(0.8)" }} />
              {rel.playing && (
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <MiniWaveform playing color={T.gold} />
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                <span style={{ fontSize:"8px", color:T.gold,
                  fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.15em" }}>
                  {rel.cat}
                </span>
                {rel.tag && (
                  <span style={{ fontSize:"7px", background:`${T.gold}22`,
                    border:`1px solid ${T.gold}44`, padding:"0 4px",
                    color:T.gold, fontFamily:"'Oswald', sans-serif", letterSpacing:"0.1em" }}>
                    {rel.tag}
                  </span>
                )}
              </div>
              <p style={{ margin:"0 0 1px", fontSize:"14px", color:T.white,
                fontFamily:"'Oswald', sans-serif", textTransform:"uppercase",
                letterSpacing:"0.02em", overflow:"hidden", whiteSpace:"nowrap",
                textOverflow:"ellipsis" }}>
                {rel.title}
              </p>
              <p style={{ margin:0, fontSize:"10px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
                {rel.artist} · {rel.released}
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}>
              <button
                onClick={e => { e.stopPropagation(); }}
                style={{
                  background:"transparent", border:"1px solid #222",
                  width:28, height:28, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", color:T.muted, fontSize:10,
                }}>
                ▶
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Music → Market bridge */}
      <div style={{ margin:"2px 0", padding:"14px 16px", background:"#080808", borderTop:"1px solid #111" }}>
        <p style={{ margin:"0 0 8px", fontSize:"9px", letterSpacing:"0.2em",
          color:T.gold, fontFamily:"'Oswald', sans-serif" }}>
          FROM THE RECORD
        </p>
        <div style={{ display:"flex", gap:10, overflow:"auto" }}>
          {["Smash Daddys Tee · £35","HOTMESS Mesh · £25"].map(item => (
            <div key={item} style={{
              flexShrink:0, background:"#111", padding:"10px 12px",
              border:"1px solid #1a1a1a", minWidth:140,
            }}>
              <p style={{ margin:"0 0 4px", fontSize:"10px", color:T.white,
                fontFamily:"'Barlow Condensed', sans-serif" }}>{item.split("·")[0].trim()}</p>
              <p style={{ margin:"0 0 8px", fontSize:"9px", color:T.gold,
                fontFamily:"'Barlow', sans-serif" }}>{item.split("·")[1].trim()}</p>
              <button style={{
                background:"transparent", border:`1px solid ${T.gold}`,
                padding:"4px 10px", fontSize:"8px",
                fontFamily:"'Oswald', sans-serif", letterSpacing:"0.15em",
                color:T.gold, cursor:"pointer", textTransform:"uppercase",
              }}>
                take it
                {/* DEV: openSheet('product', { product, source: 'music' }) */}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Social signal note */}
      {/* DEV: This bar appears in GhostedMode when is_music_playing=true
               deriveContext() adds: "Listening · {current_track_title}"
               Controlled by profiles.music_visibility */}
      <div style={{ padding:"10px 16px", borderTop:"1px solid #0d0d0d",
        display:"flex", gap:8, alignItems:"center" }}>
        <MiniWaveform playing={false} color="#333" />
        <p style={{ margin:0, fontSize:"9px", color:"#333", fontFamily:"'Barlow', sans-serif" }}>
          Playing a track shows "Listening · track" on your Ghosted card when music_visibility is on
        </p>
      </div>
    </div>
  );
}

// ── RAW CONVICT ENGINE ────────────────────────────────────────────────────────
// Cold, stark, industrial. Different aesthetic from Smash Daddys.
// DEV: reads from raw_convict_releases table (to be built per spec)
function RawConvictEngine({ onReleaseTap }) {
  return (
    <div style={{ background:T.black }}>
      {/* Hero — convict aesthetic: cold, minimal, stark */}
      <div style={{
        padding:"32px 16px 24px",
        borderBottom:`1px solid ${T.convict}22`,
        position:"relative",
      }}>
        {/* Stark grid lines */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:`repeating-linear-gradient(90deg, ${T.convict}05 0px, ${T.convict}05 1px, transparent 1px, transparent 60px)`,
        }} />

        <p style={{ margin:"0 0 4px", fontSize:"9px", letterSpacing:"0.4em",
          color:T.convict, fontFamily:"'Barlow Condensed', sans-serif",
          opacity:0.5 }}>
          UNDERGROUND · LONDON
        </p>
        <h2 style={{ margin:"0 0 2px", fontSize:"48px", lineHeight:0.92,
          fontFamily:"'Oswald', sans-serif", fontWeight:300,
          color:T.convict, textTransform:"uppercase", letterSpacing:"0.04em" }}>
          RAW<br/>CONVICT<br/>RECORDS
        </h2>
        <p style={{ margin:"16px 0 0", fontSize:"10px", color:`${T.convict}55`,
          fontFamily:"'Barlow', sans-serif", letterSpacing:"0.08em" }}>
          {RC_RELEASES.length} releases · catalogue open
        </p>
      </div>

      {/* Releases */}
      {RC_RELEASES.map((rel, i) => (
        <motion.div
          key={rel.id}
          onClick={() => onReleaseTap?.(rel)}
          whileTap={{ scale:0.98 }}
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:i*0.1 }}
          style={{
            position:"relative", overflow:"hidden",
            borderBottom:`1px solid ${T.convict}11`, cursor:"pointer",
          }}
        >
          <div style={{ display:"flex", gap:0 }}>
            {/* Image strip — narrow, high contrast */}
            <img src={rel.img} alt={rel.title}
              style={{ width:90, height:110, objectFit:"cover",
                filter:"brightness(0.3) contrast(1.4) saturate(0)" }}
            />
            <div style={{ flex:1, padding:"14px 14px 14px 16px",
              display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:"8px", color:`${T.convict}55`,
                    fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.2em" }}>
                    {rel.cat}
                  </span>
                  {rel.exclusive && (
                    <span style={{ fontSize:"7px", background:"transparent",
                      border:`1px solid ${T.convict}33`, padding:"0 4px",
                      color:`${T.convict}55`, fontFamily:"'Barlow Condensed', sans-serif",
                      letterSpacing:"0.1em" }}>
                      MEMBERS
                    </span>
                  )}
                </div>
                <p style={{ margin:"0 0 2px", fontSize:"15px", lineHeight:1.1,
                  fontFamily:"'Barlow Condensed', sans-serif", fontWeight:600,
                  color:T.convict, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  {rel.title}
                </p>
                <p style={{ margin:0, fontSize:"10px", color:`${T.convict}44`,
                  fontFamily:"'Barlow', sans-serif" }}>
                  {rel.artist} · {rel.type.toUpperCase()}
                </p>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"9px", color:`${T.convict}33`,
                  fontFamily:"'Barlow', sans-serif" }}>{rel.released}</span>
                <button
                  onClick={e => e.stopPropagation()}
                  style={{
                    background:"transparent", border:`1px solid ${T.convict}33`,
                    padding:"4px 10px", fontSize:"8px",
                    fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:"0.2em",
                    color:`${T.convict}66`, cursor:"pointer", textTransform:"uppercase",
                  }}>
                  {rel.exclusive ? "UNLOCK" : "PLAY"}
                  {/* DEV: exclusive = check membership tier, if HOTMESS+ play, else open upgrade */}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* ConvictPlayer placeholder */}
      <div style={{ padding:"20px 16px", borderTop:`1px solid ${T.convict}11` }}>
        <p style={{ margin:"0 0 4px", fontSize:"8px", letterSpacing:"0.3em",
          color:`${T.convict}33`, fontFamily:"'Barlow Condensed', sans-serif" }}>
          CONVICT PLAYER
        </p>
        <p style={{ margin:0, fontSize:"11px", color:`${T.convict}22`,
          fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
          ConvictPlayer.jsx mounts here
          {/* DEV: <ConvictPlayer trackSource={...} useGlobalContext={true} /> */}
        </p>
      </div>
    </div>
  );
}

// ── RELEASE DETAIL SHEET ──────────────────────────────────────────────────────
function ReleaseSheet({ release, isRaw, onClose }) {
  if (!release) return null;
  const accent = isRaw ? T.convict : T.gold;
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:60 }}
    >
      <motion.div
        initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:28, stiffness:280 }}
        onClick={e => e.stopPropagation()}
        style={{
          position:"fixed", bottom:0, left:0, right:0,
          background:"#0a0a0a", borderTop:`1px solid #1a1a1a`,
          borderRadius:"18px 18px 0 0", padding:"20px 16px 48px",
          maxHeight:"80vh", overflowY:"auto",
        }}
      >
        <div style={{ width:36, height:3, background:"#222", borderRadius:2, margin:"0 auto 20px" }} />
        <img src={release.img} alt={release.title}
          style={{ width:"100%", height:200, objectFit:"cover",
            marginBottom:16, filter:"brightness(0.8)" }} />
        <p style={{ margin:"0 0 2px", fontSize:"9px", letterSpacing:"0.25em",
          color:accent, fontFamily:"'Barlow Condensed', sans-serif" }}>
          {release.cat} · {(release.type||"").toUpperCase()}
        </p>
        <h3 style={{ margin:"0 0 4px", fontSize:"28px",
          fontFamily:"'Oswald', sans-serif", fontWeight:isRaw?300:700,
          color:T.white, textTransform:"uppercase" }}>
          {release.title}
        </h3>
        <p style={{ margin:"0 0 16px", fontSize:"12px", color:T.muted,
          fontFamily:"'Barlow', sans-serif" }}>
          {release.artist} · {release.released}
        </p>
        <InlinePlayer release={release} accentColor={accent} />
        {release.linked_event?.soon && (
          <div style={{ marginTop:12, padding:"10px 12px",
            background:`${accent}11`, border:`1px solid ${accent}33` }}>
            <p style={{ margin:"0 0 2px", fontSize:"8px", letterSpacing:"0.2em",
              color:accent, fontFamily:"'Oswald', sans-serif" }}>HEAR IT LIVE</p>
            <p style={{ margin:0, fontSize:"11px", color:T.muted,
              fontFamily:"'Barlow', sans-serif" }}>
              {release.linked_event.title} at {release.linked_event.venue}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function HotmessMusic() {
  const [label, setLabel] = useState("sd");
  const [selectedRelease, setSelectedRelease] = useState(null);

  return (
    <>
      <FontLoader />
      <div style={{
        background:T.black, color:T.white, minHeight:"100vh",
        maxWidth:480, margin:"0 auto", fontFamily:"'Barlow', sans-serif",
      }}>
        {/* Top bar */}
        <div style={{
          position:"sticky", top:0, zIndex:40,
          background:"rgba(0,0,0,0.92)", backdropFilter:"blur(12px)",
          borderBottom:"1px solid #0d0d0d",
          padding:"14px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <span style={{ fontFamily:"'Oswald', sans-serif", fontSize:"14px",
            letterSpacing:"0.2em", color:T.white, textTransform:"uppercase" }}>
            MUSIC
          </span>
          <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif",
            letterSpacing:"0.1em" }}>
            {label === "sd" ? "SMASH DADDYS RECORDS" : "RAW CONVICT RECORDS"}
          </span>
        </div>

        {/* Label switcher — sticky */}
        <div style={{ position:"sticky", top:53, zIndex:39, background:T.black }}>
          <LabelTabs active={label} onChange={setLabel} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={label}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            transition={{ duration:0.2 }}>
            {label === "sd"
              ? <SmashDaddysEngine onReleaseTap={setSelectedRelease} />
              : <RawConvictEngine  onReleaseTap={r => setSelectedRelease({ ...r, _raw:true })} />
            }
          </motion.div>
        </AnimatePresence>

        {/* Release sheet */}
        <AnimatePresence>
          {selectedRelease && (
            <ReleaseSheet
              release={selectedRelease}
              isRaw={!!selectedRelease._raw}
              onClose={() => setSelectedRelease(null)}
            />
          )}
        </AnimatePresence>

        <div style={{ height:100 }} />
      </div>
    </>
  );
}
