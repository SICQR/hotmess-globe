/**
 * CareOnTheGroundStrip — A quiet horizontal row of currently-live curated
 * care beacons (Vauxhall chemsex hub, 56 Dean Street, Antidote, Royal Free,
 * etc.). Rendered AFTER the people row so the sexual/social grid leads
 * the page, with care surfacing as ground-truth, not the headline.
 *
 * Phil 2026-06-03 Samui — Ghosted grid revival.
 *
 * Product ruling (Phil, same session):
 *   "The care beacon strip should not make Ghosted feel like a recovery
 *   directory. Ghosted is the 'men in the room' surface. Care can appear
 *   as ground truth, but not dominate the sexual/social grid."
 *
 *   "Visually: nightlife gold first, care cream/white quieter, no panic/
 *   service energy unless user taps into Care."
 *
 * Therefore:
 *   - Label: "ON THE GROUND TONIGHT" (NOT "Care nearby" / "Aftercare hubs"
 *     / "Support beacons" — those read clinical and dominate the room).
 *   - Visual: cream rule on deep slate, no gold glow, no pulsing dot. The
 *     strip should read like a quiet sidebar of "here if you need it",
 *     not a recovery service window.
 *   - Position: under the people row, above the filter chips. People-first.
 *
 * Doctrine:
 *   D15 Care Language — no "support", no "help", no "wellness", no
 *     "service". Just the place name + a CARE tag.
 *   D14 Routing as Continuity — tap a tile flies to that beacon coord on
 *     /pulse, never an external map.
 *   D17 No silent affordance — disabled visibly when coords missing.
 *   D49 Entity ontology — these are kind=place beacons, separate read row
 *     from the kind=person row above (GhostedRecentStories).
 *
 * Renders nothing when no live care beacons exist.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';

interface CareBeaconTile {
  id: string;
  title: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
}

export function CareOnTheGroundStrip() {
  const navigate = useNavigate();
  const [tiles, setTiles] = React.useState<CareBeaconTile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data } = await supabase
          .from('beacons')
          .select('id, title, beacon_category, latitude, longitude')
          .is('owner_id', null)
          .eq('active', true)
          .gt('ends_at', nowIso)
          .in('beacon_category', ['aftercare', 'care'])
          .order('created_at', { ascending: false })
          .limit(12);

        if (cancelled) return;
        const mapped: CareBeaconTile[] = (data || []).map((b: any) => ({
          id: b.id,
          title: b.title || 'Care',
          category: b.beacon_category,
          lat: typeof b.latitude === 'number' ? b.latitude : null,
          lng: typeof b.longitude === 'number' ? b.longitude : null,
        }));
        setTiles(mapped);
      } catch {
        // Silent — non-essential strip, fail to empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  if (tiles.length === 0) return null;

  return (
    <div className="px-3 pt-2 pb-1">
      {/* Section label — cream, restrained, never gold. Says "ground truth"
          not "headline". Brand voice: declarative, no marketing verb. */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-white/55">
          On the ground tonight
        </span>
        <span className="text-[8px] tracking-wider uppercase text-white/20">
          {tiles.length}
        </span>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-x',
        }}
      >
        {tiles.map((tile) => {
          const tappable = tile.lat != null && tile.lng != null;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                if (!tappable) return;
                navigate('/pulse', {
                  state: {
                    flyTo: { lat: tile.lat, lng: tile.lng, zoom: 15 },
                    focusBeaconId: tile.id,
                  },
                });
              }}
              disabled={!tappable}
              aria-label={`${tile.title} — tap to find on the map`}
              className="shrink-0 relative overflow-hidden rounded-lg text-left transition-transform active:scale-[0.98] disabled:opacity-35 disabled:active:scale-100"
              style={{
                width: 118,
                height: 78,
                // Quiet cream-on-slate. No gold, no glow, no panic energy.
                background: 'linear-gradient(180deg, rgba(28,28,30,0.92) 0%, rgba(12,12,14,0.96) 100%)',
                border: '1px solid rgba(245,238,220,0.14)',
              }}
            >
              {/* No pulsing dot. A tiny cream sigil instead — "here, quietly". */}
              <span
                aria-hidden="true"
                className="absolute"
                style={{
                  top: 7,
                  left: 7,
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'rgba(245,238,220,0.45)',
                }}
              />

              {/* CARE tag — cream/30, top-right. Says what without raising voice. */}
              <span
                className="absolute text-[7px] font-black tracking-[0.14em] uppercase"
                style={{ top: 7, right: 7, color: 'rgba(245,238,220,0.45)' }}
              >
                CARE
              </span>

              {/* Title — 2 lines max, soft white, bottom-aligned */}
              <span
                className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 pt-2 block text-[10.5px] font-medium leading-tight"
                style={{
                  color: 'rgba(245,238,220,0.86)',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {tile.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CareOnTheGroundStrip;
