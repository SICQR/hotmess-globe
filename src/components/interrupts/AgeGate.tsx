import React from 'react';
import { motion } from 'framer-motion';
import BrandBackground from '@/components/ui/BrandBackground';

interface AgeGateProps {
  onConfirm?: () => void;
  onReject?: () => void;
}

/**
 * Age Gate — first gate, blocks entire app.
 * No globe, no radio, nothing until passed.
 */
export function AgeGate({ onConfirm, onReject }: AgeGateProps) {
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black p-6 overflow-hidden">
      <BrandBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="text-center mb-10">
          <p className="text-5xl font-black tracking-tight text-white leading-none">
            HOT<span className="text-[#FF1493]" style={{ textShadow: '0 0 24px rgba(255,20,147,0.6)' }}>MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mt-2">LONDON</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-black uppercase text-center text-white mb-3 tracking-wide">
            Are you 18+?
          </h1>
          <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
            HOTMESS is an 18+ platform for London's queer nightlife community.
          </p>

          <div className="space-y-3">
            <button
              onClick={onConfirm}
              className="w-full h-14 rounded-xl bg-[#FF1493] text-black font-black text-lg uppercase tracking-widest transition-all active:scale-95 hover:opacity-90"
              style={{ boxShadow: '0 0 28px rgba(255,20,147,0.45)' }}
            >
              Yes, I'm 18+
            </button>
            <button
              onClick={onReject}
              className="w-full h-14 rounded-xl border border-white/10 text-white/40 font-semibold hover:bg-white/5 active:scale-95 transition-all"
            >
              No, take me out
            </button>
          </div>
        </div>

        <p className="text-xs text-white/20 text-center mt-6 leading-relaxed">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

export default AgeGate;
