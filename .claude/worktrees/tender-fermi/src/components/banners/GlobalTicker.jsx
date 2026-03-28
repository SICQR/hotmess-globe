/**
 * GlobalTicker — CSS marquee for global_ticker banners
 *
 * Renders a continuous scrolling ticker above the bottom nav.
 * Content comes from app_banners WHERE placement = 'global_ticker'.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBanners } from '@/services/AppBannerService';

export function GlobalTicker({ className = '' }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    fetchBanners('global_ticker').then((banners) => {
      if (mounted && banners.length > 0) {
        setItems(banners);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (items.length === 0) return null;

  const handleClick = (item) => {
    if (!item.cta_url) return;
    if (item.cta_url.startsWith('http')) {
      window.open(item.cta_url, '_blank', 'noopener');
    } else {
      navigate(item.cta_url);
    }
  };

  // Build ticker content — duplicate for seamless loop
  const tickerContent = items.map((item, i) => (
    <span
      key={i}
      className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => handleClick(item)}
    >
      {item.badge_text && (
        <span
          className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
          style={{ backgroundColor: item.accent_color || '#C8962C', color: '#000' }}
        >
          {item.badge_text}
        </span>
      )}
      <span className="text-[11px] font-bold text-white/70 uppercase tracking-wide">
        {item.headline}
      </span>
      {item.subline && (
        <span className="text-[10px] text-white/40">{item.subline}</span>
      )}
      <span className="text-white/10 mx-3">•</span>
    </span>
  ));

  return (
    <div
      className={`w-full overflow-hidden bg-[#0D0D0D]/95 backdrop-blur-sm border-t border-white/5 ${className}`}
      style={{ height: '36px', flexShrink: 0 }}
    >
      <div className="ticker-track flex items-center h-full whitespace-nowrap">
        <div className="ticker-content inline-flex items-center animate-ticker">
          {tickerContent}
          {tickerContent}
        </div>
      </div>

      <style>{`
        @keyframes ticker-run {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-run 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

export default GlobalTicker;
