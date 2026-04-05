/**
 * L2GhostedPreviewSheet — Quick preview when tapping a Ghosted card.
 *
 * The decision point. Shows: photo, name, distance, context, vibe.
 * Actions: Boo (fastest), Message, Meet (real next move).
 * Movement users get: Suggest Stop, Meet Halfway (promoted).
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, MessageCircle, MapPin, Navigation, X, Radio } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { hapticMedium, hapticLight } from '@/lib/haptics';
import { formatDistance } from '@/lib/ghostedUtils';
import { pushNotify } from '@/lib/pushNotify';
import { GHOST_SVG_PATH } from '@/lib/assetHelpers';

const AMBER = '#C8962C';

interface PreviewProps {
  uid?: string;
  name?: string;
  avatar?: string;
  distance?: number | null;
  context?: string;
  vibe?: string | null;
  isMoving?: boolean;
  isListening?: boolean;
  radioShow?: string;
  email?: string | null;
  movementDestination?: string;
  movementEta?: string;
}

export default function L2GhostedPreviewSheet({
  uid,
  name = 'Anonymous',
  avatar,
  distance,
  context = 'Nearby',
  vibe,
  isMoving,
  isListening,
  radioShow,
  email,
  movementDestination,
  movementEta,
}: PreviewProps) {
  const { openSheet, closeSheet } = useSheet();
  const [booSent, setBooSent] = useState(false);
  const [sending, setSending] = useState(false);

  const distStr = formatDistance(distance);

  // Build the subtitle line: "420m · At Eagle" or "1.2km · Moving · 6 min"
  const subtitleParts: string[] = [];
  if (distStr) subtitleParts.push(distStr);
  if (isMoving && movementEta) {
    subtitleParts.push(`Moving · ${movementEta}`);
  } else if (isMoving && movementDestination) {
    subtitleParts.push(`On the way to ${movementDestination}`);
  } else if (isMoving) {
    subtitleParts.push('Passing near you');
  } else if (context && context !== 'Nearby') {
    subtitleParts.push(context);
  }
  const subtitle = subtitleParts.join(' · ') || 'Nearby';

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

      // Contextual success toast
      if (isMoving) {
        toast('Catch him before he lands');
      } else if (isListening) {
        toast("You're in the same moment");
      } else {
        toast('Boo sent');
      }
    } catch {
      toast('Failed to send Boo');
    }
    setSending(false);
  }, [email, sending, booSent, isMoving, isListening]);

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

  // ── Meet handler ────────────────────────────────────────────────
  const handleMeet = useCallback(() => {
    hapticLight();
    if (uid) {
      closeSheet();
      setTimeout(() => {
        openSheet('chat', {
          userId: uid,
          title: `Chat with ${name}`,
          meetMode: true,
        });
      }, 200);
    }
  }, [uid, name, openSheet, closeSheet]);

  // ── Full profile ────────────────────────────────────────────────
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
      {/* Hero — compact photo area */}
      <div className="relative h-56 overflow-hidden rounded-t-2xl">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1C1C1E] to-[#0D0D0D] flex flex-col items-center justify-center gap-2">
            <svg className="w-14 h-14 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={GHOST_SVG_PATH} />
            </svg>
            <span className="text-sm font-bold text-white/15 uppercase tracking-wider">{name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(5,5,7,1) 0%, rgba(5,5,7,0.4) 50%, transparent 100%)' }}
        />

        {/* Close */}
        <button
          onClick={() => closeSheet()}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {/* Movement indicator overlay */}
        {isMoving && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <motion.div
              animate={{ y: [-1, 1, -1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Navigation className="w-3 h-3" style={{ color: AMBER }} />
            </motion.div>
            <span className="text-[10px] font-bold" style={{ color: AMBER }}>Moving</span>
          </div>
        )}

        {/* Listening indicator overlay */}
        {isListening && !isMoving && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#00C2E0] animate-pulse" />
            <span className="text-[10px] font-bold text-[#00C2E0]">Listening</span>
          </div>
        )}
      </div>

      {/* Identity + context — tight to hero */}
      <div className="px-5 -mt-10 relative z-10">
        <h2 className="text-xl font-black text-white leading-tight">{name}</h2>
        <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>

        {/* Vibe badge — only if they've set an intent */}
        {vibe && (
          <span
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}30` }}
          >
            {vibe.charAt(0).toUpperCase() + vibe.slice(1)}
          </span>
        )}

        {/* Radio context — compact inline */}
        {isListening && radioShow && (
          <div className="mt-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#00C2E0]" />
            <span className="text-xs text-[#00C2E0] font-semibold">{radioShow}</span>
          </div>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}

      {/* Movement-promoted: when they're moving, Meet/Stop are primary */}
      {isMoving ? (
        <div className="px-5 mt-5 space-y-2">
          {/* Primary row: Boo + Meet halfway */}
          <div className="flex gap-3">
            <button
              onClick={handleBoo}
              disabled={sending}
              className="h-12 w-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
              style={{
                background: booSent ? `${AMBER}20` : AMBER,
                color: booSent ? AMBER : '#000',
                border: booSent ? `1px solid ${AMBER}40` : 'none',
              }}
            >
              <Ghost className="w-5 h-5" />
            </button>
            <button
              onClick={handleMeet}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
              style={{ background: AMBER, color: '#000' }}
            >
              <MapPin className="w-4 h-4" />
              Meet halfway
            </button>
          </div>
          {/* Secondary: Suggest stop + Message */}
          <div className="flex gap-3">
            <button
              onClick={handleMessage}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
              style={{ background: `${AMBER}12`, color: AMBER, border: `1px solid ${AMBER}20` }}
            >
              <Navigation className="w-3.5 h-3.5" />
              Suggest a stop
            </button>
            <button
              onClick={handleMessage}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-white/8 text-white/70 active:scale-95 transition-all border border-white/10"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Message
            </button>
          </div>
        </div>
      ) : (
        /* Standard: Boo + Message + Meet */
        <div className="px-5 mt-5 space-y-2">
          <div className="flex gap-3">
            {/* Boo — primary, fastest action */}
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
              <AnimatePresence mode="wait">
                <motion.span
                  key={booSent ? 'sent' : 'boo'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {booSent ? 'Sent' : 'Boo'}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Message */}
            <button
              onClick={handleMessage}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-white/10 text-white active:scale-95 transition-all border border-white/10"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>

          {/* Meet — full-width secondary, real next move */}
          <button
            onClick={handleMeet}
            className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all border border-white/10 bg-white/5 text-white/70"
          >
            <MapPin className="w-3.5 h-3.5" />
            Meet
          </button>
        </div>
      )}

      {/* View full profile — quiet link */}
      <button
        onClick={handleFullProfile}
        className="mx-5 mt-3 h-8 text-xs font-semibold text-white/30 active:text-white/50 transition-colors"
      >
        View full profile
      </button>
    </div>
  );
}
