import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';

interface TopHUDProps {
  safetyStatus?: 'safe' | 'active' | 'resolved';
  weatherText?: string;
}

/**
 * Top HUD (L1 - Z-50) - StatusHUD with Level, XP, City Context
 * Always visible, persists across all navigation
 * 
 * Shows:
 * - User level & XP
 * - Current city context
 * - Safety status
 * - Weather/time info
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

  // Fetch current user for level/XP/city
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-hud'],
    queryFn: () => base44.auth.me(),
    refetchInterval: 60000, // Refresh every minute
  });

  const level = currentUser?.level || 1;
  const xp = currentUser?.xp || 0;
  const city = currentUser?.city || 'London';
  
  // Default weather text if not provided
  const defaultWeatherText = `${city} • ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const displayWeatherText = weatherText || defaultWeatherText;

  return (
    <header className="fixed top-0 left-0 right-0 z-[50] flex h-12 items-center justify-between px-3 sm:px-4 bg-[rgba(5,5,7,0.92)] backdrop-blur-[20px] border-b-2 border-white/10">
      {/* Left: City & Time — truncate on narrow screens */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-black uppercase text-white tracking-wider truncate">
          {displayWeatherText}
        </span>
      </div>

      {/* Center: Level — always visible; XP hidden on xs */}
      <div className="flex items-center gap-1.5 shrink-0 px-2">
        <span className="text-xs font-black text-[#FFD700] tracking-wider whitespace-nowrap">
          LVL {level}
        </span>
        <span className="hidden sm:inline text-xs text-white/40">•</span>
        <span className="hidden sm:inline text-xs text-white/60 whitespace-nowrap">
          {xp} XP
        </span>
      </div>

      {/* Right: Safety dot + label (label hidden on xs) */}
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
