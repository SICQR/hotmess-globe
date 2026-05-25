import React, { useRef, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

// City / area / postcode search for the single-engine Pulse map. Uses Mapbox
// forward geocoding (the token is already loaded for the map) and hands the chosen
// place back as { lat, lng, zoom } so the parent can flyTo it. Debounced, keyboard
// dismissible, privacy-light (query goes only to Mapbox, no result is stored).

const TOKEN = (import.meta && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';

// Zoom target by result granularity — a postcode/neighbourhood lands at street
// level, a city/region pulls back to district scale.
function zoomForType(t) {
  const k = String(t || '');
  if (/postcode|address|poi/.test(k)) return 15;
  if (/neighborhood|locality/.test(k)) return 14;
  if (/place|district/.test(k)) return 11;
  return 9; // region / country
}

export default function PulseSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const runSearch = (value) => {
    setQ(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.trim().length < 2 || !TOKEN) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
          + encodeURIComponent(value.trim()) + '.json'
          + '?limit=6&types=place,locality,neighborhood,postcode,district,region,address'
          + '&access_token=' + encodeURIComponent(TOKEN);
        const res = await fetch(url);
        const json = await res.json();
        const feats = Array.isArray(json.features) ? json.features : [];
        setResults(feats
          .filter((f) => Array.isArray(f.center) && f.center.length === 2)
          .map((f) => ({
            id: f.id,
            name: f.place_name || f.text || '',
            center: f.center,
            type: (Array.isArray(f.place_type) && f.place_type[0]) || '',
          })));
        setOpen(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const pick = (r) => {
    if (!r || !Array.isArray(r.center)) return;
    const [lng, lat] = r.center;
    if (onSelect) onSelect({ lat, lng, zoom: zoomForType(r.type) });
    setQ(r.name);
    setOpen(false);
    setResults([]);
  };

  const clear = () => { setQ(''); setResults([]); setOpen(false); };

  return (
    <div className="absolute top-[calc(104px+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 w-[min(86%,340px)] z-40" data-pull-refresh-ignore>
      <div className="flex items-center gap-2 bg-black/60 border border-white/20 backdrop-blur-md rounded-full px-4 py-2.5 shadow-lg">
        {loading ? (
          <Loader2 className="w-4 h-4 text-white/50 animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
        )}
        <input
          value={q}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') clear();
            if (e.key === 'Enter' && results[0]) pick(results[0]);
          }}
          placeholder="Search city, area, postcode"
          aria-label="Search for a city, area, or postcode"
          className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/35"
        />
        {q && (
          <button onClick={clear} aria-label="Clear search" className="text-white/40 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="mt-2 bg-[#0A0A0A]/95 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => pick(r)}
                className="w-full text-left px-4 py-3 text-sm text-white/85 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
