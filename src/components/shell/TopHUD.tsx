import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { LAYER } from '@/lib/layerSystem';

interface TopHUDProps {
  safetyStatus?: 'safe' | 'active' | 'resolved';
  weatherText?: string;
}

/**
 * TopHUD — L1 Shell (z-hud / z-[50])
 *
 * Always visible. Never obscured by sheets or panels (L2/z-[80]).
 * No animation of its own — it is a static fixture.
 */
export function TopHUD({ safetyStatus = 'safe', weatherText }: TopHUDProps) {
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

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-hud'],
    queryFn: () => base44.auth.me(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const city  = currentUser?.city  || 'London';

  const defaultWeatherText = `${city} • ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const displayWeatherText = weatherText || defaultWeatherText;

  return (
    <header
      className={`fixed top-0 left-0 right-0 ${LAYER.HUD} flex h-12 items-center justify-between px-3 sm:px-4 bg-[rgba(5,5,7,0.92)] backdrop-blur-[20px] border-b border-white/10 pt-[env(safe-area-inset-top,0px)]`}
    >
      {/* Left: City & Time */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-black uppercase text-white tracking-wider truncate">
          {displayWeatherText}
        </span>
      </div>

      {/* Right: Safety indicator */}
      <div className="flex items-center gap-1.5 justify-end flex-1">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColors[safetyStatus]}`} />
        <span className="hidden sm:inline text-xs text-[#A1A1AA] uppercase tracking-wider whitespace-nowrap">
          {statusLabels[safetyStatus]}
        </span>
      </div>
    </header>
  );
}

export default TopHUD;
