import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import { safeGetViewerLatLng } from '@/utils/geolocation';

export default function AgeGate() {
  const [entering, setEntering] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get next URL and strip any hash fragments to prevent scroll jumps
  const rawNextUrl = searchParams.get('next') || createPageUrl('Home');
  const nextUrl = rawNextUrl.split('#')[0];

  const handleEnter = async () => {
    setEntering(true);
    
    // Store age verification
    try {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'true');
    } catch {
      // ignore
    }

    // Request location permission (non-blocking)
    if ('geolocation' in navigator) {
      safeGetViewerLatLng(
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        { retries: 1, logKey: 'age-gate' }
      ).then(() => {
        try { sessionStorage.setItem('location_permission', 'granted'); } catch {}
      }).catch(() => {
        try { sessionStorage.setItem('location_permission', 'denied'); } catch {}
      });
    }

    // Use React Router navigation to avoid full page reload
    navigate(nextUrl, { replace: true });
  };

  const handleExit = () => {
    window.location.href = 'https://google.com';
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        background: 'radial-gradient(ellipse 150% 100% at 50% 30%, #E62020 0%, #8B0000 20%, #4d0000 40%, #1a0000 55%, #0D0D0D 85%)'
      }}
    >
      {/* Subtle vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* CONTENT */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center px-4 my-auto w-full max-w-2xl"
      >
        {/* HOTMESS Wordmark with gradient */}
        <h1 
          className="text-6xl sm:text-8xl md:text-[10rem] font-black italic uppercase tracking-[-0.02em] leading-[0.85] mb-4"
          style={{
            background: 'linear-gradient(90deg, #8B0000 0%, #E62020 20%, #E62020 40%, #E5A820 55%, rgba(250,250,250,0.4) 75%, rgba(250,250,250,0.2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          HOTMESS
        </h1>
        
        {/* Tagline */}
        <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-white/50 mb-8">
          Always too much, yet never enough
        </p>

        {/* Power words */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">BRUTAL</span>
          <span className="w-1.5 h-1.5 bg-white/60" />
          <span className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">CHROME</span>
          <span className="w-1.5 h-1.5 bg-white/60" />
          <span className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">POWER</span>
        </div>

        {/* Description */}
        <p className="text-sm text-white/60 max-w-md mx-auto mb-10 leading-relaxed">
          Complete brand system with logos, gradients, typography, animations, and accessibility-compliant design tokens. Ready for production.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Primary CTA - Red outline */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEnter}
            disabled={entering}
            className="px-8 py-4 border-2 border-[#E62020] text-[#E62020] font-semibold uppercase tracking-[0.15em] text-sm hover:bg-[#E62020] hover:text-white transition-all duration-150 disabled:opacity-70"
          >
            {entering ? 'ENTERING...' : 'ENTER SITE'}
          </motion.button>
          
          {/* Secondary CTA - Gold border */}
          <button 
            onClick={handleExit}
            className="px-8 py-4 border-2 border-[#E5A820] text-[#E5A820] font-semibold uppercase tracking-[0.15em] text-sm hover:bg-[#E5A820] hover:text-black transition-all duration-150"
          >
            EXIT
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Legal text */}
          <p className="text-[10px] text-white/30 uppercase tracking-wider text-center sm:text-left">
            By entering, you confirm you are 18+ and consent to our Terms of Service.
          </p>
          
          {/* Version badge */}
          <div className="text-[10px] text-white/20 uppercase tracking-widest">
            HM-LUX-V3
          </div>
        </div>
      </div>
    </div>
  );
}