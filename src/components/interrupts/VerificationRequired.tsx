import React from 'react';

interface VerificationRequiredProps {
  onStartVerification?: () => void;
  onClose?: () => void;
  feature?: string;
}

/**
 * Verification Required - blocks action until user verifies
 */
export function VerificationRequired({ 
  onStartVerification, 
  onClose,
  feature = 'this feature'
}: VerificationRequiredProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-[#0E0E12] border border-[rgba(255,255,255,0.08)] p-6 flex flex-col gap-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-semibold text-white">Verification Required</h2>
          <p className="text-sm text-[#A1A1AA] mt-2">
            To use {feature}, you need to verify your identity first.
          </p>
        </div>
        
        <button 
          onClick={onStartVerification}
          className="w-full h-11 rounded-xl bg-[#39FF14] text-black font-semibold"
        >
          Start Verification
        </button>
        
        <button 
          onClick={onClose}
          className="w-full h-11 rounded-xl border border-[rgba(255,255,255,0.16)] text-[#A1A1AA]"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}

export default VerificationRequired;
