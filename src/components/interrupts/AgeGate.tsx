import React from 'react';
import { motion } from 'framer-motion';

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
    <div className="fixed inset-0 z-[120] bg-black flex items-end justify-center pb-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bg-[#1C1C1E] rounded-3xl p-8 mx-4 max-w-sm w-full"
      >
        {/* Wordmark */}
        <p className="font-black text-2xl text-white leading-none">
          HOT<span className="text-[#C8962C]">MESS</span>
        </p>

        {/* Title + subtitle */}
        <h1 className="font-black text-xl text-white mt-4">
          You&apos;re in grown territory.
        </h1>
        <p className="text-white/60 text-sm mt-1">
          This is an 18+ space for gay and bisexual men.
        </p>

        {/* Primary CTA */}
        <button
          onClick={onConfirm}
          className="bg-[#C8962C] text-black font-black rounded-2xl w-full py-4 text-base mt-6 active:scale-95 transition-all"
        >
          I&apos;m 18+
        </button>

        {/* Secondary CTA */}
        <button
          onClick={onReject}
          className="bg-[#2A2A2A] text-white font-bold rounded-2xl w-full py-3 text-sm mt-3 active:scale-95 transition-all"
        >
          Leave
        </button>

        {/* Fine print */}
        <p className="text-white/30 text-xs text-center mt-4 leading-relaxed">
          By entering you confirm you are 18 or older.
        </p>
      </motion.div>
    </div>
  );
}

export default AgeGate;
