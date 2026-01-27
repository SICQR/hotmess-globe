import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoCall, CALL_STATE } from '@/hooks/useVideoCall';

/**
 * Full-screen video call interface
 */
export function VideoCallScreen({ targetUser, onClose }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    callState,
    formattedDuration,
    error,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    isConnected,
  } = useVideoCall();

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start call when component mounts
  useEffect(() => {
    if (targetUser?.id) {
      startCall(targetUser.id);
    }
  }, [targetUser?.id, startCall]);

  // Handle call end
  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 100 }}
        className="fixed bottom-20 right-4 z-50"
      >
        <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
          {/* Remote video thumbnail */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <div className="w-10 h-10 rounded-full bg-zinc-700" />
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white">
            {formattedDuration}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="absolute top-1 right-1 p-1 bg-black/60 rounded hover:bg-black/80"
          >
            <Maximize2 className="w-3 h-3 text-white" />
          </button>

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="absolute bottom-1 right-1 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
          >
            <PhoneOff className="w-3 h-3 text-white" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 overflow-hidden">
              {targetUser?.avatar_url ? (
                <img src={targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-white">
                  {targetUser?.full_name?.[0] || '?'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {targetUser?.full_name || 'Unknown'}
            </h2>
            <p className="text-zinc-400">
              {callState === CALL_STATE.CALLING && 'Calling...'}
              {callState === CALL_STATE.CONNECTING && 'Connecting...'}
              {callState === CALL_STATE.FAILED && (error || 'Call failed')}
            </p>
          </div>
        )}
      </div>

      {/* Local video (picture-in-picture) */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className="absolute top-4 right-4 w-32 md:w-48 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 shadow-2xl border border-white/10"
      >
        {localStream && !isVideoOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <VideoOff className="w-8 h-8 text-zinc-500" />
          </div>
        )}
      </motion.div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
            {targetUser?.avatar_url ? (
              <img src={targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                {targetUser?.full_name?.[0]}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{targetUser?.full_name || 'Unknown'}</p>
            <p className="text-sm text-zinc-400">
              {isConnected ? formattedDuration : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleEndCall}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Switch camera */}
          <button
            onClick={switchCamera}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>

          {/* Toggle video */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              isVideoOff ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Toggle mute */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Incoming call modal
 */
export function IncomingCallModal({ caller, callId, onAccept, onReject }) {
  const { acceptCall, rejectCall } = useVideoCall();

  const handleAccept = async () => {
    await acceptCall(callId, caller.id);
    onAccept?.();
  };

  const handleReject = async () => {
    await rejectCall(callId, caller.id);
    onReject?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 text-center">
        {/* Pulsing ring animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-green-500/30"
          />
          <div className="relative w-24 h-24 rounded-full bg-zinc-800 overflow-hidden">
            {caller.avatar_url ? (
              <img src={caller.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-white">
                {caller.full_name?.[0] || '?'}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          {caller.full_name || 'Unknown'}
        </h2>
        <p className="text-zinc-400 mb-8">Incoming video call...</p>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
          >
            <Phone className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Video call button for profiles
 */
export function VideoCallButton({ targetUser, size = 'default', variant = 'default' }) {
  const [isCallActive, setIsCallActive] = useState(false);

  const handleStartCall = () => {
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
  };

  return (
    <>
      <Button
        onClick={handleStartCall}
        size={size}
        variant={variant}
        className={variant === 'default' ? 'bg-[#00d9ff] hover:bg-[#00d9ff]/80' : ''}
      >
        <Video className="w-4 h-4 mr-2" />
        Video Call
      </Button>

      <AnimatePresence>
        {isCallActive && (
          <VideoCallScreen targetUser={targetUser} onClose={handleEndCall} />
        )}
      </AnimatePresence>
    </>
  );
}
