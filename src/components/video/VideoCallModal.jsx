/**
 * VideoCallModal — consent + call initiation modal
 *
 * Shows before starting a video call:
 *  - Persona / profile confirmation
 *  - Safety reminder
 *  - Confirm → creates video_calls row → mounts VideoCallRoom overlay
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Shield, X, User, CheckCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import VideoCallRoom from './VideoCallRoom';

const SAFETY_TIPS = [
  'Only video call people you know or have chatted with',
  'Never share personal details during a call',
  'Tap Safety Exit anytime to end immediately',
];

export default function VideoCallModal({
  remoteUserId,
  remoteUserName,
  remoteUserPhoto,
  onClose,
}) {
  const [stage, setStage]     = useState('consent'); // 'consent' | 'calling'
  const [callId, setCallId]   = useState(null);
  const [starting, setStarting] = useState(false);

  const startCall = async () => {
    setStarting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not logged in'); return; }

      const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await supabase.from('video_calls').insert({
        id: newCallId,
        caller_id: user.id,
        callee_id: remoteUserId,
        status: 'ringing',
        started_at: new Date().toISOString(),
      });

      if (error) throw error;

      setCallId(newCallId);
      setStage('calling');
    } catch (err) {
      toast.error('Could not start call');
      console.error('[VideoCallModal]', err);
    } finally {
      setStarting(false);
    }
  };

  const handleCallEnd = () => {
    setStage('consent');
    setCallId(null);
    onClose?.();
  };

  if (stage === 'calling' && callId) {
    return (
      <VideoCallRoom
        callId={callId}
        remoteUserId={remoteUserId}
        remoteUserName={remoteUserName}
        remoteUserPhoto={remoteUserPhoto}
        isCaller={true}
        onEnd={handleCallEnd}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end justify-center pb-8 px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6"
        >
          {/* Close */}
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Person */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#C8962C] to-[#B026FF] flex items-center justify-center mb-3 border-2 border-[#C8962C]/40">
              {remoteUserPhoto ? (
                <img src={remoteUserPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/60" />
              )}
            </div>
            <p className="text-white font-black text-lg">{remoteUserName}</p>
            <p className="text-white/40 text-sm mt-0.5">Go on cam?</p>
          </div>

          {/* Safety tips */}
          <div className="bg-black/40 rounded-2xl p-4 mb-6 border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-[#C8962C]" />
              <span className="text-[#C8962C] font-black text-xs">STAY SAFE</span>
            </div>
            <p className="text-white/50 text-xs mb-3">You'll show up as your active persona.</p>
            <ul className="space-y-2">
              {SAFETY_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#C8962C] flex-shrink-0 mt-0.5" />
                  <span className="text-white/60 text-xs leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <button
            onClick={startCall}
            disabled={starting}
            className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 mb-3 disabled:opacity-60"
          >
            <Video className="w-5 h-5" />
            {starting ? 'Calling…' : 'Start call'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#2A2A2A] text-white font-bold rounded-2xl text-sm"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
