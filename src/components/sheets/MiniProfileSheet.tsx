import React from 'react';
import { BaseSheet } from './BaseSheet';

interface MiniProfileSheetProps {
  username: string;
  distanceBand: 'very close' | 'nearby' | 'in the area';
  isVerified?: boolean;
  canHandshake?: boolean;
  onHandshake?: () => void;
  onPass?: () => void;
  onClose?: () => void;
}

/**
 * Mini Profile Sheet - shown when tapping a social beacon
 * No chat without handshake
 */
export function MiniProfileSheet({
  username,
  distanceBand,
  isVerified = false,
  canHandshake = true,
  onHandshake,
  onPass,
  onClose
}: MiniProfileSheetProps) {
  return (
    <BaseSheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.08)]" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-white">@{username}</span>
            {isVerified && (
              <span className="text-[#39FF14] text-sm">✓</span>
            )}
          </div>
          <div className="text-xs text-[#A1A1AA]">{distanceBand}</div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-4">
        <button 
          onClick={onHandshake}
          disabled={!canHandshake}
          className="flex-1 h-11 rounded-xl bg-[#39FF14] text-black font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Handshake
        </button>
        <button 
          onClick={onPass}
          className="flex-1 h-11 rounded-xl border border-[rgba(255,255,255,0.16)] text-white font-medium"
        >
          Pass
        </button>
      </div>
    </BaseSheet>
  );
}

export default MiniProfileSheet;
