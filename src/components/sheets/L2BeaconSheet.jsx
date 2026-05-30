/**
 * L2BeaconSheet — View or create a beacon
 *
 * If `beaconId` is passed → shows beacon details (viewer mode).
 * If no `beaconId` → shows multi-step beacon creation flow.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  MapPin, Clock, Radio, Loader2, Navigation, ExternalLink,
  CheckCircle, ChevronRight, ChevronLeft, Zap, Heart, MessageCircle,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errorUtils';
import { usePowerups } from '@/hooks/usePowerups';

// ─────────────────────────────────────────────────────────────────────────────
// BEACON ID NORMALISATION + KIND DETECTION
// Phil 2026-05-29: locked interaction contract.
//
// `owner_id` is IGNORED for kind detection. The seeded curated district/care
// /event signals are technically owned by an operator account but must NEVER
// render as a personal user-beacon (no "Boo SMASH" on Soho · Warming).
//
// Kind is computed purely from `metadata.curated`, `type`, `beacon_category`,
// and structural signals (venue_id, event_start_at). owner_id is only read
// inside the user-beacon branch, after the kind decision is final.
// ─────────────────────────────────────────────────────────────────────────────

const BEACON_ID_PREFIX_RE = /^beacon[:_]/;
function normaliseBeaconId(raw) {
  if (!raw) return raw;
  return String(raw).replace(BEACON_ID_PREFIX_RE, '');
}

/**
 * detectBeaconKind — pure function. NEVER reads owner_id.
 * Returns one of: 'district' | 'hotmess' | 'care' | 'event' | 'venue' | 'user'
 *
 * Resolution order:
 *   1. metadata.kind — explicit operator override (curated seeds, ops tools)
 *   2. metadata.curated === true → district (atmospheric pulse read)
 *   3. metadata.intent — first-class user-drop semantic (Slice 1, 2026-05-29)
 *   4. structural type + beacon_category heuristics — legacy fallback
 */
function detectBeaconKind(beacon) {
  if (!beacon) return 'user';
  const meta = beacon.metadata || {};
  const t = String(beacon.type || '').toLowerCase();
  const c = String(beacon.beacon_category || '').toLowerCase();

  // Explicit operator hint wins. Seeded district beacons set metadata.curated=true.
  if (meta.kind && typeof meta.kind === 'string') return meta.kind;
  if (meta.curated === true) {
    // (handled below, after intent check)
  }

  // First-class user intent (Slice 1). Map intent → card-rendering kind.
  // Looking/Arriving/Cruising/Quiet hold → user (Boo/Message branch).
  // Hosting → event (party invite, "I'm going" CTA).
  // Aftercare offered → care (no Boo, "What this offers" CTA).
  // Selling/swap → user for now; Slice 2 may split to a market kind.
  const intent = String(meta.intent || '').toLowerCase();
  if (intent) {
    if (intent === 'aftercare') return 'care';
    if (intent === 'hosting') return 'event';
    return 'user';
  }

  if (meta.curated === true) {
    // Curated editorial that isn't tied to a specific venue or scheduled event
    // is a district pulse read, not a party invite.
    if (!beacon.venue_id && !beacon.event_start_at) return 'district';
  }

  // HOTMESS broadcasts (radio etc.) — operator-owned ambient signal.
  if (t === 'radio' || c === 'hotmess') return 'hotmess';

  // Care / safety / recovery — never a tap-to-Boo target.
  if (t === 'safety' || c === 'safety' || c === 'aftercare' || c === 'clinic') return 'care';

  // Real events with a venue OR a schedule.
  if (t === 'event' && (beacon.venue_id || beacon.event_start_at)) return 'event';
  if (c === 'event' && (beacon.venue_id || beacon.event_start_at)) return 'event';

  // Curated event-shaped beacons without venue/schedule = district editorial.
  if (t === 'event' || c === 'event') return 'district';

  // Venue dots (gym/sauna/cafe/market/etc.)
  if (c === 'venue' || c === 'gym' || c === 'sauna' || c === 'cafe' || c === 'market' ||
      c === 'club' || c === 'leather' || c === 'cruising') return 'venue';

  // Default: a real human's personal drop. Boo/Message branch applies.
  return 'user';
}

const BEACON_DAILY_LIMIT = 3; // default daily beacon limit per user

// ─────────────────────────────────────────────────────────────────────────────
// BEACON TYPE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

// Drop Beacon — INTENT picker (Phil locked 2026-05-29).
//
// A beacon answers "what are you signalling right now?" — NOT "what type of
// place are you?" Venues (gym/sauna/cafe/clinic/club/leather/market-as-place)
// are a different entity that belongs in the venue catalog, not the user
// drop flow. See docs/doctrine/12-drop-beacon-doctrine.md.
//
// Each option carries:
//   intent           — first-class semantic; written to metadata.intent and
//                      used by the kind-router to render the right card.
//   label            — what the user sees.
//   subtitle         — micro-copy under the label (one short line, optional).
//   legacyType       — slotted into `beacons.type` so the existing CHECK
//                      constraint (social/event/drop/market/radio/safety/user)
//                      accepts the row. Replaced by Slice 2 schema.
//   legacyCategory   — slotted into `beacons.beacon_category` for back-compat
//                      with the sprite renderer (CHECK accepts venue/user/
//                      event/hotmess/safety/gym/club/sauna/leather/cafe/clinic
//                      /aftercare/cruising/market). Replaced by Slice 2.
//   globeColor       — gold for personal user signals, pink for hosting,
//                      cream for care, kept honest with the L2 sheet accent.
//   globePulseType   — visual rhythm; matches Beacon Identity System palette.
//   globeSizeBase    — relative footprint on /pulse.
const BEACON_INTENTS = [
  {
    intent: 'looking',
    label: 'Looking',
    subtitle: 'Open to connect',
    legacyType: 'user',     legacyCategory: 'user',
    globeColor: '#C8962C',  globePulseType: 'standard', globeSizeBase: 1.0,
  },
  {
    intent: 'hosting',
    label: 'Hosting',
    subtitle: 'Party or play at my place',
    legacyType: 'event',    legacyCategory: 'event',
    globeColor: '#FF4F9A',  globePulseType: 'flare',    globeSizeBase: 2.0,
  },
  {
    intent: 'arriving',
    label: 'Arriving',
    subtitle: 'Just landed somewhere',
    legacyType: 'social',   legacyCategory: 'user',
    globeColor: '#C8962C',  globePulseType: 'standard', globeSizeBase: 1.2,
  },
  {
    intent: 'cruising',
    label: 'Cruising',
    subtitle: 'Active signal, eyes up',
    legacyType: 'social',   legacyCategory: 'cruising',
    globeColor: '#C8962C',  globePulseType: 'ripple',   globeSizeBase: 1.0,
  },
  {
    intent: 'aftercare',
    label: 'Aftercare offered',
    subtitle: 'Land here if you need it',
    legacyType: 'safety',   legacyCategory: 'aftercare',
    globeColor: '#F4ECD8',  globePulseType: 'steady',   globeSizeBase: 1.0,
  },
  {
    intent: 'quiet_hold',
    label: 'Quiet hold',
    subtitle: 'Low-key, around if needed',
    legacyType: 'social',   legacyCategory: 'user',
    globeColor: '#C8962C',  globePulseType: 'steady',   globeSizeBase: 0.8,
  },
  {
    intent: 'market',
    label: 'Selling / swap',
    subtitle: 'I have something to move',
    legacyType: 'market',   legacyCategory: 'market',
    globeColor: '#C8962C',  globePulseType: 'standard', globeSizeBase: 1.0,
  },
];

const INTENT_BY_VALUE = Object.fromEntries(BEACON_INTENTS.map((i) => [i.intent, i]));

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
  // Postcode override — dropper-private input. Postcode TEXT is NEVER written
  // to the beacons row; we forward-geocode via api.postcodes.io (free, UK-only,
  // no auth), apply the same privacy snap as GPS, and persist only the snapped
  // lat/lng. Other users see the bucketed cue ("nearby" / "in the area") —
  // never the postcode. Per sacred-invariants rule #7 (no exact tracking).
  const [locationMode, setLocationMode] = useState('gps'); // 'gps' | 'postcode'
  const [postcode, setPostcode] = useState('');
  const [postcodeError, setPostcodeError] = useState(null);
  const [resolvingPostcode, setResolvingPostcode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [beaconCount, setBeaconCount] = useState(0);
  const [limitChecked, setLimitChecked] = useState(false);
  const { isActive: isBoostActive, consume: consumeBoost } = usePowerups();
  const { openSheet } = useSheet();

  const set = (key, value) => setFormData(f => ({ ...f, [key]: value }));

  // Check how many beacons user has created today
  useEffect(() => {
    const checkLimit = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from('beacons')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .gte('starts_at', todayStart.toISOString());
        setBeaconCount(count ?? 0);
      } catch {
        // Non-fatal
      }
      setLimitChecked(true);
    };
    checkLimit();
  }, []);

  // Calculate effective limit (base + extra beacon drops)
  const extraBeacons = isBoostActive('extra_beacon_drop') ? 1 : 0;
  const effectiveLimit = BEACON_DAILY_LIMIT + extraBeacons;
  const atLimit = beaconCount >= effectiveLimit;

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

  // Forward-geocode a UK postcode → { lat, lng } via the free postcodes.io API.
  // Privacy: we never store the raw postcode string anywhere — only the resolved
  // (and later privacy-snapped) coordinates. Snap happens in
  // toPublicSafeFeatureCollection on the read path, so writes can use the precise
  // resolved coords; reads expose only the ~1.1km grid cell.
  const fetchLocationFromPostcode = async () => {
    const pc = (postcode || '').trim();
    if (!pc) {
      setPostcodeError('Enter a UK postcode');
      return;
    }
    setResolvingPostcode(true);
    setPostcodeError(null);
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) {
        if (res.status === 404) throw new Error('Postcode not found');
        throw new Error('Postcode lookup failed — try again');
      }
      const json = await res.json();
      const result = json && json.result;
      if (!result || result.latitude == null || result.longitude == null) {
        throw new Error('Postcode has no coordinates');
      }
      setCoords({ lat: Number(result.latitude), lng: Number(result.longitude) });
    } catch (err) {
      setPostcodeError(err.message || 'Postcode lookup failed');
      setCoords(null);
    } finally {
      setResolvingPostcode(false);
    }
  };

    const handleSubmit = async () => {
    if (!coords) return toast.error('Location required — tap Retry to get it');
    setLoading(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to drop a beacon');

      const now = new Date();
      const endsAt = new Date(now.getTime() + duration.ms);

      const titleStr = formData.title.trim() || null;
      const descStr  = formData.description.trim() || null;
      const addrStr  = formData.address.trim() || null;

      // Slice 1 (Phil 2026-05-29) — beacon-as-INTENT, not beacon-as-venue-type.
      //
      // `selectedType` here holds the intent value (e.g. 'looking', 'hosting').
      // We persist the intent in metadata.intent as the source of truth, and
      // shim `type` + `beacon_category` to legacy CHECK-accepted values so the
      // existing DB constraint passes without a migration. Slice 2 will add
      // first-class entity_kind + intent columns and retire this shim.
      const intentSpec = INTENT_BY_VALUE[selectedType] || INTENT_BY_VALUE.looking;

      const { error } = await supabase.from('beacons').insert({
        code:             nanoid(8),
        type:             intentSpec.legacyType,
        beacon_category:  intentSpec.legacyCategory,
        owner_id:         user.id,
        geo_lat:          coords.lat,
        geo_lng:          coords.lng,
        // latitude/longitude mirror geo_lat/geo_lng — both columns exist on
        // the table for legacy compatibility; populate both so the mapboxLayerStack
        // payload (which reads `lat||location_lat`) finds something.
        latitude:         coords.lat,
        longitude:        coords.lng,
        starts_at:        now.toISOString(),
        ends_at:          endsAt.toISOString(),
        intensity:        intensity,
        status:           'active',
        title:            titleStr,
        description:      descStr,
        // Globe visual config — derived from the intent spec.
        globe_color:      intentSpec.globeColor,
        globe_pulse_type: intentSpec.globePulseType,
        globe_size_base:  intentSpec.globeSizeBase,
        // First-class semantic. Read by detectBeaconKind() in this file and
        // by future consumers; survives the Slice 2 migration unchanged.
        metadata:         { intent: intentSpec.intent, intent_label: intentSpec.label },
      });

      if (error) throw error;

      // Phil 2026-05-27 — if this drop was the 'extra' enabled by the
      // power-up, decrement the credit. consumeBoost is a no-op if no
      // extra_beacon_drop is active. Awaited so the UI's next refresh
      // sees the new count, but errors are swallowed so a consume
      // failure never blocks the user from seeing their beacon land.
      if (isBoostActive('extra_beacon_drop')) {
        try { await consumeBoost('extra_beacon_drop'); } catch { /* never block UX */ }
      }

      setSaved(true);
      toast.success('Beacon dropped!');
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err) {
      toast.error(humanizeError(err, 'Failed to drop beacon'));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1 — Type selector ────────────────────────────────────────────────
  if (step === 1) {
    // Beacon limit reached
    if (limitChecked && atLimit) {
      return (
        <div className="flex flex-col h-full px-4 py-4 items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-white/30" />
          </div>
          <h2 className="text-white font-black text-xl mb-2">Beacon Limit Reached</h2>
          <p className="text-white/40 text-sm mb-6 max-w-[260px]">
            You've used {beaconCount}/{effectiveLimit} beacons today.
            {!isBoostActive('extra_beacon_drop') && ' Get an Extra Beacon Drop to drop one more.'}
          </p>
          {!isBoostActive('extra_beacon_drop') && (
            <button
              onClick={() => openSheet('boost-shop', {})}
              className="h-12 px-6 rounded-2xl flex items-center gap-2 font-bold text-sm text-black active:scale-95 transition-transform"
              style={{ backgroundColor: '#C8962C' }}
            >
              <Zap className="w-4 h-4" />
              Get Extra Beacon
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full px-4 py-4">
        <h2 className="text-white font-black text-xl mb-1">Drop a Beacon</h2>
        <p className="text-white/40 text-sm mb-5">
          What are you signalling right now?
          {limitChecked && <span className="ml-2 text-white/20">({beaconCount}/{effectiveLimit} today)</span>}
        </p>

        <div className="grid grid-cols-1 gap-2 flex-1">
          {BEACON_INTENTS.map((t) => {
            const isSelected = selectedType === t.intent;
            return (
              <button
                key={t.intent}
                onClick={() => setSelectedType(t.intent)}
                className={`bg-[#1C1C1E] rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98] flex items-center justify-between gap-3 ${
                  isSelected ? 'border border-[#C8962C]' : 'border border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm">{t.label}</div>
                  {t.subtitle && (
                    <div className="text-white/45 text-xs leading-snug mt-0.5">{t.subtitle}</div>
                  )}
                </div>
                <span
                  aria-hidden
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? '' : 'opacity-40'}`}
                  style={{
                    background: t.globeColor,
                    boxShadow: isSelected ? `0 0 10px ${t.globeColor}` : 'none',
                  }}
                />
              </button>
            );
          })}
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
      <p className="text-white/40 text-sm mb-4">
        Pin the beacon at your GPS — or enter a UK postcode if you're dropping it
        for somewhere else. Postcode stays private; only a fuzzy radius is shown.
      </p>

      {/* Location mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setLocationMode('gps'); setPostcodeError(null); if (!coords) fetchLocation(); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            locationMode === 'gps'
              ? 'bg-[#C8962C] text-black'
              : 'bg-[#1C1C1E] text-white/55 border border-white/10'
          }`}
        >
          USE MY GPS
        </button>
        <button
          onClick={() => { setLocationMode('postcode'); setCoords(null); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            locationMode === 'postcode'
              ? 'bg-[#C8962C] text-black'
              : 'bg-[#1C1C1E] text-white/55 border border-white/10'
          }`}
        >
          USE POSTCODE
        </button>
      </div>

      {/* Location surface — GPS pill OR postcode input */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {locationMode === 'gps' ? (
          locating ? (
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
          )
        ) : (
          <div className="w-full flex flex-col gap-3">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-black">
              UK Postcode
            </label>
            <div className="flex gap-2">
              <input
                value={postcode}
                onChange={(e) => { setPostcode(e.target.value.toUpperCase()); setPostcodeError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchLocationFromPostcode(); }}
                placeholder="E.g. E1 6AN"
                maxLength={10}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="postal-code"
                className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm tracking-wider font-mono focus:outline-none focus:border-[#C8962C]/60"
              />
              <button
                onClick={fetchLocationFromPostcode}
                disabled={!postcode || resolvingPostcode}
                className={`px-4 py-3 rounded-xl text-xs font-black transition-all ${
                  postcode && !resolvingPostcode
                    ? 'bg-[#C8962C] text-black active:scale-95'
                    : 'bg-white/5 text-white/25 cursor-not-allowed'
                }`}
              >
                {resolvingPostcode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'PIN'}
              </button>
            </div>
            {postcodeError && (
              <p className="text-[11px] text-[#FF4F9A]">{postcodeError}</p>
            )}
            {coords && !postcodeError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#C8962C]/12 rounded-lg border border-[#C8962C]/30">
                <MapPin className="w-3.5 h-3.5 text-[#C8962C]" />
                <span className="text-[#C8962C] text-[11px] font-semibold">Postcode pinned — your fuzzy radius is set</span>
              </div>
            )}
            <p className="text-[10px] text-white/35 leading-snug">
              Your postcode stays on your device. Only an approximate radius is shown to other users.
            </p>
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

function BeaconViewer({ beaconId, beacon: passedBeacon }) {
  const [beacon, setBeacon] = useState(passedBeacon || null);
  const [loading, setLoading] = useState(!passedBeacon);
  const [checkinCount, setCheckinCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState([]);
  const { openSheet, closeSheet } = useSheet();
  const navigate = useNavigate();

  // ── Viewer identity for user-beacon Boo/Message gate ──
  const [myUserId, setMyUserId] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setMyUserId(data?.user?.id ?? null);
    });
    return () => { alive = false; };
  }, []);
  const { sendTap, isMutualBoo } = useTaps(myUserId);

  // ── Owner display name for user-kind branch ──
  const [ownerName, setOwnerName] = useState(null);

  // Fetch the owner's display name only when we're in the user-beacon branch.
  // (Curated beacons must never surface the operator account that owns them.)
  //
  // Hooks rule: this effect MUST sit above the loading / !beacon early-returns
  // below (rules-of-hooks). The branch is gated by kind/ownerId INSIDE the
  // effect, so it's a no-op while beacon is loading or absent.
  useEffect(() => {
    const k = beacon ? detectBeaconKind(beacon) : null;
    const oId = (beacon && beacon.owner_id) || null;
    if (k !== 'user' || !oId) { setOwnerName(null); return; }
    let alive = true;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', oId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setOwnerName(data?.display_name ?? null);
      });
    return () => { alive = false; };
  }, [beacon]);

  // Check-in modal state (venue/event kinds only)
  const [showCheckinModal, setShowCheckinModal]   = useState(false);
  const [checkinStep, setCheckinStep]             = useState(1);
  const [checkinVisibility, setCheckinVisibility] = useState('private');
  const [tonightIntention, setTonightIntention]   = useState('');
  const [checkingIn, setCheckingIn]               = useState(false);
  const [activeCheckin, setActiveCheckin]         = useState(null);

  // The id arriving via deep-link / globe feature is sometimes prefixed
  // (`beacon:` from useRealtimeBeacons.js, `beacon_` from the pulse_signals
  // view). The raw uuid is what `beacons.id` stores — normalise before query.
  const cleanBeaconId = useMemo(() => normaliseBeaconId(beaconId), [beaconId]);

  useEffect(() => {
    if (passedBeacon) { setBeacon(passedBeacon); setLoading(false); }
    if (!cleanBeaconId) { setLoading(false); return; }
    supabase
      .from('beacons')
      .select('id, code, type, beacon_category, geo_lat, geo_lng, starts_at, ends_at, intensity, title, description, city_slug, globe_color, globe_pulse_type, globe_size_base, checkin_count, venue_id, owner_id, event_start_at, event_end_at, metadata')
      .eq('id', cleanBeaconId)
      .maybeSingle()
      .then(({ data }) => {
        setBeacon(prev => prev || data);
        setLoading(false);
      });
  }, [cleanBeaconId, passedBeacon]);

  // Fetch venue-specific data
  useEffect(() => {
    if (!beacon?.venue_id) return;

    // Use venue_checkin_counts view — bypasses RLS which limits direct reads to own rows
    supabase
      .from('venue_checkin_counts')
      .select('checkins_last_4h')
      .eq('venue_id', beacon.venue_id)
      .maybeSingle()
      .then(({ data }) => setCheckinCount(
        data?.checkins_last_4h || beacon.checkin_count || 0
      ));

    supabase
      .from('right_now_posts')
      .select('id, text, intent, created_at, user_id')
      .eq('host_beacon_id', beacon.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentPosts(data || []));

    // Check for existing active check-in at this venue
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('timed_checkins')
        .select('id, started_at, checkin_visibility, tonight_intention, expires_at')
        .eq('user_id', user.id)
        .eq('venue_id', beacon.venue_id)
        .gt('expires_at', new Date().toISOString())
        .is('ended_at', null)
        .maybeSingle()
        .then(({ data }) => setActiveCheckin(data || null));
    });
  }, [beacon?.venue_id, beacon?.id, beacon?.checkin_count]);

  // Opens modal instead of immediately checking in
  const handleCheckIn = () => {
    setCheckinStep(1);
    setCheckinVisibility('private');
    setTonightIntention('');
    setShowCheckinModal(true);
  };

  // Called when user completes the 2-step modal
  const handleCheckinConfirm = async () => {
    setCheckingIn(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in'); return; }

      const now     = new Date();
      const expires = new Date(now);
      expires.setHours(6, 0, 0, 0);
      if (expires <= now) expires.setDate(expires.getDate() + 1);

      // Write venue_checkins — fires trg_checkin_beacon_count + trg_checkin_globe_event.
      // Phil 2026-05-29: `source` was 'globe_tap' which violates the
      // venue_checkins_source_check CHECK constraint (allows: qr, beacon, manual).
      // The check-in originates from a beacon tap on /pulse, so 'beacon' is the
      // semantically correct allowed value.
      const { error: vcErr } = await supabase.from('venue_checkins').insert({
        venue_id:      beacon.venue_id || beacon.id,
        user_id:       user.id,
        source:        'beacon',
        checked_in_at: now.toISOString(),
        metadata: {
          beacon_id:          beacon.id,
          checkin_visibility: checkinVisibility,
          origin:             'globe_tap',
        },
      });
      if (vcErr) throw vcErr;

      // Write timed_checkins — fires trg_timed_checkin_globe (globe flare)
      const { data: tc, error: tcErr } = await supabase.from('timed_checkins').insert({
        user_id:            user.id,
        venue_id:           beacon.venue_id || beacon.id,
        beacon_id:          beacon.id,
        started_at:         now.toISOString(),
        expires_at:         expires.toISOString(),
        tonight_intention:  tonightIntention.trim() || null,
        checkin_visibility: checkinVisibility,
        metadata: { beacon_title: beacon.title, city: beacon.city_slug },
      }).select().single();
      if (tcErr) throw tcErr;

      setCheckinCount(c => c + 1);
      setActiveCheckin(tc);
      notifySafetyContacts(user, beacon, now);

      setShowCheckinModal(false);
      toast.success('Checked in. Your safety contacts have been notified.');
    } catch (err) {
      console.error('[checkin]', err);
      toast.error('Check-in failed — ' + (err.message || 'try again'));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeCheckin) return;
    try {
      await supabase
        .from('timed_checkins')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeCheckin.id);
      setActiveCheckin(null);
      toast.success('Checked out.');
    } catch (err) {
      toast.error('Check-out failed');
    }
  };

  // Safety contact notification — non-blocking, fire and forget
  const notifySafetyContacts = async (user, beaconData, checkinTime) => {
    try {
      // trusted_contacts uses user_email not user_id
      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name, notify_on_sos')
        .eq('user_email', user.email)
        .eq('notify_on_sos', true);

      if (!contacts || contacts.length === 0) return;

      const timeStr = checkinTime.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
      });

      const rows = contacts.map(c => ({
        user_id: user.id,
        type:    'safety_checkin',
        title:   'Safe check-in',
        body:    `${user.user_metadata?.full_name || 'Your contact'} checked into ${beaconData.title || 'a venue'} at ${timeStr}`,
        payload: {
          venue_name:   beaconData.title,
          beacon_id:    beaconData.id,
          checkin_time: checkinTime.toISOString(),
          contact_id:   c.id,
        },
        read: false,
      }));

      await supabase.from('notifications').insert(rows);
    } catch (err) {
      console.warn('[safety-notif]', err.message);
      // Non-fatal — never surface to user
    }
  };

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

  const title       = beacon.title || `${beacon.type || 'Beacon'}`;
  const description = beacon.description || null;
  const category    = beacon.beacon_category || 'user';
  const kind        = detectBeaconKind(beacon);
  // Curated editorial gets brand gold regardless of category default colour.
  // Doctrine 11 — never render district/hotmess in events-pink.
  const isCurated = kind === 'district' || kind === 'hotmess';
  const categoryColor = isCurated
    ? '#C8962C'
    : kind === 'care'
      ? '#F4ECD8'
      : (beacon.globe_color || (category === 'venue' ? '#00C2E0' : category === 'event' ? '#FF4F9A' : '#C8962C'));
  const lat = beacon.geo_lat ?? beacon.lat;
  const lng = beacon.geo_lng ?? beacon.lng;
  const ownerId = beacon.owner_id || null; // ONLY read in the user-kind branch.
  const mutual = kind === 'user' && ownerId ? isMutualBoo(ownerId) : false;

  // (owner-name fetch effect hoisted above early-returns — see top of BeaconViewer)

  const handleBoo = async () => {
    if (kind !== 'user' || !ownerId || !myUserId) return;
    try {
      await sendTap(ownerId, ownerName || 'them');
      toast('Boo sent. They have to want it back.');
    } catch (e) {
      console.warn('[L2BeaconSheet] sendTap failed', e);
    }
  };

  const handleMessage = () => {
    if (kind !== 'user' || !ownerId) return;
    // Boo-first hard gate (Phil 2026-05-29, sacred-invariant from #656).
    if (!mutual) {
      toast('Boo first. They have to want it back.');
      return;
    }
    closeSheet();
    openSheet(SHEET_TYPES.CHAT, { userId: ownerId, beaconId: beacon.id });
  };

  // Time-remaining string for the sheet header chip.
  //
  // Persistent / curated / far-future beacons MUST NOT display a countdown.
  // The seeding doctrine (D14 Slice 2 care anchors) sets ends_at to a far
  // future timestamp deliberately — the venue's actual operating window
  // lives in body copy, not in the lifecycle. Without this guard the
  // header reads "13942h 49m" for a care anchor, which looks broken.
  //
  // Rules:
  //  - is_persistent === true  → no countdown
  //  - metadata.curated === true → no countdown (operator-placed editorial)
  //  - ends_at > 7 days out → no countdown (reads as ongoing, not now)
  //  - else show "h+ Xh Ym" or "Ym" — same as before
  const endsAtMs = beacon.ends_at ? new Date(beacon.ends_at).getTime() : null;
  const remaining = (() => {
    if (!endsAtMs || !Number.isFinite(endsAtMs)) return null;
    if (beacon.is_persistent === true) return null;
    if (beacon.metadata && beacon.metadata.curated === true) return null;
    const diff = endsAtMs - Date.now();
    if (diff <= 0) return 'ended';
    if (diff > 7 * 24 * 3_600_000) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  })();

  // Kind label shown in the small chip — never expose the operator-owner for
  // curated kinds, and never lead with "user" for a personal drop.
  const kindLabel = (() => {
    if (kind === 'district') return 'district pulse';
    if (kind === 'hotmess') return 'hotmess broadcast';
    if (kind === 'care') return 'care available';
    if (kind === 'event') return 'event';
    if (kind === 'venue') return category;
    return 'someone on pulse';
  })();

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      {/* No X close button — Phil 2026-05-29 (matches audit #82/#88).
          Drag-to-dismiss (via L2SheetContainer), backdrop tap, and Escape
          are the reverse actions. The peek state keeps the bottom half of
          the globe visible behind the card; dragging up reveals more,
          dragging down dismisses. */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border"
            style={{ color: categoryColor, borderColor: `${categoryColor}40`, backgroundColor: `${categoryColor}15` }}
          >
            <Radio className="w-2.5 h-2.5" />
            {kindLabel}
          </span>
          {remaining && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums"
              style={{ color: categoryColor }}
            >
              <Clock className="w-2.5 h-2.5" />
              {remaining}
            </span>
          )}
        </div>

        <h2 className="text-white font-black text-xl leading-tight">{title}</h2>

        {/* user-kind: surface the owner display name underneath the title so
            the viewer knows whose signal this is. Curated kinds never show
            owner_id-derived info. */}
        {kind === 'user' && ownerName && (
          <p className="text-white/60 text-[13px] mt-1">{ownerName}</p>
        )}

        {description && (
          <p className="text-white/50 text-sm mt-2 leading-relaxed">{description}</p>
        )}

        {/* Venue-specific: check-in count */}
        {category === 'venue' && checkinCount > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00C2E0]">
              {checkinCount} checked in
            </span>
            <span className="text-[10px] text-white/20 uppercase">last 4 hours</span>
          </div>
        )}

        {/* Event-specific: start/end times */}
        {(beacon.starts_at || beacon.event_start_at) && (
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-3.5 h-3.5 text-[#C8962C] flex-shrink-0" />
            <span className="text-[#C8962C] text-xs font-semibold">
              {format(new Date(beacon.event_start_at || beacon.starts_at), 'EEE d MMM · h:mm a')}
              {(beacon.event_end_at || beacon.ends_at)
                ? ` → ${format(new Date(beacon.event_end_at || beacon.ends_at), 'h:mm a')}`
                : ''}
            </span>
          </div>
        )}

        {beacon.city_slug && (
          <div className="flex items-start gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-white/40 flex-shrink-0 mt-0.5" />
            <span className="text-white/50 text-xs capitalize">{beacon.city_slug}</span>
          </div>
        )}

        {/* Recent posts at this beacon */}
        {recentPosts.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Recent pulse</p>
            {recentPosts.map((post) => (
              <p key={post.id} className="text-white/60 text-xs leading-relaxed">
                &ldquo;{post.text}&rdquo;
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Action block — Phil 2026-05-29: must be above-fold at peek state.
          Was `mt-auto` (pinned to bottom of expanded sheet, hidden at 50dvh
          peek). Now renders immediately after the content so Directions /
          On the map / Boo / Message land in the first 50dvh the user sees. */}
      <div className="px-4 pt-2 pb-4 flex flex-col gap-2">
        {/* ── kind: user — Boo / Message — never both, never neither ── */}
        {kind === 'user' && ownerId && myUserId && ownerId !== myUserId && (
          mutual ? (
            <button
              onClick={handleMessage}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          ) : (
            <button
              onClick={handleBoo}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Heart className="w-4 h-4" />
              Boo
            </button>
          )
        )}

        {/* ── kind: venue — check-in flow (unchanged from prior behaviour) ── */}
        {kind === 'venue' && (
          activeCheckin ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#C8962C]/10 border border-[#C8962C]/30 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-[#C8962C] animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[#C8962C] text-xs font-semibold">You&apos;re here</span>
                  {activeCheckin.tonight_intention && (
                    <p className="text-white/50 text-xs truncate mt-0.5">
                      {activeCheckin.tonight_intention}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCheckOut}
                className="w-full bg-white/5 border border-white/10 text-white/60 font-bold text-sm rounded-2xl py-3 active:scale-95 transition-transform"
              >
                Check out
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              className="w-full bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <MapPin className="w-4 h-4" />
              Check in here
            </button>
          )
        )}

        {/* ── kind: event — I'm going (real scheduled event with venue) ── */}
        {kind === 'event' && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full bg-[#FF4F9A] text-white font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            I&apos;m going
          </button>
        )}

        {/* ── kind: care — never a Boo target, surface care affordance only ── */}
        {kind === 'care' && (
          <button
            onClick={() => { closeSheet(); navigate('/safety'); }}
            className="w-full bg-white/5 border border-white/10 text-white font-bold text-sm rounded-2xl py-3 active:scale-95 transition-transform"
          >
            What this offers
          </button>
        )}

        {/* ── kind: district / hotmess — no primary CTA; the pulse read IS the
              card. No "Boo SMASH" on Soho · Warming, ever. ── */}

        {/* Directions are universally useful for any beacon with a real
            lat/lng — district, venue, event, user. We never expose exact
            coords; we hand the values off to the existing L2DirectionsSheet
            (registered in SHEET_REGISTRY) which uses the same ≤200m privacy
            snap as the rest of the app.
            Phil 2026-05-29: previously both buttons just `openSheet`d or
            `navigate`d immediately. The L2 sheet system only tracks one
            active sheet, so calling openSheet from inside an open sheet
            triggered a half-transition (backdrop blurred, no new content).
            Fix: closeSheet() first, defer the next action by a tick so the
            exit animation completes before the next mount. Same pattern
            used in L2ClusterPreviewSheet for tap-on-signal. */}
        {(lat && lng) && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                closeSheet();
                window.setTimeout(() => openSheet('directions', { lat, lng, label: title }), 80);
              }}
              className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
            >
              <Navigation className="w-4 h-4 text-white/40" />
              Directions
            </button>
            <button
              onClick={() => {
                closeSheet();
                // Globe.jsx subscribes to 'pulse:flyto' (line 343). On the
                // same /pulse route, navigate({state}) is a no-op because
                // React Router doesn't re-render the page — dispatching
                // the event drives the camera api directly. Off-route the
                // listener would just no-op so this is safe everywhere.
                window.setTimeout(() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pulse:flyto', {
                      detail: { lat, lng, zoom: 14 },
                    }));
                  }
                  if (typeof window === 'undefined' || window.location.pathname !== '/pulse') {
                    navigate('/pulse', { state: { flyTo: { lat, lng, zoom: 14 } } });
                  }
                }, 80);
              }}
              className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
            >
              <ExternalLink className="w-4 h-4 text-white/40" />
              On the map
            </button>
          </div>
        )}
      </div>

      {/* 2-step check-in modal */}
      {showCheckinModal && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowCheckinModal(false)}
        >
          <div
            className="rounded-t-2xl p-5 pb-8 border-t border-white/10"
            style={{ background: '#111116' }}
            onClick={e => e.stopPropagation()}
          >
            {checkinStep === 1 ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">
                  Check in to {beacon.title}
                </p>
                <h3 className="text-white font-black text-lg mb-1">Who can see this?</h3>
                <p className="text-white/40 text-xs mb-5">
                  Your safety contacts are always notified. This controls your visibility on Ghosted.
                </p>
                <div className="flex flex-col gap-2 mb-5">
                  {[
                    { value: 'private',     label: 'Private',     sub: "Safety contacts only — nothing on Ghosted", tag: 'Default' },
                    { value: 'connections', label: 'Connections', sub: "Visible to men you've matched with", tag: null },
                    { value: 'scene',       label: 'Scene',       sub: 'Visible to everyone at this venue tonight', tag: null },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCheckinVisibility(opt.value)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all active:scale-98 ${
                        checkinVisibility === opt.value
                          ? 'border-[#C8962C]/60 bg-[#C8962C]/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                        checkinVisibility === opt.value
                          ? 'border-[#C8962C] bg-[#C8962C]'
                          : 'border-white/30'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{opt.label}</span>
                          {opt.tag && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#C8962C]/20 text-[#C8962C]">
                              {opt.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-white/40 text-xs">{opt.sub}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCheckinStep(2)}
                  className="w-full py-3.5 rounded-xl bg-[#C8962C] text-black font-black text-sm active:scale-95 transition-transform"
                >
                  Next
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">
                  Optional
                </p>
                <h3 className="text-white font-black text-lg mb-1">What&apos;s your vibe tonight?</h3>
                <p className="text-white/40 text-xs mb-4">
                  {checkinVisibility === 'private'
                    ? 'Private — only you will see this.'
                    : "This appears on your Ghosted card while you're here."}
                </p>
                <textarea
                  value={tonightIntention}
                  onChange={e => { if (e.target.value.length <= 80) setTonightIntention(e.target.value); }}
                  placeholder="Here for the music, sweaty dancing..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm resize-none focus:outline-none focus:border-[#C8962C]/50 mb-1"
                />
                <p className="text-right text-[10px] text-white/25 mb-4">
                  {tonightIntention.length}/80
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckinStep(1)}
                    className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCheckinConfirm}
                    disabled={checkingIn}
                    className="flex-1 py-3.5 rounded-xl bg-[#C8962C] text-black font-black text-sm disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {checkingIn ? 'Checking in...' : 'Check in'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — routes to viewer or creator
// ─────────────────────────────────────────────────────────────────────────────

export default function L2BeaconSheet({ beaconId, beacon }) {
  const { closeSheet } = useSheet();

  if (beaconId) {
    return <BeaconViewer beaconId={beaconId} beacon={beacon} />;
  }

  return <BeaconCreator onSuccess={closeSheet} />;
}






