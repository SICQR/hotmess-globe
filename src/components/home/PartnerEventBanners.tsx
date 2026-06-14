/**
 * PartnerEventBanners — full-bleed image cards for partner events.
 * Reads from app_banners WHERE placement = 'home_partner_events'.
 * Shows active banners with ON NOW / COMING SOON badges.
 * Tap opens the cta_url in external browser.
 *
 * Phil 2026-06-14: SBN & Horsefair partner integration.
 */

import React from 'react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';

interface PartnerBanner {
  id: string;
  headline: string;
  subline: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string | null;
  badge_text: string | null;
  bg_color: string | null;
  accent_color: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export default function PartnerEventBanners() {
  const [banners, setBanners] = React.useState<PartnerBanner[]>([]);

  React.useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('app_banners')
      .select('id, headline, subline, cta_text, cta_url, image_url, badge_text, bg_color, accent_color, starts_at, ends_at')
      .eq('placement', 'home_partner_events')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('priority', { ascending: false })
      .then(({ data }) => {
        if (data) setBanners(data);
      });
  }, []);

  if (!banners.length) return null;

  return (
    <div className="px-4 space-y-3">
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30 mb-1">
        On the ground tonight
      </div>
      {banners.map((b) => {
        const isLive = b.starts_at && b.ends_at
          ? new Date() >= new Date(b.starts_at) && new Date() < new Date(b.ends_at)
          : false;

        return (
          <button
            key={b.id}
            type="button"
            onClick={() => b.cta_url && window.open(b.cta_url, '_blank', 'noopener')}
            className="relative w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
            style={{ aspectRatio: '16/9', background: b.bg_color || '#0A0A0A' }}
          >
            {b.image_url && (
              <img
                src={b.image_url}
                alt={b.headline}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.15) 50%, transparent 100%)' }}
            />
            {(b.badge_text || isLive) && (
              <span
                className="absolute top-3 right-3 text-[10px] font-black tracking-[0.14em] uppercase px-2.5 py-1 rounded-full"
                style={isLive
                  ? { background: GOLD, color: '#050507' }
                  : { background: 'rgba(5,5,7,0.72)', color: GOLD, border: '1px solid rgba(200,150,44,0.4)', backdropFilter: 'blur(8px)' }
                }
              >
                {isLive ? 'ON NOW' : b.badge_text}
              </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
              <h3 className="text-base font-black text-white tracking-tight leading-tight mb-0.5">
                {b.headline}
              </h3>
              {b.subline && (
                <p className="text-[12px] text-white/60 leading-tight mb-2">{b.subline}</p>
              )}
              {b.cta_text && (
                <span
                  className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full"
                  style={{ background: b.accent_color || GOLD, color: '#050507' }}
                >
                  {b.cta_text}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
