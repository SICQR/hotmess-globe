/**
 * L2VideoCallSheet
 *
 * Full-screen video call interface adapted for HOTMESS OS sheet system.
 * Uses browser WebRTC APIs for local camera preview.
 * Remote video is placeholder until signaling server is wired.
 *
 * Wireframe:
 * +---------------------------------------+
 * |  CalleeName        [Fullscreen]       |  <- gradient header, z-20
 * |  [Connecting...] 00:15               |
 * +---------------------------------------+
 * |                                       |
 * |     REMOTE VIDEO / AVATAR             |
 * |                                       |
 * |                    +--------+         |
 * |                    | LOCAL  |         |  <- draggable PIP
 * |                    +--------+         |
 * |                                       |
 * +---------------------------------------+
 * | SAFETY: call not recorded             |  <- safety banner
 * +---------------------------------------+
 * |  [Video] [Mic]  [END]  [Fullscreen]  |  <- controls, z-20
 * +---------------------------------------+
 *
 * Props: callId, calleeId, calleeName, calleeAvatar
 * States: connecting | connected | ended
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize, Shield } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

interface L2VideoCallSheetProps {
  callId?: string;
  calleeId?: string;
  calleeName?: string;
  calleeAvatar?: string;
}

type CallStatus = 'connecting' | 'connected' | 'ended';

export default function L2VideoCallSheet({
  callId = '',
  calleeId = '',
  calleeName = 'Unknown',
  calleeAvatar,
}: L2VideoCallSheetProps) {
  const { closeSheet } = useSheet();

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---- Video calls coming soon flag ----
  const [comingSoon] = useState(true);

  // ---- Initialize call ----
  const initializeCall = useCallback(async () => {
    // Video calls require WebRTC signaling (post-launch feature)
    if (comingSoon) {
      setCallStatus('connecting');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Production: use WebRTC signaling via rtc_signals table
      setTimeout(() => {
        setCallStatus('connected');
      }, 2000);
    } catch (error) {
      console.error('[VideoCall] Failed to initialize:', error);
      closeSheet();
    }
  }, [closeSheet, comingSoon]);

  // ---- Cleanup: stop all media tracks ----
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // ---- End call ----
  const endCall = useCallback(() => {
    stopAllTracks();
    setCallStatus('ended');
    closeSheet();
  }, [stopAllTracks, closeSheet]);

  // ---- Mount: init call + start timer ----
  useEffect(() => {
    initializeCall();

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Toggle video track ----
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // ---- Toggle audio track ----
  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // ---- Toggle fullscreen ----
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // ---- Format duration MM:SS ----
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-black z-[80] flex flex-col"
    >
      {/* ---- Header overlay ---- */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 pt-[env(safe-area-inset-top,24px)] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">{calleeName}</h3>
            <div className="flex items-center gap-3 text-sm mt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  callStatus === 'connecting'
                    ? 'bg-[#C8962C]/20 text-[#C8962C]'
                    : callStatus === 'connected'
                      ? 'bg-[#34C759]/20 text-[#34C759]'
                      : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                }`}
              >
                {callStatus === 'connecting' ? 'Connecting...' : callStatus === 'connected' ? 'Connected' : 'Ended'}
              </span>
              {callStatus === 'connected' && (
                <span className="text-white/60 font-mono text-sm">
                  {formatDuration(callDuration)}
                </span>
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

      {/* ---- Video grid ---- */}
      <div className="flex-1 relative">
        {/* Remote video (main) — placeholder until WebRTC signaling */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Avatar placeholder / Coming Soon overlay */}
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
          {comingSoon ? (
            <div className="mt-4 text-center px-8">
              <p className="text-[#C8962C] font-black text-sm uppercase tracking-wider">Coming Soon</p>
              <p className="text-white/40 text-xs mt-2 leading-relaxed">
                Video calls are being built with end-to-end encryption.
                Use chat to connect for now.
              </p>
              <button
                onClick={endCall}
                className="mt-6 bg-[#C8962C] text-black font-black text-sm rounded-2xl px-6 py-3"
              >
                Go Back
              </button>
            </div>
          ) : callStatus === 'connecting' ? (
            <p className="text-sm text-[#8E8E93] mt-2">Connecting...</p>
          ) : null}
        </div>

        {/* Connecting spinner overlay */}
        {callStatus === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute bottom-48 w-10 h-10 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Local video (PIP) — draggable */}
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

      {/* ---- Safety banner ---- */}
      <div className="absolute bottom-36 left-4 right-4 z-20 p-3 bg-black/60 backdrop-blur-sm border border-[#34C759]/30 rounded-xl">
        <p className="text-xs text-white/70 flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#34C759] flex-shrink-0 mt-px" />
          <span>
            <span className="font-bold text-[#34C759]">SAFETY:</span> This call is not recorded.
            End the call immediately if you feel uncomfortable.
          </span>
        </p>
      </div>

      {/* ---- Controls bar ---- */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-[env(safe-area-inset-bottom,24px)] pt-8 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 ${
              videoEnabled
                ? 'bg-white/15 border border-white/20'
                : 'bg-[#FF3B30] border border-[#FF3B30]'
            }`}
          >
            {videoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 ${
              audioEnabled
                ? 'bg-white/15 border border-white/20'
                : 'bg-[#FF3B30] border border-[#FF3B30]'
            }`}
          >
            {audioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            aria-label="End call"
            className="w-16 h-16 flex items-center justify-center rounded-full bg-[#FF3B30] border-2 border-[#FF3B30] active:scale-95 transition-transform"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Fullscreen */}
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
