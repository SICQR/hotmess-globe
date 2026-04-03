import React from 'react';
import { motion } from 'framer-motion';

export default function AgeGate({ onVerified }) {
  const handleEnter = () => {
    onVerified();
  };

  const handleExit = () => {
    window.location.href = 'about:blank';
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex items-end justify-center pb-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-[#1C1C1E] rounded-3xl p-8 mx-4 w-full max-w-sm"
      >
        {/* Title */}
        <h1 className="font-black text-xl text-white leading-tight">
          You&apos;re in grown territory.
        </h1>
        <p className="text-white/60 text-sm mt-1 mb-6">
          HOTMESS is for adults only. Confirm your age to enter.
        </p>

        {/* CTAs */}
        <button
          onClick={handleEnter}
          className="bg-[#C8962C] text-black font-black rounded-2xl w-full py-4 text-base"
        >
          I&apos;m 18+
        </button>
        <button
          onClick={handleExit}
          className="bg-[#2A2A2A] text-white font-bold rounded-2xl w-full py-4 text-base mt-3"
        >
          Leave
        </button>

        {/* Fine print */}
        <p className="text-white/30 text-xs text-center mt-4 leading-relaxed">
          By entering you confirm you are 18+ and agree to our Terms &amp; Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
