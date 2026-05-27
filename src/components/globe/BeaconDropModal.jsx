import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, Sparkles, Loader2, ShoppingBag, Dumbbell, PartyPopper, Flame, Crown, Coffee, Plus, HandHeart, Eye } from 'lucide-react';
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
  // Postcode override — dropper-private input. Postcode text is NEVER written
  // to the beacons row; we forward-geocode via api.postcodes.io and persist
  // only the resolved coordinates. Other users see the bucketed cue.
  // Per sacred-invariants rule #7 (no exact tracking).
  const [locationMode, setLocationMode] = useState('gps'); // 'gps' | 'postcode'
  const [postcode, setPostcode] = useState('');
  const [postcodeCoords, setPostcodeCoords] = useState(null);
  const [postcodeError, setPostcodeError] = useState(null);
  const [resolvingPostcode, setResolvingPostcode] = useState(false);
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
      //  1. Postcode mode + resolved coords (dropper-private input)
      //  2. Explicit point passed by caller (e.g. local-map centre)
      //  3. Device GPS
      let lat, lng;
      if (locationMode === 'postcode' && postcodeCoords) {
        lat = postcodeCoords.lat;
        lng = postcodeCoords.lng;
      } else if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
        lat = Number(location.lat);
        lng = Number(location.lng);
      } else {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
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
        // Mirror to latitude/longitude for legacy mapboxLayerStack payload
        // (toPublicSafeFeatureCollection reads `lat || location_lat`).
        latitude: lat,
        longitude: lng,
        starts_at: new Date().toISOString(),
        ends_at: expiresAt,
        intensity: 80,
        visibility: 'public',
        code: `B44-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        metadata: { title: title.trim() }
      });
      if (error) throw error;
      toast.success('Beacon dropped on the globe!');

      onComplete?.();
      onClose();
    } catch (err) {
      console.error('Beacon drop error:', err);
      if (err.code === 1) {
        toast.error('Location denied. Please enable GPS permissions to drop a beacon.');
      } else if (err.code === 3) {
        toast.error('Location timeout. Please try again.');
      } else {
        toast.error('Failed to drop beacon. Ensure GPS is enabled.');
      }
    } finally {

      setLoading(false);
    }
  };

  // Forward-geocode UK postcode via postcodes.io (free, no auth, UK-only).
  // We never store the raw postcode — only resolved coords on the row, and
  // those get privacy-snapped to a ~1.1km grid on read by toPublicSafeFeatureCollection.
  const lookupPostcode = async () => {
    const pc = (postcode || '').trim();
    if (!pc) { setPostcodeError('Enter a UK postcode'); return; }
    setResolvingPostcode(true);
    setPostcodeError(null);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Postcode not found');
        throw new Error('Lookup failed — try again');
      }
      const json = await res.json();
      const r = json && json.result;
      if (!r || r.latitude == null || r.longitude == null) throw new Error('No coordinates for that postcode');
      setPostcodeCoords({ lat: Number(r.latitude), lng: Number(r.longitude) });
    } catch (err) {
      setPostcodeError(err.message || 'Postcode lookup failed');
      setPostcodeCoords(null);
    } finally {
      setResolvingPostcode(false);
    }
  };

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
            className="fixed inset-x-0 bottom-0 z-[131] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,20px))]"
          >

            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#C8962C]/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#C8962C]" />
                </div>
                <h3 className="text-xl font-black italic tracking-tight text-white uppercase">Drop Beacon</h3>
              </div>
            </div>

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

              {/* Location mode — GPS (default) or UK postcode override.
                  Postcode is dropper-private: text never stored, only resolved coords. */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 block">Location</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setLocationMode('gps'); setPostcodeError(null); }}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                      locationMode === 'gps' ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/55 border border-white/10'
                    }`}
                  >
                    Use my GPS
                  </button>
                  <button
                    onClick={() => setLocationMode('postcode')}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                      locationMode === 'postcode' ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/55 border border-white/10'
                    }`}
                  >
                    Use postcode
                  </button>
                </div>
                {locationMode === 'postcode' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        value={postcode}
                        onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setPostcodeError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') lookupPostcode(); }}
                        placeholder="E.g. E1 6AN"
                        maxLength={10}
                        autoCapitalize="characters"
                        autoComplete="postal-code"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm tracking-wider font-mono placeholder:text-white/20 focus:border-[#C8962C]/50 outline-none"
                      />
                      <button
                        onClick={lookupPostcode}
                        disabled={!postcode || resolvingPostcode}
                        className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                          postcode && !resolvingPostcode ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/25 cursor-not-allowed'
                        }`}
                      >
                        {resolvingPostcode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PIN'}
                      </button>
                    </div>
                    {postcodeError && <p className="text-[11px] text-[#FF4F9A]">{postcodeError}</p>}
                    {postcodeCoords && !postcodeError && (
                      <p className="text-[11px] text-[#C8962C] font-semibold">Postcode pinned — fuzzy radius set</p>
                    )}
                    <p className="text-[10px] text-white/30 leading-snug">
                      Your postcode stays private. Only an approximate radius is shown.
                    </p>
                  </div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDrop}
                disabled={loading || !title.trim() || (locationMode === 'postcode' && !postcodeCoords)}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



