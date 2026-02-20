import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, PhoneOff, User, X, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * FakeCallGenerator - Safety feature for escaping awkward/unsafe situations
 * 
 * Simulates an incoming phone call with:
 * - Customizable caller name
 * - Delay timer (5s, 30s, 1min, 5min)
 * - Realistic vibration pattern
 * - Full-screen incoming call UI
 * - "Answer" redirects to safety/care page
 */

const VIBRATION_PATTERN = [200, 100, 200, 100, 200, 500]; // Realistic phone ring

const PRESET_CALLERS = [
  { name: 'Mum', emoji: '👩' },
  { name: 'Best Friend', emoji: '🧑‍🤝‍🧑' },
  { name: 'Work', emoji: '💼' },
  { name: 'Flatmate', emoji: '🏠' },
  { name: 'Partner', emoji: '❤️' },
];

const DELAY_OPTIONS = [
  { label: 'Now', seconds: 0 },
  { label: '5 sec', seconds: 5 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
];

export default function FakeCallGenerator({ onClose, compact = false }) {
  const navigate = useNavigate();
  const [callerName, setCallerName] = useState('Mum');
  const [selectedDelay, setSelectedDelay] = useState(5);
  const [isScheduled, setIsScheduled] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [callAnswered, setCallAnswered] = useState(false);
  
  const timerRef = useRef(null);
  const vibrationRef = useRef(null);
  const audioRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (vibrationRef.current) clearInterval(vibrationRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      navigator.vibrate?.(0);
    };
  }, []);

  const scheduleCall = () => {
    setIsScheduled(true);
    setCountdown(selectedDelay);

    if (selectedDelay === 0) {
      triggerCall();
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          triggerCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerCall = () => {
    setShowIncomingCall(true);
    
    // Start vibration pattern (repeating)
    const vibrateLoop = () => {
      if (navigator.vibrate) {
        navigator.vibrate(VIBRATION_PATTERN);
      }
    };
    vibrateLoop();
    vibrationRef.current = setInterval(vibrateLoop, 1500);

    // Try to play ringtone (browser may block autoplay)
    try {
      // Use a simple oscillator as fallback ringtone
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Ring pattern
      const ringPattern = () => {
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
      };
      
      const ringInterval = setInterval(ringPattern, 1000);
      
      audioRef.current = {
        pause: () => {
          oscillator.stop();
          clearInterval(ringInterval);
          audioContext.close();
        }
      };
    } catch (e) {
      // Audio not supported, vibration will still work
    }
  };

  const answerCall = () => {
    setCallAnswered(true);
    stopRinging();
    
    // Brief "answered" state, then redirect to safety
    setTimeout(() => {
      navigate('/safety');
    }, 1500);
  };

  const declineCall = () => {
    stopRinging();
    setShowIncomingCall(false);
    setIsScheduled(false);
    setCountdown(null);
  };

  const stopRinging = () => {
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    navigator.vibrate?.(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const cancelScheduled = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsScheduled(false);
    setCountdown(null);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Full-screen incoming call overlay
  if (showIncomingCall) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#1a1a2e] to-black flex flex-col items-center justify-between py-16 px-6"
      >
        {/* Caller Info */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center mb-6 border-4 border-white/20"
          >
            <User className="w-16 h-16 text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-black text-white mb-2">{callerName}</h1>
          <p className="text-white/60 text-lg">
            {callAnswered ? 'Connected' : 'Incoming call...'}
          </p>
          
          {callAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-[#39FF14] font-bold"
            >
              Redirecting to safety...
            </motion.div>
          )}
        </div>

        {/* Call Actions */}
        {!callAnswered && (
          <div className="flex items-center justify-center gap-16">
            {/* Decline */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={declineCall}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]"
            >
              <PhoneOff className="w-10 h-10 text-white" />
            </motion.button>

            {/* Answer */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              onClick={answerCall}
              className="w-20 h-20 rounded-full bg-[#39FF14] flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.5)]"
            >
              <Phone className="w-10 h-10 text-black" />
            </motion.button>
          </div>
        )}

        {/* Subtle hint */}
        <p className="text-white/30 text-xs mt-8 text-center">
          Answer to go to Safety Hub
        </p>
      </motion.div>
    );
  }

  // Scheduled state - waiting for call
  if (isScheduled) {
    return (
      <div className={cn(
        "bg-black border-2 border-[#39FF14] p-6",
        compact ? "rounded-lg" : ""
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#39FF14]/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-[#39FF14]" />
          </div>
          <div>
            <h3 className="font-black text-white">CALL SCHEDULED</h3>
            <p className="text-sm text-white/60">From: {callerName}</p>
          </div>
        </div>

        <div className="text-center py-6">
          <div className="text-5xl font-black text-[#39FF14] mb-2">
            {formatTime(countdown)}
          </div>
          <p className="text-white/40 text-sm">until incoming call</p>
        </div>

        <p className="text-xs text-white/40 text-center mb-4">
          Put your phone face-up. The call will appear automatically.
        </p>

        <Button
          onClick={cancelScheduled}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Setup state
  return (
    <div className={cn(
      "bg-black",
      compact ? "" : "border-2 border-[#FF1493] p-6"
    )}>
      {!compact && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FF1493]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#FF1493]" />
            </div>
            <div>
              <h3 className="font-black text-white uppercase">Fake Call</h3>
              <p className="text-xs text-white/60">Escape awkward situations</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Caller Name */}
      <div className="mb-4">
        <label className="text-xs text-white/60 uppercase tracking-wider font-bold mb-2 block">
          Caller Name
        </label>
        <Input
          value={callerName}
          onChange={(e) => setCallerName(e.target.value)}
          placeholder="Enter name..."
          className="bg-white/5 border-white/20 text-white"
        />
        
        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESET_CALLERS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setCallerName(preset.name)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold border-2 transition-all",
                callerName === preset.name
                  ? "bg-[#FF1493] border-[#FF1493] text-black"
                  : "bg-transparent border-white/20 text-white/60 hover:border-white/40"
              )}
            >
              {preset.emoji} {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Delay Selection */}
      <div className="mb-6">
        <label className="text-xs text-white/60 uppercase tracking-wider font-bold mb-2 block">
          Call In
        </label>
        <div className="grid grid-cols-5 gap-2">
          {DELAY_OPTIONS.map((option) => (
            <button
              key={option.seconds}
              onClick={() => setSelectedDelay(option.seconds)}
              className={cn(
                "py-2 text-xs font-bold border-2 transition-all",
                selectedDelay === option.seconds
                  ? "bg-[#FF1493] border-[#FF1493] text-black"
                  : "bg-transparent border-white/20 text-white/60 hover:border-white/40"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white/5 border border-white/10 p-3 mb-4 text-xs text-white/60">
        <p className="font-bold text-white/80 mb-1">HOW IT WORKS</p>
        <p>
          Your phone will ring with a fake incoming call. Answer to be taken to the Safety Hub, 
          or decline to dismiss. Perfect for exiting uncomfortable situations gracefully.
        </p>
      </div>

      {/* Schedule Button */}
      <Button
        onClick={scheduleCall}
        className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black py-6"
      >
        <Phone className="w-5 h-5 mr-2" />
        {selectedDelay === 0 ? 'CALL NOW' : `CALL IN ${formatTime(selectedDelay)}`}
      </Button>
    </div>
  );
}

/**
 * FakeCallButton - Compact trigger button for quick access
 */
export function FakeCallButton({ onClick, className }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 bg-white/5 border-2 border-[#FF1493]/50 hover:border-[#FF1493] transition-all",
        className
      )}
    >
      <Phone className="w-5 h-5 text-[#FF1493]" />
      <div className="text-left">
        <p className="text-sm font-black text-white">FAKE CALL</p>
        <p className="text-[10px] text-white/60">Escape safely</p>
      </div>
    </motion.button>
  );
}
