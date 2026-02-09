import React from 'react';

interface AgeGateProps {
  onConfirm?: () => void;
  onReject?: () => void;
}

/**
 * Age Gate - first gate, blocks entire app
 * No globe, no radio, nothing until passed
 */
export function AgeGate({ onConfirm, onReject }: AgeGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050507] p-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        {/* Logo */}
        <div className="text-4xl font-bold text-white">HOTMESS</div>
        <div className="text-sm text-[#A1A1AA]">LONDON</div>
        
        <h1 className="text-xl font-semibold text-white mt-8">
          Are you 18 or older?
        </h1>
        
        <p className="text-sm text-[#A1A1AA]">
          HOTMESS is an 18+ platform for London's queer nightlife community.
        </p>
        
        <div className="w-full flex flex-col gap-3 mt-4">
          <button 
            onClick={onConfirm}
            className="w-full h-12 rounded-xl bg-[#39FF14] text-black font-semibold"
          >
            Yes, I'm 18+
          </button>
          
          <button 
            onClick={onReject}
            className="w-full h-12 rounded-xl border border-[rgba(255,255,255,0.16)] text-[#A1A1AA]"
          >
            No, I'm under 18
          </button>
        </div>
        
        <p className="text-xs text-[#6B7280] mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default AgeGate;
