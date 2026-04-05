/**
 * /v/:slug — QR venue check-in landing page.
 *
 * A user scans a QR code at the venue door → lands here → sees venue info
 * + check-in CTA → checks in → globe node lights up.
 *
 * No auth required to view. Auth required to check in.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { MapPin, Check, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PulsePlace } from '@/hooks/usePulsePlaces';
import { INTENSITY_VISUALS, getConversionLabel, getMomentumLabel } from '@/hooks/useVenueIntensity';

const GOLD = '#C8962C';

export default function VenueCheckin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [place, setPlace] = useState<PulsePlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinCount, setCheckinCount] = useState(0);
  const [momentum, setMomentum] = useState(0);
  const [intensityLevel, setIntensityLevel] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load venue + user + intensity
  useEffect(() => {
    if (!slug) return;

    // Fetch place
    supabase
      .from('pulse_places')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }
        setPlace(data as PulsePlace);
        setLoading(false);
      });

    // Fetch intensity
    supabase
      .from('place_intensity')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCheckinCount(data.checkins_4h || 0);
          setMomentum(data.momentum || 0);
          setIntensityLevel(data.intensity_level || 0);
        }
      });

    // Check auth
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);

      // Check for existing check-in today
      if (u) {
        supabase
          .from('venue_checkins')
          .select('id')
          .eq('user_id', u.id)
          .eq('place_slug', slug)
          .gt('checked_in_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) setCheckedIn(true);
          });
      }
    });
  }, [slug]);

  const handleCheckin = async () => {
    if (!user) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/v/${slug}`);
      return;
    }

    if (checkedIn || checkingIn) return;

    setCheckingIn(true);
    try {
      const now = new Date();
      const expires = new Date(now);
      expires.setHours(6, 0, 0, 0);
      if (expires <= now) expires.setDate(expires.getDate() + 1);

      // Write venue_checkins
      const { error: vcErr } = await supabase.from('venue_checkins').insert({
        venue_id: place?.id || null,
        user_id: user.id,
        place_slug: slug,
        source: 'qr_scan',
        checked_in_at: now.toISOString(),
        metadata: { place_name: place?.name, place_type: place?.type },
      });
      if (vcErr) throw vcErr;

      // Write timed_checkins for duration tracking
      await supabase.from('timed_checkins').insert({
        user_id: user.id,
        venue_id: place?.id || null,
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        checkin_visibility: 'private',
        metadata: { place_slug: slug, place_name: place?.name, source: 'qr_scan' },
      }).catch(() => {}); // Non-blocking

      // Notify safety contacts (fire and forget)
      notifySafetyContacts(user, place, now);

      setCheckedIn(true);
      setCheckinCount(c => c + 1);
      toast.success('Checked in. Safety contacts notified.');
    } catch (err: any) {
      console.error('[venue-checkin]', err);
      toast.error('Check-in failed — ' + (err.message || 'try again'));
    } finally {
      setCheckingIn(false);
    }
  };

  // Fire-and-forget safety notification
  const notifySafetyContacts = async (u: any, p: PulsePlace | null, time: Date) => {
    try {
      const { data: contacts } = await supabase
        .from('trusted_contacts')
        .select('id, contact_name')
        .eq('user_id', u.id);

      if (!contacts || contacts.length === 0) return;

      // Push notification to each contact
      for (const contact of contacts) {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: contact.id,
            title: 'Safety check-in',
            body: `${u.user_metadata?.display_name || 'Someone'} checked in at ${p?.name || 'a venue'}`,
          }),
        }).catch(() => {});
      }
    } catch { /* non-blocking */ }
  };

  // Intensity visual config
  const iv = INTENSITY_VISUALS[intensityLevel as keyof typeof INTENSITY_VISUALS] || INTENSITY_VISUALS[0];
  const fakeIntensity = { slug: slug || '', name: place?.name || '', type: place?.type || '', lat: 0, lng: 0, checkins_30m: 0, checkins_1h: 0, checkins_4h: checkinCount, effective_count: checkinCount, intensity_level: intensityLevel, momentum, last_checkin_at: null };
  const conversionLabel = getConversionLabel(fakeIntensity);
  const momentumLabel = getMomentumLabel(fakeIntensity);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="w-12 h-12 text-white/20 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Venue not found</h1>
        <p className="text-white/50 text-sm mb-6">This venue isn't on the HOTMESS Globe yet.</p>
        <button onClick={() => navigate('/pulse')} className="px-6 py-3 bg-[#C8962C] text-black font-bold rounded-xl">
          Open Pulse
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Venue glow */}
        <div className="relative mb-8">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: place.type === 'curated'
                ? `radial-gradient(circle, ${GOLD}40 0%, ${GOLD}10 60%, transparent 80%)`
                : 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              boxShadow: intensityLevel >= 3
                ? `0 0 ${20 + intensityLevel * 10}px ${place.type === 'curated' ? GOLD : '#fff'}40`
                : undefined,
            }}
          >
            <MapPin
              className="w-10 h-10"
              style={{ color: place.type === 'curated' ? GOLD : '#fff' }}
            />
          </div>

          {/* Pulse ring for active venues */}
          {intensityLevel >= 2 && (
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: place.type === 'curated' ? `${GOLD}60` : 'rgba(255,255,255,0.3)' }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </div>

        {/* Venue name */}
        <h1 className="text-white text-2xl font-bold mb-1">{place.name}</h1>
        <p className="text-white/40 text-sm mb-4">{place.notes || place.country}</p>

        {/* Conversion label */}
        <AnimatePresence>
          {conversionLabel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
              style={{
                background: intensityLevel >= 4 ? `${GOLD}30` : 'rgba(255,255,255,0.08)',
                color: intensityLevel >= 4 ? GOLD : '#fff',
                border: `1px solid ${intensityLevel >= 4 ? `${GOLD}40` : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {conversionLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Who's there — anonymous silhouettes */}
        {checkinCount > 0 && (
          <div className="mb-3">
            <div className="flex justify-center -space-x-2 mb-2">
              {Array.from({ length: Math.min(checkinCount, 6) }).map((_, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: place?.type === 'curated'
                      ? `rgba(200,150,44,${0.08 + i * 0.03})`
                      : `rgba(255,255,255,${0.05 + i * 0.02})`,
                    border: `1px solid ${place?.type === 'curated' ? `${GOLD}25` : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill={place?.type === 'curated' ? `${GOLD}40` : 'rgba(255,255,255,0.2)'} />
                    <path d="M4 20c0-4 4-7 8-7s8 3 8 7" fill={place?.type === 'curated' ? `${GOLD}30` : 'rgba(255,255,255,0.15)'} />
                  </svg>
                </div>
              ))}
              {checkinCount > 6 && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: place?.type === 'curated' ? `${GOLD}15` : 'rgba(255,255,255,0.06)',
                    color: place?.type === 'curated' ? GOLD : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${place?.type === 'curated' ? `${GOLD}25` : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  +{checkinCount - 6}
                </div>
              )}
            </div>
            <span className="text-white text-3xl font-bold">{checkinCount}</span>
            <span className="text-white/50 text-sm ml-2">here now</span>
          </div>
        )}

        {momentumLabel && (
          <motion.p
            className="text-sm font-medium mb-6"
            style={{ color: GOLD }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {momentumLabel}
          </motion.p>
        )}

        {checkinCount === 0 && (
          <p className="text-white/30 text-sm mb-6">No one here yet</p>
        )}

        {/* Check-in CTA */}
        <button
          onClick={handleCheckin}
          disabled={checkedIn || checkingIn}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: checkedIn ? '#1C1C1E' : GOLD,
            color: checkedIn ? GOLD : '#000',
            boxShadow: !checkedIn ? `0 0 30px ${GOLD}40` : undefined,
          }}
        >
          {checkingIn ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Checking in...
            </span>
          ) : checkedIn ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              You're checked in
            </span>
          ) : !user ? (
            <span className="flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              Sign in to check in
            </span>
          ) : checkinCount === 0 ? (
            'Be the first'
          ) : (
            'Check in'
          )}
        </button>

        {checkedIn && (
          <p className="text-white/30 text-xs mt-3">Your safety contacts have been notified</p>
        )}
      </div>

      {/* Bottom: Open Pulse */}
      <div className="p-6 pb-safe">
        <button
          onClick={() => navigate('/pulse')}
          className="w-full py-3 rounded-xl bg-white/5 text-white/50 text-sm font-medium active:bg-white/10 transition-colors"
        >
          Open Pulse Globe
        </button>
      </div>
    </div>
  );
}
