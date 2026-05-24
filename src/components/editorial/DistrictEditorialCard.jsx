import React, { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { X } from 'lucide-react';

// District culture surface — editorial voice + cultural memory in local mode.
// docs/GLOBE_DISTRICT_EDITORIAL_AND_CURATION_SYSTEM.md (editorial) and
// docs/GLOBE_EVENT_ARCHIVE_AND_CULTURAL_MEMORY_SYSTEM.md (archive).
// All content is public-read; renders nothing if there's nothing to show or a fetch
// fails, so it can never break the map. Sits above the map overlay; dismissible.
export default function DistrictEditorialCard({ citySlug }) {
  const [data, setData] = useState(null);
  const [archive, setArchive] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDismissed(false);
    setData(null);
    setArchive([]);
    if (!citySlug) return undefined;
    (async () => {
      try {
        const { data: row } = await supabase
          .from('district_editorial_profiles')
          .select('title, blurb, mood, curator, accent_color')
          .eq('city_slug', citySlug)
          .maybeSingle();
        if (!cancelled) setData(row || null);
      } catch (e) { /* non-fatal */ }
      try {
        const { data: arch } = await supabase
          .from('archived_events')
          .select('title, year, venue_name')
          .eq('city_slug', citySlug)
          .eq('visibility', 'public')
          .order('year', { ascending: false })
          .limit(2);
        if (!cancelled) setArchive(Array.isArray(arch) ? arch : []);
      } catch (e) { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [citySlug]);

  if (dismissed || (!data && archive.length === 0)) return null;
  const accent = (data && data.accent_color) || '#C8962C';

  return (
    <div
      className="absolute top-[calc(16px+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[122] w-[min(92vw,420px)] bg-black/75 border border-white/15 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl"
      data-pull-refresh-ignore
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {data ? (
            <>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>
                {data.mood || 'District'}
              </div>
              <h3 className="text-white text-base font-black italic tracking-tight leading-tight">{data.title}</h3>
              {data.blurb && <p className="text-white/70 text-xs leading-snug mt-1.5">{data.blurb}</p>}
              {data.curator && (
                <div className="text-white/40 text-[10px] uppercase tracking-wider mt-2">Curated · {data.curator}</div>
              )}
            </>
          ) : (
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>Cultural memory</div>
          )}

          {archive.length > 0 && (
            <div className="mt-2.5 border-t border-white/10 pt-2">
              <div className="text-white/40 text-[9px] uppercase tracking-widest mb-1">From the archive</div>
              {archive.map((a, i) => (
                <div key={i} className="text-white/65 text-[11px] leading-snug">
                  <span className="text-white/85">{a.title}</span>
                  {a.year ? ` · ${a.year}` : ''}
                  {a.venue_name ? ` · ${a.venue_name}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1.5 bg-white/5 rounded-full text-white/50 hover:bg-white/15 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
