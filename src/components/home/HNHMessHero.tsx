/**
 * HNHMessHero — Full-width HNH MESS brand hero for HomeMode
 *
 * Features: floating product image, radial glow, gold top/bottom rules,
 * watermark wordmark, animated CTA strip.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#C8962C';
const HNH_RED = '#C41230';

// Primary product: HNH MESS 50ml
const PRODUCT_IMG =
  'https://cdn.shopify.com/s/files/1/0898/3245/6517/files/upload_vfKIW_gxRluGoOwPLITLrg.png';

export function HNHMessHero({ className = '' }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <div
      className={`relative w-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ minHeight: 320, background: '#0A0A0A' }}
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

      {/* Radial glow behind product */}
      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: '55%',
          background: `radial-gradient(ellipse at 70% 50%, ${HNH_RED}25 0%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Watermark wordmark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: 0.04 }}
      >
        <span className="font-black italic text-[7rem] text-white leading-none">HNH</span>
      </div>

      {/* Content layout */}
      <div className="relative z-10 flex items-center justify-between px-5 py-8">
        {/* Left: copy + CTA */}
        <div className="flex-1 pr-4">
          <p
            className="text-[9px] font-black uppercase tracking-[0.35em] mb-2"
            style={{ color: GOLD }}
          >
            Hand N Hand
          </p>
          <h2 className="font-black text-white text-2xl leading-tight mb-1">
            HNH<br />
            <span style={{ color: GOLD }}>MESS</span>
          </h2>
          <p className="text-white/50 text-xs mb-4 leading-relaxed">
            Premium water-based lube.<br />
            For the mess you love to make.
          </p>
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
            className="mt-4 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider"
            style={{ color: GOLD }}
          >
            Shop now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right: floating product image */}
        <div
          className="flex-shrink-0"
          style={{
            width: 130,
            height: 160,
            position: 'relative',
            animation: 'hnh-float 3.5s ease-in-out infinite',
          }}
        >
          <img
            src={PRODUCT_IMG}
            alt="HNH MESS Lube"
            className="w-full h-full object-contain drop-shadow-2xl"
            onError={(e) => {
              // Fallback: styled placeholder
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Glow under bottle */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full blur-xl"
            style={{
              width: 80,
              height: 20,
              background: `${HNH_RED}60`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes hnh-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export default HNHMessHero;
