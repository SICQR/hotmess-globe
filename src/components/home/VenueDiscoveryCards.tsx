/**
 * VenueDiscoveryCards — horizontal-scroll portrait cards for tonight's venues.
 *
 * Data source: app_banners WHERE placement = 'home_partner_events'.
 * Same data as PartnerEventBanners but rendered as a swipeable portrait strip
 * instead of a vertical 16:9 stack. This IS the discovery layer on Home.
 *
 * Phil 2026-06-16: Home redesign — venue cards replace the stacked banner layout.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const GREEN = '#30D158';

interface Banner {
  id: string;
  headline: string;
  subline: string | null;
  cta_url: string | null;
  image_url: string | null;
  badge_text: string | null;
  bg_color: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

function isLiveNow(b: Banner): boolean {
  if (!b.starts_at || !b.ends_at) return false;
  const now = Date.now();
  return now >= new Date(b.starts_at).getTime() && now < new Date(b.ends_at).getTime();
}

function isSoon(b: Banner): boolean {
  if (!b.starts_at) return false;
  const diff = new Date(b.starts_at).getTime() - Date.now();
  return diff > 0 && diff < 6 * 60 * 60 * 1000;
}

export default function VenueDiscoveryCards() {
  const navigate = useNavigate();
  const [banners, setBanners] = React.useState<Banner[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('app_banners')
      .select('id, headline, subline, cta_url, image_url, badge_text, bg_color, starts_at, ends_at')
      .eq('placement', 'home_partner_events')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order('priority', { ascending: false })
      .then(({ data }) => {
        if (data) setBanners(data);
        setLoaded(true);
      });
  }, []);

  if (loaded && banners.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between px-5 mb-3">
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          On the ground tonight
        </span>
        <button
          type="button"
          onClick={() => navigate('/pulse')}
          className="text-[11px] font-semibold"
          style={{ color: GOLD }}
        >
          Open map →
        </button>
      </div>

      <div
        className="flex gap-2.5 overflow-x-auto pl-5 lg:overflow-x-visible lg:flex-wrap lg:justify-center lg:px-0"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingRight: 20 }}
      >
        {!loaded && [0, 1].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-[22px] animate-pulse"
            style={{ width: 200, height: 260, background: '#0f0f11', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        ))}

        {banners.map((b) => {
          const live = isLiveNow(b);
          const soon = !live && isSoon(b);

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => b.cta_url && window.open(b.cta_url, '_blank', 'noopener')}
              className="flex-shrink-0 relative overflow-hidden active:scale-[0.97] transition-transform text-left"
              style={{
                width: 200,
                height: 260,
                borderRadius: 22,
                background: b.bg_color || '#0f0f11',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              aria-label={b.headline}
            >
              {b.image_url ? (
                <img
                  src={b.image_url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    background: b.bg_color
                      ? `linear-gradient(135deg, ${b.bg_color}cc 0%, ${b.bg_color}44 100%)`
                      : 'linear-gradient(135deg, #1a0533 0%, #0d1117 50%, #0a1628 100%)',
                  }}
                >
                  <span
                    className="absolute bottom-16 left-4 text-[72px] font-black leading-none select-none"
                    style={{ color: 'rgba(255,255,255,0.06)' }}
                  >
                    {b.headline?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}

              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.75) 65%, rgba(0,0,0,0.97) 100%)',
                }}
              />

              {(live || soon || b.badge_text) && (
                <div className="absolute top-3 left-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.12em] uppercase rounded-full px-2 py-1"
                    style={
                      live
                        ? { background: 'rgba(48,209,88,0.14)', color: GREEN, border: '1px solid rgba(48,209,88,0.28)' }
                        : { background: 'rgba(200,150,44,0.12)', color: GOLD, border: '1px solid rgba(200,150,44,0.28)' }
                    }
                  >
                    {live && (
                      <span
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: GREEN, animation: 'pulse 2s ease-in-out infinite' }}
                      />
                    )}
                    {live ? 'Live now' : soon ? 'Tonight' : (b.badge_text ?? '')}
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-[15px] font-black text-white leading-tight tracking-tight mb-1">
                  {b.headline}
                </p>
                {b.subline && (
                  <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {b.subline}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
