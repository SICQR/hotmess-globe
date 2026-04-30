/**
 * L2BeaconSheet — View or create a beacon
 *
 * If `beaconId` is passed → shows beacon details (viewer mode).
 * If no `beaconId` → shows multi-step beacon creation flow.
 */

import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
  MapPin, Clock, Radio, Loader2, Navigation, ExternalLink,
  CheckCircle, ChevronRight, ChevronLeft, Zap,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errorUtils';
import { usePowerups } from '@/hooks/usePowerups';

const BEACON_DAILY_LIMIT = 3; // default daily beacon limit per user

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
  const [beaconCount, setBeaconCount] = useState(0);
  const [limitChecked, setLimitChecked] = useState(false);
  const { isActive: isBoostActive } = usePowerups();
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

      // Determine globe visual config from beacon type
      const beaconCategory = 'user'; // all user-created beacons
      const globeVisuals = {
        checkin:  { color: '#C8962C', pulse: 'standard', size: 1.0 },
        event:   { color: '#FF4F9A', pulse: 'flare',    size: 2.5 },
        drop:    { color: '#C8962C', pulse: 'standard', size: 1.0 },
        chat:    { color: '#C8962C', pulse: 'ripple',   size: 1.5 },
        party:   { color: '#FF4F9A', pulse: 'flare',    size: 2.0 },
        meetup:  { color: '#C8962C', pulse: 'standard', size: 1.5 },
        cruising:{ color: '#C8962C', pulse: 'standard', size: 1.0 },
        safety:  { color: '#FF3B30', pulse: 'private',  size: 0   },
      };
      const vis = globeVisuals[selectedType] || globeVisuals.checkin;

      const { error } = await supabase.from('beacons').insert({
        code:             nanoid(8),
        type:             selectedType,
        beacon_category:  beaconCategory,
        owner_id:         user.id,
        geo_lat:          coords.lat,
        geo_lng:          coords.lng,
        starts_at:        now.toISOString(),
        ends_at:          endsAt.toISOString(),
        intensity:        intensity,
        status:           'active',
        active:           true,
        title:            titleStr,
        description:      descStr,
        // Globe visual config
        globe_color:      vis.color,
        globe_pulse_type: vis.pulse,
        globe_size_base:  vis.size,
      });

      if (error) throw error;

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
          What kind of beacon is this?
          {limitChecked && <span className="ml-2 text-white/20">({beaconCount}/{effectiveLimit} today)</span>}
        </p>

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

function BeaconViewer({ beaconId, beacon: passedBeacon }) {
  const [beacon, setBeacon] = useState(passedBeacon || null);
  const [loading, setLoading] = useState(!passedBeacon);
  const [checkinCount, setCheckinCount] = useState(0);
  const [recentPosts, setRecentPosts] = useState([]);
  const { openSheet } = useSheet();

  // Check-in modal state
  const [showCheckinModal, setShowCheckinModal]   = useState(false);
  const [checkinStep, setCheckinStep]             = useState(1);
  const [checkinVisibility, setCheckinVisibility] = useState('private');
  const [tonightIntention, setTonightIntention]   = useState('');
  const [checkingIn, setCheckingIn]               = useState(false);
  const [activeCheckin, setActiveCheckin]         = useState(null);

  useEffect(() => {
    if (passedBeacon) { setBeacon(passedBeacon); setLoading(false); }
    if (!beaconId) { setLoading(false); return; }
    supabase
      .from('beacons')
      .select('id, code, type, beacon_category, geo_lat, geo_lng, starts_at, ends_at, intensity, title, description, city_slug, globe_color, globe_pulse_type, globe_size_base, checkin_count, venue_id, owner_id, event_start_at, event_end_at')
      .eq('id', beaconId)
      .single()
      .then(({ data }) => {
        setBeacon(data);
        setLoading(false);
      });
  }, [beaconId, passedBeacon]);

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

      // Write venue_checkins — fires trg_checkin_beacon_count + trg_checkin_globe_event
      const { error: vcErr } = await supabase.from('venue_checkins').insert({
        venue_id:      beacon.venue_id || beacon.id,
        user_id:       user.id,
        source:        'globe_tap',
        checked_in_at: now.toISOString(),
        metadata: {
          beacon_id:          beacon.id,
          checkin_visibility: checkinVisibility,
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
  const categoryColor = beacon.globe_color || (category === 'venue' ? '#00C2E0' : category === 'event' ? '#FF4F9A' : '#C8962C');
  const lat = beacon.geo_lat ?? beacon.lat;
  const lng = beacon.geo_lng ?? beacon.lng;

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border"
            style={{ color: categoryColor, borderColor: `${categoryColor}40`, backgroundColor: `${categoryColor}15` }}
          >
            <Radio className="w-2.5 h-2.5" />
            {category}
          </span>
          <span className="text-white/30 text-[10px] uppercase">{beacon.type}</span>
        </div>

        <h2 className="text-white font-black text-xl leading-tight">{title}</h2>

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

      <div className="px-4 py-4 flex flex-col gap-2 mt-auto">
        {/* Venue check-in / active state */}
        {category === 'venue' && (
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

        {/* Event: I'm going */}
        {category === 'event' && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full bg-[#FF4F9A] text-white font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            I&apos;m going
          </button>
        )}

        {/* Directions */}
        {(lat && lng) && (
          <div className="flex gap-3">
            <button
              onClick={() => openSheet('directions', { lat, lng, label: title })}
              className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
            >
              <Navigation className="w-4 h-4 text-white/40" />
              Directions
            </button>
            <button
              onClick={() => window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')}
              className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
            >
              <ExternalLink className="w-4 h-4 text-white/40" />
              Map
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

