import React from 'react';
import { BaseSheet } from '../sheets/BaseSheet';

interface NowPanelProps {
  isLive?: boolean;
  minutesLeft?: number;
  canGoLive?: boolean;
  onGoLive?: () => void;
  onEndSession?: () => void;
}

/**
 * NOW Panel - Right Now presence control
 * Go Live requires: is_verified + location_opt_in + no active presence
 */
export function NowPanel({
  isLive = false,
  minutesLeft = 0,
  canGoLive = false,
  onGoLive,
  onEndSession
}: NowPanelProps) {
  return (
    <BaseSheet>
      <h3 className="text-lg font-semibold text-white">Right Now</h3>
      
      {isLive ? (
        <>
          <div className="rounded-xl p-4 bg-[rgba(57,255,20,0.1)] border border-[#39FF14]">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-[#39FF14] font-medium">You're Live</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {minutesLeft} min left
            </div>
          </div>
          
          <button 
            onClick={onEndSession}
            className="w-full h-11 rounded-xl border border-[rgba(255,255,255,0.16)] text-[#A1A1AA] font-medium"
          >
            End Session
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-[#A1A1AA]">
            Let nearby verified users know you're out right now.
          </p>
          
          <button 
            onClick={onGoLive}
            disabled={!canGoLive}
            className="w-full h-12 rounded-xl bg-[#39FF14] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Go Live — 60 min
          </button>
          
          {!canGoLive && (
            <p className="text-xs text-[#A1A1AA] text-center">
              Verification required to go live
            </p>
          )}
        </>
      )}
    </BaseSheet>
  );
}

export default NowPanel;
