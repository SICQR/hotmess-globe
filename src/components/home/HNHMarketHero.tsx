/**
 * HNHMarketHero — HNH MESS featured product section for MarketMode
 *
 * 2-column grid: 50ml secondary card + 250ml featured gold card (BEST VALUE badge).
 * ADD TO BAG buttons fire Shopify cart actions via handles.
 */

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';
const HNH_RED = '#C41230';

const PRODUCTS = [
  {
    handle: 'hnh-mess-lube-50ml',
    name: 'HNH MESS',
    size: '50ml',
    price: '£10',
    image:
      'https://cdn.shopify.com/s/files/1/0898/3245/6517/files/IMG_1401.heic?v=1751020652',
    featured: false,
    badge: null,
  },
  {
    handle: 'hnh-mess-lube-250ml',
    name: 'HNH MESS',
    size: '250ml',
    price: '£15',
    image:
      'https://cdn.shopify.com/s/files/1/0898/3245/6517/files/upload_vfKIW_gxRluGoOwPLITLrg.png?v=1750505220',
    featured: true,
    badge: 'BEST VALUE',
  },
];

export function HNHMarketHero({ className = '' }: { className?: string }) {
  const { openSheet } = useSheet();

  const handleAdd = (handle: string) => {
    // Open product sheet — source 'shopify' triggers handle-based fetch
    openSheet('product', { handle, source: 'shopify' });
  };

  return (
    <div className={`px-4 mt-4 mb-2 ${className}`}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[0.35em]"
            style={{ color: GOLD }}
          >
            Hand N Hand
          </p>
          <h3 className="font-black text-white text-base leading-tight">HNH MESS</h3>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest rounded px-2 py-1"
          style={{
            background: `${HNH_RED}20`,
            border: `1px solid ${HNH_RED}40`,
            color: HNH_RED,
          }}
        >
          Premium Lube
        </span>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-3">
        {PRODUCTS.map((p) => (
          <div
            key={p.handle}
            className="relative rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: p.featured
                ? `linear-gradient(135deg, #1A1000 0%, #0F0A00 100%)`
                : '#1C1C1E',
              border: p.featured
                ? `1px solid ${GOLD}40`
                : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Badge */}
            {p.badge && (
              <div className="absolute top-2 right-2 z-10">
                <span
                  className="text-[8px] font-black uppercase tracking-widest rounded px-1.5 py-0.5"
                  style={{ background: GOLD, color: '#000' }}
                >
                  {p.badge}
                </span>
              </div>
            )}

            {/* Product image */}
            <div className="flex items-center justify-center p-6 aspect-square bg-[#0D0D0F]">
              <img
                src={p.image}
                alt={`${p.name} ${p.size}`}
                className="h-full w-full object-contain hover:scale-110 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0';
                }}
              />
            </div>

            {/* Info */}
            <div className="p-4 flex-1 flex flex-col justify-between bg-black">
              <div className="mb-4">
                <p className="text-[#C8962C] text-[9px] font-black uppercase tracking-widest">{p.name}</p>
                <h4 className="text-white font-black text-sm uppercase tracking-tighter">{p.size} Edition</h4>
                <p className="font-black text-sm mt-1 text-white/50">
                  {p.price}
                </p>
              </div>
              <button
                onClick={() => handleAdd(p.handle)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98]"
                style={
                  p.featured
                    ? { background: GOLD, color: '#000' }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid rgba(255,255,255,0.1)`,
                        color: '#FFF',
                      }
                }
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Select
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        className="mt-4"
        style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}
      />
    </div>
  );
}

export default HNHMarketHero;
