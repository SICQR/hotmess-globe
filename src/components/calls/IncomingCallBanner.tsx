/**
 * IncomingCallBanner — OS-style incoming call interrupt
 *
 * Looks and feels like a real phone incoming call banner (iOS/Android compact
 * call UI). Slides in from top, shows caller photo + name, big circular
 * decline (red) + accept (green) buttons. Auto-dismisses as missed after 30s.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Video } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { showLocalNotification } from '@/lib/notifications/showNotification';

interface IncomingCall {
  callId: string;
  callerName: string;
  callerAvatar: string | null;
}

// Vibrate pattern — feels like a ringing phone
const ringVibrate = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200, 400]);
  }
};

export function IncomingCallBanner() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openSheet } = useSheet();

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
              callee_id: string;
              status: string;
              caller_name?: string;
            };

            if (row.status !== 'ringing') return;

            // Fetch caller profile (name + avatar)
            let callerName = row.caller_name || 'Unknown';
            let callerAvatar: string | null = null;

            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url, photos')
              .eq('id', row.caller_id)
              .single();

            if (profile) {
              if (profile.display_name) callerName = profile.display_name;
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
        <motion.div
          key="incoming-call-banner"
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed inset-x-3 z-[180]"
          style={{ top: 'max(env(safe-area-inset-top, 12px), 12px)' }}
        >
          {/* Frosted glass card — matches iOS dark call banner */}
          <div
            className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background: 'rgba(28, 28, 30, 0.96)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div className="px-4 py-3.5 flex items-center gap-3.5">

              {/* Caller avatar with pulsing ring */}
              <div className="relative flex-shrink-0">
                {/* Outer ring — pulses like a ringing phone */}
                <div
                  className="absolute -inset-1 rounded-full animate-ping"
                  style={{ background: 'rgba(48, 209, 88, 0.25)' }}
                />
                <div
                  className="absolute -inset-0.5 rounded-full"
                  style={{ background: 'rgba(48, 209, 88, 0.15)' }}
                />
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2"
                  style={{ borderColor: '#30D158' }}
                >
                  {incomingCall.callerAvatar ? (
                    <img
                      src={incomingCall.callerAvatar}
                      alt={incomingCall.callerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2C2C2E]">
                      <span className="text-lg font-black text-white">
                        {incomingCall.callerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Caller info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-[15px] leading-tight truncate">
                  {incomingCall.callerName}
                </p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#C8962C' }}>
                  HOTMESS Video
                </p>
              </div>

              {/* Action buttons — big circles like real phone UI */}
              <div className="flex items-center gap-3 flex-shrink-0">

                {/* Decline — red circle, phone-off icon */}
                <button
                  onClick={handleDecline}
                  className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ backgroundColor: '#FF3B30' }}
                  aria-label="Decline call"
                >
                  <PhoneOff className="w-5 h-5 text-white" />
                </button>

                {/* Accept — green circle, video icon */}
                <button
                  onClick={handleAccept}
                  className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ backgroundColor: '#30D158' }}
                  aria-label="Accept call"
                >
                  <Video className="w-5 h-5 text-white" />
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IncomingCallBanner;
