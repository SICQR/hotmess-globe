import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface SafetyOverlayProps {
  isActive?: boolean;
  onFakeCall?: () => void;
  onShareLocation?: () => void;
  onCallEmergency?: () => void;
  onResolve?: (pin: string) => void;
}

/**
 * Safety Overlay - fullscreen panic mode
 * No close button. Only explicit resolve exits.
 */
export function SafetyOverlay({
  isActive = false,
  onFakeCall,
  onShareLocation,
  onCallEmergency,
  onResolve,
}: SafetyOverlayProps) {
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] rounded-3xl p-8 mx-4 w-full max-w-sm">
        {!showPinEntry ? (
          <>
            {/* Shield icon */}
            <div className="bg-[#1C1C1E] border-2 border-[#C8962C] rounded-2xl p-4 w-fit mx-auto mb-5">
              <Shield className="w-8 h-8 text-[#C8962C]" />
            </div>

            <h1 className="text-[#C8962C] font-black text-xl text-center mb-1">You are not alone</h1>
            <p className="text-white/70 text-sm text-center mb-6">
              Help is being notified. Use the options below or wait for assistance.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={onFakeCall}
                className="bg-[#C8962C] text-black font-black rounded-2xl w-full py-4 text-base"
              >
                📞 Fake Call
              </button>
              <button
                onClick={onShareLocation}
                className="bg-[#2A2A2A] text-white font-bold rounded-2xl w-full py-4 text-base"
              >
                📍 Share Location
              </button>
              <button
                onClick={onCallEmergency}
                className="bg-[#2A2A2A] text-white font-bold rounded-2xl w-full py-4 text-base"
              >
                🚨 Call Emergency Services
              </button>
            </div>

            <button
              onClick={() => setShowPinEntry(true)}
              className="w-full text-white/40 text-xs text-center mt-5"
            >
              I&apos;m safe — end alert
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[#C8962C] font-black text-xl text-center mb-4">Enter your PIN</h2>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-widest bg-black/40 rounded-2xl border border-white/20 text-white placeholder-white/30 py-3 mb-4"
              placeholder="••••"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinEntry(false); setPin(''); }}
                className="flex-1 bg-[#2A2A2A] text-white font-bold rounded-2xl py-4"
              >
                Back
              </button>
              <button
                onClick={() => onResolve?.(pin)}
                disabled={pin.length !== 4}
                className="flex-1 bg-[#C8962C] text-black font-black rounded-2xl py-4 disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SafetyOverlay;
