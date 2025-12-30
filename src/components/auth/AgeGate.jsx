import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield } from 'lucide-react';

export default function AgeGate({ onVerified }) {
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    const year = parseInt(birthYear);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    if (!year || year < 1900 || year > currentYear) {
      setError('Please enter a valid birth year');
      return;
    }

    if (age < 18) {
      setError('You must be 18 or older to access HOTMESS LONDON');
      return;
    }

    onVerified();
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border-2 border-[#FF1493] rounded-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-16 h-16 text-[#FF1493]" />
          </div>
          
          <h1 className="text-4xl font-black text-center mb-2 text-white uppercase tracking-tight">
            MEN ONLY. 18+.
          </h1>
          <p className="text-center text-[#FF1493] mb-2 font-bold uppercase tracking-wide text-sm">
            IF THAT'S YOU — ENTER.
          </p>
          <p className="text-center text-white/40 mb-8 text-xs">
            IF NOT — BOUNCE.
          </p>

          <div className="bg-red-500/10 border-2 border-red-500/60 rounded-none p-4 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400 font-bold uppercase tracking-wider">
                THE HARD LINE
              </div>
            </div>
            <div className="text-xs text-white/80 leading-relaxed">
              By entering, you confirm you are a man, you are 18+, and you enter willingly. 
              You agree to comply with all applicable laws. This is the Consent-to-DB lock.
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-white">
              Enter Your Birth Year
            </label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => {
                setBirthYear(e.target.value);
                setError('');
              }}
              placeholder="YYYY"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-[#FF1493]"
              min="1900"
              max={new Date().getFullYear()}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleVerify}
              className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black text-lg py-6 uppercase tracking-wider rounded-none"
            >
              ENTER
            </Button>
            <Button
              onClick={() => window.location.href = 'https://www.google.com'}
              variant="outline"
              className="flex-1 border-2 border-white/20 text-white hover:bg-white/10 font-black text-lg py-6 uppercase tracking-wider rounded-none"
            >
              LEAVE
            </Button>
          </div>

          <p className="text-center text-xs text-white/40 mt-6 uppercase tracking-wide">
            LEGAL COMPLIANCE REQUIRED BY LAW
          </p>
        </div>
      </motion.div>
    </div>
  );
}