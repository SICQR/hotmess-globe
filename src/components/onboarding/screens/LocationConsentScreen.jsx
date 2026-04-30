import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ShieldCheck, ChevronRight } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';

const GOLD = '#C8962C';

export default function LocationConsentScreen({ onAllow, onSkip, progress = 4 }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Radiance */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#C8962C]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#C8962C]/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm px-8 relative z-10 flex flex-col items-center"
      >
        {/* HOTMESS wordmark */}
        <p className="text-2xl font-black italic tracking-tighter text-white mb-8 select-none">
          HOT<span style={{ color: GOLD }}>MESS</span>
        </p>
        
        <ProgressDots current={progress} total={5} />
        
        <div className="mt-12 mb-10 relative">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-[#C8962C]/20 rounded-full blur-xl"
          />
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-tr from-[#C8962C]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <MapPin className="w-10 h-10 text-[#C8962C]" />
          </div>
          
          {/* Decorative floating dots */}
          <motion.div 
            animate={{ y: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 4, delay: 1 }}
            className="absolute -top-2 -right-2 w-3 h-3 bg-[#C8962C] rounded-full border-2 border-black" 
          />
          <motion.div 
            animate={{ y: [5, -5, 5] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="absolute -bottom-1 -left-4 w-2 h-2 bg-white/40 rounded-full" 
          />
        </div>

        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white text-3xl font-black mb-6 tracking-tighter uppercase italic"
        >
          Who's <span className="text-[#C8962C]">Nearby?</span>
        </motion.h2>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-10 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4 text-left">
            <div className="mt-1">
              <ShieldCheck className="w-5 h-5 text-white/40" />
            </div>
            <p className="text-white/70 text-sm leading-relaxed font-medium">
              HOTMESS uses your location to show you who's nearby. 
              Your exact location is <span className="text-white font-bold">never shown</span> — only your general area. 
              Toggle this anytime in settings.
            </p>
          </div>
        </motion.div>

        <div className="w-full space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAllow}
            className="w-full h-16 rounded-2xl text-black font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2 group transition-all"
            style={{ 
              backgroundColor: GOLD,
              boxShadow: '0 10px 30px -10px rgba(200, 150, 44, 0.4)'
            }}
          >
            Allow Location
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          
          <button
            onClick={onSkip}
            className="w-full py-4 text-white/20 font-bold text-[11px] tracking-[0.3em] uppercase hover:text-white/60 transition-colors"
          >
            Not Now
          </button>
        </div>
      </motion.div>

      {/* Decorative glass elements */}
      <div className="absolute top-[20%] right-[-10%] w-32 h-32 bg-white/5 border border-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-[15%] left-[-15%] w-48 h-48 bg-[#C8962C]/5 rounded-full blur-3xl" />
    </div>
  );
}
