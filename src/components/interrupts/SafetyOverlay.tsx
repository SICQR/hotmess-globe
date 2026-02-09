import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SafetyOverlayProps {
  isActive?: boolean;
  onFakeCall?: () => void;
  onShareLocation?: () => void;
  onCallEmergency?: () => void;
  onResolve?: (pin: string) => void;
}

/**
 * Safety Overlay - fullscreen panic mode
 * - No close button
 * - No navigation
 * - Only explicit resolve exits
 */
export function SafetyOverlay({
  isActive = false,
  onFakeCall,
  onShareLocation,
  onCallEmergency,
  onResolve
}: SafetyOverlayProps) {
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#FF2D2D] text-white p-6">
      {!showPinEntry ? (
        <>
          <h1 className="text-2xl font-bold text-center">You are not alone</h1>
          <p className="text-center text-white/80 max-w-xs">
            Help is being notified. Use the options below or wait for assistance.
          </p>
          
          <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
            <button 
              onClick={onFakeCall}
              className="w-full h-12 rounded-xl bg-white text-black font-semibold"
            >
              📞 Fake Call
            </button>
            
            <button 
              onClick={onShareLocation}
              className="w-full h-12 rounded-xl border-2 border-white font-semibold"
            >
              📍 Share Location
            </button>
            
            <button 
              onClick={onCallEmergency}
              className="w-full h-12 rounded-xl border-2 border-white font-semibold"
            >
              🚨 Call Emergency Services
            </button>
          </div>
          
          <button 
            onClick={() => setShowPinEntry(true)}
            className="mt-8 text-sm text-white/60 underline"
          >
            I'm safe — end alert
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Enter your PIN to confirm</h2>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-32 h-12 text-center text-2xl tracking-widest bg-white/20 rounded-xl border-2 border-white text-white placeholder-white/40"
            placeholder="••••"
            autoFocus
          />
          <div className="flex gap-3">
            <button 
              onClick={() => { setShowPinEntry(false); setPin(''); }}
              className="px-6 h-11 rounded-xl border-2 border-white"
            >
              Back
            </button>
            <button 
              onClick={() => onResolve?.(pin)}
              disabled={pin.length !== 4}
              className="px-6 h-11 rounded-xl bg-white text-[#FF2D2D] font-semibold disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SafetyOverlay;
