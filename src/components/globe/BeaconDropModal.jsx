import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, Sparkles, Loader2, ShoppingBag, Dumbbell, PartyPopper, Flame, Crown, Coffee, Plus, HandHeart, Eye, Crosshair, Search } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

// HOTMESS Beacon Identity System — 9 doctrine sprite categories.
// Each id is a valid beacon_category value per migration
// expand_beacon_category_to_9_doctrine_sprites (2026-05-27).
const BEACON_TYPES = [
  { id: 'gym',       label: 'Gym',       icon: Dumbbell,    color: '#FF5500' },
  { id: 'club',      label: 'Club',      icon: PartyPopper, color: '#A899D8' },
  { id: 'sauna',     label: 'Sauna',     icon: Flame,       color: '#00C2E0' },
  { id: 'leather',   label: 'Leather',   icon: Crown,       color: '#C8962C' },
  { id: 'cafe',      label: 'Café',      icon: Coffee,      color: '#F5E6C8' },
  { id: 'clinic',    label: 'Clinic',    icon: Plus,        color: '#F4F1E8' },
  { id: 'aftercare', label: 'Aftercare', icon: HandHeart,   color: '#F4F1E8' },
  { id: 'cruising',  label: 'Cruising',  icon: Eye,         color: '#FF2D78' },
  { id: 'market',    label: 'Market',    icon: ShoppingBag, color: '#C8962C' },
];


export default function BeaconDropModal({ isOpen, onClose, onComplete, location }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('club');
  // Location: a single autocompleting search resolves city / area / postcode /
  // street / venue name via Mapbox geocoding (same token + endpoint used by
  // the header PulseSearch — no CSP issues, no carrier blocks, works without
  // device GPS). The chosen entry hands { lat, lng } that we'll persist. The
  // search text itself is NEVER written to the beacons row — only the resolved
  // coords (which are privacy-snapped to ~1.1km on the read path).
  // Per sacred-invariants rule #7 (no exact tracking).
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [pickedPlace, setPickedPlace] = useState(null); // { name, lat, lng }
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [usingGps, setUsingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const placeDebounceRef = React.useRef(null);
  const MAPBOX_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';
  const [loading, setLoading] = useState(false);

  const handleDrop = async () => {
    if (!title.trim()) {
      toast.error('Give your beacon a title');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Location resolution priority:
      //  1. Picked place from the Mapbox autocomplete (typed city/area/postcode/venue)
      //  2. Device GPS captured via the inline "use my location" button
      //  3. Explicit point passed by caller (e.g. local-map centre tap)
      //  Fallback ladder so the user is NEVER blocked by GPS permission alone —
      //  the typed search is the primary input; GPS is just a shortcut.
      let lat, lng;
      if (pickedPlace) {
        lat = pickedPlace.lat;
        lng = pickedPlace.lng;
      } else if (gpsCoords) {
        lat = gpsCoords.lat;
        lng = gpsCoords.lng;
      } else if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
        lat = Number(location.lat);
        lng = Number(location.lng);
      } else {
        throw new Error('NO_LOCATION_PICKED');
      }
      
      // All user-dropped beacons go in via the beacons table with a 9-cat sprite
      // identity (clinic + aftercare are care states, both still beacons — the
      // legacy pulse_places branch for 'recovery' is removed; aftercare lives
      // alongside the others now).
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('beacons').insert({
        owner_id: user.id,
        title: title.trim(),
        // type is the broad enum (CHECK: social/event/drop/market/radio/safety/user).
        // All user-dropped beacons are 'user' — the sprite identity lives in
        // beacon_category. Keep the two in sync per doctrine.
        type: 'user',
        beacon_category: kind,
        status: 'active',
        geo_lat: lat,
        geo_lng: lng,
        // NOTE: do NOT set latitude/longitude — those are GENERATED columns
        // (derived from geo_lat/geo_lng by Postgres). Postgres errors out
        // with 'cannot insert a non-DEFAULT value into column latitude' if
        // we try. PR #518 added them by mistake — Phil reported "Failed to
        // drop beacon, try a different location" on every attempt since.
        starts_at: new Date().toISOString(),
        ends_at: expiresAt,
        intensity: 80,
        visibility: 'public',
        code: `B44-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        metadata: { title: title.trim() }
      });
      if (error) throw error;
      toast.success('Beacon dropped on the globe!');

      // Pass the resolved coords back so the parent can refresh the beacon
      // feed AND flyTo the drop point — the realtime INSERT subscription
      // shouldn't be the only path to "see your beacon land", because
      // even when realtime fires the map is at globe-zoom and a single
      // beacon is invisible until the camera moves. Phil 2026-05-27:
      // drops confirmed by DB but never seen on the map.
      onComplete?.({ lat, lng });
      onClose();
    } catch (err) {
      console.error('Beacon drop error:', err);
      if (err && err.message === 'NO_LOCATION_PICKED') {
        toast.error('Pick a place or tap "use my location" first.');
      } else if (err && err.code === 1) {
        toast.error('Location denied. Allow GPS or type a postcode/area instead.');
      } else if (err && err.code === 3) {
        toast.error('Location timed out. Try typing a postcode or area.');
      } else {
        toast.error('Failed to drop beacon. Try a different location.');
      }
    } finally {

      setLoading(false);
    }
  };

  // Forward-geocode via Mapbox places (same endpoint + token used by the
  // header PulseSearch). Accepts cities, areas, postcodes, addresses, and POIs
  // — one input handles "Soho", "E1 6AN", "Eagle London", etc. Privacy: the
  // query text never lands on the beacons row, only resolved coords.
  const runPlaceSearch = (value) => {
    setPlaceQuery(value);
    setPickedPlace(null);
    setGeocodeError(null);
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!value || value.trim().length < 2 || !MAPBOX_TOKEN) {
      setPlaceResults([]);
      setPlaceOpen(false);
      return;
    }
    setGeocoding(true);
    placeDebounceRef.current = setTimeout(async () => {
      try {
        const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
          + encodeURIComponent(value.trim()) + '.json'
          + '?limit=6&types=place,locality,neighborhood,postcode,district,address,poi'
          + '&access_token=' + encodeURIComponent(MAPBOX_TOKEN);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geocode failed');
        const json = await res.json();
        const feats = Array.isArray(json.features) ? json.features : [];
        setPlaceResults(feats
          .filter((f) => Array.isArray(f.center) && f.center.length === 2)
          .map((f) => ({
            id: f.id,
            name: f.place_name || f.text || '',
            lng: f.center[0],
            lat: f.center[1],
          })));
        setPlaceOpen(true);
      } catch (err) {
        setGeocodeError('Could not search places — try GPS instead');
        setPlaceResults([]);
      } finally {
        setGeocoding(false);
      }
    }, 280);
  };

  const pickPlace = (r) => {
    if (!r) return;
    setPickedPlace({ name: r.name, lat: r.lat, lng: r.lng });
    setPlaceQuery(r.name);
    setPlaceOpen(false);
    setPlaceResults([]);
    setGpsCoords(null); // explicit picks override any prior GPS capture
  };

  const captureGps = async () => {
    if (!navigator.geolocation) {
      setGeocodeError('GPS not supported in this browser');
      return;
    }
    setUsingGps(true);
    setGeocodeError(null);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setPickedPlace(null);
      setPlaceQuery('My current location');
    } catch (err) {
      setGeocodeError(err && err.code === 1
        ? 'GPS denied — type a postcode or area instead'
        : 'GPS failed — type a postcode or area instead');
    } finally {
      setUsingGps(false);
    }
  };

  // Clean up debounce timer on unmount
  useEffect(() => () => { if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current); }, []);

  // A location is set if we've picked a place OR captured GPS OR a caller-passed location exists
  const hasLocation = Boolean(
    pickedPlace ||
    gpsCoords ||
    (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)))
  );

    return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130]"
          />
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            // Sheet caps at 88vh so the drag handle + DROP BEACON header stay visible
            // on small phones; the content area below scrolls. PR fixed Phil's
            // 2026-05-27 report that the modal was pushing off the top of the
            // screen because the 9-cat picker + location UI was tall.
            style={{ maxHeight: '70dvh' }}  // dvh = dynamic viewport height; accounts for mobile browser chrome
            className="fixed inset-x-0 bottom-0 z-[131] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] flex flex-col overflow-hidden"
          >

            {/* Drag handle + DROP BEACON header — pinned outside the scroll
                area so the user can always see what sheet they're in and grab
                the drag pip to dismiss. Phil 2026-05-27: sheet was still scrolling
                title off-screen because the header was inside the overflow-y-auto. */}
            <div className="flex-shrink-0 px-6 pt-3 pb-4 border-b border-white/5">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#C8962C]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4.5 h-4.5 text-[#C8962C]" />
                </div>
                <h3 className="text-base font-black italic tracking-tight text-white uppercase">Drop Beacon</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,20px))]">

            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-8 flex gap-3">
              <Info className="w-5 h-5 text-[#C8962C] flex-shrink-0 mt-0.5" />
              <p className="text-white/60 text-xs leading-relaxed">
                Dropping a beacon alerts other members to your location for the next <span className="text-white">4 hours</span>. 
                Use this to find friends or coordinate meetups.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Beacon Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 20))}
                  placeholder="What's happening?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-bold focus:border-[#C8962C]/50 outline-none transition-all placeholder:text-white/10"
                />
                <div className="flex justify-end mt-2">
                  <span className="text-[10px] font-mono text-white/20">{title.length}/20</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Beacon Kind</label>
                <div className="grid grid-cols-3 gap-2">

                  {BEACON_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setKind(type.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        kind === type.id 
                          ? 'bg-white/10 border-white/20 scale-[1.02]' 
                          : 'bg-transparent border-transparent grayscale opacity-40'
                      }`}
                    >
                      <type.icon className="w-5 h-5" style={{ color: kind === type.id ? type.color : 'white' }} />
                      <span className="text-[9px] font-black uppercase tracking-wider text-white">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location — one input for city / area / postcode / venue name (Mapbox
                  autocomplete) + a "use my location" shortcut. The search text never
                  lands on the beacons row — only resolved coords. */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Where</label>
                <div className="relative">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-3 focus-within:border-[#C8962C]/50 transition-colors">
                    {geocoding ? (
                      <Loader2 className="w-4 h-4 text-white/50 animate-spin flex-shrink-0" />
                    ) : (
                      <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
                    )}
                    <input
                      value={placeQuery}
                      onChange={(e) => runPlaceSearch(e.target.value)}
                      onFocus={() => { if (placeResults.length) setPlaceOpen(true); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && placeResults[0]) pickPlace(placeResults[0]);
                      }}
                      placeholder="Type a postcode, area, or venue"
                      className="flex-1 min-w-0 bg-transparent outline-none text-white text-sm placeholder:text-white/30"
                    />
                  </div>
                  {placeOpen && placeResults.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-2 bg-[#0A0A0A]/95 border border-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                      {placeResults.map((r) => (
                        <li key={r.id}>
                          <button
                            onClick={() => pickPlace(r)}
                            className="w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                          >
                            {r.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={captureGps}
                    disabled={usingGps}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                      gpsCoords ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/65 border border-white/10'
                    }`}
                  >
                    {usingGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {gpsCoords ? 'GPS pinned' : 'Use my location'}
                  </button>
                  {pickedPlace && !gpsCoords && (
                    <span className="text-[11px] text-[#C8962C] font-semibold truncate">Pinned · {pickedPlace.name}</span>
                  )}
                </div>
                {geocodeError && (
                  <p className="text-[11px] text-[#FF4F9A] mt-2">{geocodeError}</p>
                )}
                <p className="text-[10px] text-white/30 leading-snug mt-2">
                  Your location stays private. Only an approximate radius is shown to others.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDrop}
                disabled={loading || !title.trim() || !hasLocation}
                className="w-full h-16 bg-[#C8962C] disabled:bg-white/10 disabled:text-white/20 rounded-2xl text-black font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                style={{ boxShadow: !loading && title.trim() ? '0 10px 40px -10px rgba(200, 150, 44, 0.5)' : 'none' }}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Drop Signal
                  </>
                )}
              </motion.button>
            </div>
            </div>{/* /scroll wrapper */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}







