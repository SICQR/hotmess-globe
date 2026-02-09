import React from 'react';

interface TopHUDProps {
  safetyStatus?: 'safe' | 'active' | 'resolved';
  weatherText?: string;
}

/**
 * Top HUD - always visible, shows Wetter Watch + safety status
 */
export function TopHUD({ safetyStatus = 'safe', weatherText = 'Wetter Watch • Live' }: TopHUDProps) {
  const statusColors = {
    safe: 'bg-[#39FF14]',
    active: 'bg-[#FF2D2D] animate-pulse',
    resolved: 'bg-[#A1A1AA]'
  };

  const statusLabels = {
    safe: 'Safe',
    active: 'Alert',
    resolved: 'Resolved'
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-11 items-center justify-between px-4 bg-[rgba(15,15,18,0.85)] backdrop-blur border-b border-[rgba(255,255,255,0.08)]">
      <div className="text-xs text-[#A1A1AA]">
        {weatherText}
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusColors[safetyStatus]}`} />
        <span className="text-xs text-[#A1A1AA]">{statusLabels[safetyStatus]}</span>
      </div>
    </header>
  );
}

export default TopHUD;
