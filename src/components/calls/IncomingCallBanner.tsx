/**
 * IncomingCallBanner — Fixed top banner for incoming video calls
 *
 * Subscribes to video_calls INSERT events where callee_id = auth.uid() and
 * status = 'ringing'. Shows a fixed top banner with Accept / Decline.
 * Auto-dismisses after 30s.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { showLocalNotification } from '@/lib/notifications/showNotification';

interface IncomingCall {
  callId: string;
  callerName: string;
}

export function IncomingCallBanner() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openSheet } = useSheet();

  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      channel = supabase
        .channel('incoming-calls')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'video_calls',
            filter: `callee_id=eq.${userId}`,
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

            // Resolve caller name from profiles if not embedded in row
            let callerName = row.caller_name || 'Unknown';
            if (!row.caller_name) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', row.caller_id)
                .single();
              if (profile?.display_name) callerName = profile.display_name;
            }

            setIncomingCall({ callId: row.id, callerName });

            // Notify even when tab is backgrounded
            showLocalNotification(
              'Incoming call',
              `${callerName} is calling`,
              '/',
              'call'
            );

            // Auto-dismiss after 30s
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = setTimeout(() => {
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
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[180] bg-[#1C1C1E] border-b border-[#C8962C]/30 px-4 pt-[env(safe-area-inset-top)] pb-3 flex items-center gap-3"
        >
          {/* Caller avatar / icon */}
          <div className="w-10 h-10 rounded-full bg-[#C8962C]/20 border border-[#C8962C]/40 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-[#C8962C]" />
          </div>

          {/* Caller info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm truncate">{incomingCall.callerName}</p>
            <p className="text-white/40 text-xs">Incoming video call</p>
          </div>

          {/* Decline */}
          <button
            onClick={handleDecline}
            className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex-shrink-0"
          >
            Decline
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 rounded-full bg-[#C8962C] text-black text-xs font-bold flex-shrink-0"
          >
            Accept
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IncomingCallBanner;
