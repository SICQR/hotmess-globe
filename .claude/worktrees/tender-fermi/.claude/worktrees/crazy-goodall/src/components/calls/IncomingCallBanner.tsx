/**
 * IncomingCallBanner — Platform-matched incoming call interrupt
 *
 * Detects iOS vs Android and renders the correct native call UI:
 *
 * iOS  — compact frosted-glass pill sliding in from top (like FaceTime
 *         compact banner). Circular avatar left, name + subtitle centre,
 *         two round icon-only buttons right (red PhoneOff / green Video).
 *         SF Pro feel: tight kerning, system blur, inset card.
 *
 * Android — full-width Material You card from top. Larger avatar with
 *            blurred photo background tint, caller name, two pill buttons
 *            (Decline / Accept) side by side at bottom of card.
 *            Google Sans feel: looser type, stronger elevation shadow.
 *
 * Desktop — falls back to iOS style (most visually clean).
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Video } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { showLocalNotification } from '@/lib/notifications/showNotification';

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other'; // desktop → uses iOS style
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface IncomingCall {
  callId: string;
  callerName: string;
  callerAvatar: string | null;
}

// ── Haptics ───────────────────────────────────────────────────────────────────

const ringVibrate = () => {
  if ('vibrate' in navigator) navigator.vibrate([400, 200, 400, 200, 400]);
};

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size,
  borderColor,
}: {
  src: string | null;
  name: string;
  size: number;
  borderColor: string;
}) {
  return (
    <div
      className="rounded-full overflow-hidden border-2 flex-shrink-0"
      style={{ width: size, height: size, borderColor }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: '#2C2C2E' }}
        >
          <span
            className="font-black text-white"
            style={{ fontSize: size * 0.38 }}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── iOS compact banner ────────────────────────────────────────────────────────
//
// Matches the iOS FaceTime compact incoming call banner exactly:
//   • Frosted glass inset card, slides from above safe-area
//   • Avatar left (48px) with animate-ping green ring
//   • Name + "HOTMESS Video" centre
//   • Two 48px circle buttons right: red (PhoneOff), green (Video)

function IOSBanner({
  call,
  onAccept,
  onDecline,
}: {
  call: IncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      key="ios-call-banner"
      initial={{ y: -110, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -110, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="fixed inset-x-3 z-[180]"
      style={{ top: 'max(env(safe-area-inset-top, 10px), 10px)' }}
    >
      <div
        className="rounded-[18px] overflow-hidden border border-white/12"
        style={{
          background: 'rgba(28, 28, 30, 0.97)',
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(48px)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div className="px-3.5 py-3 flex items-center gap-3">

          {/* Avatar + pulse ring */}
          <div className="relative flex-shrink-0">
            <div
              className="absolute -inset-1 rounded-full animate-ping opacity-60"
              style={{ background: 'rgba(48, 209, 88, 0.3)' }}
            />
            <Avatar src={call.callerAvatar} name={call.callerName} size={48} borderColor="#30D158" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* App label — grey, above name, like iOS "FaceTime" label */}
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: '#8E8E93' }}
            >
              HOTMESS Video
            </p>
            <p
              className="font-black leading-none truncate"
              style={{ fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.3px' }}
            >
              {call.callerName}
            </p>
          </div>

          {/* Buttons — icon-only circles, iOS style */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Decline */}
            <button
              onClick={onDecline}
              className="rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ width: 48, height: 48, backgroundColor: '#FF3B30' }}
              aria-label="Decline"
            >
              <PhoneOff className="w-[19px] h-[19px] text-white" />
            </button>
            {/* Accept */}
            <button
              onClick={onAccept}
              className="rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ width: 48, height: 48, backgroundColor: '#34C759' }}
              aria-label="Accept"
            >
              <Video className="w-[19px] h-[19px] text-white" />
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// ── Android Material You banner ───────────────────────────────────────────────
//
// Matches Android 12+ heads-up call notification:
//   • Full-width card (inset-x-2), larger rounded corners
//   • Blurred avatar-tinted background behind content
//   • Larger avatar (64px) left, bolder name
//   • "Video call" subtitle in system-green
//   • Pill-shaped Decline (red) + Accept (green) buttons with text + icon
//   • Heavier elevation shadow, faster spring

function AndroidBanner({
  call,
  onAccept,
  onDecline,
}: {
  call: IncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      key="android-call-banner"
      initial={{ y: -130, scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: -130, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
      className="fixed inset-x-2 z-[180]"
      style={{ top: 'max(env(safe-area-inset-top, 8px), 8px)' }}
    >
      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          background: '#1E1E1E',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Optional blurred avatar tint strip at very top */}
        {call.callerAvatar && (
          <div
            className="absolute inset-0 opacity-10 rounded-[28px]"
            style={{
              backgroundImage: `url(${call.callerAvatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(24px)',
            }}
          />
        )}

        <div className="relative px-5 pt-5 pb-4">

          {/* Top row: avatar + name + subtitle */}
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar — larger, no ring, just subtle border */}
            <div className="relative flex-shrink-0">
              {/* Pulsing soft ring */}
              <div
                className="absolute -inset-1.5 rounded-full animate-ping opacity-40"
                style={{ background: 'rgba(76, 175, 80, 0.4)' }}
              />
              <Avatar src={call.callerAvatar} name={call.callerName} size={64} borderColor="#4CAF50" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Android uses a "calling…" label above the name */}
              <p
                className="text-xs font-medium mb-0.5"
                style={{ color: '#4CAF50' }}
              >
                Incoming video call
              </p>
              <p
                className="font-bold leading-tight truncate"
                style={{ fontSize: 20, color: '#FFFFFF', letterSpacing: '-0.2px' }}
              >
                {call.callerName}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: '#9E9E9E' }}
              >
                HOTMESS
              </p>
            </div>
          </div>

          {/* Bottom row: Decline + Accept pill buttons — Android style */}
          <div className="flex gap-3">
            {/* Decline */}
            <button
              onClick={onDecline}
              className="flex-1 h-14 rounded-full flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ backgroundColor: '#B71C1C' }}
              aria-label="Decline call"
            >
              <PhoneOff className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-[15px]">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={onAccept}
              className="flex-1 h-14 rounded-full flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ backgroundColor: '#2E7D32' }}
              aria-label="Accept call"
            >
              <Video className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-[15px]">Accept</span>
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncomingCallBanner() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openSheet } = useSheet();
  const platform = detectPlatform();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('incoming-calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `callee_id=eq.${user.id}`,
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              caller_id: string;
              status: string;
              caller_name?: string;
            };

            if (row.status !== 'ringing') return;

            let callerName = row.caller_name || 'Unknown';
            let callerAvatar: string | null = null;

            const { data: profile } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url, photos')
              .eq('id', row.caller_id)
              .single();

            if (profile) {
              if (profile.username) callerName = profile.username;
              else if (profile.display_name) callerName = profile.display_name;
              callerAvatar =
                profile.avatar_url ||
                (Array.isArray(profile.photos) && profile.photos[0]?.url
                  ? profile.photos[0].url
                  : null);
            }

            setIncomingCall({ callId: row.id, callerName, callerAvatar });
            ringVibrate();

            showLocalNotification(
              `📞 ${callerName} is calling`,
              'Incoming HOTMESS Video Call',
              '/',
              'call'
            );

            // Auto-dismiss after 30s — mark as missed
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            const callId = row.id;
            dismissTimerRef.current = setTimeout(async () => {
              await supabase
                .from('video_calls')
                .update({ status: 'missed' })
                .eq('id', callId)
                .eq('status', 'ringing');
              setIncomingCall(null);
            }, 30000);
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const dismiss = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setIncomingCall(null);
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    await supabase
      .from('video_calls')
      .update({ status: 'accepted' })
      .eq('id', incomingCall.callId);
    openSheet('video-call', { callId: incomingCall.callId });
    dismiss();
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    await supabase
      .from('video_calls')
      .update({ status: 'declined' })
      .eq('id', incomingCall.callId);
    dismiss();
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        platform === 'android'
          ? (
            <AndroidBanner
              call={incomingCall}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )
          : (
            <IOSBanner
              call={incomingCall}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )
      )}
    </AnimatePresence>
  );
}

export default IncomingCallBanner;
