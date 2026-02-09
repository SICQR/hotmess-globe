import React from 'react';

interface BaseSheetProps {
  children: React.ReactNode;
  onClose?: () => void;
  showHandle?: boolean;
}

/**
 * Base Sheet - bottom drawer, max 85dvh, rounds top corners
 * Sheets stack, never navigate
 */
export function BaseSheet({ children, onClose, showHandle = true }: BaseSheetProps) {
  return (
    <div 
      className="fixed bottom-[120px] left-0 right-0 z-30 max-h-[85dvh] rounded-t-2xl bg-[#0E0E12] border border-[rgba(255,255,255,0.08)] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Drag handle */}
      {showHandle && (
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.16)]" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

export default BaseSheet;
