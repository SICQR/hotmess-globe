/**
 * GhostedStrip — full-bleed photo banner CTA matching home redesign mockup.
 *
 * Layout: avatar stack (left) · count + tagline (centre) · "Ghosted →" gold btn (right)
 * Height: 110px. Background: /public/images/ghosted-cover.jpg.
 *
 * Phil 2026-06-16: Home redesign V4.1 — matches agreed mockup.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';

interface AvatarRow {
  avatar_url: string | null;
}

interface GhostedStripProps {
  rnCount: number;
}

export default function GhostedStrip({ rnCount }: GhostedStripProps) {
  const navigate = useNavigate();
  const [avatars, setAvatars] = React.useState<string[]>([]);

  React.useEffect(() => {
    supabase
      .from('right_now_status')
      .select('profiles!inner(avatar_url)')
      .eq('is_active', true)
      .limit(3)
      .then(({ data }) => {
        if (!data) return;
        const urls = (data as unknown as { profiles: AvatarRow }[])
          .map((r) => r.profiles?.avatar_url)
          .filter((u): u is string => !!u);
        setAvatars(urls);
      });
  }, []);

  const hasCount = rnCount > 0;

  return (
    <button
      type="button"
      onClick={() => navigate('/ghosted')}
      className="mx-4 mb-4 relative overflow-hidden rounded-[20px] active:scale-[0.98] transition-transform text-left"
      style={{ height: 110, width: 'calc(100% - 32px)', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Open Ghosted"
    >
      {/* Background photo */}
      <img
        src="/images/ghosted-cover.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
        loading="lazy"
      />
      {/* Scrim — heavier on left for legibility */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.3) 100%)' }}
      />

      {/* Content row */}
      <div className="relative flex items-center h-full px-4 gap-3">

        {/* Avatar stack */}
        <div className="flex items-center flex-shrink-0">
          {avatars.length > 0 ? (
            <div className="flex -space-x-2.5">
              {avatars.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                  style={{ border: '2px solid rgba(0,0,0,0.5)' }}
                />
              ))}
              {hasCount && rnCount > avatars.length && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: 'rgba(200,150,44,0.2)',
                    color: GOLD,
                    border: '2px solid rgba(0,0,0,0.5)',
                    marginLeft: '-10px',
                  }}
                >
                  +{rnCount - avatars.length}
                </div>
              )}
            </div>
          ) : (
            /* Placeholder rings while avatars load */
            <div className="flex -space-x-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(0,0,0,0.5)' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-white tracking-tight leading-tight">
            {hasCount ? `${rnCount} men out right now` : "Who's out tonight?"}
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Don&rsquo;t guess. See them.
          </p>
        </div>

        {/* CTA — solid gold, matches mockup */}
        <div
          className="px-4 py-2 rounded-full text-[11px] font-black whitespace-nowrap flex-shrink-0"
          style={{ background: GOLD, color: '#000' }}
        >
          Ghosted →
        </div>

      </div>
    </button>
  );
}
