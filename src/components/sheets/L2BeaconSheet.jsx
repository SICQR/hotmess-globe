/**
 * L2BeaconSheet — View or create a beacon
 *
 * If `beaconId` is passed → shows beacon details (viewer mode).
 * If no `beaconId` → shows multi-step beacon creation flow.
 */

import { useState, useEffect } from 'react';
import {
  MapPin, Clock, Radio, Loader2, Navigation, ExternalLink,
  CheckCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// BEACON TYPE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const BEACON_TYPES = [
  { value: 'party',    label: 'Party',    emoji: '🎉' },
  { value: 'meetup',   label: 'Meetup',   emoji: '📍' },
  { value: 'event',    label: 'Event',    emoji: '🏳️‍🌈' },
  { value: 'cruising', label: 'Cruising', emoji: '👁️' },
  { value: 'safety',   label: 'Safety',   emoji: '🛡️' },
];

const DURATIONS = [
  { label: 'Tonight', ms: 6 * 60 * 60 * 1000 },
  { label: '2hr',     ms: 2 * 60 * 60 * 1000 },
  { label: '4hr',     ms: 4 * 60 * 60 * 1000 },
  { label: '6hr',     ms: 6 * 60 * 60 * 1000 },
  { label: '24hr',    ms: 24 * 60 * 60 * 1000 },
];

const VISIBILITIES = ['public', 'friends', 'private'];

// ─────────────────────────────────────────────────────────────────────────────
// CREATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

function BeaconCreator({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', address: '' });
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [visibility, setVisibility] = useState('public');
  const [intensity, setIntensity] = useState(3);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, value) => setFormData(f => ({ ...f, [key]: value }));

  // Step 3: auto-fetch location when arriving
  useEffect(() => {
    if (step === 3) fetchLocation();
  }, [step]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location — please allow location access');
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async () => {
    if (!coords) return toast.error('Location required — tap Retry to get it');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to drop a beacon');

      const now = new Date();
      const endsAt = new Date(now.getTime() + duration.ms);

      const { error } = await supabase.from('beacons').insert({
        type: selectedType,
        owner_id: user.id,
        lat: coords.lat,
        lng: coords.lng,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        intensity: intensity,
        visibility: visibility,
        kind: selectedType,
        mode: 'active',
        metadata: {
          title: formData.title.trim() || null,
          description: formData.description.trim() || null,
          address: formData.address.trim() || null,
        },
      });

      if (error) throw error;

      setSaved(true);
      toast.success('Beacon dropped!');
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to drop beacon');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 — Type selector ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col h-full px-4 py-4">
        <h2 className="text-white font-black text-xl mb-1">Drop a Beacon</h2>
        <p className="text-white/40 text-sm mb-5">What kind of beacon is this?</p>

        <div className="grid grid-cols-2 gap-3 flex-1">
          {BEACON_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`bg-[#1C1C1E] rounded-2xl p-4 text-left transition-all active:scale-95 ${
                selectedType === t.value
                  ? 'border border-[#C8962C]'
                  : 'border border-white/10'
              }`}
            >
              <span className="text-2xl block mb-2">{t.emoji}</span>
              <span className="text-white font-bold text-sm">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-4">
          <button
            onClick={() => setStep(2)}
            disabled={!selectedType}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              selectedType
                ? 'bg-[#C8962C] text-black active:scale-95'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2 — Details form ─────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-white/40 text-sm mb-2 -ml-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <h2 className="text-white font-black text-xl">Beacon Details</h2>

          {/* Title */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Title
            </label>
            <input
              value={formData.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Give your beacon a name..."
              maxLength={80}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What's the vibe?"
              rows={3}
              maxLength={300}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Address / Venue
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={formData.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Club name or address..."
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Duration
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    duration.label === d.label
                      ? 'bg-[#C8962C] text-black'
                      : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              {VISIBILITIES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    visibility === v
                      ? 'bg-[#C8962C] text-black'
                      : 'bg-[#1C1C1E] text-white/50 border border-white/10'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Intensity — <span className="text-[#C8962C]">{intensity}/5</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={intensity}
              onChange={e => setIntensity(Number(e.target.value))}
              className="w-full accent-[#C8962C]"
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>Low key</span>
              <span>Full send</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-white/8">
          <button
            onClick={() => setStep(3)}
            className="w-full py-4 rounded-2xl font-black text-sm bg-[#C8962C] text-black flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Next — Location <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 — Location + confirm ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-full px-4 py-4">
      <button
        onClick={() => setStep(2)}
        className="flex items-center gap-1 text-white/40 text-sm mb-4 -ml-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-white font-black text-xl mb-1">Your Location</h2>
      <p className="text-white/40 text-sm mb-6">
        The beacon will be pinned to your current position.
      </p>

      {/* Location pill */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {locating ? (
          <div className="flex items-center gap-3 px-5 py-3 bg-[#1C1C1E] rounded-full border border-white/10">
            <Loader2 className="w-4 h-4 text-[#C8962C] animate-spin" />
            <span className="text-white/60 text-sm">Getting your location...</span>
          </div>
        ) : coords ? (
          <div className="flex items-center gap-3 px-5 py-3 bg-[#C8962C]/15 rounded-full border border-[#C8962C]/40">
            <MapPin className="w-4 h-4 text-[#C8962C]" />
            <span className="text-[#C8962C] text-sm font-semibold">Using your current location</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3 px-5 py-3 bg-[#1C1C1E] rounded-full border border-white/10">
              <MapPin className="w-4 h-4 text-white/30" />
              <span className="text-white/40 text-sm">Location not set</span>
            </div>
            <button
              onClick={fetchLocation}
              className="text-[#C8962C] text-sm font-bold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary card */}
        {selectedType && (
          <div className="w-full bg-[#1C1C1E] rounded-2xl p-4 border border-white/8 mt-4">
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-2">
              Beacon Summary
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Type</span>
                <span className="text-white font-semibold capitalize">{selectedType}</span>
              </div>
              {formData.title && (
                <div className="flex justify-between">
                  <span className="text-white/40">Title</span>
                  <span className="text-white font-semibold truncate ml-4 max-w-[55%]">{formData.title}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">Duration</span>
                <span className="text-white font-semibold">{duration.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Visibility</span>
                <span className="text-white font-semibold capitalize">{visibility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Intensity</span>
                <span className="text-[#C8962C] font-semibold">{intensity}/5</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!coords || loading || saved}
        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
          saved
            ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30'
            : coords && !loading
              ? 'bg-[#C8962C] text-black active:scale-95'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
        }`}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Dropping...</>
          : saved
            ? <><CheckCircle className="w-4 h-4" /> Beacon Dropped!</>
            : <><MapPin className="w-4 h-4" /> Confirm &amp; Drop</>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEWER MODE
// ─────────────────────────────────────────────────────────────────────────────

function BeaconViewer({ beaconId }) {
  const [beacon, setBeacon] = useState(null);
  const [loading, setLoading] = useState(true);
  const { openSheet } = useSheet();

  useEffect(() => {
    if (!beaconId) { setLoading(false); return; }
    supabase
      .from('beacons')
      .select('id, type, kind, lat, lng, starts_at, end_at, intensity, metadata')
      .eq('id', beaconId)
      .single()
      .then(({ data }) => {
        setBeacon(data);
        setLoading(false);
      });
  }, [beaconId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!beacon) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Radio className="w-10 h-10 text-white/10 mb-3" />
        <p className="text-white/50 font-bold text-sm">Beacon not found</p>
      </div>
    );
  }

  const meta = beacon.metadata || {};
  const title = meta.title || meta.name || `${beacon.kind || beacon.type} Beacon`;
  const address = meta.address || null;
  const description = meta.description || null;
  const imageUrl = meta.image_url || null;

  const kindColor = beacon.kind === 'event' ? '#C8962C'
    : beacon.kind === 'broadcast' ? '#B026FF'
    : '#00FF87';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {imageUrl && (
        <div className="w-full h-40 relative overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
        </div>
      )}

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border"
            style={{ color: kindColor, borderColor: `${kindColor}40`, backgroundColor: `${kindColor}15` }}
          >
            <Radio className="w-2.5 h-2.5" />
            {beacon.kind || beacon.type}
          </span>
          {beacon.intensity && (
            <span className="text-white/30 text-[10px]">
              Intensity: {beacon.intensity}/5
            </span>
          )}
        </div>

        <h2 className="text-white font-black text-xl leading-tight">{title}</h2>

        {description && (
          <p className="text-white/50 text-sm mt-2 leading-relaxed">{description}</p>
        )}

        {beacon.starts_at && (
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-3.5 h-3.5 text-[#C8962C] flex-shrink-0" />
            <span className="text-[#C8962C] text-xs font-semibold">
              {format(new Date(beacon.starts_at), 'EEE d MMM · h:mm a')}
              {beacon.ends_at ? ` → ${format(new Date(beacon.ends_at), 'h:mm a')}` : ''}
            </span>
          </div>
        )}

        {address && (
          <div className="flex items-start gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-white/40 flex-shrink-0 mt-0.5" />
            <span className="text-white/50 text-xs">{address}</span>
          </div>
        )}
      </div>

      {(beacon.lat && beacon.lng) && (
        <div className="px-4 py-4 flex gap-3 mt-auto">
          <button
            onClick={() => openSheet('directions', {
              lat: beacon.lat,
              lng: beacon.lng,
              label: title,
              address,
            })}
            className="flex-1 bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </button>
          <button
            onClick={() => window.open(`https://maps.google.com/?q=${beacon.lat},${beacon.lng}`, '_blank')}
            className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
          >
            <ExternalLink className="w-4 h-4 text-white/40" />
            Map
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — routes to viewer or creator
// ─────────────────────────────────────────────────────────────────────────────

export default function L2BeaconSheet({ beaconId }) {
  const { closeSheet } = useSheet();

  if (beaconId) {
    return <BeaconViewer beaconId={beaconId} />;
  }

  return <BeaconCreator onSuccess={closeSheet} />;
}
