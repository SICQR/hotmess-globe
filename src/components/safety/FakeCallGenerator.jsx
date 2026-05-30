import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, X, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * FakeCallGenerator - "The Exit" Implementation
 * 
 * Requirements (v5 Final):
 * - Platform-matched visuals (iOS vs Android)
 * - Caller Logic: Trusted Contact (if available) or 'HOTMESS Concierge'
 * - Trigger: Immediate via event or scheduled
 */

const VIBRATION_PATTERN = [200, 100, 200, 100, 200, 500];

const DELAY_OPTIONS = [
  { label: 'Now', seconds: 0 },
  { label: '15s', seconds: 15 },
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
];

export default function FakeCallGenerator({ onClose, compact = false }) {
  const navigate = useNavigate();
  const [callerName, setCallerName] = useState('HOTMESS Concierge');
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [selectedDelay, setSelectedDelay] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const timerRef = useRef(null);
  const vibrationRef = useRef(null);

  // 1. Detect Platform
  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // 2. Fetch Trusted Contacts for Caller Selection
  useEffect(() => {
    const fetchContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('trusted_contacts').select('contact_name').limit(4);
      if (data && data.length > 0) {
        setTrustedContacts(data);
        setCallerName(data[0].contact_name);
      }
    };
    fetchContacts();
  }, []);

  // 3. Listen for Global Trigger Event (Silent SOS -> Fake Call)
  useEffect(() => {
    const handleGlobalTrigger = (e) => {
      const delay = e.detail?.delay ?? 0;
      if (delay === 0) {
        triggerCall();
      } else {
        setSelectedDelay(delay);
        scheduleCall(delay);
      }
    };
    window.addEventListener('hm:trigger-fake-call', handleGlobalTrigger);
    return () => window.removeEventListener('hm:trigger-fake-call', handleGlobalTrigger);
  }, [callerName]);

  const scheduleCall = (delayOverride) => {
    const delay = delayOverride ?? selectedDelay;
    setIsScheduled(true);
    setCountdown(delay);

    if (delay === 0) {
      triggerCall();
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
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
    
    const vibrateLoop = () => {
      if (navigator.vibrate) navigator.vibrate(VIBRATION_PATTERN);
    };
    vibrateLoop();
    vibrationRef.current = setInterval(vibrateLoop, 2000);
  };

  const stopRinging = () => {
    if (vibrationRef.current) clearInterval(vibrationRef.current);
    navigator.vibrate?.(0);
  };

  const handleDecline = () => {
    stopRinging();
    setShowIncomingCall(false);
    setIsScheduled(false);
    onClose?.();
  };

  const handleAnswer = () => {
    stopRinging();
    // Answer state (Connected), then redirect to safety/care
    setTimeout(() => {
      setShowIncomingCall(false);
      navigate('/safety');
      onClose?.();
    }, 2000);
  };

  if (showIncomingCall) {
    return createPortal(
      <IncomingCallUI 
        callerName={callerName} 
        isIOS={isIOS} 
        onAnswer={handleAnswer} 
        onDecline={handleDecline} 
      />,
      document.body
    );
  }

  if (isScheduled) {
    return (
      <div className="bg-[#1C1C1E] border border-[#C8962C]/30 p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#C8962C]/10 flex items-center justify-center animate-pulse">
            <Clock className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm uppercase tracking-wider">Call Pending</h3>
            <p className="text-xs text-white/40">From: {callerName}</p>
          </div>
        </div>
        <div className="text-center py-4">
          <span className="text-4xl font-black text-[#C8962C]">{countdown}s</span>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => setIsScheduled(false)} 
          className="w-full text-white/40 text-xs hover:text-white"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("bg-[#1C1C1E] rounded-2xl p-6 shadow-2xl border border-white/5", compact ? "" : "w-full max-w-sm mx-auto")}>
      {!compact && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-white text-lg uppercase tracking-tight">The Exit</h3>
          <button onClick={onClose} className="p-1 text-white/20 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Caller</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setCallerName('HOTMESS Concierge')}
              className={cn(
                "px-3 py-2 text-[11px] font-bold border rounded-lg transition-all",
                callerName === 'HOTMESS Concierge' ? "bg-[#C8962C] border-[#C8962C] text-black" : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              Concierge
            </button>
            {trustedContacts.map(c => (
              <button 
                key={c.contact_name}
                onClick={() => setCallerName(c.contact_name)}
                className={cn(
                  "px-3 py-2 text-[11px] font-bold border rounded-lg transition-all",
                  callerName === c.contact_name ? "bg-[#C8962C] border-[#C8962C] text-black" : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                {c.contact_name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Wait Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {DELAY_OPTIONS.map(opt => (
              <button 
                key={opt.seconds}
                onClick={() => setSelectedDelay(opt.seconds)}
                className={cn(
                  "py-2 text-[11px] font-bold border rounded-lg transition-all",
                  selectedDelay === opt.seconds ? "bg-[#C8962C] border-[#C8962C] text-black" : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => scheduleCall()}
          className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-[#C8962C] transition-all mt-4"
        >
          Activate Exit
        </Button>
      </div>
    </div>
  );
}

/**
 * Platform-Matched Incoming Call UI
 */
function IncomingCallUI({ callerName, isIOS, onAnswer, onDecline }) {
  const [connected, setConnected] = useState(false);

  const handleAnswer = () => {
    setConnected(true);
    onAnswer();
  };

  if (isIOS) {
    return (
      <div className="fixed inset-0 z-[1000] bg-gray-900/40 backdrop-blur-3xl flex flex-col items-center justify-between py-20 px-8 text-white font-sans select-none overflow-hidden">
        <div className="text-center mt-4">
          <h2 className="text-3xl font-normal mb-1">{callerName}</h2>
          <p className="text-lg opacity-80">{connected ? '00:01' : 'mobile'}</p>
        </div>

        {!connected ? (
          <div className="w-full flex justify-between items-center px-4 mb-10">
            <div className="flex flex-col items-center gap-2">
              <button onClick={onDecline} className="w-18 h-18 rounded-full bg-[#FF3B30] flex items-center justify-center active:bg-[#FF3B30]/70 transition-colors">
                <PhoneOff className="w-8 h-8 fill-current" />
              </button>
              <span className="text-xs font-medium">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleAnswer} className="w-18 h-18 rounded-full bg-[#4CD964] flex items-center justify-center active:bg-[#4CD964]/70 transition-colors">
                <Phone className="w-8 h-8 fill-current" />
              </button>
              <span className="text-xs font-medium">Accept</span>
            </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-y-10 px-4 mb-12 opacity-60">
             {[
               {icon: MessageCircle, label: 'mute'},
               {icon: MessageCircle, label: 'keypad'},
               {icon: MessageCircle, label: 'speaker'},
               {icon: MessageCircle, label: 'add call'},
               {icon: MessageCircle, label: 'FaceTime'},
               {icon: MessageCircle, label: 'contacts'}
             ].map(item => (
               <div key={item.label} className="flex flex-col items-center gap-1">
                 <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center">
                    <item.icon className="w-6 h-6" />
                 </div>
                 <span className="text-[10px]">{item.label}</span>
               </div>
             ))}
             <div className="col-start-2 flex flex-col items-center mt-4">
                <button onClick={onDecline} className="w-18 h-18 rounded-full bg-[#FF3B30] flex items-center justify-center">
                  <PhoneOff className="w-8 h-8 fill-current" />
                </button>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Stock Android Implementation
  return (
    <div className="fixed inset-0 z-[1000] bg-[#121212] flex flex-col items-center justify-between py-16 px-10 text-white font-sans select-none">
       <div className="text-center mt-12">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-4xl font-bold mb-4 mx-auto">
            {callerName[0]}
          </div>
          <h2 className="text-2xl font-medium mb-1">{callerName}</h2>
          <p className="text-sm text-gray-400">Incoming call</p>
       </div>

       {!connected ? (
         <div className="w-full flex flex-col items-center gap-12 mb-12">
            <div className="relative w-full h-24 flex items-center justify-center">
               <motion.div 
                 animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute w-20 h-20 rounded-full border-4 border-blue-400"
               />
               <div className="z-10 w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-xl">
                  <Phone className="w-8 h-8 text-white" />
               </div>
            </div>
            <div className="w-full flex justify-between items-center px-4">
              <button onClick={onDecline} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-400">Dismiss</span>
              </button>
              <button onClick={handleAnswer} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-400">Answer</span>
              </button>
            </div>
         </div>
       ) : (
         <div className="w-full flex flex-col items-center mb-12">
            <p className="text-blue-400 text-sm font-bold mb-10">Connected</p>
            <button onClick={onDecline} className="w-18 h-18 rounded-full bg-red-600 flex items-center justify-center">
              <PhoneOff className="w-8 h-8" />
            </button>
         </div>
       )}
    </div>
  );
}
