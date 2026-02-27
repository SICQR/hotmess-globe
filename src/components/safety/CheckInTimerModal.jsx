/**
 * CheckInTimerModal
 *
 * Bottom sheet to set / monitor / cancel a safety check-in timer.
 * When the timer expires without user tapping "I'm OK", useCheckinTimer
 * automatically alerts all trusted contacts with GPS location.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';

const PRESETS = [
  { minutes: 30,  label: '30 min' },
  { minutes: 60,  label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
];

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function CheckInTimerModal({ isOpen, onClose }) {
  const [selected, setSelected] = useState(60);
  const [loading, setLoading]   = useState(false);
  const { isActive, secondsLeft, durationMinutes, setTimer, clearTimer } = useCheckinTimer();

  const handleStart = async () => {
    setLoading(true);
    try {
      await setTimer(selected);
      const label = selected < 60 ? `${selected} min` : `${selected / 60}h`;
      toast.success(`Check-in timer set for ${label}. Contacts alerted if you don't respond.`);
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Could not set timer');
    } finally {
      setLoading(false);
    }
  };

  const handleImOK = () => {
    clearTimer();
    toast.success("Glad you're safe! Timer cleared.");
    onClose?.();
  };

  const durationLabel = durationMinutes < 60
    ? `${durationMinutes} min`
    : `${durationMinutes / 60}h`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end justify-center pb-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-sm bg-[#1C1C1E] rounded-3xl p-6 border border-[#C8962C]/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00D9FF]" />
                <span className="text-white font-black text-lg uppercase">Check-In Timer</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isActive ? (
              /* ── Active timer ── */
              <>
                <div className="text-center py-4 mb-5">
                  <div className="text-5xl font-black text-white tabular-nums mb-2">
                    {fmt(secondsLeft)}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    remaining of {durationLabel} timer
                  </p>
                </div>

                <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/20 rounded-2xl p-3 mb-5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#00D9FF] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/60">
                    When this timer reaches zero, your trusted contacts will be
                    automatically alerted with your last known location.
                  </p>
                </div>

                <button
                  onClick={handleImOK}
                  className="w-full py-4 bg-[#39FF14]/20 border border-[#39FF14] text-[#39FF14] font-black rounded-2xl uppercase mb-3 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  I'm OK — Cancel Timer
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white/50 font-bold rounded-2xl text-sm uppercase"
                >
                  Keep Running
                </button>
              </>
            ) : (
              /* ── Set timer ── */
              <>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Duration</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {PRESETS.map(({ minutes, label }) => (
                    <button
                      key={minutes}
                      onClick={() => setSelected(minutes)}
                      className={`py-3 rounded-2xl text-sm font-black transition-all ${
                        selected === minutes
                          ? 'bg-[#00D9FF] text-black'
                          : 'bg-black/40 border border-white/10 text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-5">
                  <p className="text-[11px] text-white/50">
                    If you don't tap <strong className="text-white/70">"I'm OK"</strong> within{' '}
                    <strong className="text-white/70">
                      {selected < 60 ? `${selected} min` : `${selected / 60}h`}
                    </strong>
                    , your trusted contacts will be automatically alerted with your location.
                  </p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full py-4 bg-[#00D9FF] text-black font-black rounded-2xl uppercase disabled:opacity-60"
                >
                  {loading ? 'Setting…' : 'Set Timer'}
                </button>
                <p className="text-[10px] text-white/20 text-center mt-3">
                  Tap "I'm OK" to cancel at any time.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
