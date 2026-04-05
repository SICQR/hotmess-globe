/**
 * L2GhostedPreviewSheet — Quick preview when tapping a Ghosted card.
 *
 * Shows: photo, name, distance, context, vibe.
 * Actions: Boo (primary), Message, Meet.
 * Movement users get: Suggest Stop, Meet Halfway.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ghost, MessageCircle, MapPin, Navigation, X } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { hapticMedium, hapticLight } from '@/lib/haptics';
import { formatDistance } from '@/lib/ghostedUtils';
import { pushNotify } from '@/lib/pushNotify';

const AMBER = '#C8962C';

interface PreviewProps {
  uid?: string;
  name?: string;
  avatar?: string;
  distance?: number | null;
  context?: string;
  vibe?: string | null;
  isMoving?: boolean;
  email?: string | null;
  movementDestination?: string;
}

export default function L2GhostedPreviewSheet({
  uid,
  name = 'Anonymous',
  avatar,
  distance,
  context = 'Nearby',
  vibe,
  isMoving,
  email,
  movementDestination,
}: PreviewProps) {
  const { openSheet, closeSheet } = useSheet();
  const [booSent, setBooSent] = useState(false);
  const [sending, setSending] = useState(false);

  const distStr = formatDistance(distance);

  // ── Boo handler ─────────────────────────────────────────────────
  const handleBoo = useCallback(async () => {
    if (sending || booSent) return;
    setSending(true);
    hapticMedium();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const myEmail = session?.user?.email;
      if (!myEmail || !email) {
        toast('Could not send Boo');
        setSending(false);
        return;
      }

      // Check if already boo'd
      const { data: existing } = await supabase
        .from('taps')
        .select('id')
        .eq('tapper_email', myEmail)
        .eq('tapped_email', email)
        .eq('tap_type', 'boo')
        .maybeSingle();

      if (existing) {
        setBooSent(true);
        toast('Already Boo\'d');
        setSending(false);
        return;
      }

      await supabase.from('taps').insert({
        tapper_email: myEmail,
        tapped_email: email,
        tap_type: 'boo',
      });

      setBooSent(true);

      // Get sender name
      let myName = 'Someone';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('email', myEmail)
          .maybeSingle();
        if (profile?.display_name) myName = profile.display_name;
      } catch { /* best-effort */ }

      // Notification
      supabase.from('notifications').insert({
        user_email: email,
        type: 'boo',
        title: 'Boo\'d you!',
        message: `${myName} boo'd you!`,
        read: false,
      }).then(() => {}).catch(() => {});

      pushNotify({
        emails: [email],
        title: 'Boo\'d you!',
        body: `${myName} boo'd you!`,
        tag: 'boo',
        url: '/ghosted',
      });

      toast('Boo sent');
    } catch {
      toast('Failed to send Boo');
    }
    setSending(false);
  }, [email, sending, booSent]);

  // ── Message handler ──────────────────────────────────────────────
  const handleMessage = useCallback(() => {
    hapticLight();
    if (uid) {
      closeSheet();
      setTimeout(() => {
        openSheet('chat', { userId: uid, title: `Chat with ${name}` });
      }, 200);
    }
  }, [uid, name, openSheet, closeSheet]);

  // ── Meet handler (opens profile for now) ─────────────────────────
  const handleMeet = useCallback(() => {
    hapticLight();
    if (uid) {
      closeSheet();
      setTimeout(() => {
        openSheet('profile', { uid });
      }, 200);
    }
  }, [uid, openSheet, closeSheet]);

  // ── Full profile ─────────────────────────────────────────────────
  const handleFullProfile = useCallback(() => {
    hapticLight();
    if (uid) {
      closeSheet();
      setTimeout(() => {
        openSheet('profile', { uid });
      }, 200);
    }
  }, [uid, openSheet, closeSheet]);

  return (
    <div className="flex flex-col pb-6">
      {/* Hero area */}
      <div className="relative h-64 overflow-hidden rounded-t-2xl">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-5xl font-black text-white/10">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(5,5,7,1) 0%, rgba(5,5,7,0.3) 50%, transparent 100%)' }}
        />

        {/* Close button */}
        <button
          onClick={() => closeSheet()}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Info section */}
      <div className="px-5 -mt-12 relative z-10">
        <h2 className="text-xl font-black text-white">{name}</h2>

        {/* Distance + context */}
        <div className="flex items-center gap-2 mt-1">
          {distStr && (
            <span className="text-sm font-semibold text-white/60">{distStr}</span>
          )}
          {distStr && <span className="text-white/20">·</span>}
          <span className="text-sm text-white/50">{context}</span>
        </div>

        {/* Vibe badge */}
        {vibe && (
          <div className="mt-2">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}30` }}
            >
              {vibe}
            </span>
          </div>
        )}

        {/* Movement banner */}
        {isMoving && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}20` }}
          >
            <Navigation className="w-3.5 h-3.5" style={{ color: AMBER }} />
            <span className="text-xs font-semibold" style={{ color: AMBER }}>
              {movementDestination
                ? `On the way to ${movementDestination}`
                : 'Passing near you'}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 mt-6 flex gap-3">
        {/* Boo — primary */}
        <button
          onClick={handleBoo}
          disabled={sending}
          className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
          style={{
            background: booSent ? `${AMBER}20` : AMBER,
            color: booSent ? AMBER : '#000',
            border: booSent ? `1px solid ${AMBER}40` : 'none',
          }}
        >
          <Ghost className="w-4 h-4" />
          {booSent ? 'Sent' : 'Boo'}
        </button>

        {/* Message */}
        <button
          onClick={handleMessage}
          className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-white/10 text-white active:scale-95 transition-all border border-white/10"
        >
          <MessageCircle className="w-4 h-4" />
          Message
        </button>

        {/* Meet */}
        <button
          onClick={handleMeet}
          className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white/5 text-white/60 active:scale-95 transition-all border border-white/10"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {/* Movement-specific actions */}
      {isMoving && (
        <div className="px-5 mt-3 flex gap-3">
          <button
            onClick={handleMessage}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
            style={{ background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}25` }}
          >
            <Navigation className="w-3.5 h-3.5" />
            Suggest stop
          </button>
          <button
            onClick={handleMeet}
            className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
            style={{ background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}25` }}
          >
            <MapPin className="w-3.5 h-3.5" />
            Meet halfway
          </button>
        </div>
      )}

      {/* View full profile */}
      <button
        onClick={handleFullProfile}
        className="mx-5 mt-4 h-10 rounded-xl text-xs font-semibold text-white/40 active:text-white/60 transition-colors"
      >
        View full profile
      </button>
    </div>
  );
}
