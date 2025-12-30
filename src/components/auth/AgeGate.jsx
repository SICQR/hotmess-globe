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
          
          <h1 className="text-3xl font-black text-center mb-2 text-white">
            AGE VERIFICATION
          </h1>
          <p className="text-center text-white/60 mb-8">
            HOTMESS LONDON is an 18+ platform for adults only
          </p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-400">
              <strong>Legal Notice:</strong> By entering, you confirm you are 18+ and agree to comply with all applicable laws.
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

          <Button
            onClick={handleVerify}
            className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black text-lg py-6"
          >
            VERIFY & ENTER
          </Button>

          <p className="text-center text-xs text-white/40 mt-6">
            This verification is required by law for adult-oriented platforms
          </p>
        </div>
      </motion.div>
    </div>
  );
}