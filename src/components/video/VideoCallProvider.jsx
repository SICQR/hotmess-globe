import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { IncomingCallModal, VideoCallScreen } from './VideoCallUI';

const VideoCallContext = createContext(null);

/**
 * Global video call provider
 * Handles incoming calls and manages call state across the app
 */
export function VideoCallProvider({ children }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`incoming_calls:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rtc_signals',
          filter: `to_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const signal = payload.new;

          if (signal.type === 'incoming-call' && !activeCall) {
            // Fetch caller info
            const { data: callerProfile } = await supabase
              .from('users')
              .select('id, full_name, avatar_url')
              .eq('id', signal.from_user_id)
              .single();

            setIncomingCall({
              callId: signal.call_id,
              caller: callerProfile || { id: signal.from_user_id },
            });
          }
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [currentUserId, activeCall]);

  // Handle accepting incoming call
  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      setActiveCall({
        callId: incomingCall.callId,
        targetUser: incomingCall.caller,
        isOutgoing: false,
      });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // Handle rejecting incoming call
  const handleRejectCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Start outgoing call
  const startCall = useCallback((targetUser) => {
    setActiveCall({
      targetUser,
      isOutgoing: true,
    });
  }, []);

  // End active call
  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const value = {
    incomingCall,
    activeCall,
    startCall,
    endCall,
    hasActiveCall: !!activeCall,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}

      {/* Incoming call modal */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <IncomingCallModal
            caller={incomingCall.caller}
            callId={incomingCall.callId}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {activeCall && (
          <VideoCallScreen
            targetUser={activeCall.targetUser}
            onClose={endCall}
          />
        )}
      </AnimatePresence>
    </VideoCallContext.Provider>
  );
}

export function useVideoCallContext() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCallContext must be used within VideoCallProvider');
  }
  return context;
}
