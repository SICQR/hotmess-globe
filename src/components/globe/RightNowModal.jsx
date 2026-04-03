import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Home, Car, Building, HelpCircle, Sparkles, X, Camera, MapPin, Clock, Eye, Edit3, Square, Users, Send as SendIcon } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useGlobe } from '@/contexts/GlobeContext';
import { usePowerups } from '@/hooks/usePowerups';
import { useSheet } from '@/contexts/SheetContext';
import { uploadToStorage } from '@/lib/uploadToStorage';

const DURATIONS = [
  { value: 60,   label: '1 hour' },
  { value: 120,  label: '2 hours' },
  { value: 240,  label: '4 hours' },
  { value: 0,    label: 'Until I stop' },
];

const LOGISTICS = [
  { value: 'can_host',    label: 'Can host',   icon: Home },
  { value: 'can_travel',  label: 'Can travel', icon: Car },
  { value: 'hotel',       label: 'Hotel',      icon: Building },
  { value: 'undecided',   label: 'Undecided',  icon: HelpCircle },
];

const VISIBILITY_OPTIONS = [
  { value: 'nearby',   label: 'Nearby only', icon: MapPin },
  { value: 'city',     label: 'My city',     icon: Building },
  { value: 'everyone', label: 'Everyone',    icon: Eye },
  { value: 'mutuals',  label: 'Mutuals only', icon: Users },
];

export default function RightNowModal({ isOpen, onClose, intent: intentProp = 'explore' }) {
  const [duration, setDuration]       = useState(120);
  const [logistics, setLogistics]     = useState([]);
  const [coldVibe, setColdVibe]       = useState(false);
  const [headline, setHeadline]       = useState('');
  const [visibility, setVisibility]   = useState('nearby');
  const [venueTag, setVenueTag]       = useState('');
  const [photoFile, setPhotoFile]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [isLive, setIsLive]           = useState(false);
  const [venues, setVenues]           = useState([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [vibeBlast, setVibeBlast]     = useState(false);
  const fileInputRef = useRef(null);
  const { emitPulse } = useGlobe();
  const { isActive: isBoostActive, expiresAt: boostExpiresAt } = usePowerups();
  const { openSheet } = useSheet();

  // Fetch venues for autocomplete
  useEffect(() => {
    if (!isOpen) return;
    supabase.from('venues').select('id, name, city').limit(50)
      .then(({ data }) => { if (data) setVenues(data); });
  }, [isOpen]);

  // Check if user is already live
  useEffect(() => {
    if (!isOpen) return;
    const checkLive = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('right_now_status')
        .select('*')
        .eq('user_email', user.email)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      if (data) setIsLive(true);
    };
    checkLive();
  }, [isOpen]);

  const filteredVenues = venueTag.length >= 2
    ? venues.filter(v => v.name.toLowerCase().includes(venueTag.toLowerCase())).slice(0, 5)
    : [];

  const toggleLogistics = (val) =>
    setLogistics(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleEndLive = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('right_now_status')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_email', user.email);
      setIsLive(false);
      toast.success('You are no longer live');
    } catch {
      toast.error('Failed to end live status');
    } finally {
      setLoading(false);
    }
  };

  const goLive = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not logged in'); return; }

      const durationMs = duration === 0
        ? 365 * 24 * 60 * 60 * 1000 // "Until I stop" = 1 year (effectively forever)
        : duration * 60 * 1000;
      const expires_at = new Date(Date.now() + durationMs).toISOString();

      // Try to capture GPS
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 60000,
              enableHighAccuracy: false,
            })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          // GPS denied or unavailable
        }
      }

      // Upload photo if provided
      let photoUrl = null;
      if (photoFile) {
        try {
          photoUrl = await uploadToStorage(photoFile, 'uploads', user.id);
        } catch {
          // Photo upload failed — continue without it
        }
      }

      // Write to right_now_status TABLE
      const { error } = await supabase
        .from('right_now_status')
        .upsert({
          user_email: user.email,
          user_id: user.id ?? null,
          intent: intentProp,
          timeframe: duration === 0 ? 'indefinite' : duration < 60 ? `${duration}m` : `${duration/60}h`,
          active: true,
          updated_at: new Date().toISOString(),
          expires_at,
          location,
          preferences: {
            logistics,
            cold_vibe: coldVibe,
            headline: headline.trim() || null,
            visibility,
            venue_tag: venueTag.trim() || null,
            photo_url: photoUrl,
            vibe_blast: vibeBlast && isBoostActive('vibe_blast'),
          },
        }, { onConflict: 'user_email' });

      if (error) throw error;

      // Signal the Globe
      emitPulse?.({
        type: 'right_now',
        lat: location?.lat,
        lng: location?.lng,
        metadata: { intent: intentProp, duration, headline: headline.trim() },
      });

      setIsLive(true);
      toast.success(
        location
          ? "You're live! Beacon placed on the globe."
          : "You're live! Allow location access to appear on the globe."
      );
    } catch (err) {
      toast.error(err.message || 'Failed to go live');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end justify-center pb-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6 border border-[#C8962C]/20 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#C8962C]" />
                <span className="text-white font-black text-lg uppercase">Go Right Now</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success state: You're Live */}
            {isLive ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C8962C]/20 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-[#C8962C]" />
                </div>
                <h3 className="text-white font-black text-xl mb-1">You're Live</h3>
                <p className="text-white/40 text-sm mb-6">People nearby can see your status</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsLive(false)}
                    className="py-3 rounded-2xl text-sm font-bold bg-white/10 border border-white/10 text-white"
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={handleEndLive}
                    disabled={loading}
                    className="py-3 rounded-2xl text-sm font-bold bg-red-500/20 border border-red-500/30 text-red-400"
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    End
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="w-full mt-3 py-3 rounded-2xl text-sm font-bold bg-[#C8962C] text-black"
                >
                  See who noticed
                </button>
              </div>
            ) : (
              <>
                {/* Headline */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Headline (optional)</p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 60))}
                    placeholder="What are you up to?"
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#C8962C]/50"
                    maxLength={60}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20">
                    {headline.length}/60
                  </span>
                </div>

                {/* Duration */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Duration
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {DURATIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setDuration(value)}
                      className={`py-3 rounded-2xl text-sm font-black transition-all ${
                        duration === value
                          ? 'bg-[#C8962C] text-black'
                          : 'bg-black/40 border border-white/10 text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Visibility */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                  <Eye className="w-3 h-3 inline mr-1" />
                  Who can see
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setVisibility(value)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${
                        visibility === value
                          ? 'bg-[#C8962C]/20 border border-[#C8962C] text-[#C8962C]'
                          : 'bg-black/40 border border-white/10 text-white/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Logistics */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Logistics</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {LOGISTICS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => toggleLogistics(value)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${
                        logistics.includes(value)
                          ? 'bg-[#C8962C]/20 border border-[#C8962C] text-[#C8962C]'
                          : 'bg-black/40 border border-white/10 text-white/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Venue tag */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Venue (optional)
                </p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={venueTag}
                    onChange={(e) => {
                      setVenueTag(e.target.value);
                      setShowVenueSuggestions(true);
                    }}
                    onFocus={() => setShowVenueSuggestions(true)}
                    placeholder="Tag a venue..."
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white text-sm font-medium placeholder:text-white/25 focus:outline-none focus:border-[#C8962C]/50"
                  />
                  {showVenueSuggestions && filteredVenues.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden z-10">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setVenueTag(v.name);
                            setShowVenueSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-white/30" />
                          <span>{v.name}</span>
                          {v.city && <span className="text-white/25 text-xs ml-auto">{v.city}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photo upload */}
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                  <Camera className="w-3 h-3 inline mr-1" />
                  Photo (optional)
                </p>
                <div className="mb-4">
                  {photoPreview ? (
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 rounded-2xl border border-dashed border-white/15 text-white/30 text-sm font-semibold flex items-center justify-center gap-2 active:bg-white/5 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Add a photo
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Cold Vibe */}
                <button
                  onClick={() => setColdVibe(prev => !prev)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl mb-3 border transition-all ${
                    coldVibe ? 'bg-green-500/10 border-green-500/50' : 'bg-black/40 border-white/10'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 flex-shrink-0 ${coldVibe ? 'text-green-400' : 'text-white/30'}`} />
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase ${coldVibe ? 'text-green-400' : 'text-white/50'}`}>Cold Vibe Mode</p>
                    <p className="text-[10px] text-white/30">Cali Sober. Emerald glow on globe</p>
                  </div>
                  <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${coldVibe ? 'bg-green-500 border-green-500' : 'border-white/20'}`}>
                    {coldVibe && <div className="w-2 h-2 bg-black rounded-full" />}
                  </div>
                </button>

                {/* Vibe Blast */}
                <button
                  onClick={() => {
                    if (isBoostActive('vibe_blast')) {
                      setVibeBlast(prev => !prev);
                    } else {
                      openSheet('boost-shop', {});
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl mb-5 border transition-all ${
                    vibeBlast && isBoostActive('vibe_blast')
                      ? 'bg-[#C8962C]/10 border-[#C8962C]/50'
                      : 'bg-black/40 border-white/10'
                  }`}
                >
                  <SendIcon className={`w-4 h-4 flex-shrink-0 ${vibeBlast && isBoostActive('vibe_blast') ? 'text-[#C8962C]' : 'text-white/30'}`} />
                  <div className="text-left flex-1">
                    <p className={`text-xs font-black uppercase ${vibeBlast && isBoostActive('vibe_blast') ? 'text-[#C8962C]' : 'text-white/50'}`}>
                      Vibe Blast
                      {!isBoostActive('vibe_blast') && <span className="text-[10px] font-normal text-white/25 ml-2">POWER-UP</span>}
                    </p>
                    <p className="text-[10px] text-white/30">Broadcast to everyone you're connected to</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    vibeBlast && isBoostActive('vibe_blast') ? 'bg-[#C8962C] border-[#C8962C]' : 'border-white/20'
                  }`}>
                    {vibeBlast && isBoostActive('vibe_blast') && <div className="w-2 h-2 bg-black rounded-full" />}
                  </div>
                </button>

                <button
                  onClick={goLive}
                  disabled={loading}
                  className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl uppercase disabled:opacity-60"
                >
                  {loading ? 'Going live...' : vibeBlast && isBoostActive('vibe_blast') ? 'Blast Live' : 'Go Live'}
                </button>
                <p className="text-[10px] text-white/20 text-center mt-3">Ends automatically. No ghost status.</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
