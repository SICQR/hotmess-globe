/**
 * Video Call Room Component
 * 
 * WebRTC-based video calling with:
 * - Camera/mic controls
 * - Screen sharing (Premium)
 * - Blur background option
 * - End call / safety exit
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff,
  Maximize,
  Minimize,
  Monitor,
  Shield,
  User,
  Clock,
  Loader2,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';

// Call states
const CALL_STATES = {
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed'
};

export default function VideoCallRoom({
  callId,
  remoteUserId,
  remoteUserName,
  remoteUserPhoto,
  onEnd,
  className = ''
}) {
  const { user } = useAuth();
  const [callState, setCallState] = useState(CALL_STATES.CONNECTING);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize call
  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanupCall();
    };
  }, [callId]);

  // Initialize WebRTC connection
  const initializeCall = async () => {
    try {
      setCallState(CALL_STATES.CONNECTING);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallState(CALL_STATES.CONNECTED);
        startDurationTimer();
      };

      // ICE candidate handling
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase
            .from('rtc_signals')
            .insert({
              call_id: callId,
              sender_id: user.id,
              signal_type: 'ice-candidate',
              signal_data: event.candidate
            });
        }
      };

      // Connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        
        if (state === 'connected') {
          setCallState(CALL_STATES.CONNECTED);
        } else if (state === 'disconnected' || state === 'failed') {
          setCallState(CALL_STATES.FAILED);
          setError('Connection lost');
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await supabase
        .from('rtc_signals')
        .insert({
          call_id: callId,
          sender_id: user.id,
          signal_type: 'offer',
          signal_data: offer
        });

      setCallState(CALL_STATES.RINGING);

      // Listen for answer and ICE candidates
      const subscription = supabase
        .channel(`call-${callId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'rtc_signals',
          filter: `call_id=eq.${callId}`
        }, async (payload) => {
          const signal = payload.new;
          
          if (signal.sender_id === user.id) return;

          if (signal.signal_type === 'answer') {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(signal.signal_data)
            );
          } else if (signal.signal_type === 'ice-candidate') {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(signal.signal_data)
            );
          }
        })
        .subscribe();

      return () => subscription.unsubscribe();

    } catch (err) {
      console.error('Call initialization error:', err);
      setError(err.message || 'Failed to start call');
      setCallState(CALL_STATES.FAILED);
    }
  };

  // Cleanup call
  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  // Start duration timer
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // End call
  const endCall = async () => {
    cleanupCall();
    
    // Update call status in DB
    await supabase
      .from('video_calls')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_seconds: callDuration
      })
      .eq('id', callId);

    setCallState(CALL_STATES.ENDED);
    onEnd?.();
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden ${className}`}
    >
      {/* Remote video (full screen) */}
      <div className="absolute inset-0">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {/* Placeholder with user photo/icon */}
            <div className="text-center">
              {remoteUserPhoto ? (
                <img 
                  src={remoteUserPhoto} 
                  alt={remoteUserName}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-16 h-16 text-white/40" />
                </div>
              )}
              <p className="text-xl font-bold text-white">{remoteUserName}</p>
              
              {/* Call state message */}
              {callState === CALL_STATES.CONNECTING && (
                <p className="text-white/60 mt-2 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </p>
              )}
              {callState === CALL_STATES.RINGING && (
                <p className="text-white/60 mt-2">Ringing...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local video (picture-in-picture) */}
      <motion.div
        drag
        dragConstraints={containerRef}
        className="absolute bottom-24 right-4 w-32 h-44 md:w-40 md:h-56 border-2 border-white/20 bg-black overflow-hidden cursor-move z-10"
      >
        {!isVideoOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <VideoOff className="w-8 h-8 text-white/40" />
          </div>
        )}
      </motion.div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-black/50 border border-white/20">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="font-mono text-white">{formatDuration(callDuration)}</span>
            </div>
            {callState === CALL_STATES.CONNECTED && (
              <span className="px-2 py-1 bg-[#39FF14]/20 text-[#39FF14] text-xs font-bold">
                CONNECTED
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-colors
              ${isMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/20 hover:bg-white/30'
              }
            `}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Toggle video */}
          <button
            onClick={toggleVideo}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-colors
              ${isVideoOff 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/20 hover:bg-white/30'
              }
            `}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Camera flip (mobile) */}
          <button
            onClick={() => {/* TODO: Flip camera */}}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors md:hidden"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Safety button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => {
              endCall();
              // Could also trigger safety features
            }}
            className="px-4 py-2 bg-black/50 border border-white/20 text-white/60 text-xs 
                       hover:border-red-500 hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Safety Exit
          </button>
        </div>
      </div>

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50"
          >
            <div className="text-center p-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Call Error</h3>
              <p className="text-white/60 mb-4">{error}</p>
              <Button onClick={onEnd}>Close</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
