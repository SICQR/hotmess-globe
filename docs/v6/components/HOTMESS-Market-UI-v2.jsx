/**
 * HOTMESS MARKET — Editorial UI System
 * Version: 2.0 | April 2026
 *
 * Three-engine commerce shell: Shop / Drops / Preloved
 * Design principle: editorial nightlife magazine, not a shop tab.
 *
 * INTEGRATION NOTES (search DEV: for all hook points):
 *   - Replace all MOCK_* constants with real data queries
 *   - Connect openSheet() from SheetContext
 *   - Fonts must be loaded at app level (not here)
 *   - SellingBadge lives in GhostedCard, not this file
 *
 * FONTS (add to global CSS or _document):
 *   @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Barlow:ital,wght@0,300;0,400;1,300;1,400&display=swap');
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Keep these in sync with src/styles/tokens.css or tailwind.config.js
export const MARKET_TOKENS = {
  bg:      "#000000",
  surface: "#111111",
  border:  "#1a1a1a",
  white:   "#FFFFFF",
  muted:   "rgba(255,255,255,0.35)",
  // Engine accents
  shop:    "#C8962C",  // amber — HNH MESS / Shop
  drops:   "#CF3A10",  // burnt orange — Drops / urgency
  pre:     "#9E7D47",  // dirty gold — Preloved
};

// ── MICROCOPY ─────────────────────────────────────────────────────────────────
// DEV: all copy is deterministic — driven by product/listing data.
// Never use random(). These are defaults shown when listing has no context.
export const MARKET_COPY = {
  // Context tags — set from product.tags or listing.condition
  tags: {
    worn:         "WORN",
    drop:         "TONIGHT ONLY",
    limited:      "LAST ONE",
    justDropped:  "JUST DROPPED",
    tonight:      "TONIGHT",
    goneSoon:     "GONE SOON",
  },
  // CTA labels — deterministic by stock/availability state
  cta: {
    buy:          "take it",
    lastUnit:     "last one",
    lowStock:     (n) => `last ${n}`,  // e.g. "last 4"
    expired:      "it's gone",
    preloved:     "message seller",
    sell:         "sell yours",
  },
  // Quick chip labels — sent as prefilled messages in L2ChatSheet
  // DEV: these call openSheet("chat", { prefill: label, userId: seller.id })
  chips: [
    "still available?",
    "i'll take it",
    "when can I collect?",
  ],
  // Engine heroes — fixed copy per engine, not data-driven
  heroes: {
    shop: {
      eyebrow:  "HNH MESS",
      heading:  ["AFTERCARE", "ISN\u2019T OPTIONAL"],
      sub:      "held. used. needed.",
      cta:      "SHOP HNH",
    },
    drops: {
      status:   "DROP LIVE NOW",
      heading:  ["TONIGHT", "ONLY"],
      sub:      "no restock",
      cta:      "ENTER DROP",
      unitLabel: "REMAINING",
    },
    preloved: {
      heading:  ["WORN. USED.", "STILL WORTH IT."],
      sub:      "from last night. or the one before.",
      cta:      "BROWSE",
    },
  },
};

// ── COUNTDOWN HOOK ────────────────────────────────────────────────────────────
// DEV: initialSeconds derived from drop.ends_at — new Date(drop.ends_at) - Date.now()
function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(Math.max(0, initialSeconds));
  const ref = useRef(initialSeconds);

  useEffect(() => {
    ref.current = Math.max(0, initialSeconds);
    setSecs(ref.current);
    const id = setInterval(() => {
      ref.current = Math.max(0, ref.current - 1);
      setSecs(ref.current);
    }, 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);

  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

// Engine tab strip
// DEV: activeEngine from URL param (useSearchParams) so deep links work
function EngineTabs({ active, onChange }) {
  const tabs = [
    { id: "shop",     label: "SHOP",     accent: MARKET_TOKENS.shop  },
    { id: "drops",    label: "DROPS",    accent: MARKET_TOKENS.drops },
    { id: "preloved", label: "PRELOVED", accent: MARKET_TOKENS.pre   },
  ];
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${MARKET_TOKENS.border}` }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: "12px 0",
            background: "transparent", border: "none",
            fontFamily: "'Oswald', sans-serif",
            fontSize: "11px", letterSpacing: "0.15em",
            color: active === t.id ? t.accent : MARKET_TOKENS.muted,
            borderBottom: active === t.id
              ? `2px solid ${t.accent}`
              : "2px solid transparent",
            cursor: "pointer", transition: "color 0.2s, border-color 0.2s",
            textTransform: "uppercase",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Context tag — overlaid top-left on card image
// DEV: text comes from product.tags[0] or listing.condition via MARKET_COPY.tags
function ContextTag({ text, accent }) {
  return (
    <div
      style={{
        position: "absolute", top: 10, left: 10, zIndex: 2,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
        border: `1px solid ${accent || MARKET_TOKENS.muted}`,
        padding: "2px 8px",
        fontSize: "9px", fontFamily: "'Oswald', sans-serif",
        letterSpacing: "0.2em", color: accent || MARKET_TOKENS.white,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
}

// ── EDITORIAL CARD ────────────────────────────────────────────────────────────
// Core card component used across all three engines.
//
// DEV integration:
//   item = {
//     id:       string,            // product.id or listing.id
//     title:    string,            // product.title or listing.title
//     subtitle: string | null,     // product variant name or listing condition
//     price:    string,            // formatted: "£15"
//     tag:      string,            // from MARKET_COPY.tags
//     micro:    string | null,     // context copy: "Left at Eagle" / "worn once"
//     img:      string,            // Shopify CDN URL or Supabase Storage URL
//     dist:     string | null,     // preloved only: "0.4km" (from snapToGrid distance)
//   }
//   accent:  string  — engine accent colour
//   onTap:   (item) => void — opens product/listing sheet
//   size:    "normal" | "large"
export function EditorialCard({ item, accent, onTap, size = "normal" }) {
  const isLarge = size === "large";
  return (
    <motion.div
      onClick={() => onTap?.(item)}
      whileTap={{ scale: 0.97 }}
      style={{
        position: "relative", overflow: "hidden", cursor: "pointer",
        background: MARKET_TOKENS.surface,
        height: isLarge ? 380 : 240,
      }}
    >
      {/* Product/listing image */}
      {/* DEV: img from Shopify CDN (product.images[0].url) or Supabase Storage */}
      <motion.img
        src={item.img}
        alt={item.title}
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
          filter: "brightness(0.72)",
        }}
      />

      {/* Context tag — top-left */}
      {item.tag && <ContextTag text={item.tag} accent={accent} />}

      {/* Bottom gradient + editorial copy */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          padding: "16px 12px 12px",
        }}
      >
        {/* Micro-copy — the story. Context before commerce. */}
        {item.micro && (
          <p style={{
            margin: "0 0 3px",
            fontSize: "10px", fontFamily: "'Barlow', sans-serif",
            fontStyle: "italic", color: MARKET_TOKENS.muted, letterSpacing: "0.02em",
          }}>
            {item.micro}
          </p>
        )}

        {/* Title */}
        <p style={{
          margin: "0 0 1px",
          fontSize: isLarge ? "18px" : "14px", lineHeight: 1.1,
          fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em",
          color: MARKET_TOKENS.white, textTransform: "uppercase",
        }}>
          {item.title}
        </p>

        {/* Subtitle */}
        {item.subtitle && (
          <p style={{
            margin: "0 0 6px",
            fontSize: "10px", fontFamily: "'Barlow', sans-serif",
            color: MARKET_TOKENS.muted, letterSpacing: "0.02em",
          }}>
            {item.subtitle}
          </p>
        )}

        {/* Price + distance */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Price intentionally small — never the dominant element */}
          <span style={{
            fontSize: "12px", fontFamily: "'Oswald', sans-serif",
            color: accent,
          }}>
            {item.price}
          </span>
          {item.dist && (
            <span style={{
              fontSize: "9px", fontFamily: "'Barlow', sans-serif",
              color: MARKET_TOKENS.muted, letterSpacing: "0.1em",
            }}>
              {item.dist}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── STAGGERED EDITORIAL GRID ──────────────────────────────────────────────────
// Row pattern (repeating): LARGE | SMALL+SMALL | SMALL+LARGE
// DEV: items array from Shopify/Supabase query, already sorted/filtered
function EditorialGrid({ items, accent, onTap }) {
  const rows = [];
  let i = 0;
  let rowIdx = 0;
  while (i < items.length) {
    const pattern = rowIdx % 3;
    if (pattern === 0) {
      rows.push(
        <div key={`r${rowIdx}`} style={{ marginBottom: 2 }}>
          {items[i] && <EditorialCard item={items[i]} accent={accent} onTap={onTap} size="large" />}
        </div>
      );
      i += 1;
    } else if (pattern === 1) {
      rows.push(
        <div key={`r${rowIdx}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 2 }}>
          {items[i]   && <EditorialCard item={items[i]}   accent={accent} onTap={onTap} />}
          {items[i+1] && <EditorialCard item={items[i+1]} accent={accent} onTap={onTap} />}
        </div>
      );
      i += 2;
    } else {
      rows.push(
        <div key={`r${rowIdx}`} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 2, marginBottom: 2 }}>
          {items[i]   && <EditorialCard item={items[i]}   accent={accent} onTap={onTap} />}
          {items[i+1] && <EditorialCard item={items[i+1]} accent={accent} onTap={onTap} size="large" />}
        </div>
      );
      i += 2;
    }
    rowIdx++;
  }
  return <div>{rows}</div>;
}

// ── SHOP ENGINE ───────────────────────────────────────────────────────────────
// DEV: items from /api/shopify/products
// DEV: onTap -> openSheet("product", { product, source: "shopify" })
export function ShopEngine({ items = [], onTap }) {
  const c = MARKET_COPY.heroes.shop;
  const T = MARKET_TOKENS;

  return (
    <div>
      {/* Hero story block — not a banner, a statement */}
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        {/* DEV: heroImage from Shopify collection.image or CMS asset */}
        <img
          src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80"
          alt="HNH MESS"
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "brightness(0.42) contrast(1.1) saturate(0.75)",
          }}
        />
        {/* Gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.15) 70%, transparent 100%)",
        }} />
        {/* Copy */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 22px" }}>
          <p style={{
            margin: "0 0 5px", fontSize: "10px", letterSpacing: "0.25em",
            color: T.shop, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
          }}>
            {c.eyebrow}
          </p>
          <h2 style={{
            margin: "0 0 5px",
            fontSize: "36px", lineHeight: 1, letterSpacing: "0.02em",
            fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            color: T.white, textTransform: "uppercase",
          }}>
            {c.heading[0]}<br />{c.heading[1]}
          </h2>
          <p style={{
            margin: "0 0 18px",
            fontSize: "12px", fontFamily: "'Barlow', sans-serif",
            fontStyle: "italic", color: T.muted,
          }}>
            {c.sub}
          </p>
          <button
            onClick={() => onTap?.({ type: "hero", engine: "shop" })}
            style={{
              background: T.shop, border: "none",
              padding: "10px 24px", cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", fontSize: "11px",
              letterSpacing: "0.2em", color: "#000", textTransform: "uppercase",
            }}
          >
            {c.cta}
          </button>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ padding: "2px" }}>
        <EditorialGrid items={items} accent={T.shop} onTap={onTap} />
      </div>
    </div>
  );
}

// ── DROPS ENGINE ──────────────────────────────────────────────────────────────
// DEV: items from /api/shopify/products?tag=drop + internal drops
// DEV: isLive from drop.starts_at < Date.now() < drop.ends_at
// DEV: endsAt = new Date(drop.ends_at).getTime() — passed as prop
// DEV: onTap -> openSheet("product", { product, source: "drops" })
export function DropsEngine({ items = [], endsAt = 0, isLive = false, onTap }) {
  const remainingSeconds = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  const countdown = useCountdown(remainingSeconds);
  const c = MARKET_COPY.heroes.drops;
  const T = MARKET_TOKENS;

  return (
    <div style={{ background: isLive ? "#040404" : T.bg }}>
      {/* Hero — event mode. No product image. Pure type + countdown. */}
      <div style={{
        padding: "28px 16px 24px",
        borderBottom: `1px solid ${T.drops}22`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Ambient glow — signals urgency without screaming */}
        <motion.div
          animate={{ opacity: [0.07, 0.16, 0.07] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 100%, ${T.drops}55 0%, transparent 70%)`,
          }}
        />

        {/* Live status */}
        <p style={{
          margin: "0 0 4px", fontSize: "10px", letterSpacing: "0.3em",
          color: T.drops, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <motion.span
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: T.drops, display: "inline-block", flexShrink: 0,
            }}
          />
          {c.status}
        </p>

        {/* Heading */}
        <h2 style={{
          margin: "0 0 4px",
          fontSize: "52px", lineHeight: 0.94, letterSpacing: "-0.01em",
          fontFamily: "'Oswald', sans-serif", fontWeight: 700,
          color: T.white, textTransform: "uppercase",
        }}>
          {c.heading[0]}<br />{c.heading[1]}
        </h2>

        <p style={{
          margin: "0 0 18px",
          fontSize: "11px", fontFamily: "'Barlow', sans-serif",
          color: T.muted, letterSpacing: "0.1em",
        }}>
          {c.sub}
        </p>

        {/* Countdown — deterministic from drop.ends_at */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 18 }}>
          <span style={{
            fontSize: "38px", fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            color: T.drops, letterSpacing: "0.05em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {countdown}
          </span>
          <span style={{
            fontSize: "9px", fontFamily: "'Barlow', sans-serif",
            color: T.muted, letterSpacing: "0.25em", textTransform: "uppercase",
          }}>
            {c.unitLabel}
          </span>
        </div>

        {/* Pulsing CTA */}
        <motion.button
          onClick={() => onTap?.({ type: "hero", engine: "drops" })}
          animate={{
            boxShadow: [
              `0 0 0px ${T.drops}00`,
              `0 0 22px ${T.drops}88`,
              `0 0 0px ${T.drops}00`,
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "100%", padding: "13px",
            background: T.drops, border: "none", cursor: "pointer",
            fontFamily: "'Oswald', sans-serif", fontSize: "12px",
            letterSpacing: "0.2em", color: T.white, textTransform: "uppercase",
          }}
        >
          {c.cta}
        </motion.button>
      </div>

      {/* Drop items grid */}
      <div style={{ padding: "2px" }}>
        <EditorialGrid items={items} accent={T.drops} onTap={onTap} />
      </div>
    </div>
  );
}

// ── PRELOVED DETAIL SHEET ─────────────────────────────────────────────────────
// DEV: in production this is rendered by L2Sheet, not inline.
// This component is a spec reference for L2SheetContent type="listing".
// DEV: chips call openSheet("chat", { prefill: chip, userId: listing.seller_id })
function PrelovedDetailSheet({ listing, onClose, onChipTap, onMessageSeller }) {
  const T = MARKET_TOKENS;
  if (!listing) return null;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50 }}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 51,
          background: "#111", borderTop: `1px solid ${T.border}`,
          borderRadius: "20px 20px 0 0",
          padding: "16px 16px 40px",
          maxHeight: "82vh", overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 3, background: "#2a2a2a",
          borderRadius: 2, margin: "0 auto 20px",
        }} />

        {/* Listing image */}
        {listing.img && (
          <img
            src={listing.img}
            alt={listing.title}
            style={{
              width: "100%", height: 240, objectFit: "cover",
              marginBottom: 16, filter: "brightness(0.82)",
            }}
          />
        )}

        {/* Engine label */}
        <p style={{
          margin: "0 0 3px", fontSize: "9px", letterSpacing: "0.22em",
          color: T.pre, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
        }}>
          PRELOVED
        </p>

        {/* Title */}
        <h3 style={{
          margin: "0 0 5px",
          fontSize: "26px", fontFamily: "'Oswald', sans-serif", fontWeight: 600,
          color: T.white, textTransform: "uppercase", letterSpacing: "0.03em",
        }}>
          {listing.title}
        </h3>

        {/* Context copy — the story */}
        <p style={{
          margin: "0 0 14px",
          fontSize: "12px", fontFamily: "'Barlow', sans-serif",
          fontStyle: "italic", color: T.muted, lineHeight: 1.5,
        }}>
          {[listing.context, listing.micro].filter(Boolean).join(". ")}
          {listing.context_nights_ago && ` · ${listing.context_nights_ago} nights ago`}
        </p>

        {/* Price row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{
            fontSize: "22px", fontFamily: "'Oswald', sans-serif", color: T.pre,
          }}>
            {listing.price}
          </span>
          <span style={{
            fontSize: "10px", fontFamily: "'Barlow', sans-serif",
            color: T.muted, letterSpacing: "0.05em",
          }}>
            {listing.dist && `${listing.dist} · `}{listing.seller}
          </span>
        </div>

        {/* Quick-action chips */}
        {/* DEV: onChipTap(chip) -> openSheet("chat", { prefill: chip, userId: listing.seller_id }) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {MARKET_COPY.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipTap?.(chip)}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                padding: "6px 12px", cursor: "pointer",
                fontSize: "10px", fontFamily: "'Barlow', sans-serif",
                color: T.muted, borderRadius: 2, letterSpacing: "0.02em",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Primary CTA */}
        {/* DEV: openSheet("chat", { userId: listing.seller_id }) */}
        <button
          onClick={() => onMessageSeller?.(listing)}
          style={{
            width: "100%", padding: "14px",
            background: T.pre, border: "none", cursor: "pointer",
            fontFamily: "'Oswald', sans-serif", fontSize: "12px",
            letterSpacing: "0.2em", color: "#000", textTransform: "uppercase",
          }}
        >
          {MARKET_COPY.cta.preloved}
        </button>
      </motion.div>
    </>
  );
}

// ── PRELOVED ENGINE ───────────────────────────────────────────────────────────
// DEV: items from market_listings (Supabase), status="active"
// DEV: item.micro populated from listing.context_use (free text field, max 30 chars)
// DEV: item.dist from snapToGrid() distance comparison (approximate, never exact)
// DEV: onTap -> setSelectedListing(item) for inline sheet, OR openSheet("listing", ...)
export function PrelovedEngine({ items = [], onTap, onChipTap, onMessageSeller }) {
  const [selected, setSelected] = useState(null);
  const c = MARKET_COPY.heroes.preloved;
  const T = MARKET_TOKENS;

  const handleTap = (item) => {
    setSelected(item);
    onTap?.(item);
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ position: "relative", height: 260, overflow: "hidden" }}>
        {/* DEV: heroImage from CMS or hard-coded brand asset */}
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"
          alt="Preloved"
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "brightness(0.32) saturate(0.45)",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.25) 70%, transparent 100%)",
        }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 22px" }}>
          <h2 style={{
            margin: "0 0 6px",
            fontSize: "28px", lineHeight: 1.1, letterSpacing: "0.02em",
            fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            color: T.white, textTransform: "uppercase",
          }}>
            {c.heading[0]}<br />{c.heading[1]}
          </h2>
          <p style={{
            margin: "0 0 16px",
            fontSize: "11px", fontFamily: "'Barlow', sans-serif",
            fontStyle: "italic", color: T.muted,
          }}>
            {c.sub}
          </p>
          <button
            onClick={() => onTap?.({ type: "hero", engine: "preloved" })}
            style={{
              background: "transparent",
              border: `1px solid ${T.pre}`,
              padding: "8px 20px", cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", fontSize: "10px",
              letterSpacing: "0.2em", color: T.pre, textTransform: "uppercase",
            }}
          >
            {c.cta}
          </button>
        </div>
      </div>

      {/* Listings grid */}
      <div style={{ padding: "2px" }}>
        <EditorialGrid items={items} accent={T.pre} onTap={handleTap} />
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <PrelovedDetailSheet
            listing={selected}
            onClose={() => setSelected(null)}
            onChipTap={(chip) => {
              setSelected(null);
              onChipTap?.(chip, selected);
            }}
            onMessageSeller={(listing) => {
              setSelected(null);
              onMessageSeller?.(listing);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MARKET SHELL ──────────────────────────────────────────────────────────────
// Root component — tab routing + shared chrome
// DEV: wire shopItems, dropItems, prelovedItems from parent queries
// DEV: dropsEndsAt from active drop record
// DEV: isDropLive from drop.starts_at < Date.now() < drop.ends_at
// DEV: activeEngine from useSearchParams (so /market/drops deep-links correctly)
export default function MarketMode({
  shopItems       = [],
  dropItems       = [],
  prelovedItems   = [],
  dropsEndsAt     = 0,
  isDropLive      = false,
  // Action handlers — all wired to SheetContext in production
  onProductTap,   // (item) => openSheet("product", { product: item, source: engine })
  onListingTap,   // (listing) => openSheet("listing", { listingId: listing.id })
  onChipTap,      // (chip, listing) => openSheet("chat", { prefill: chip, userId: listing.seller_id })
  onMessageSeller,// (listing) => openSheet("chat", { userId: listing.seller_id })
  onSellFAB,      // () => openSheet("createListing")
}) {
  const [engine, setEngine] = useState("shop");
  const T = MARKET_TOKENS;
  const engineAccent = engine === "shop" ? T.shop : engine === "drops" ? T.drops : T.pre;

  return (
    <div style={{
      background: T.bg, color: T.white, minHeight: "100vh",
      fontFamily: "'Barlow', sans-serif",
      maxWidth: 480, margin: "0 auto", position: "relative",
    }}>

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px",
      }}>
        <span style={{
          fontFamily: "'Oswald', sans-serif", fontSize: "14px",
          letterSpacing: "0.2em", color: T.white, textTransform: "uppercase",
        }}>
          MARKET
        </span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* DEV: bagCount from useShopCart().itemCount */}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {/* Bag count badge — only shown when bagCount > 0 */}
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 14, height: 14, borderRadius: "50%",
              background: engineAccent, fontSize: "7px", color: "#000",
              fontFamily: "'Oswald', sans-serif", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              0
            </span>
          </div>
          {/* DEV: filter sheet trigger */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.5" style={{ cursor: "pointer" }}>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
        </div>
      </div>

      {/* Tab strip + search — sticky below top bar */}
      <div style={{
        position: "sticky", top: 53, zIndex: 39,
        background: T.bg,
      }}>
        <EngineTabs active={engine} onChange={setEngine} />

        {/* Search — shared across all engines */}
        <div style={{ padding: "10px 16px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: T.surface, border: `1px solid ${T.border}`,
            padding: "8px 12px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder={engine === "preloved" ? "search the scene..." : "search market..."}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: T.white, fontSize: "12px",
                fontFamily: "'Barlow', sans-serif", letterSpacing: "0.02em",
              }}
            />
          </div>
        </div>
      </div>

      {/* Engine content with enter/exit transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={engine}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {engine === "shop" && (
            <ShopEngine
              items={shopItems}
              onTap={onProductTap}
            />
          )}
          {engine === "drops" && (
            <DropsEngine
              items={dropItems}
              endsAt={dropsEndsAt}
              isLive={isDropLive}
              onTap={onProductTap}
            />
          )}
          {engine === "preloved" && (
            <PrelovedEngine
              items={prelovedItems}
              onTap={onListingTap}
              onChipTap={onChipTap}
              onMessageSeller={onMessageSeller}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Sell FAB — Preloved only */}
      {engine === "preloved" && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onSellFAB}
          style={{
            position: "fixed", bottom: 100, right: 16, zIndex: 30,
            width: 48, height: 48, borderRadius: "50%",
            background: T.pre, border: "none", cursor: "pointer",
            fontSize: "22px", color: "#000",
            boxShadow: `0 4px 20px ${T.pre}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Oswald', sans-serif",
          }}
        >
          +
        </motion.button>
      )}

      {/* Bottom safe area */}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ── INTEGRATION REFERENCE ─────────────────────────────────────────────────────
// How to wire this into MarketMode.tsx:
//
// import MarketMode, { ShopEngine, DropsEngine, PrelovedEngine } from "./MarketEditorial";
//
// const { openSheet } = useSheet();
//
// <MarketMode
//   shopItems={shopifyProducts.map(p => ({
//     id: p.id,
//     title: p.title,
//     subtitle: p.variants[0].title,
//     price: `£${p.variants[0].price}`,
//     tag: p.tags.includes("limited") ? MARKET_COPY.tags.limited : MARKET_COPY.tags.drop,
//     micro: p.metafields?.context || null,
//     img: p.images[0].url,
//   }))}
//   dropItems={dropProducts.map(p => ({
//     ...mapProduct(p),
//     tag: `LAST ${p.variants[0].inventory_quantity}`,
//     micro: "no restock.",
//   }))}
//   prelovedItems={listings.map(l => ({
//     id: l.id,
//     title: l.title,
//     subtitle: l.condition,
//     price: `£${l.price}`,
//     tag: MARKET_COPY.tags.worn,
//     micro: l.context_use,        // "worn once at Eagle"
//     img: l.images[0],
//     dist: formatDist(l.distance_m),
//     seller: l.seller_handle,
//     context: l.context_venue,    // "Left at Eagle"
//     context_nights_ago: Math.floor((Date.now() - new Date(l.created_at)) / 86400000),
//   }))}
//   dropsEndsAt={activeDrop?.ends_at ? new Date(activeDrop.ends_at).getTime() : 0}
//   isDropLive={isDropLive}
//   onProductTap={(item) => openSheet("product", { product: item, source: "shop" })}
//   onListingTap={(listing) => openSheet("listing", { listingId: listing.id })}
//   onChipTap={(chip, listing) => openSheet("chat", { prefill: chip, userId: listing.seller_id })}
//   onMessageSeller={(listing) => openSheet("chat", { userId: listing.seller_id })}
//   onSellFAB={() => openSheet("createListing")}
// />
//
// NOTE: SellingBadge belongs in GhostedCard.tsx, not here.
// Show it when profile.active_listing_count > 0.
// On tap: openSheet("listing", { userId: profile.id })
