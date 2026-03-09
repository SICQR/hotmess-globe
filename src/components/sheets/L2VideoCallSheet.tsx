/**
 * L2VideoCallSheet
 *
 * Full-screen video call interface with Supabase-backed WebRTC signaling.
 *
 * Signal flow (via rtc_signals table + Supabase Realtime):
 *   Caller:  create video_call → getUserMedia → createOffer → INSERT offer signal
 *            → await answer signal → setRemoteDescription
 *   Callee:  receive callId → getUserMedia → fetch offer → createAnswer
 *            → INSERT answer signal
 *   Both:    exchange ICE candidates via rtc_signals
 *
 * Props:
 *   callId       – existing video_calls.id (callee-side, or rejoin)
 *   calleeId     – profiles.id of the person to call (caller-side)
 *   calleeName   – display name
 *   calleeAvatar – avatar URL
 *
 * Tables used:
 *   video_calls  (id, caller_id, callee_id, status, started_at, ended_at, duration_seconds)
 *   rtc_signals  (id, call_id, from_user_id, to_user_id, type, payload, processed)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize, Shield, Loader2 } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';
import { pushNotify } from '@/lib/pushNotify';

interface L2VideoCallSheetProps {
  callId?: string;
  calleeId?: string;
  calleeName?: string;
  calleeAvatar?: string;
}

type CallStatus = 'init' | 'connecting' | 'connected' | 'ended' | 'failed';

const PC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function L2VideoCallSheet({
  callId: initialCallId = '',
  calleeId = '',
  calleeName = 'Unknown',
  calleeAvatar,
}: L2VideoCallSheetProps) {
  const { closeSheet } = useSheet();

  const [videoEnabled, setVideoEnabled]   = useState(true);
  const [audioEnabled, setAudioEnabled]   = useState(true);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [callDuration, setCallDuration]   = useState(0);
  const [callStatus, setCallStatus]       = useState<CallStatus>('init');
  const [statusLabel, setStatusLabel]     = useState('Connecting…');
  const [activeCallId, setActiveCallId]   = useState<string>(initialCallId);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myUserIdRef    = useRef<string | null>(null);
  const isCallerRef    = useRef<boolean>(false);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closePeerConnection = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const endCall = useCallback(async (reason = 'user_hangup') => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Send end signal to remote party (best-effort)
    if (activeCallId && myUserIdRef.current) {
      const remoteId = isCallerRef.current ? calleeId : null;
      if (remoteId) {
        supabase.from('rtc_signals').insert({
          call_id: activeCallId,
          from_user_id: myUserIdRef.current,
          to_user_id: remoteId,
          type: 'end',
          payload: { reason } as Record<string, unknown>,
        }).then(() => {});
      }
    }

    stopAllTracks();
    closePeerConnection();
    setCallStatus('ended');

    // Update video_calls record
    if (activeCallId) {
      await supabase.from('video_calls').update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        end_reason: reason,
        duration_seconds: callDuration,
      }).eq('id', activeCallId);
    }
    closeSheet();
  }, [stopAllTracks, closePeerConnection, activeCallId, callDuration, calleeId, closeSheet]);

  // ── Subscribe to rtc_signals for this call ─────────────────────────────────
  const subscribeSignals = useCallback((callId: string, myId: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`rtc:${callId}:${myId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rtc_signals',
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const sig = payload.new as {
            from_user_id: string;
            to_user_id: string;
            type: string;
            payload: Record<string, unknown>;
            id: string;
          };

          // Ignore signals we sent ourselves
          if (sig.from_user_id === myId) return;
          // Only process signals addressed to us
          if (sig.to_user_id !== myId) return;

          const pc = pcRef.current;
          if (!pc) return;

          if (sig.type === 'offer' && !isCallerRef.current) {
            // Callee receives offer
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as unknown as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await supabase.from('rtc_signals').insert({
              call_id: callId,
              from_user_id: myId,
              to_user_id: sig.from_user_id,
              type: 'answer',
              payload: answer as unknown as Record<string, unknown>,
            });
            // Update call status to active
            await supabase.from('video_calls').update({
              status: 'active',
              started_at: new Date().toISOString(),
            }).eq('id', callId);

          } else if (sig.type === 'answer' && isCallerRef.current) {
            // Caller receives answer
            if (pc.signalingState !== 'have-local-offer') return;
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as unknown as RTCSessionDescriptionInit));

          } else if (sig.type === 'ice-candidate') {
            // Both sides receive ICE candidates
            if (sig.payload?.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(sig.payload as unknown as RTCIceCandidateInit)).catch(() => {});
            }
          } else if (sig.type === 'end') {
            endCall('remote_hangup');
          }

          // Mark signal processed
          await supabase.from('rtc_signals').update({ processed: true }).eq('id', sig.id);
        }
      )
      .subscribe();
  }, [endCall]);

  // ── Create RTCPeerConnection ────────────────────────────────────────────────
  const createPC = useCallback((callId: string, myId: string, remoteId: string) => {
    const pc = new RTCPeerConnection(PC_CONFIG);
    pcRef.current = pc;

    // Add local tracks
    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    // Remote track → remote video
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidate → publish to rtc_signals
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      supabase.from('rtc_signals').insert({
        call_id: callId,
        from_user_id: myId,
        to_user_id: remoteId,
        type: 'ice-candidate',
        payload: candidate.toJSON() as unknown as Record<string, unknown>,
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          setStatusLabel('Connected');
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
          }
          break;
        case 'disconnected':
        case 'failed':
          setCallStatus('failed');
          setStatusLabel('Call dropped');
          break;
        case 'closed':
          break;
      }
    };

    return pc;
  }, []);

  // ── Initialize call ─────────────────────────────────────────────────────────
  const initializeCall = useCallback(async () => {
    setCallStatus('connecting');
    setStatusLabel('Starting camera…');

    try {
      // 1. Get auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      myUserIdRef.current = user.id;

      // 2. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      let callId = initialCallId;
      let remoteId = calleeId;

      if (!callId && calleeId) {
        // ── CALLER: initiate new call ────────────────────────────────────────
        isCallerRef.current = true;

        // Create video_calls record — 'ringing' triggers IncomingCallBanner on callee
        const { data: callRow, error } = await supabase.from('video_calls').insert({
          caller_id: user.id,
          callee_id: calleeId,
          status: 'ringing',
        }).select('id').single();

        if (error) throw error;
        callId = callRow.id;
        setActiveCallId(callId);

        // Push notification to wake callee's device (fire-and-forget)
        (async () => {
          try {
            const [{ data: calleeProfile }, { data: callerProfile }] = await Promise.all([
              supabase.from('profiles').select('email').eq('id', calleeId).maybeSingle(),
              supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
            ]);
            if (calleeProfile?.email) {
              const callerName = callerProfile?.display_name || 'Someone';
              pushNotify({
                emails: [calleeProfile.email],
                title: `${callerName} is calling you`,
                body: 'Incoming video call on HOTMESS',
                tag: `call-${callId}`,
                url: '/ghosted',
              });
            }
          } catch { /* best-effort */ }
        })();

        setStatusLabel('Ringing…');
        const pc = createPC(callId, user.id, calleeId);
        subscribeSignals(callId, user.id);

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await supabase.from('rtc_signals').insert({
          call_id: callId,
          from_user_id: user.id,
          to_user_id: calleeId,
          type: 'offer',
          payload: offer as unknown as Record<string, unknown>,
        });

      } else if (callId) {
        // ── CALLEE: join existing call ───────────────────────────────────────
        isCallerRef.current = false;

        // Fetch the call to get caller_id
        const { data: callRow } = await supabase
          .from('video_calls')
          .select('caller_id, callee_id, status')
          .eq('id', callId)
          .single();

        if (!callRow) throw new Error('Call not found');
        remoteId = callRow.caller_id;

        setStatusLabel('Connecting…');
        createPC(callId, user.id, remoteId);
        subscribeSignals(callId, user.id);

        // Fetch any already-queued offer signal
        const { data: offerSig } = await supabase
          .from('rtc_signals')
          .select('*')
          .eq('call_id', callId)
          .eq('type', 'offer')
          .eq('processed', false)
          .single();

        if (offerSig) {
          const pc = pcRef.current!;
          await pc.setRemoteDescription(new RTCSessionDescription(offerSig.payload as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await supabase.from('rtc_signals').insert({
            call_id: callId,
            from_user_id: user.id,
            to_user_id: remoteId,
            type: 'answer',
            payload: answer as unknown as Record<string, unknown>,
          });
          await supabase.from('video_calls').update({
            status: 'active',
            started_at: new Date().toISOString(),
          }).eq('id', callId);
          await supabase.from('rtc_signals').update({ processed: true }).eq('id', offerSig.id);
        }

      } else {
        // No callId and no calleeId — can't start
        throw new Error('Missing calleeId or callId');
      }

    } catch (error) {
      console.error('[VideoCall] init error:', error);
      setCallStatus('failed');
      setStatusLabel('Could not start call');
      stopAllTracks();
      closePeerConnection();
    }
  }, [initialCallId, calleeId, createPC, subscribeSignals, stopAllTracks, closePeerConnection]);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    initializeCall();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllTracks();
      closePeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle video track ─────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  }, []);

  // ── Toggle audio track ─────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  }, []);

  // ── Toggle fullscreen ──────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isRemoteConnected = callStatus === 'connected' && remoteVideoRef.current?.srcObject;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-black z-[80] flex flex-col"
    >
      {/* ── Header overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 pt-[env(safe-area-inset-top,24px)] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{calleeName}</h3>
            <div className="flex items-center gap-3 text-sm mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                callStatus === 'connected'
                  ? 'bg-[#34C759]/20 text-[#34C759]'
                  : callStatus === 'failed'
                    ? 'bg-[#FF3B30]/20 text-[#FF3B30]'
                    : 'bg-[#C8962C]/20 text-[#C8962C]'
              }`}>
                {callStatus === 'connected' ? 'Connected' : callStatus === 'failed' ? 'Failed' : statusLabel}
              </span>
              {callStatus === 'connected' && (
                <span className="text-white/60 font-mono text-sm">{formatDuration(callDuration)}</span>
              )}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          >
            <Maximize className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* ── Video grid ── */}
      <div className="flex-1 relative">
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Avatar / connecting overlay — shown when remote video not yet streaming */}
        {!isRemoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0D]">
            {calleeAvatar ? (
              <img
                src={calleeAvatar}
                alt={calleeName}
                className="w-28 h-28 rounded-full object-cover border-2 border-[#C8962C]/30 mb-4"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-[#1C1C1E] flex items-center justify-center mb-4 border-2 border-[#C8962C]/30">
                <span className="text-4xl font-bold text-[#C8962C]">
                  {calleeName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <p className="text-xl font-semibold text-white">{calleeName}</p>
            {callStatus === 'failed' ? (
              <div className="mt-4 text-center px-8">
                <p className="text-[#FF3B30] font-black text-sm uppercase tracking-wider">Call Failed</p>
                <p className="text-white/40 text-xs mt-2">Could not connect. Check your connection and try again.</p>
                <button onClick={() => endCall('user_hangup')} className="mt-6 bg-[#C8962C] text-black font-black text-sm rounded-2xl px-6 py-3">
                  Close
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3">
                <Loader2 className="w-4 h-4 text-[#C8962C] animate-spin" />
                <p className="text-sm text-[#8E8E93]">{statusLabel}</p>
              </div>
            )}
          </div>
        )}

        {/* Local video PIP — draggable */}
        <motion.div
          drag
          dragConstraints={containerRef}
          dragElastic={0.1}
          className="absolute top-20 right-4 w-[120px] h-[160px] bg-black rounded-2xl border-2 border-[#C8962C]/40 overflow-hidden shadow-lg shadow-black/50 cursor-move z-10"
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-white/60" />
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Safety banner ── */}
      <div className="absolute bottom-36 left-4 right-4 z-20 p-3 bg-black/60 backdrop-blur-sm border border-[#34C759]/30 rounded-xl">
        <p className="text-xs text-white/70 flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#34C759] flex-shrink-0 mt-px" />
          <span>
            <span className="font-bold text-[#34C759]">SAFETY:</span> This call is not recorded.
            End the call immediately if you feel uncomfortable.
          </span>
        </p>
      </div>

      {/* ── Controls bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-[env(safe-area-inset-bottom,24px)] pt-8 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 ${
              videoEnabled ? 'bg-white/15 border border-white/20' : 'bg-[#FF3B30] border border-[#FF3B30]'
            }`}
          >
            {videoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 ${
              audioEnabled ? 'bg-white/15 border border-white/20' : 'bg-[#FF3B30] border border-[#FF3B30]'
            }`}
          >
            {audioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={() => endCall('user_hangup')}
            aria-label="End call"
            className="w-16 h-16 flex items-center justify-center rounded-full bg-[#FF3B30] border-2 border-[#FF3B30] active:scale-95 transition-transform"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/15 border border-white/20 active:scale-95 transition-all"
          >
            <Maximize className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
