import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function AgeGate({ onVerified }) {
  const handleEnter = async () => {
    try {
      await base44.auth.updateMe({ age_verified: true });
      onVerified();
    } catch (err) {
      console.error('Verification failed:', err);
    }
  };

  const handleExit = () => {
    window.location.href = 'https://google.com';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* BACKGROUND IMAGE - HIGH MASC EDITORIAL */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1920&q=80')] bg-cover bg-center opacity-60 grayscale scale-110 blur-[2px]" />
      
      {/* VIGNETTE OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-90" />

      {/* CORE AGE GATE CONTENT */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center px-6"
      >
        <h1 className="text-8xl md:text-[12rem] font-black italic tracking-tighter text-white leading-none mb-4">
          HOT<span className="text-[#FF1493]">MESS</span>
        </h1>
        <p className="text-xl md:text-2xl font-bold italic uppercase tracking-[0.3em] text-white/80 mb-12">
          London Operating System
        </p>

        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnter}
            className="bg-[#FF1493] text-black font-black py-6 text-2xl uppercase italic hover:bg-white transition-all shadow-[0_0_30px_#FF1493]"
          >
            I AM 18+ // ENTER
          </motion.button>
          <button 
            onClick={handleExit}
            className="border-2 border-white/20 text-white/40 py-4 uppercase font-bold text-xs tracking-widest hover:border-white/60 hover:text-white transition-all"
          >
            Exit Terminal
          </button>
        </div>
      </motion.div>

      {/* EDITORIAL COOKIE CONSENT - BOTTOM PINNED */}
      <div className="absolute bottom-10 left-0 w-full px-8 flex flex-col md:flex-row justify-between items-end gap-4 border-t border-white/10 pt-6 bg-black/40 backdrop-blur-md">
        <div className="max-w-md">
          <p className="text-[10px] uppercase font-black tracking-widest text-[#FF1493] mb-2">Data Intelligence Policy</p>
          <p className="text-[10px] leading-relaxed text-white/50 uppercase">
            We use cookies to track XP heartbeats, geospatial pulse data, and marketplace security. By entering, you consent to the industrial surveillance of your nightlife participation.
          </p>
        </div>
        <div className="text-[8px] text-white/20 font-mono">
          HM-CC-V1.0.5
        </div>
      </div>
    </div>
  );
}