/**
 * HNHMessStrip — 46px persistent strip below HNHMessHero
 *
 * Small bottle image, price copy, SHOP badge. Taps → /market.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const GOLD = '#C8962C';
const BOTTLE_IMG =
  'https://cdn.shopify.com/s/files/1/0629/2497/4961/files/hnh-mess-50ml.png';

export function HNHMessStrip({ className = '' }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/market')}
      className={`w-full flex items-center gap-3 px-4 flex-shrink-0 active:opacity-70 transition-opacity ${className}`}
      style={{
        height: 46,
        background: 'linear-gradient(90deg, #0F0A00 0%, #1A1200 100%)',
        borderTop: `1px solid ${GOLD}20`,
        borderBottom: `1px solid ${GOLD}20`,
      }}
    >
      {/* Tiny bottle */}
      <img
        src={BOTTLE_IMG}
        alt=""
        className="h-8 w-auto object-contain flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      {/* Copy */}
      <div className="flex-1 text-left">
        <span className="text-white/80 text-xs font-semibold">HNH MESS</span>
        <span className="text-white/40 text-xs mx-1.5">·</span>
        <span className="text-white/50 text-[11px]">Premium water-based lube from £10</span>
      </div>

      {/* Badge */}
      <span
        className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest rounded px-2 py-0.5"
        style={{ background: GOLD, color: '#000' }}
      >
        SHOP
      </span>
    </button>
  );
}

export default HNHMessStrip;
