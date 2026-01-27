import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * WebRTC Video Call Hook
 * Handles peer connection, signaling, and media streams
 */

// Call states
export const CALL_STATE = {
  IDLE: 'idle',
  CALLING: 'calling',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
};

export function useVideoCall() {
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [callId, setCallId] = useState(null);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const signalChannel = useRef(null);
  const callTimer = useRef(null);
  const iceServers = useRef([]);

  // Fetch ICE servers configuration
  const { data: rtcConfig } = useQuery({
    queryKey: ['rtc-config'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch('/api/rtc/signal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to get RTC config');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Send signaling message
  const sendSignal = useCallback(async (type, targetUserId, payload = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch('/api/rtc/signal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        targetUserId,
        callId: callId,
        payload,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Signal failed');
    }

    return response.json();
  }, [callId]);

  // Get local media stream
  const getLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      localStream.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to get local media:', err);
      setError('Camera/microphone access denied');
      throw err;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const config = {
      iceServers: rtcConfig?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(config);

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      remoteStream.current = event.streams[0];
      // Trigger state update
      setCallState((prev) => prev === CALL_STATE.CONNECTING ? CALL_STATE.CONNECTED : prev);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        sendSignal('ice-candidate', remoteUserId, { candidate: event.candidate });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setCallState(CALL_STATE.CONNECTED);
          startCallTimer();
          break;
        case 'disconnected':
        case 'failed':
          endCall('connection_failed');
          break;
        case 'closed':
          setCallState(CALL_STATE.ENDED);
          break;
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [rtcConfig, remoteUserId, sendSignal]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    if (callTimer.current) clearInterval(callTimer.current);
    setCallDuration(0);
    callTimer.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopCallTimer = useCallback(() => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
  }, []);

  // Initiate a call
  const startCall = useCallback(async (targetUserId, videoEnabled = true) => {
    try {
      setError(null);
      setRemoteUserId(targetUserId);
      setCallState(CALL_STATE.CALLING);

      // Get local media
      await getLocalStream(videoEnabled);

      // Request call
      const result = await sendSignal('call-request', targetUserId);
      setCallId(result.callId);

      // Create peer connection
      const pc = createPeerConnection();

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: videoEnabled,
      });
      await pc.setLocalDescription(offer);
      await sendSignal('offer', targetUserId, { sdp: offer });

      setCallState(CALL_STATE.CONNECTING);
    } catch (err) {
      console.error('Failed to start call:', err);
      setError(err.message);
      setCallState(CALL_STATE.FAILED);
    }
  }, [getLocalStream, createPeerConnection, sendSignal]);

  // Accept incoming call
  const acceptCall = useCallback(async (incomingCallId, callerId, videoEnabled = true) => {
    try {
      setError(null);
      setCallId(incomingCallId);
      setRemoteUserId(callerId);
      setCallState(CALL_STATE.CONNECTING);

      // Get local media
      await getLocalStream(videoEnabled);

      // Accept call
      await sendSignal('call-accept', callerId);

      // Create peer connection
      createPeerConnection();
    } catch (err) {
      console.error('Failed to accept call:', err);
      setError(err.message);
      setCallState(CALL_STATE.FAILED);
    }
  }, [getLocalStream, createPeerConnection, sendSignal]);

  // Reject incoming call
  const rejectCall = useCallback(async (incomingCallId, callerId) => {
    try {
      await sendSignal('call-reject', callerId);
      setCallState(CALL_STATE.IDLE);
    } catch (err) {
      console.error('Failed to reject call:', err);
    }
  }, [sendSignal]);

  // End call
  const endCall = useCallback(async (reason = 'user_hangup') => {
    try {
      // Send end signal
      if (remoteUserId && callId) {
        await sendSignal('call-end', remoteUserId);
      }
    } catch {
      // Ignore errors when ending
    }

    // Cleanup
    stopCallTimer();

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    remoteStream.current = null;
    setCallState(CALL_STATE.ENDED);
    setCallId(null);
    setRemoteUserId(null);
  }, [remoteUserId, callId, sendSignal, stopCallTimer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!localStream.current) return;

    const videoTrack = localStream.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });

      const newTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(
          (s) => s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      // Update local stream
      videoTrack.stop();
      localStream.current.removeTrack(videoTrack);
      localStream.current.addTrack(newTrack);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  }, []);

  // Handle incoming signals
  useEffect(() => {
    if (!rtcConfig?.userId) return;

    const channel = supabase
      .channel(`rtc_signals:${rtcConfig.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rtc_signals',
          filter: `to_user_id=eq.${rtcConfig.userId}`,
        },
        async (payload) => {
          const signal = payload.new;

          switch (signal.type) {
            case 'incoming-call':
              setCallId(signal.call_id);
              setRemoteUserId(signal.from_user_id);
              setCallState(CALL_STATE.RINGING);
              break;

            case 'call-accepted':
              setCallState(CALL_STATE.CONNECTING);
              break;

            case 'call-rejected':
            case 'call-ended':
              endCall();
              break;

            case 'offer':
              if (peerConnection.current && signal.payload.sdp) {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload.sdp)
                );
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                await sendSignal('answer', signal.from_user_id, { sdp: answer });
              }
              break;

            case 'answer':
              if (peerConnection.current && signal.payload.sdp) {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.payload.sdp)
                );
              }
              break;

            case 'ice-candidate':
              if (peerConnection.current && signal.payload.candidate) {
                await peerConnection.current.addIceCandidate(
                  new RTCIceCandidate(signal.payload.candidate)
                );
              }
              break;
          }

          // Mark signal as processed
          await supabase
            .from('rtc_signals')
            .update({ processed: true })
            .eq('id', signal.id);
        }
      )
      .subscribe();

    signalChannel.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [rtcConfig?.userId, endCall, sendSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    // State
    callState,
    callId,
    remoteUserId,
    error,
    isMuted,
    isVideoOff,
    callDuration,
    formattedDuration: formatDuration(callDuration),

    // Streams
    localStream: localStream.current,
    remoteStream: remoteStream.current,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,

    // Check if call is active
    isActive: [CALL_STATE.CALLING, CALL_STATE.RINGING, CALL_STATE.CONNECTING, CALL_STATE.CONNECTED].includes(callState),
    isRinging: callState === CALL_STATE.RINGING,
    isConnected: callState === CALL_STATE.CONNECTED,
  };
}
