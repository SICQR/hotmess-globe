/**
 * HomeMode -- Dashboard (route: /)
 *
 * 12-section scrollable OS dashboard matching HOTMESS-HomeMode-Design.html:
 *   01. Intention Bar       — Hookup / Hang / Explore status picker
 *   02. Pulse Globe Teaser  — Mini globe CTA → /pulse
 *   03. Who's Out Right Now — Avatar row with intent-coloured rings
 *   04. Tonight's Events    — Horizontal event cards
 *   05. Live Radio          — Radio banner (channel teal)
 *   06. Nearby (Ghost)      — 4-col mini-grid teaser → /ghosted
 *   07. Market Picks        — Horizontal product scroll
 *   08. Active Beacons      — Compact beacon list
 *   09. Venue Kings         — Horizontal venue-king scroll
 *   10. Creator Drop        — HUNG drop banner
 *   11. Your Profile        — Profile completion card
 *   12. Safety Strip        — SOS reminder
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin,
  ChevronDown,
  Bell,
  Zap,
  ChevronRight,
  Flame,
  Star,
  Play,
  Pause,
  Radio,
  Calendar,
  Sparkles,
  Search,
  Shield,
  Crown,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useRadio } from '@/contexts/RadioContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { supabase } from '@/components/utils/supabaseClient';
import { format, isToday, isTomorrow } from 'date-fns';
import RightNowModal from '@/components/globe/RightNowModal';
import '@/styles/radio-waveform.css';

interface HomeModeProps {
  className?: string;
}

// ── Brand constants ──────────────────────────────────────────────────────────
const AMBER   = '#C8962C';
const CARD_BG = '#1C1C1E';
const ROOT_BG = '#050507';
const MUTED   = '#8E8E93';
const BORDER  = 'rgba(255,255,255,0.06)';

// ── Right-Now intent colours (per mockup) ────────────────────────────────────
const RN_COLORS: Record<string, { ring: string; bg: string; text: string; label: string; emoji: string }> = {
  hookup:  { ring: '#FF5500', bg: 'rgba(255,85,0,0.15)',    text: '#FF5500', label: 'HOOKUP',  emoji: '🔥' },
  hang:    { ring: '#00C2E0', bg: 'rgba(0,194,224,0.12)',  text: '#00C2E0', label: 'HANG',    emoji: '👋' },
  explore: { ring: '#A899D8', bg: 'rgba(168,153,216,0.12)', text: '#A899D8', label: 'EXPLORE', emoji: '🗺' },
};

function getRNColor(intent: string) {
  return RN_COLORS[intent?.toLowerCase()] ?? { ring: AMBER, bg: `${AMBER}20`, text: AMBER, label: intent?.toUpperCase(), emoji: '✨' };
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return 'TONIGHT';
  if (isTomorrow(d)) return 'TOMORROW';
  return format(d, 'EEE d MMM').toUpperCase();
}

// ── Section animation wrapper ─────────────────────────────────────────────────
const sectionVars = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

function Sec({ index, children, className = '' }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.section custom={index} initial="hidden" animate="visible" variants={sectionVars} className={className}>
      {children}
    </motion.section>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SH({
  title, dot, onLink, linkLabel = 'See all',
}: {
  title: string; dot?: string; onLink?: () => void; linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3 px-4">
      <h2 className="font-bold leading-none" style={{ fontSize: 18, color: '#fff' }}>
        {dot && (
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 relative" style={{ background: dot, top: -1 }} />
        )}
        {title}
      </h2>
      {onLink && (
        <button onClick={onLink} className="text-[13px] font-medium active:opacity-70" style={{ color: AMBER }}>
          {linkLabel}
        </button>
      )}
    </div>
  );
}

// ── Shimmer ──────────────────────────────────────────────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

// ── 01. Intention Bar ─────────────────────────────────────────────────────────
function IntentionBar({
  activeIntent,
  onSelect,
}: {
  activeIntent: string | null;
  onSelect: (intent: string) => void;
}) {
  const intents: Array<{ key: string; emoji: string; label: string }> = [
    { key: 'hookup',  emoji: '🔥', label: 'HOOKUP'  },
    { key: 'hang',    emoji: '👋', label: 'HANG'    },
    { key: 'explore', emoji: '🗺', label: 'EXPLORE' },
  ];
  return (
    <div className="mx-4 rounded-2xl p-4" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
        What are you up to?
      </p>
      <div className="flex gap-2">
        {intents.map(({ key, emoji, label }) => {
          const c = RN_COLORS[key];
          const isActive = activeIntent === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex-1 py-2.5 rounded-xl border-[1.5px] flex flex-col items-center gap-1 active:scale-95 transition-all"
              style={{
                borderColor: c.ring,
                background: isActive ? c.bg : 'transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span className="text-[10px] font-bold" style={{ color: c.text }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 02. Globe Teaser ──────────────────────────────────────────────────────────
function GlobeTeaser({ liveCount, onTap }: { liveCount: number; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="mx-4 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-transform"
      style={{
        height: 140,
        background: 'linear-gradient(135deg, #0D1520 0%, #050507 60%)',
        border: `1px solid rgba(200,150,44,0.2)`,
      }}
      aria-label="Open Pulse globe"
    >
      {/* Orb */}
      <div
        className="absolute"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 35% 35%, #1a2840 0%, #0a1525 60%, #050b15 100%)',
          boxShadow: '0 0 40px rgba(200,150,44,0.15), 0 0 80px rgba(200,150,44,0.06)',
        }}
      />
      {/* Orbit rings */}
      {[54, 78, 100].map((sz, i) => (
        <div
          key={sz}
          className="absolute rounded-full"
          style={{
            top: '50%', left: '50%',
            width: sz, height: sz * 0.3,
            marginLeft: -(sz / 2), marginTop: -(sz * 0.3 / 2),
            border: `1px solid rgba(200,150,44,${0.25 - i * 0.06})`,
            borderRadius: '50%',
            transform: `rotateX(70deg)`,
          }}
        />
      ))}
      {/* Nodes */}
      {[
        { top: '30%', left: '28%' },
        { top: '55%', left: '62%' },
        { top: '42%', left: '54%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{ ...pos, width: 6, height: 6, background: AMBER, boxShadow: `0 0 8px ${AMBER}` }}
        />
      ))}
      {/* Stats */}
      <div className="absolute bottom-3.5 left-4 flex gap-5">
        <div>
          <p className="font-extrabold leading-none" style={{ fontSize: 18, color: AMBER }}>{liveCount}</p>
          <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED }}>LIVE NOW</p>
        </div>
        <div>
          <p className="font-extrabold leading-none" style={{ fontSize: 18, color: AMBER }}>3</p>
          <p className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED }}>EVENTS</p>
        </div>
      </div>
      {/* CTA pill */}
      <div
        className="absolute top-3.5 right-3.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
        style={{ background: AMBER, color: '#000' }}
      >
        PULSE →
      </div>
    </button>
  );
}

// ── 03. Right Now user card ────────────────────────────────────────────────────
function RNCard({
  name, intent, avatarUrl, onTap,
}: { name: string; intent: string; avatarUrl?: string; onTap: () => void }) {
  const c = getRNColor(intent);
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
      style={{ width: 72 }}
    >
      <div className="relative" style={{ width: 56, height: 56 }}>
        {/* Coloured ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ padding: 2.5, background: `conic-gradient(${c.ring}, ${c.ring})` }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" style={{ border: `2px solid ${ROOT_BG}` }} />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-black text-lg"
              style={{ background: CARD_BG, border: `2px solid ${ROOT_BG}`, color: c.ring }}
            >
              {name[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        {/* RN badge bottom-right */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
          style={{ background: c.ring, border: `2px solid ${ROOT_BG}`, color: '#000', zIndex: 2 }}
        >
          {c.emoji}
        </div>
      </div>
      <span className="text-[11px] font-medium truncate w-full text-center" style={{ color: MUTED }}>
        {name}
      </span>
    </button>
  );
}

// ── 03. Right Now empty ───────────────────────────────────────────────────────
function RNEmpty({ onGoLive }: { onGoLive: () => void }) {
  return (
    <div
      className="mx-4 flex flex-col items-center py-5 px-4 rounded-2xl border border-dashed border-white/10"
      style={{ background: `${CARD_BG}80` }}
    >
      <Zap className="w-8 h-8 mb-2" style={{ color: MUTED }} />
      <p className="text-white text-sm font-semibold mb-1">Be first to share your vibe</p>
      <p className="text-xs mb-3" style={{ color: MUTED }}>Let nearby people know you're out</p>
      <button
        onClick={onGoLive}
        className="h-10 px-5 rounded-full font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
        style={{ background: AMBER, color: '#000' }}
      >
        <Zap className="w-3.5 h-3.5" />
        Go Live
      </button>
    </div>
  );
}

// ── 04. Event card ─────────────────────────────────────────────────────────────
function EventCard({
  title, imageUrl, venue, startsAt, onTap,
}: { title: string; imageUrl?: string; venue?: string; startsAt?: string; onTap: () => void }) {
  const datePill = fmtDate(startsAt);
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 rounded-2xl overflow-hidden border text-left active:scale-[0.98] transition-transform"
      style={{ width: 200, background: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <div className="relative" style={{ height: 110 }}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1a0a0a,#2a1020)' }}>
            <Calendar className="w-8 h-8" style={{ color: `${AMBER}40` }} />
          </div>
        )}
        {datePill && (
          <span
            className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{ background: AMBER, color: '#000' }}
          >
            {datePill}
          </span>
        )}
      </div>
      <div className="p-2.5 pb-3">
        <p className="text-[10px] font-bold mb-1 uppercase tracking-wide" style={{ color: AMBER }}>
          {startsAt ? new Date(startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Tonight'}
        </p>
        <p className="text-white font-bold text-[13px] leading-tight line-clamp-2 mb-1">{title}</p>
        {venue && <p className="text-[11px] line-clamp-1" style={{ color: MUTED }}>{venue}</p>}
      </div>
    </button>
  );
}

// ── 05. Radio Banner ──────────────────────────────────────────────────────────
const RADIO_TEAL = '#00C2E0';

function RadioBanner({ onNavigate }: { onNavigate: () => void }) {
  const { isPlaying, currentShowName, togglePlay } = useRadio();
  return (
    <div
      className="mx-4 rounded-2xl p-4 cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg,#001820 0%,#003040 50%,#001828 100%)',
        border: `1px solid rgba(0,194,224,0.25)`,
      }}
      onClick={onNavigate}
    >
      {/* Background glow */}
      <div
        className="absolute -top-5 -right-5 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse,rgba(0,194,224,0.1) 0%,transparent 70%)` }}
      />
      {/* LIVE badge */}
      <div
        className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md mb-2"
        style={{ background: 'rgba(0,194,224,0.15)', border: `1px solid rgba(0,194,224,0.3)`, color: RADIO_TEAL }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: RADIO_TEAL }} />
        LIVE
      </div>
      <p className="font-black text-base text-white mb-0.5">{currentShowName || 'HOTMESS RADIO'}</p>
      <p className="text-xs mb-3" style={{ color: `rgba(0,194,224,0.8)` }}>On air now</p>
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: RADIO_TEAL }}
        >
          {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black ml-0.5" />}
        </button>
        {/* Waveform */}
        <div className="flex items-center gap-0.5 flex-1 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                background: `rgba(0,194,224,0.4)`,
                height: isPlaying ? `${20 + Math.sin(i * 0.8) * 60}%` : '20%',
                transition: 'height 0.3s ease',
                animationDelay: `${i * 0.04}s`,
              }}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: RADIO_TEAL }}>TUNE IN</span>
      </div>
    </div>
  );
}

// ── 06. Nearby Ghosted Teaser ─────────────────────────────────────────────────
function GhostTeaser({
  users,
  onNavigate,
}: { users: Array<{ id: string; name: string; intent: string }>; onNavigate: () => void }) {
  const mock = ['😈', '🔥', '👻', '💫', '🌙', '⚡', '🎭', '🦊'];
  const cells = users.length >= 4 ? users.slice(0, 8) : mock.map((e, i) => ({ id: `m${i}`, name: e, intent: 'explore' }));
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 px-4">
        {cells.slice(0, 8).map((u, i) => {
          const c = getRNColor((u as { intent: string }).intent);
          return (
            <button
              key={u.id || i}
              onClick={onNavigate}
              className="rounded-xl overflow-hidden relative aspect-square active:scale-95 transition-transform"
              style={{ background: '#242426', border: `1px solid ${BORDER}` }}
            >
              <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 26 }}>
                {typeof u.name === 'string' && u.name.match(/\p{Emoji}/u) ? u.name : u.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl" style={{ background: c.ring }} />
              <span className="absolute top-1 right-1.5 text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {i < users.length ? `${(i + 1) * 0.2 | 0}.${((i + 1) * 2) % 9}km` : ''}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onNavigate}
        className="mx-4 mt-2.5 py-3 rounded-xl text-center text-[13px] font-semibold active:opacity-70"
        style={{
          background: `rgba(200,150,44,0.08)`,
          border: `1px dashed rgba(200,150,44,0.3)`,
          color: AMBER,
        }}
      >
        See everyone nearby →
      </button>
    </div>
  );
}

// ── 07. Market card ───────────────────────────────────────────────────────────
function MarketCard({
  title, imageUrl, price, brand, onTap,
}: { title: string; imageUrl?: string; price?: number; brand?: string; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 rounded-xl overflow-hidden border text-left active:scale-95 transition-transform"
      style={{ width: 140, background: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <div className="relative" style={{ height: 140 }}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg,#2a1a0a,#1a0a0a)' }}>
            <Sparkles className="w-8 h-8" style={{ color: `${AMBER}40` }} />
          </div>
        )}
        {brand && (
          <span
            className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: AMBER, color: '#000' }}
          >
            {brand}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-white text-[12px] font-semibold leading-tight line-clamp-2 mb-1">{title}</p>
        {price != null && (
          <p className="font-black text-sm" style={{ color: AMBER }}>£{price}</p>
        )}
      </div>
    </button>
  );
}

// ── 08. Beacon row ────────────────────────────────────────────────────────────
const BEACON_ICONS: Record<string, typeof Flame> = {
  event: Calendar,
  social: Star,
  default: Flame,
};

function BeaconRow({
  title, kind, distance, isLast, onTap,
}: { title: string; kind?: string; distance?: string; isLast: boolean; onTap: () => void }) {
  const Icon = BEACON_ICONS[kind ?? ''] ?? BEACON_ICONS.default;
  return (
    <button
      onClick={onTap}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 transition-colors ${!isLast ? 'border-b border-white/5' : ''}`}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `rgba(200,150,44,0.12)`, border: `1px solid rgba(200,150,44,0.25)` }}>
        <Icon className="w-5 h-5" style={{ color: AMBER }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{title}</p>
        {distance && <p className="text-[11px] mt-0.5 font-semibold" style={{ color: AMBER }}>{distance}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
    </button>
  );
}

// ── 09. Venue King card ───────────────────────────────────────────────────────
function VenueKingCard({
  name, venue, emoji, onTap,
}: { name: string; venue: string; emoji?: string; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 rounded-2xl text-center p-3 active:scale-95 transition-transform"
      style={{ width: 130, background: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      <Crown className="w-4 h-4 mx-auto mb-1" style={{ color: AMBER }} />
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl mx-auto mb-1.5"
        style={{ background: '#242426', border: `2px solid ${AMBER}` }}
      >
        {emoji ?? '👑'}
      </div>
      <p className="text-white font-bold text-[12px] mb-0.5">{name}</p>
      <p className="text-[10px] mb-2" style={{ color: MUTED }}>{venue}</p>
      <span
        className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
        style={{ border: `1px solid rgba(200,150,44,0.3)`, color: AMBER }}
      >
        King
      </span>
    </button>
  );
}

// ── 10. Creator Drop Banners ──────────────────────────────────────────────────
const HUNG_RED = '#C41230';
const HNH_PLUM = '#8B5CF6';

function HUNGDrop({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex-1 rounded-2xl p-4 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg,#1a0a0a 0%,#2a0808 50%,#1a0305 100%)',
        border: `1px solid rgba(196,18,48,0.3)`,
      }}
    >
      <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: HUNG_RED }}>NEW DROP</p>
      <p className="font-black text-[16px] leading-tight text-white mb-0.5">HUNG SS25</p>
      <p className="text-[11px] mb-3" style={{ color: MUTED }}>Statement pieces</p>
      <span
        className="inline-block px-3 py-2 rounded-xl text-center text-[11px] font-bold w-full"
        style={{ background: HUNG_RED, color: '#fff' }}
      >
        Shop Now
      </span>
    </button>
  );
}

function HNHDrop({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="flex-1 rounded-2xl p-4 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg,#08040f 0%,#150a2a 50%,#08040f 100%)',
        border: `1px solid rgba(139,92,246,0.3)`,
      }}
    >
      <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: HNH_PLUM }}>CARE DROP</p>
      <p className="font-black text-[16px] leading-tight text-white mb-0.5">HNH MESS</p>
      <p className="text-[11px] mb-3" style={{ color: MUTED }}>Hand N Hand</p>
      <span
        className="inline-block px-3 py-2 rounded-xl text-center text-[11px] font-bold w-full"
        style={{ background: HNH_PLUM, color: '#fff' }}
      >
        Shop Now
      </span>
    </button>
  );
}

function CreatorDrop({ onHung, onHnh }: { onHung: () => void; onHnh: () => void }) {
  return (
    <div className="mx-4 flex gap-3">
      <HUNGDrop onTap={onHung} />
      <HNHDrop onTap={onHnh} />
    </div>
  );
}

// ── 11. Profile completion card ───────────────────────────────────────────────
function ProfileCard({ onTap }: { onTap: () => void }) {
  const { pct, steps, displayName, avatarUrl } = useProfileCompletion();
  const nextStep = steps.find((s) => !s.done);
  return (
    <button
      onClick={onTap}
      className="mx-4 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[22px]"
        style={{ background: '#242426', border: `2px solid ${pct === 100 ? AMBER : BORDER}` }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          : displayName[0]?.toUpperCase() ?? '?'
        }
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-[15px] mb-2">{displayName}</p>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: pct === 100 ? '#30D158' : AMBER }}
          />
        </div>
        {nextStep
          ? <p className="text-[10px]" style={{ color: AMBER }}>Next: {nextStep.label}</p>
          : <p className="text-[10px]" style={{ color: '#30D158' }}>Profile complete ✓</p>
        }
      </div>

      {/* % badge */}
      <span
        className="text-[11px] font-black px-2.5 py-1.5 rounded-lg flex-shrink-0"
        style={{
          background: pct === 100 ? 'rgba(48,209,88,0.15)' : 'rgba(200,150,44,0.15)',
          border: `1px solid ${pct === 100 ? 'rgba(48,209,88,0.3)' : 'rgba(200,150,44,0.3)'}`,
          color: pct === 100 ? '#30D158' : AMBER,
        }}
      >
        {pct}%
      </span>
    </button>
  );
}

// ── 12. Safety strip ──────────────────────────────────────────────────────────
function SafetyStrip({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="mx-4 rounded-xl p-3.5 flex items-center gap-3 active:opacity-80 transition-opacity"
      style={{
        background: 'rgba(255,59,48,0.06)',
        border: '1px solid rgba(255,59,48,0.2)',
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#FF3B30' }}
      >
        <Shield className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-white font-bold text-[13px]">Safety Centre</p>
        <p className="text-[11px]" style={{ color: MUTED }}>SOS · Fake call · Location share</p>
      </div>
      <ChevronRight className="w-4 h-4" style={{ color: '#FF3B30' }} />
    </button>
  );
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────
function RNSkeleton() {
  return (
    <div className="flex gap-3 px-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 72 }}>
          <Shimmer className="rounded-full w-14 h-14" />
          <Shimmer className="w-10 h-3" />
        </div>
      ))}
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="flex-shrink-0 rounded-2xl overflow-hidden" style={{ width: 200, background: CARD_BG }}>
      <div className="animate-pulse w-full rounded-none" style={{ height: 110, background: 'rgba(255,255,255,0.06)' }} />
      <div className="p-2.5 space-y-2">
        <Shimmer className="w-3/4 h-4" />
        <Shimmer className="w-1/2 h-3" />
      </div>
    </div>
  );
}

function BeaconSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Shimmer className="w-11 h-11 rounded-xl" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="w-2/3 h-4" />
        <Shimmer className="w-1/3 h-3" />
      </div>
    </div>
  );
}

function MarketSkeleton() {
  return (
    <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 140, background: CARD_BG }}>
      <div className="animate-pulse w-full rounded-none" style={{ height: 140, background: 'rgba(255,255,255,0.06)' }} />
      <div className="p-2.5 space-y-2">
        <Shimmer className="w-3/4 h-3" />
        <Shimmer className="w-1/3 h-4" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================
export function HomeMode({ className = '' }: HomeModeProps) {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const { unreadCount } = useUnreadCount();
  const queryClient = useQueryClient();
  const [city, setCity] = useState(() => localStorage.getItem('hm_city') || 'London');
  const [showRightNow, setShowRightNow] = useState(false);
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current > 0 && scrollRef.current?.scrollTop === 0)
      pullDistance.current = e.touches[0].clientY - touchStartY.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80 && !refreshing) {
      setRefreshing(true);
      queryClient.invalidateQueries().then(() => setTimeout(() => setRefreshing(false), 600));
    }
    touchStartY.current = 0;
    pullDistance.current = 0;
  }, [refreshing, queryClient]);

  // ── City cycling ──────────────────────────────────────────────────────────
  const handleCityTap = useCallback(() => {
    const CITIES = ['London', 'Berlin', 'New York'];
    const next = CITIES[(CITIES.indexOf(city) + 1) % CITIES.length];
    setCity(next);
    localStorage.setItem('hm_city', next);
  }, [city]);

  // ── Set intention (Right Now status) ──────────────────────────────────────
  const handleIntentSelect = useCallback((intent: string) => {
    setActiveIntent(prev => prev === intent ? null : intent);
    if (intent !== activeIntent) setShowRightNow(true);
  }, [activeIntent]);

  // ── Queries ────────────────────────────────────────────────────────────────

  // Right Now users (two-step join: status → profiles for names + avatars)
  const { data: rnUsers = [], isLoading: rnLoading } = useQuery({
    queryKey: ['home-right-now'],
    queryFn: async () => {
      const { data: statusRows, error } = await supabase
        .from('right_now_status')
        .select('id, user_email, intent, active')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      if (!statusRows || statusRows.length === 0) return [];

      const emails = statusRows.map((r: Record<string, unknown>) => r.user_email as string).filter(Boolean);
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, photos')
        .in('email', emails);

      const profileMap = new Map<string, Record<string, unknown>>();
      for (const p of (profileRows ?? [])) {
        profileMap.set((p as Record<string, unknown>).email as string, p as Record<string, unknown>);
      }

      return statusRows.map((r: Record<string, unknown>) => {
        const p = profileMap.get(r.user_email as string) ?? {};
        const photos = Array.isArray(p.photos) ? p.photos : [];
        // Prefer photos[0].url, fall back to avatar_url
        const avatarUrl: string | undefined = (photos[0]?.url as string | undefined) ?? (p.avatar_url as string | undefined) ?? undefined;
        return {
          id: (p.id as string) || (r.id as string),
          email: r.user_email as string,
          intent: (r.intent as string) || 'explore',
          name: (p.display_name as string) || ((r.user_email as string) ?? '').split('@')[0] || 'Anon',
          avatarUrl,
        };
      });
    },
    refetchInterval: 30_000,
  });

  // Events from beacons VIEW
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, end_at, kind')
        .gte('end_at', now)
        .order('starts_at', { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: meta.title || meta.name || 'Event',
          imageUrl: meta.image_url || undefined,
          venue: meta.address || undefined,
          startsAt: b.starts_at as string,
          kind: b.kind as string,
        };
      });
    },
    refetchInterval: 60_000,
  });

  // Active beacons (non-event)
  const { data: beacons = [], isLoading: beaconsLoading } = useQuery({
    queryKey: ['home-beacons'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('beacons')
        .select('id, metadata, starts_at, end_at, kind')
        .gte('end_at', now)
        .order('starts_at', { ascending: true })
        .limit(4);
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => {
        const meta = (b.metadata ?? {}) as Record<string, string>;
        return {
          id: b.id as string,
          title: meta.title || 'Beacon',
          kind: b.kind as string,
        };
      });
    },
    refetchInterval: 60_000,
  });

  // Market listings
  const { data: market = [], isLoading: marketLoading } = useQuery({
    queryKey: ['home-market'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preloved_listings')
        .select('id, title, price, images, category')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: (p.title as string) || 'Item',
        price: p.price as number,
        imageUrl: Array.isArray(p.images) ? (p.images[0] as string) : undefined,
        brand: undefined as string | undefined,
      }));
    },
    refetchInterval: 120_000,
  });

  // Venue Kings
  const { data: venueKings = [] } = useQuery({
    queryKey: ['home-venue-kings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_kings')
        .select('id, user_id, venue_name, claimed_at')
        .order('claimed_at', { ascending: false })
        .limit(6);
      if (error) return [];
      return (data ?? []).map((k: Record<string, unknown>) => ({
        id: k.id as string,
        name: ((k.user_id as string) ?? '').slice(0, 8) || 'King',
        venue: (k.venue_name as string) || 'Unknown venue',
      }));
    },
    refetchInterval: 300_000,
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${className}`} style={{ background: ROOT_BG }}>

      {/* ── Sticky Header ── */}
      <header
        className="flex-shrink-0 z-20 flex items-center justify-between px-4 h-14"
        style={{ paddingTop: 'env(safe-area-inset-top,0px)', background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}` }}
      >
        {/* City pill */}
        <button
          onClick={handleCityTap}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER, animationName: 'pulse', animationDuration: '2s', animationIterationCount: 'infinite' }} />
          <span className="text-white font-bold text-[13px]">{city}</span>
          <ChevronDown className="w-3 h-3" style={{ color: MUTED }} />
        </button>

        {/* Wordmark */}
        <h1 className="text-[16px] font-black italic tracking-tight select-none leading-none">
          <span className="text-white">HOT</span>
          <span style={{ color: AMBER }}>MESS</span>
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openSheet('search' as Parameters<typeof openSheet>[0], {})}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <Search className="w-4 h-4 text-white/60" />
          </button>
          <button
            onClick={() => openSheet('notification-inbox' as Parameters<typeof openSheet>[0], {})}
            className="relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <Bell className="w-4 h-4 text-white/60" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: AMBER }} />
            )}
          </button>
        </div>
      </header>

      {/* Pull-to-refresh */}
      {refreshing && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: AMBER, borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="pb-36 space-y-6 pt-3">

          {/* ── 01. Intention Bar ── */}
          <Sec index={0}>
            <IntentionBar activeIntent={activeIntent} onSelect={handleIntentSelect} />
          </Sec>

          {/* ── 02. Pulse Globe Teaser ── */}
          <Sec index={1}>
            <SH title="World Pulse" dot={AMBER} onLink={() => navigate('/pulse')} linkLabel="Open globe" />
            <GlobeTeaser liveCount={rnUsers.length} onTap={() => navigate('/pulse')} />
          </Sec>

          {/* ── 03. Who's Out Right Now ── */}
          <Sec index={2}>
            <SH
              title="Who's Out"
              dot="#30D158"
              onLink={() => setShowRightNow(true)}
              linkLabel={rnUsers.length > 0 ? 'Go Live' : 'Be first'}
            />
            {rnLoading ? (
              <RNSkeleton />
            ) : rnUsers.length === 0 ? (
              <RNEmpty onGoLive={() => setShowRightNow(true)} />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide px-4">
                {rnUsers.map((u) => (
                  <RNCard
                    key={u.id}
                    name={u.name}
                    intent={u.intent}
                    avatarUrl={u.avatarUrl}
                    onTap={() => openSheet('profile', { email: u.email })}
                  />
                ))}
              </div>
            )}
          </Sec>

          {/* ── 04. Tonight's Events ── */}
          {(eventsLoading || events.length > 0) && (
            <Sec index={3}>
              <SH title="Tonight's Events" dot={AMBER} onLink={() => navigate('/pulse')} />
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide px-4">
                {eventsLoading
                  ? [0, 1, 2].map(i => <EventSkeleton key={i} />)
                  : events.map((ev) => (
                    <EventCard
                      key={ev.id}
                      title={ev.title}
                      imageUrl={ev.imageUrl}
                      venue={ev.venue}
                      startsAt={ev.startsAt}
                      onTap={() => openSheet('event', { id: ev.id })}
                    />
                  ))
                }
              </div>
            </Sec>
          )}

          {/* ── 05. Live Radio ── */}
          <Sec index={4}>
            <SH title="Hotmess Radio" dot={RADIO_TEAL} onLink={() => navigate('/radio')} linkLabel="Full player" />
            <RadioBanner onNavigate={() => navigate('/radio')} />
          </Sec>

          {/* ── 06. Nearby (Ghosted Teaser) ── */}
          <Sec index={5}>
            <SH title="Nearby" dot="#30D158" onLink={() => navigate('/ghosted')} />
            <GhostTeaser users={rnUsers} onNavigate={() => navigate('/ghosted')} />
          </Sec>

          {/* ── 07. Market Picks ── */}
          {(marketLoading || market.length > 0) && (
            <Sec index={6}>
              <SH title="Fresh Drops" dot={AMBER} onLink={() => navigate('/market')} />
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide px-4">
                {marketLoading
                  ? [0, 1, 2].map(i => <MarketSkeleton key={i} />)
                  : market.map((p) => (
                    <MarketCard
                      key={p.id}
                      title={p.title}
                      imageUrl={p.imageUrl}
                      price={p.price}
                      brand={p.brand}
                      onTap={() => openSheet('product', { id: p.id })}
                    />
                  ))
                }
              </div>
            </Sec>
          )}

          {/* ── 08. Active Beacons ── */}
          {(beaconsLoading || beacons.length > 0) && (
            <Sec index={7}>
              <SH title="Active Beacons" dot={AMBER} onLink={() => navigate('/pulse')} />
              <div className="rounded-2xl overflow-hidden border border-white/5 mx-4" style={{ background: CARD_BG }}>
                {beaconsLoading
                  ? [0, 1].map(i => <BeaconSkeleton key={i} />)
                  : beacons.map((b, i) => (
                    <BeaconRow
                      key={b.id}
                      title={b.title}
                      kind={b.kind}
                      isLast={i === beacons.length - 1}
                      onTap={() => openSheet('beacon', { id: b.id })}
                    />
                  ))
                }
              </div>
            </Sec>
          )}

          {/* ── 09. Venue Kings ── */}
          {venueKings.length > 0 && (
            <Sec index={8}>
              <SH title="Venue Kings" dot={AMBER} />
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-4">
                {venueKings.map((k) => (
                  <VenueKingCard
                    key={k.id}
                    name={k.name}
                    venue={k.venue}
                    onTap={() => openSheet('profile', { id: k.id })}
                  />
                ))}
              </div>
            </Sec>
          )}

          {/* ── 10. Creator Drop ── */}
          <Sec index={9}>
            <SH title="Creator Drop" dot={HUNG_RED} />
            <CreatorDrop
              onHung={() => openSheet('brand' as Parameters<typeof openSheet>[0], { brand: 'hung' })}
              onHnh={() => openSheet('brand' as Parameters<typeof openSheet>[0], { brand: 'hnhMess' })}
            />
          </Sec>

          {/* ── 11. Your Profile ── */}
          <Sec index={10}>
            <SH title="Your Profile" onLink={() => navigate('/profile')} linkLabel="Edit" />
            <ProfileCard onTap={() => navigate('/profile')} />
          </Sec>

          {/* ── 12. Safety Strip ── */}
          <Sec index={11}>
            <SafetyStrip onTap={() => openSheet('safety' as Parameters<typeof openSheet>[0], {})} />
          </Sec>

        </div>
      </div>

      {/* Right Now modal */}
      <RightNowModal isOpen={showRightNow} onClose={() => setShowRightNow(false)} intent={activeIntent ?? 'explore'} />
    </div>
  );
}

export default HomeMode;
