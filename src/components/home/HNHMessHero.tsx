/**
 * HNHMessHero — Full-width HNH MESS brand hero for HomeMode
 *
 * Hierarchy: Brand identity → Human context → Meaning → Product/CTA
 * NOT product-first. The brand story comes before the price.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#C8962C';
const HNH_RED = '#C41230';

const PRODUCT_IMG =
  'https://cdn.shopify.com/s/files/1/0898/3245/6517/files/upload_vfKIW_gxRluGoOwPLITLrg.png';

export function HNHMessHero({ className = '' }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <div
      className={`relative w-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ background: '#0A0A0A' }}
    >
      {/* Top gold rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}80 50%, transparent 100%)`,
        }}
      />
      {/* Bottom gold rule */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}80 50%, transparent 100%)`,
        }}
      />

      {/* Watermark wordmark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: 0.03 }}
      >
        <span className="font-black italic text-[7rem] text-white leading-none">HNH</span>
      </div>

      {/* ── 1. HERO: Brand identity + product visual ── */}
      <div className="relative z-10 px-5 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className="text-[9px] font-black uppercase tracking-[0.35em] mb-2"
              style={{ color: GOLD }}
            >
              Hand N Hand
            </p>
            <h2 className="font-black text-white text-2xl leading-tight">
              HNH <span style={{ color: GOLD }}>MESS</span>
            </h2>
            <p className="text-white/40 text-[11px] mt-1">Premium water-based lube</p>
          </div>

          {/* Product visual — secondary to brand name */}
          <div
            className="flex-shrink-0 relative"
            style={{
              width: 90,
              height: 110,
              animation: 'hnh-float 3.5s ease-in-out infinite',
            }}
          >
            <img
              src={PRODUCT_IMG}
              alt="HNH MESS"
              className="w-full h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full blur-xl"
              style={{ width: 60, height: 14, background: `${HNH_RED}50` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. HUMAN IMAGE — contextual lifestyle strip ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 100 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${HNH_RED}20 0%, transparent 70%)`,
          }}
        />
        {/* Placeholder: subtle ambient glow. Replace with lifestyle image when available. */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: 0.06 }}
        >
          <span className="text-white text-[10px] uppercase tracking-[0.5em] font-semibold">
            Made for the mess
          </span>
        </div>
      </div>

      {/* ── 3. BLURB — meaning, not marketing ── */}
      <div className="relative z-10 px-5 py-4">
        <p className="text-white/50 text-xs leading-relaxed max-w-[280px]">
          Built by the community, for the community. Body-safe, vegan,
          and designed for connection — not performance.
        </p>
      </div>

      {/* ── 4. PRODUCT / CTA BLOCK ── */}
      <div className="relative z-10 px-5 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-black uppercase tracking-widest rounded px-2 py-1"
            style={{ background: GOLD, color: '#000' }}
          >
            50ml · £10
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-widest rounded px-2 py-1"
            style={{
              background: 'transparent',
              border: `1px solid ${GOLD}40`,
              color: GOLD,
            }}
          >
            250ml · £15
          </span>
        </div>
        <button
          onClick={() => navigate('/market')}
          className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider"
          style={{ color: GOLD }}
        >
          Shop now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── 5. SUPPORT — brand origin ── */}
      <div className="px-5 pb-5">
        <p className="text-white/20 text-[10px] tracking-wider">
          A HOTMESS original
        </p>
      </div>

      <style>{`
        @keyframes hnh-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

export default HNHMessHero;
