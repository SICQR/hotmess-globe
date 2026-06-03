/**
 * UnifiedSignalEmissionSheet — the canonical "Go Live" surface (D56).
 *
 * One component. Every drop surface routes here. Same field set, same hierarchy,
 * same sticky CTA, same emotional meaning ("the intent IS the signal").
 *
 * Field doctrine (Phil 2026-06-03 Samui ratification):
 *   - Intent grid (PRIMARY — above the fold)
 *   - Title (optional, defaults to intent label)
 *   - Duration (4 chips, Tonight default)
 *   - Location (GPS-first single tap, postcode expandable)
 *   - Sticky "Go Live" CTA at bottom
 *
 * Removed per doctrine: description, address/venue, visibility selector,
 * intensity slider. These are creator-economy primitives. A beacon is
 * presence emission, not event publishing.
 *
 * Post-drop continuity (D13/D14/D17): onSuccess receives {lat,lng} so the
 * parent surface can closeSheet → pulse:flyto → navigate('/pulse'). The
 * city visibly registers the signal.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Loader2, Crosshair, Zap, MapPin } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { usePowerups } from '@/hooks/usePowerups';

const BEACON_DAILY_LIMIT = 3;

const BEACON_INTENTS = [
  { intent: 'looking',    label: 'Looking',           subtitle: 'Open to connect',          legacyType: 'user',    legacyCategory: 'user',      globeColor: '#C8962C', globePulseType: 'standard', globeSizeBase: 1.0 },
  { intent: 'hosting',    label: 'Hosting',           subtitle: 'Party or play at my place', legacyType: 'event',   legacyCategory: 'event',     globeColor: '#FF4F9A', globePulseType: 'flare',    globeSizeBase: 2.0 },
  { intent: 'arriving',   label: 'Arriving',          subtitle: 'Just landed somewhere',    legacyType: 'social',  legacyCategory: 'user',      globeColor: '#C8962C', globePulseType: 'standard', globeSizeBase: 1.2 },
  { intent: 'cruising',   label: 'Cruising',          subtitle: 'Active signal, eyes up',   legacyType: 'social',  legacyCategory: 'cruising',  globeColor: '#C8962C', globePulseType: 'ripple',   globeSizeBase: 1.0 },
  { intent: 'aftercare',  label: 'Aftercare offered', subtitle: 'Land here if you need it', legacyType: 'safety',  legacyCategory: 'aftercare', globeColor: '#F4ECD8', globePulseType: 'steady',   globeSizeBase: 1.0 },
  { intent: 'quiet_hold', label: 'Quiet hold',        subtitle: 'Low-key, around if needed', legacyType: 'social',  legacyCategory: 'user',      globeColor: '#C8962C', globePulseType: 'steady',   globeSizeBase: 0.8 },
  { intent: 'market',     label: 'Selling / swap',    subtitle: 'I have something to move', legacyType: 'market',  legacyCategory: 'market',    globeColor: '#C8962C', globePulseType: 'standard', globeSizeBase: 1.0 },
];

const INTENT_BY_VALUE = Object.fromEntries(BEACON_INTENTS.map((i) => [i.intent, i]));

// Doctrine durations (Phil 2026-06-03). Until Morning = until 6am next day.
const DURATIONS = [
  { id: 'tonight',     label: 'Tonight',        ms: 4 * 60 * 60 * 1000 },
  { id: '2hr',         label: '2 Hours',        ms: 2 * 60 * 60 * 1000 },
  { id: 'until_morning', label: 'Until Morning', ms: null /* computed */ },
];

function computeEndsAt(now, duration) {
  if (duration.id === 'until_morning') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    // If it's already past midnight before 6am, end at 6am today
    if (now.getHours() < 6) {
      const today = new Date(now);
      today.setHours(6, 0, 0, 0);
      return today;
    }
    return next;
  }
  return new Date(now.getTime() + (duration.ms || 4 * 60 * 60 * 1000));
}

export default function UnifiedSignalEmissionSheet({ onSuccess, initialCoords }) {
  const [selectedIntent, setSelectedIntent] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [coords, setCoords] = useState(initialCoords || null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(BEACON_DAILY_LIMIT);
  const [quotaChecked, setQuotaChecked] = useState(false);
  const { isActive: isBoostActive, consume: consumeBoost } = usePowerups();

  // GPS-first: auto-fetch on mount if no initial coords
  useEffect(() => {
    if (coords) return;
    if (!navigator.geolocation) {
      setLocationError('Location not supported on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        setLocationError(null);
      },
      (err) => {
        setLocating(false);
        setLocationError(err.code === 1 ? 'Location permission needed' : 'Could not pin your location');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, [coords]);

  // Daily quota check
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !alive) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('beacons')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .gte('starts_at', todayStart.toISOString());
        if (!alive) return;
        setQuotaUsed(count ?? 0);
        setQuotaChecked(true);
      } catch { /* non-fatal */ }
    })();
    return () => { alive = false; };
  }, []);

  const effectiveLimit = quotaLimit + (isBoostActive('extra_beacon_drop') ? 1 : 0);
  const atLimit = quotaChecked && quotaUsed >= effectiveLimit;

  const canDrop = Boolean(selectedIntent && coords && !saving && !atLimit);

  const retryLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      (err) => { setLocating(false); setLocationError(err.code === 1 ? 'Location permission needed' : 'Could not pin your location'); },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const handleGoLive = async () => {
    if (!canDrop) return;
    setSaving(true);
    const intent = INTENT_BY_VALUE[selectedIntent];
    const titleStr = title.trim() || intent.label;
    const now = new Date();
    const endsAt = computeEndsAt(now, duration);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to go live');
      const { error } = await supabase.from('beacons').insert({
        code: nanoid(8),
        type: intent.legacyType,
        beacon_category: intent.legacyCategory,
        owner_id: user.id,
        // geo_lat/geo_lng only — latitude/longitude are generated columns (#889)
        geo_lat: coords.lat,
        geo_lng: coords.lng,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        intensity: 3, // doctrine-default; removed from UI
        status: 'active',
        title: titleStr,
        description: null, // doctrine: removed
        globe_color: intent.globeColor,
        globe_pulse_type: intent.globePulseType,
        globe_size_base: intent.globeSizeBase,
        visibility: 'public', // doctrine-default; removed from UI
        metadata: { intent: intent.intent, intent_label: intent.label, ui: 'unified_v1' },
      });
      if (error) throw error;
      if (isBoostActive('extra_beacon_drop')) {
        try { await consumeBoost('extra_beacon_drop'); } catch { /* non-fatal */ }
      }
      toast.success('You’re live.');
      // Post-drop continuity (D13/D14/D17): parent navigates + flies camera
      setTimeout(() => onSuccess?.({ lat: coords.lat, lng: coords.lng }), 900);
    } catch (err) {
      toast.error((err && err.message) || 'Couldn’t go live');
      setSaving(false);
    }
  };

  const intentSpec = selectedIntent ? INTENT_BY_VALUE[selectedIntent] : null;

  // Limit-reached state (rare — beta users have 3/day)
  if (atLimit) {
    return (
      <div className="flex flex-col h-full px-4 py-6 items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-white/30" />
        </div>
        <h2 className="text-white font-black text-xl mb-2">You’ve gone live enough today</h2>
        <p className="text-white/40 text-sm mb-6 max-w-[280px]">
          {quotaUsed}/{effectiveLimit} signals out. Come back tonight — the city will still be here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Scrollable content — pb large so sticky CTA doesn't cover last input */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {/* 1-line atmospheric explainer (D56 §2) */}
        <p className="text-white/40 text-xs mb-5 leading-relaxed">
          Choose your mood. Tap once. The city reacts.
          {quotaChecked && (
            <span className="ml-2 text-white/20">({quotaUsed}/{effectiveLimit} tonight)</span>
          )}
        </p>

        {/* INTENT — primary, above the fold */}
        <div className="mb-5">
          <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-2">Signal</div>
          <div className="grid grid-cols-1 gap-2">
            {BEACON_INTENTS.map((t) => {
              const isSelected = selectedIntent === t.intent;
              return (
                <button
                  key={t.intent}
                  type="button"
                  onClick={() => setSelectedIntent(t.intent)}
                  className={`bg-[#1C1C1E] rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] flex items-center justify-between gap-3 ${
                    isSelected ? 'border border-[#C8962C]' : 'border border-white/10'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{t.label}</div>
                    <div className="text-white/40 text-xs truncate">{t.subtitle}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-[#C8962C]' : 'bg-white/15'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* TITLE — optional, single line, defaults to intent label */}
        <div className="mb-5">
          <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-2">Title — optional</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={intentSpec ? intentSpec.label : 'At Eagle, In Soho, Studio tonight…'}
            maxLength={40}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#C8962C]/40"
          />
        </div>

        {/* DURATION — 4 chips, Tonight default */}
        <div className="mb-5">
          <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-2">Until</div>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((d) => {
              const isSel = duration.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                    isSel
                      ? 'bg-[#C8962C] text-black'
                      : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LOCATION — GPS-first, single tap */}
        <div className="mb-5">
          <div className="text-white/40 text-[10px] uppercase tracking-[0.18em] mb-2">Where</div>
          {locating ? (
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl px-4 py-3 text-white/40 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding you…
            </div>
          ) : coords ? (
            <div className="bg-[#1C1C1E] border border-[#C8962C]/30 rounded-2xl px-4 py-3 text-white/80 text-sm flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#C8962C]" />
              Using your current location
            </div>
          ) : (
            <button
              type="button"
              onClick={retryLocation}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm flex items-center gap-2 active:scale-[0.99]"
            >
              <Crosshair className="w-4 h-4 text-[#C8962C]" />
              Use my location
            </button>
          )}
          {locationError && (
            <p className="text-[#FF4F9A] text-xs mt-2">{locationError}</p>
          )}
        </div>
      </div>

      {/* Sticky CTA — always thumb-reachable */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)]"
        style={{ background: 'linear-gradient(to top, #000 0%, #000 60%, rgba(0,0,0,0.6) 85%, transparent 100%)' }}
      >
        <button
          type="button"
          onClick={handleGoLive}
          disabled={!canDrop}
          className="w-full h-14 bg-[#C8962C] disabled:bg-white/10 disabled:text-white/30 rounded-2xl text-black font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform shadow-[0_15px_35px_-12px_rgba(200,150,44,0.5)]"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Going live…
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Go Live
            </>
          )}
        </button>
      </div>
    </div>
  );
}
