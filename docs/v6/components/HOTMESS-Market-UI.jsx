import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── HOTMESS MARKET EDITORIAL UI SYSTEM ───────────────────────────────────────
// Three-engine commerce shell: Shop / Drops / Preloved
// Editorial tone: magazine at 2am, not a checkout form
// Dev integration notes inline throughout
// ─────────────────────────────────────────────────────────────────────────────

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  black: "#000000",
  white: "#FFFFFF",
  shop:  "#C8962C",   // amber — HNH MESS
  drops: "#CF3A10",   // burnt orange — urgency
  pre:   "#9E7D47",   // dirty gold — preloved
  dim:   "#0A0A0A",
  muted: "rgba(255,255,255,0.35)",
  card:  "#111111",
};

// ── MICROCOPY POOLS ──────────────────────────────────────────────────────────
// Replace all standard CTA/status text with these
const COPY = {
  cta:    ["take it","last one","you'll regret it","gone soon","left behind","still warm","have it","it's yours"],
  status: ["WORN","DROP","TONIGHT","LAST ONE","JUST DROPPED","GONE SOON","TONIGHT ONLY","STILL HERE"],
  sold:   ["mark sold","it's gone","that's done"],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// In production: replace with Shopify/Supabase queries
const SHOP_ITEMS = [
  { id:1, title:"HNH MESS", subtitle:"large bottle", price:"£15", tag:"AFTERCARE", micro:"hold. use. need.", img:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80", accent: T.shop },
  { id:2, title:"HNH MESS", subtitle:"small bottle",  price:"£10", tag:"POCKET SIZE", micro:"for the night.", img:"https://images.unsplash.com/photo-1589782182703-2aaa69037b5b?w=600&q=80", accent: T.shop },
  { id:3, title:"HOTMESS", subtitle:"mesh tee",      price:"£35", tag:"LAST ONE", micro:"worn once on air.", img:"https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=600&q=80", accent: T.shop },
  { id:4, title:"RAW CONVICT", subtitle:"tote bag",  price:"£20", tag:"TONIGHT", micro:"limited run.", img:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80", accent: T.shop },
];

const DROP_ITEMS = [
  { id:1, title:"SMASH DADDYS", subtitle:"tour hoodie", price:"£65", tag:"TONIGHT ONLY", micro:"no restock.", img:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80", stock:4 },
  { id:2, title:"HOTMESS x RAW",subtitle:"collab tee",  price:"£45", tag:"LAST 6", micro:"gone at midnight.", img:"https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=600&q=80", stock:6 },
  { id:3, title:"MESS PACK",     subtitle:"bundle",      price:"£89", tag:"DROP", micro:"one night only.", img:"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80", stock:12 },
];

const PRELOVED_ITEMS = [
  { id:1, title:"mesh vest",      context:"worn to Eagle", micro:"too tight now.", price:"£25", dist:"0.4km", seller:"@masc_mess",    img:"https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600&q=80", selling: true },
  { id:2, title:"harness leather",context:"bought in Berlin", micro:"one festival.", price:"£60", dist:"1.2km", seller:"@brunoknight", img:"https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=600&q=80", selling: false },
  { id:3, title:"cargo trousers", context:"left at Fabric", micro:"still smells like smoke.", price:"£30", dist:"0.8km", seller:"@circuit_lad", img:"https://images.unsplash.com/photo-1624378441864-6eda7b766c00?w=600&q=80", selling: true },
  { id:4, title:"crop jacket",    context:"worn twice", micro:"bought for Berghain.", price:"£80", dist:"2km", seller:"@darkroom_dan", img:"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80", selling: false },
];

// ── COUNTDOWN HOOK ────────────────────────────────────────────────────────────
function useCountdown(hours = 2) {
  const [secs, setSecs] = useState(hours * 3600);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(secs/3600)).padStart(2,"0");
  const m = String(Math.floor((secs%3600)/60)).padStart(2,"0");
  const s = String(secs%60).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

// Engine tab strip
function EngineTabs({ active, onChange }) {
  const tabs = [
    { id:"shop",    label:"SHOP",     accent: T.shop  },
    { id:"drops",   label:"DROPS",    accent: T.drops },
    { id:"preloved",label:"PRELOVED", accent: T.pre   },
  ];
  return (
    <div style={{ display:"flex", gap:0, borderBottom:`1px solid #1a1a1a` }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex:1, padding:"12px 0", background:"transparent", border:"none",
          fontFamily:"'Oswald', sans-serif", fontSize:"11px", letterSpacing:"0.15em",
          color: active === t.id ? t.accent : T.muted,
          borderBottom: active === t.id ? `2px solid ${t.accent}` : "2px solid transparent",
          cursor:"pointer", transition:"all 0.2s",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Editorial tag overlay
function Tag({ text, accent }) {
  return (
    <div style={{
      position:"absolute", top:10, left:10, zIndex:2,
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)",
      border:`1px solid ${accent || T.muted}`,
      padding:"2px 8px", fontSize:"9px", fontFamily:"'Oswald', sans-serif",
      letterSpacing:"0.2em", color: accent || T.white, textTransform:"uppercase",
    }}>
      {text}
    </div>
  );
}

// Selling badge for Ghosted cross-integration
// DEV: render on GhostedCard when profile.active_listing_count > 0
function SellingBadge() {
  return (
    <span style={{
      background:"rgba(158,125,71,0.2)", border:`1px solid ${T.pre}`,
      padding:"1px 6px", fontSize:"8px", letterSpacing:"0.15em",
      fontFamily:"'Oswald', sans-serif", color:T.pre, textTransform:"uppercase",
    }}>SELLING</span>
  );
}

// Editorial card — used across all engines
// DEV: replace placeholder images with Shopify CDN or Supabase Storage URLs
function EditorialCard({ item, accentColor, onTap, size = "normal" }) {
  const [hovered, setHovered] = useState(false);
  const isLarge = size === "large";
  return (
    <motion.div
      onClick={() => onTap?.(item)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      style={{
        position:"relative", overflow:"hidden", cursor:"pointer",
        background: T.card,
        height: isLarge ? 380 : 240,
      }}
    >
      {/* Image */}
      <motion.img
        src={item.img} alt={item.title}
        animate={{ scale: hovered ? 1.04 : 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"brightness(0.75)" }}
      />

      {/* Context tag top-left */}
      <Tag text={item.tag || item.context || "WORN"} accent={accentColor} />

      {/* Bottom gradient overlay with editorial copy */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        padding:"16px 12px 12px",
      }}>
        {/* Micro-copy — the story */}
        {item.micro && (
          <p style={{
            margin:"0 0 2px", fontSize:"10px", letterSpacing:"0.05em",
            color: T.muted, fontFamily:"'Barlow', sans-serif", fontStyle:"italic",
          }}>
            {item.micro}
          </p>
        )}
        {/* Title */}
        <p style={{
          margin:"0 0 1px", fontSize: isLarge ? "18px" : "14px", lineHeight:1.1,
          fontFamily:"'Oswald', sans-serif", letterSpacing:"0.05em", color:T.white, textTransform:"uppercase",
        }}>
          {item.title}
        </p>
        {/* Subtitle */}
        {item.subtitle && (
          <p style={{ margin:"0 0 6px", fontSize:"10px", color:T.muted, fontFamily:"'Barlow', sans-serif", letterSpacing:"0.03em" }}>
            {item.subtitle}
          </p>
        )}
        {/* Price + distance row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"12px", color: accentColor || T.white, fontFamily:"'Oswald', sans-serif" }}>
            {item.price}
          </span>
          {item.dist && (
            <span style={{ fontSize:"9px", color:T.muted, fontFamily:"'Barlow', sans-serif", letterSpacing:"0.1em" }}>
              {item.dist}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Staggered editorial grid
// Row pattern: LARGE | SMALL+SMALL | SMALL+LARGE | repeat
function EditorialGrid({ items, accentColor, onTap }) {
  const rows = [];
  let i = 0;
  let rowIdx = 0;
  while (i < items.length) {
    const pattern = rowIdx % 3;
    if (pattern === 0) {
      // Full-width large
      rows.push(
        <div key={`row-${rowIdx}`} style={{ marginBottom:2 }}>
          <EditorialCard item={items[i]} accentColor={accentColor} onTap={onTap} size="large" />
        </div>
      );
      i += 1;
    } else if (pattern === 1) {
      // Two small side by side
      rows.push(
        <div key={`row-${rowIdx}`} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginBottom:2 }}>
          {items[i] && <EditorialCard item={items[i]} accentColor={accentColor} onTap={onTap} />}
          {items[i+1] && <EditorialCard item={items[i+1]} accentColor={accentColor} onTap={onTap} />}
        </div>
      );
      i += 2;
    } else {
      // Small + large
      rows.push(
        <div key={`row-${rowIdx}`} style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:2, marginBottom:2 }}>
          {items[i] && <EditorialCard item={items[i]} accentColor={accentColor} onTap={onTap} />}
          {items[i+1] && <EditorialCard item={items[i+1]} accentColor={accentColor} onTap={onTap} size="large" />}
        </div>
      );
      i += 2;
    }
    rowIdx++;
  }
  return <div>{rows}</div>;
}

// ── SHOP ENGINE ───────────────────────────────────────────────────────────────
function ShopEngine({ onTap }) {
  return (
    <div>
      {/* Hero story block — mandatory, no reuse */}
      <div style={{ position:"relative", height:340, overflow:"hidden" }}>
        <img
          src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80"
          alt="HNH MESS"
          style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.45) contrast(1.1) saturate(0.8)" }}
        />
        {/* Grain overlay */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
        }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 20px" }}>
          <p style={{ margin:"0 0 4px", fontSize:"10px", letterSpacing:"0.25em", color:T.shop, fontFamily:"'Oswald', sans-serif" }}>
            HNH MESS
          </p>
          <h2 style={{
            margin:"0 0 4px", fontSize:"34px", lineHeight:1, fontFamily:"'Oswald', sans-serif",
            fontWeight:700, letterSpacing:"0.02em", color:T.white, textTransform:"uppercase",
          }}>
            AFTERCARE<br/>ISN'T OPTIONAL
          </h2>
          <p style={{ margin:"0 0 16px", fontSize:"12px", color:T.muted, fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
            held. used. needed.
          </p>
          <button style={{
            background:T.shop, border:"none", padding:"10px 24px",
            fontFamily:"'Oswald', sans-serif", fontSize:"11px", letterSpacing:"0.2em",
            color:T.black, textTransform:"uppercase", cursor:"pointer",
          }}>
            SHOP HNH
          </button>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ padding:"2px" }}>
        <EditorialGrid items={SHOP_ITEMS} accentColor={T.shop} onTap={onTap} />
      </div>
    </div>
  );
}

// ── DROPS ENGINE ──────────────────────────────────────────────────────────────
function DropsEngine({ onTap }) {
  const countdown = useCountdown(2.3);
  const isLive = true; // DEV: derive from drop.starts_at < now < drop.ends_at

  return (
    <div style={{ background: isLive ? "#040404" : T.black }}>
      {/* Hero — event mode, no image needed */}
      <div style={{
        padding:"28px 16px 24px",
        borderBottom:`1px solid ${T.drops}22`,
        position:"relative", overflow:"hidden",
      }}>
        {/* Pulse background glow */}
        <motion.div
          animate={{ opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration:2.4, repeat:Infinity, ease:"easeInOut" }}
          style={{
            position:"absolute", inset:0, pointerEvents:"none",
            background:`radial-gradient(ellipse at 50% 100%, ${T.drops}55 0%, transparent 70%)`,
          }}
        />
        <p style={{
          margin:"0 0 2px", fontSize:"10px", letterSpacing:"0.3em",
          color:T.drops, fontFamily:"'Oswald', sans-serif",
          display:"flex", alignItems:"center", gap:6,
        }}>
          <motion.span
            animate={{ opacity:[1,0.2,1] }}
            transition={{ duration:1.2, repeat:Infinity }}
            style={{ width:5, height:5, borderRadius:"50%", background:T.drops, display:"inline-block" }}
          />
          DROP LIVE NOW
        </p>
        <h2 style={{
          margin:"0 0 2px", fontSize:"52px", lineHeight:0.95, fontFamily:"'Oswald', sans-serif",
          fontWeight:700, color:T.white, textTransform:"uppercase", letterSpacing:"-0.01em",
        }}>
          TONIGHT<br/>ONLY
        </h2>
        <p style={{ margin:"0 0 16px", fontSize:"11px", color:T.muted, fontFamily:"'Barlow', sans-serif", letterSpacing:"0.1em" }}>
          no restock
        </p>

        {/* Countdown */}
        <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
          <span style={{
            fontSize:"36px", fontFamily:"'Oswald', sans-serif", fontWeight:700,
            color:T.drops, letterSpacing:"0.05em", fontVariantNumeric:"tabular-nums",
          }}>
            {countdown}
          </span>
          <span style={{ fontSize:"10px", color:T.muted, letterSpacing:"0.2em", fontFamily:"'Barlow', sans-serif" }}>
            REMAINING
          </span>
        </div>

        <motion.button
          animate={{ boxShadow: [`0 0 0px ${T.drops}00`, `0 0 20px ${T.drops}88`, `0 0 0px ${T.drops}00`] }}
          transition={{ duration:1.6, repeat:Infinity, ease:"easeInOut" }}
          style={{
            marginTop:16, background:T.drops, border:"none", padding:"12px 32px",
            fontFamily:"'Oswald', sans-serif", fontSize:"12px", letterSpacing:"0.2em",
            color:T.white, textTransform:"uppercase", cursor:"pointer", width:"100%",
          }}
        >
          ENTER DROP
        </motion.button>
      </div>

      {/* Drop items — darker, higher contrast */}
      <div style={{ padding:"2px" }}>
        <EditorialGrid items={DROP_ITEMS} accentColor={T.drops} onTap={onTap} />
      </div>
    </div>
  );
}

// ── PRELOVED ENGINE ───────────────────────────────────────────────────────────
// DEV: all data from market_listings (Supabase). Approx location from snapToGrid()
function PrelovedEngine({ onTap }) {
  const [selectedListing, setSelectedListing] = useState(null);

  const handleTap = (item) => {
    setSelectedListing(item);
    onTap?.(item);
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ position:"relative", height:260, overflow:"hidden" }}>
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"
          alt="Preloved"
          style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.35) saturate(0.5)" }}
        />
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
        }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 20px" }}>
          <h2 style={{
            margin:"0 0 4px", fontSize:"28px", lineHeight:1.1, fontFamily:"'Oswald', sans-serif",
            fontWeight:700, color:T.white, textTransform:"uppercase", letterSpacing:"0.02em",
          }}>
            WORN. USED.<br/>STILL WORTH IT.
          </h2>
          <p style={{ margin:"0 0 14px", fontSize:"11px", color:T.muted, fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
            from last night. or the one before.
          </p>
          <button style={{
            background:"transparent", border:`1px solid ${T.pre}`,
            padding:"8px 20px", fontFamily:"'Oswald', sans-serif", fontSize:"10px",
            letterSpacing:"0.2em", color:T.pre, textTransform:"uppercase", cursor:"pointer",
          }}>
            BROWSE
          </button>
        </div>
      </div>

      {/* Preloved grid with editorial context */}
      <div style={{ padding:"2px" }}>
        <EditorialGrid
          items={PRELOVED_ITEMS.map(i => ({
            ...i,
            tag: i.selling ? "WORN" : "WORN",
            // DEV: context from market_listings.context_venue / context_city / context_use
          }))}
          accentColor={T.pre}
          onTap={handleTap}
        />
      </div>

      {/* Listing detail sheet — slides up */}
      {/* DEV: replace with L2ChatSheet or full sheet component */}
      <AnimatePresence>
        {selectedListing && (
          <>
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSelectedListing(null)}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:50 }}
            />
            <motion.div
              initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
              transition={{ type:"spring", damping:28, stiffness:280 }}
              style={{
                position:"fixed", bottom:0, left:0, right:0, zIndex:51,
                background:"#111", borderTop:`1px solid #1a1a1a`,
                borderRadius:"20px 20px 0 0", padding:"20px 16px 40px",
                maxHeight:"80vh", overflowY:"auto",
              }}
            >
              {/* Drag handle */}
              <div style={{ width:36, height:3, background:"#333", borderRadius:2, margin:"0 auto 20px" }} />

              <img
                src={selectedListing.img} alt={selectedListing.title}
                style={{ width:"100%", height:240, objectFit:"cover", marginBottom:16, filter:"brightness(0.85)" }}
              />

              <p style={{ margin:"0 0 2px", fontSize:"9px", letterSpacing:"0.2em", color:T.pre, fontFamily:"'Oswald', sans-serif" }}>
                PRELOVED
              </p>
              <h3 style={{
                margin:"0 0 4px", fontSize:"24px", fontFamily:"'Oswald', sans-serif",
                color:T.white, textTransform:"uppercase", letterSpacing:"0.03em",
              }}>
                {selectedListing.title}
              </h3>
              <p style={{ margin:"0 0 2px", fontSize:"11px", color:T.muted, fontFamily:"'Barlow', sans-serif", fontStyle:"italic" }}>
                {selectedListing.context}. {selectedListing.micro}
              </p>
              <div style={{ display:"flex", justifyContent:"space-between", margin:"12px 0", paddingBottom:12, borderBottom:"1px solid #1a1a1a" }}>
                <span style={{ fontSize:"20px", fontFamily:"'Oswald', sans-serif", color:T.pre }}>{selectedListing.price}</span>
                <span style={{ fontSize:"10px", color:T.muted, alignSelf:"flex-end", fontFamily:"'Barlow', sans-serif" }}>
                  {selectedListing.dist} · {selectedListing.seller}
                  {selectedListing.selling && <SellingBadge />}
                </span>
              </div>

              {/* Quick-action chips — DEV: these fire instantly (presence signals, not openers) */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                {["still available?","i'll take it","when can I collect?"].map(chip => (
                  <button key={chip} style={{
                    background:"transparent", border:`1px solid #2a2a2a`,
                    padding:"6px 12px", fontSize:"10px", fontFamily:"'Barlow', sans-serif",
                    color:T.muted, cursor:"pointer", borderRadius:2, letterSpacing:"0.02em",
                  }}>
                    {chip}
                  </button>
                ))}
              </div>

              {/* Primary CTA */}
              <button style={{
                width:"100%", padding:"14px",
                background:T.pre, border:"none",
                fontFamily:"'Oswald', sans-serif", fontSize:"12px",
                letterSpacing:"0.2em", color:T.black, textTransform:"uppercase", cursor:"pointer",
              }}>
                MESSAGE SELLER
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TOP BAR ───────────────────────────────────────────────────────────────────
function TopBar({ engine }) {
  const accent = engine === "shop" ? T.shop : engine === "drops" ? T.drops : T.pre;
  return (
    <div style={{
      position:"sticky", top:0, zIndex:40,
      background:"rgba(0,0,0,0.92)", backdropFilter:"blur(12px)",
      borderBottom:"1px solid #111",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 16px",
    }}>
      <span style={{
        fontFamily:"'Oswald', sans-serif", fontSize:"14px",
        letterSpacing:"0.2em", color:T.white, textTransform:"uppercase",
      }}>
        MARKET
      </span>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        {/* Bag icon + count */}
        <button style={{
          background:"transparent", border:"none", color:T.muted,
          cursor:"pointer", fontSize:"18px", lineHeight:1, position:"relative",
        }}>
          ◻
          <span style={{
            position:"absolute", top:-4, right:-4,
            width:14, height:14, borderRadius:"50%",
            background:accent, fontSize:"7px", color:T.black,
            fontFamily:"'Oswald', sans-serif", fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            2
          </span>
        </button>
        {/* Filter icon */}
        <button style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:"16px" }}>
          ≡
        </button>
      </div>
    </div>
  );
}

// ── FAB ───────────────────────────────────────────────────────────────────────
// DEV: opens listing creation sheet for Preloved
function SellFAB({ engine }) {
  if (engine !== "preloved") return null;
  return (
    <motion.button
      whileTap={{ scale:0.93 }}
      style={{
        position:"fixed", bottom:100, right:16, zIndex:30,
        width:48, height:48, borderRadius:"50%",
        background:T.pre, border:"none", cursor:"pointer",
        fontFamily:"'Oswald', sans-serif", fontSize:"22px", color:T.black,
        boxShadow:`0 4px 20px ${T.pre}66`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}
    >
      +
    </motion.button>
  );
}

// ── SEARCH BAR ────────────────────────────────────────────────────────────────
function SearchBar({ engine }) {
  const accent = engine === "shop" ? T.shop : engine === "drops" ? T.drops : T.pre;
  return (
    <div style={{ padding:"10px 16px", background:T.black }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        background:"#111", border:`1px solid #1a1a1a`,
        padding:"8px 12px",
      }}>
        <span style={{ fontSize:"12px", color:T.muted }}>⌕</span>
        <input
          placeholder={engine === "preloved" ? "search the scene..." : "search market..."}
          style={{
            flex:1, background:"transparent", border:"none", outline:"none",
            color:T.white, fontSize:"12px", fontFamily:"'Barlow', sans-serif",
            letterSpacing:"0.03em",
          }}
        />
      </div>
    </div>
  );
}

// ── FONT LOADER ────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

// ── ROOT COMPONENT ─────────────────────────────────────────────────────────────
export default function HotmessMarket() {
  const [engine, setEngine] = useState("shop");

  const handleItemTap = (item) => {
    // DEV: openSheet('product', { product: item, source: engine })
    // or openSheet('listing', { listingId: item.id }) for preloved
    console.log("[HOTMESS Market] Item tapped:", item.title, "| Engine:", engine);
  };

  const engineAccent = engine === "shop" ? T.shop : engine === "drops" ? T.drops : T.pre;

  return (
    <>
      <FontLoader />
      <div style={{
        background: T.black, color: T.white, minHeight:"100vh",
        fontFamily:"'Barlow', sans-serif", maxWidth:480, margin:"0 auto",
        position:"relative",
      }}>
        <TopBar engine={engine} />

        {/* Tab strip + search */}
        <div style={{ position:"sticky", top:53, zIndex:39, background:T.black }}>
          <EngineTabs active={engine} onChange={setEngine} />
          <SearchBar engine={engine} />
        </div>

        {/* Drops active indicator — red dot on tab */}
        {/* DEV: show when drop.starts_at < now < drop.ends_at */}

        {/* Engine content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={engine}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }}
            transition={{ duration:0.25, ease:"easeOut" }}
          >
            {engine === "shop"     && <ShopEngine onTap={handleItemTap} />}
            {engine === "drops"    && <DropsEngine onTap={handleItemTap} />}
            {engine === "preloved" && <PrelovedEngine onTap={handleItemTap} />}
          </motion.div>
        </AnimatePresence>

        {/* Ghosted → Market bridge demo */}
        {/* DEV: This card appears in GhostedMode, not here */}
        <div style={{
          margin:"2px", padding:"12px 14px",
          background:"#0d0d0d", borderTop:`1px solid #1a1a1a`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <p style={{ margin:0, fontSize:"9px", letterSpacing:"0.2em", color:engineAccent, fontFamily:"'Oswald', sans-serif" }}>
              GHOSTED → MARKET
            </p>
            <p style={{ margin:"2px 0 0", fontSize:"10px", color:T.muted, fontFamily:"'Barlow', sans-serif" }}>
              Tap "Selling" on a Ghosted card to see their listing
            </p>
          </div>
          <SellingBadge />
        </div>

        <SellFAB engine={engine} />

        {/* Bottom safe area spacer */}
        <div style={{ height:100 }} />
      </div>
    </>
  );
}
