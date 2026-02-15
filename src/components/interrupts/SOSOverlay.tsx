/**
 * SOSOverlay — L3 System Interrupt (Z-100)
 * 
 * Red screen emergency overlay activated by long-press SOS button.
 * Blocks entire OS until resolved with PIN (994) or dismissed.
 * 
 * Phase 1: Basic red overlay
 * Phase 2: Add PIN logic for dismissal
 */

import React, { useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';

interface SOSOverlayProps {
  isActive: boolean;
  onDismiss?: () => void;
}

export function SOSOverlay({ isActive, onDismiss }: SOSOverlayProps) {
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');

  if (!isActive) return null;

  const handlePinSubmit = () => {
    // Phase 2: Check if PIN is 994
    if (pin === '994') {
      setPin('');
      setShowPinEntry(false);
      onDismiss?.();
    } else {
      // Wrong PIN - shake animation or error
      setPin('');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#FF0000] flex flex-col items-center justify-center p-6"
      style={{ 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)' 
      }}
    >
      {/* Emergency indicator */}
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative z-10 text-center max-w-sm">
        {!showPinEntry ? (
          <>
            {/* SOS Icon */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-none border-2 border-white bg-black/20 flex items-center justify-center animate-pulse">
              <AlertTriangle size={48} className="text-white" />
            </div>

            <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-wider">
              SOS ACTIVE
            </h1>
            
            <p className="text-white/80 mb-8 font-mono text-sm">
              THE NIGHT IS HELD. YOU ARE NOT ALONE.
            </p>

            {/* Emergency Actions */}
            <div className="space-y-3 mb-8">
              <a
                href="tel:999"
                className="flex items-center justify-center gap-3 w-full py-4 bg-white text-[#FF0000] font-black rounded-none border-2 border-white uppercase"
              >
                <Phone size={20} />
                Call 999
              </a>

              <a
                href="tel:0800-689-5652"
                className="flex items-center justify-center gap-3 w-full py-4 bg-transparent border-2 border-white text-white font-black rounded-none uppercase hover:bg-white/10"
              >
                Contact Hand N Hand
              </a>
            </div>

            {/* Dismiss option */}
            <button
              onClick={() => setShowPinEntry(true)}
              className="text-white/60 text-sm uppercase tracking-wider hover:text-white underline"
            >
              I'm safe — enter PIN to dismiss
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-white mb-6 uppercase">
              Enter PIN to Dismiss
            </h2>
            
            <p className="text-white/60 text-sm mb-4 font-mono">
              (Your safety PIN - 3 digits)
            </p>
            
            <input
              type="password"
              inputMode="numeric"
              maxLength={3}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-48 h-16 text-center text-3xl tracking-widest bg-black/20 border-2 border-white text-white placeholder-white/40 rounded-none font-mono"
              placeholder="•••"
              autoFocus
            />
            
            <div className="flex gap-3 mt-6 justify-center">
              <button 
                onClick={() => { setShowPinEntry(false); setPin(''); }}
                className="px-6 h-12 border-2 border-white text-white font-black rounded-none uppercase hover:bg-white/10"
              >
                Back
              </button>
              <button 
                onClick={handlePinSubmit}
                disabled={pin.length !== 3}
                className="px-6 h-12 bg-white text-[#FF0000] font-black rounded-none uppercase disabled:opacity-40 hover:bg-white/90"
              >
                Confirm
              </button>
            </div>
            
            <p className="mt-6 text-xs text-white/40 font-mono">
              Default PIN: 994
            </p>
          </>
        )}
        
        {/* Privacy notice */}
        <p className="mt-8 text-xs text-white/40 font-mono uppercase tracking-wider">
          No location shared. Identity protected.
        </p>
      </div>
    </div>
  );
}

export default SOSOverlay;
