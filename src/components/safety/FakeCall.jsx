/**
 * FakeCall - Fake incoming call for emergency escape
 * 
 * Simulates a realistic phone call with customizable caller
 * and AI-generated voice responses
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, PhoneOff, PhoneIncoming, User, Clock, 
  Mic, MicOff, Volume2, X, Settings
} from 'lucide-react';

// Preset callers
const PRESET_CALLERS = [
  { id: 'friend', name: 'Best Friend', avatar: '👤', number: '(555) 123-4567' },
  { id: 'mom', name: 'Mom', avatar: '👩', number: '(555) 234-5678' },
  { id: 'work', name: 'Work', avatar: '💼', number: '(555) 345-6789' },
  { id: 'roommate', name: 'Roommate', avatar: '🏠', number: '(555) 456-7890' },
];

// Pre-recorded "other side" responses
const CALL_RESPONSES = {
  greeting: [
    "Hey! What's up?",
    "Hi there! How are you?",
    "Hello?",
  ],
  urgent: [
    "I need you to come home right now.",
    "Something happened, can you come over?",
    "Where are you? We need you here.",
  ],
  casual: [
    "What are you up to?",
    "Are you still out?",
    "When are you coming back?",
  ],
};

export function FakeCallTrigger({
  onTrigger,
  delay = 30, // seconds
  caller = PRESET_CALLERS[0],
  className = '',
}) {
  const [countdown, setCountdown] = useState(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const timerRef = useRef(null);

  const scheduleCall = () => {
    setIsScheduled(true);
    setCountdown(delay);
    
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setIsScheduled(false);
          onTrigger?.();
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelCall = () => {
    clearInterval(timerRef.current);
    setIsScheduled(false);
    setCountdown(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className={className}>
      {!isScheduled ? (
        <button
          onClick={scheduleCall}
          className="w-full bg-[#E62020]/20 border border-[#E62020]/50 p-4
                     hover:bg-[#E62020]/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#E62020] flex items-center justify-center">
              <PhoneIncoming className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold tracking-wider">FAKE CALL</div>
              <div className="text-xs text-white/60">
                Receive a fake call in {delay} seconds
              </div>
            </div>
            <Clock className="w-5 h-5 text-white/40" />
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#E62020]/20 border border-[#E62020] p-4"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-12 h-12 bg-[#E62020] flex items-center justify-center"
            >
              <Phone className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <div className="font-bold tracking-wider">CALL INCOMING IN</div>
              <div className="text-2xl font-mono text-[#E62020]">
                {String(Math.floor(countdown / 60)).padStart(2, '0')}:
                {String(countdown % 60).padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={cancelCall}
              className="p-2 border border-white/20 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function FakeCallScreen({
  isOpen,
  onClose,
  caller = PRESET_CALLERS[0],
  scenario = 'casual', // 'greeting', 'urgent', 'casual'
}) {
  const [callState, setCallState] = useState('incoming'); // 'incoming', 'active', 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCallState('incoming');
      setCallDuration(0);
      // Vibrate on incoming call
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const answerCall = () => {
    setCallState('active');
    // Start call timer
    timerRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    
    // Play greeting audio (in production)
    // playAudio(CALL_RESPONSES[scenario][0]);
  };

  const endCall = () => {
    setCallState('ended');
    clearInterval(timerRef.current);
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    setTimeout(onClose, 500);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
      >
        {/* Status Bar Simulation */}
        <div className="flex items-center justify-between px-6 py-2 text-xs text-white/60">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-2">
            <span>📶</span>
            <span>🔋 87%</span>
          </div>
        </div>

        {/* Call Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Caller Avatar */}
          <motion.div
            animate={callState === 'incoming' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: callState === 'incoming' ? Infinity : 0, duration: 1.5 }}
            className={`
              w-32 h-32 rounded-full flex items-center justify-center text-5xl
              ${callState === 'incoming' 
                ? 'bg-green-500/20 border-4 border-green-500' 
                : 'bg-white/10 border-4 border-white/20'
              }
            `}
          >
            {caller.avatar}
          </motion.div>

          {/* Caller Name */}
          <h2 className="text-3xl font-bold mt-6">{caller.name}</h2>
          <p className="text-white/60 mt-1">{caller.number}</p>

          {/* Call Status */}
          <div className="mt-4 text-sm">
            {callState === 'incoming' && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-green-500"
              >
                Incoming Call...
              </motion.span>
            )}
            {callState === 'active' && (
              <span className="text-white/60 font-mono">
                {formatDuration(callDuration)}
              </span>
            )}
            {callState === 'ended' && (
              <span className="text-red-500">Call Ended</span>
            )}
          </div>
        </div>

        {/* Call Actions */}
        {callState === 'incoming' && (
          <div className="px-6 pb-12">
            {/* Slide to answer hint */}
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-center text-xs text-white/40 mb-6"
            >
              Swipe up to answer
            </motion.p>
            
            <div className="flex justify-center gap-20">
              {/* Decline */}
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              
              {/* Answer */}
              <button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)' }}
              >
                <Phone className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {callState === 'active' && (
          <div className="px-6 pb-12">
            {/* In-call controls */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <CallControl
                icon={isMuted ? MicOff : Mic}
                label={isMuted ? 'Unmute' : 'Mute'}
                active={isMuted}
                onClick={() => setIsMuted(!isMuted)}
              />
              <CallControl
                icon={Settings}
                label="Keypad"
                onClick={() => {
                  // Keypad not needed for fake calls - this is a safety feature
                  // Just provide visual feedback
                }}
              />
              <CallControl
                icon={Volume2}
                label="Speaker"
                active={isSpeakerOn}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              />
            </div>
            
            {/* End Call */}
            <div className="flex justify-center">
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Secret dismiss - tap corners to exit without showing decline */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 opacity-0"
          aria-label="Dismiss"
        />
      </motion.div>
    </AnimatePresence>
  );
}

function CallControl({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div 
        className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-colors
          ${active ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'}
        `}
      >
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs text-white/60">{label}</span>
    </button>
  );
}

// Full Fake Call Manager with settings
export function FakeCallManager({
  isOpen,
  onClose,
  onSchedule,
}) {
  const [selectedCaller, setSelectedCaller] = useState(PRESET_CALLERS[0]);
  const [delay, setDelay] = useState(30);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const handleSchedule = () => {
    const caller = useCustom 
      ? { id: 'custom', name: customName, number: customNumber, avatar: '👤' }
      : selectedCaller;
    
    onSchedule?.({ caller, delay });
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-black border-2 border-white/20 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-wider">FAKE CALL SETUP</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preset Callers */}
            <div className="mb-6">
              <label className="block text-xs text-white/60 mb-3 font-mono">SELECT CALLER</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_CALLERS.map((caller) => (
                  <button
                    key={caller.id}
                    onClick={() => {
                      setSelectedCaller(caller);
                      setUseCustom(false);
                    }}
                    className={`
                      p-3 border flex items-center gap-3 transition-all
                      ${!useCustom && selectedCaller.id === caller.id
                        ? 'border-[#E62020] bg-[#E62020]/20'
                        : 'border-white/20 hover:border-white/40'
                      }
                    `}
                  >
                    <span className="text-2xl">{caller.avatar}</span>
                    <div className="text-left">
                      <div className="text-sm font-bold">{caller.name}</div>
                      <div className="text-xs text-white/40">{caller.number}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Caller */}
            <div className="mb-6">
              <button
                onClick={() => setUseCustom(!useCustom)}
                className={`
                  w-full p-3 border flex items-center gap-3 mb-3 transition-all
                  ${useCustom 
                    ? 'border-[#E62020] bg-[#E62020]/20' 
                    : 'border-white/20 hover:border-white/40'
                  }
                `}
              >
                <User className="w-6 h-6" />
                <span className="font-bold">Custom Caller</span>
              </button>
              
              {useCustom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-3 pl-4 border-l-2 border-[#E62020]"
                >
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Caller name"
                    className="w-full bg-black border border-white/20 p-2 text-sm
                               focus:border-[#E62020] focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={customNumber}
                    onChange={(e) => setCustomNumber(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-black border border-white/20 p-2 text-sm
                               focus:border-[#E62020] focus:outline-none"
                  />
                </motion.div>
              )}
            </div>

            {/* Delay Selection */}
            <div className="mb-6">
              <label className="block text-xs text-white/60 mb-3 font-mono">
                CALL DELAY: {delay} SECONDS
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full accent-[#E62020]"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>10s</span>
                <span>1 min</span>
                <span>2 min</span>
              </div>
            </div>

            {/* Schedule Button */}
            <button
              onClick={handleSchedule}
              disabled={useCustom && (!customName || !customNumber)}
              className="w-full bg-[#E62020] text-white py-4 font-bold tracking-wider
                         hover:bg-[#ff2424] disabled:opacity-50 transition-all
                         flex items-center justify-center gap-2"
              style={{ boxShadow: '0 0 20px rgba(230, 32, 32, 0.4)' }}
            >
              <PhoneIncoming className="w-5 h-5" />
              SCHEDULE CALL
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FakeCallScreen;
