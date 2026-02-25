/**
 * VideoCallRoom — WebRTC video call UI
 *
 * Props:
 *   callId        TEXT  — video_calls.id (already created by caller)
 *   remoteUserId  UUID  — the other person's auth user id
 *   remoteUserName string
 *   remoteUserPhoto string | null
 *   isCaller      bool  — true if we initiated the call
 *   onEnd         fn    — called when call ends
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff,
  Maximize, Minimize, Shield, User, Clock,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const CALL_STATES = {
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function VideoCallRoom({
  callId,
  remoteUserId,
  remoteUserName = 'Unknown',
  remoteUserPhoto = null,
  isCaller = true,
  onEnd,
}) {
  const [userId, setUserId]           = useState(null);
  const [callState, setCallState]     = useState(CALL_STATES.CONNECTING);
  const [isMuted, setIsMuted]         = useState(false);
  const [isVideoOff, setIsVideoOff]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError]             = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const peerRef         = useRef(null);
  const localStreamRef  = useRef(null);
  const durationRef     = useRef(null);
  const containerRef    = useRef(null);
  const channelRef      = useRef(null);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Start call once we have userId
  useEffect(() => {
    if (!userId) return;
    initializeCall();
    return () => cleanupCall();
  }, [userId]);

  const sendSignal = async (type, payload) => {
    await supabase.from('rtc_signals').insert({
      call_id: callId,
      from_user_id: userId,
      to_user_id: remoteUserId,
      type,
      payload,
    });
  };

  const initializeCall = async () => {
    try {
      setCallState(CALL_STATES.CONNECTING);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setHasRemoteVideo(true);
        setCallState(CALL_STATES.CONNECTED);
        startTimer();
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('ice-candidate', event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') { setCallState(CALL_STATES.CONNECTED); }
        else if (s === 'disconnected' || s === 'failed') {
          setCallState(CALL_STATES.FAILED);
          setError('Connection lost. The other person may have disconnected.');
        }
      };

      // Subscribe to incoming signals
      channelRef.current = supabase
        .channel(`call-${callId}-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rtc_signals', filter: `call_id=eq.${callId}` },
          async ({ new: signal }) => {
            if (signal.from_user_id === userId) return; // ignore own signals
            await handleSignal(signal.type, signal.payload, pc);
          }
        )
        .subscribe();

      // Caller creates offer; callee waits for it
      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal('offer', offer);
        setCallState(CALL_STATES.RINGING);
      } else {
        setCallState(CALL_STATES.RINGING);
      }

    } catch (err) {
      console.error('[VideoCall] init error:', err);
      setError(err.message || 'Could not access camera/microphone');
      setCallState(CALL_STATES.FAILED);
    }
  };

  const handleSignal = async (type, payload, pc) => {
    try {
      if (type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer', answer);
      } else if (type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      } else if (type === 'end') {
        handleRemoteEnd();
      }
    } catch (err) {
      console.error('[VideoCall] signal error:', type, err);
    }
  };

  const handleRemoteEnd = () => {
    cleanupCall();
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => onEnd?.(), 1500);
  };

  const cleanupCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    if (durationRef.current) clearInterval(durationRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  };

  const startTimer = () => {
    durationRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(prev => !prev);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const endCall = async () => {
    await sendSignal('end', {});
    await supabase
      .from('video_calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callId);
    cleanupCall();
    setCallState(CALL_STATES.ENDED);
    onEnd?.();
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      {/* Remote video */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${hasRemoteVideo ? 'opacity-100' : 'opacity-0'}`}
        />
        {!hasRemoteVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]">
            <div className="text-center">
              {remoteUserPhoto ? (
                <img src={remoteUserPhoto} alt="" className="w-28 h-28 rounded-full mx-auto mb-4 object-cover border-2 border-[#C8962C]/40" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-14 h-14 text-white/30" />
                </div>
              )}
              <p className="text-xl font-black text-white">{remoteUserName}</p>
              <p className="text-white/40 mt-2 text-sm flex items-center justify-center gap-2">
                {callState === CALL_STATES.CONNECTING && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>}
                {callState === CALL_STATES.RINGING && 'Ringing...'}
                {callState === CALL_STATES.ENDED && 'Call ended'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PiP local video */}
      <motion.div
        drag
        dragConstraints={containerRef}
        className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 bg-black cursor-move z-10 shadow-xl"
      >
        {!isVideoOff ? (
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <VideoOff className="w-6 h-6 text-white/30" />
          </div>
        )}
      </motion.div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full border border-white/10">
              <Clock className="w-3.5 h-3.5 text-[#C8962C]" />
              <span className="font-mono text-white text-sm">{formatDuration(callDuration)}</span>
            </div>
            {callState === CALL_STATES.CONNECTED && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black rounded-full border border-green-500/30">
                LIVE
              </span>
            )}
          </div>
          <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/60">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-10">
        <div className="flex items-center justify-center gap-5 mb-4">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500' : 'bg-white/20'}`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* SOS / Safety exit */}
        <div className="flex justify-center">
          <button
            onClick={() => { endCall(); }}
            className="px-4 py-2 rounded-full bg-black/60 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5" />
            Safety Exit
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-6"
          >
            <div className="text-center max-w-xs">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white mb-2">Call Error</h3>
              <p className="text-white/50 text-sm mb-6">{error}</p>
              <button
                onClick={onEnd}
                className="px-6 py-3 bg-[#C8962C] text-black font-black rounded-2xl"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call ended overlay */}
      <AnimatePresence>
        {callState === CALL_STATES.ENDED && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50"
          >
            <div className="text-center">
              <p className="text-2xl font-black text-white mb-2">Call Ended</p>
              <p className="text-white/40 text-sm">{formatDuration(callDuration)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
