/**
 * GhostedStrip — compact CTA strip for the Ghosted feature.
 *
 * Shows live user count + 3 avatar previews, taps into /ghosted.
 * Background: /public/images/ghosted-cover.jpg (exists in repo).
 *
 * Phil 2026-06-16: Home redesign — replaces the buried Ghosted hook.
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

  return (
    <button
      type="button"
      onClick={() => navigate('/ghosted')}
      className="mx-5 mb-4 relative overflow-hidden rounded-[18px] active:scale-[0.98] transition-transform text-left"
      style={{ minHeight: 88, border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label="Open Ghosted"
    >
      <img
        src="/images/ghosted-cover.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 100%)' }}
      />

      <div className="relative flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-[15px] font-black text-white tracking-tight mb-0.5">Ghosted</p>
          <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {rnCount > 0 ? `${rnCount} out right now` : 'Drop your beacon'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {avatars.length > 0 && (
            <div className="flex -space-x-2">
              {avatars.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border-2 border-black"
                />
              ))}
            </div>
          )}
          <span
            className="text-[11px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(200,150,44,0.15)', color: GOLD, border: '1px solid rgba(200,150,44,0.3)' }}
          >
            I'm out →
          </span>
        </div>
      </div>
    </button>
  );
}
