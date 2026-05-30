import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { LAYER } from '@/lib/layerSystem';
import { supabase } from '@/components/utils/supabaseClient';
import { User, Bell } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useNotifCount } from '@/hooks/useNotifCount';
import PulseSearch from '@/components/globe/PulseSearch';

interface TopHUDProps {
  safetyStatus?: 'safe' | 'active' | 'resolved';
}

/**
 * TopHUD — L1 Shell (z-hud / z-[50])
 *
 * Always visible. Never obscured by sheets or panels (L2/z-[80]).
 * Left: HOTMESS Logo
 * Centre (Pulse only): city / area / postcode search → flies the map (window event).
 * Right: Profile Avatar (+ Notification Bell off the Pulse page; on Pulse the bell
 *        lives in the globe's right rail).
 */
export function TopHUD({ safetyStatus = 'safe' }: TopHUDProps) {
  const location = useLocation();
  const isPulse = location.pathname.startsWith('/pulse');
  const { notifCount, clearNotifBadge } = useNotifCount();
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-hud'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { openSheet } = useSheet();

  return (
    <header
      className={`fixed top-0 left-0 right-0 ${LAYER.HUD} flex h-12 items-center gap-2 sm:gap-3 px-3 sm:px-4 bg-[#050507]/90 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top,0px)]`}
    >
      {/* Left: HOTMESS Logo */}
      <span className="text-xl font-black tracking-tighter text-white shrink-0">
        HOT<span className="text-[#C8962C]">MESS</span>
      </span>

      {/* Centre: Pulse search (city / area / postcode) → window event drives the map */}
      <div className="flex-1 flex justify-center min-w-0">
        {isPulse && (
          <div className="w-full max-w-[360px]">
            <PulseSearch
              onSelect={(loc: { lat: number; lng: number; zoom?: number }) => {
                try { window.dispatchEvent(new CustomEvent('pulse:flyto', { detail: loc })); } catch (e) { /* non-fatal */ }
              }}
            />
          </div>
        )}
      </div>

      {/* Right: Notification Bell (off Pulse) + Profile Avatar */}
      <div className="flex items-center gap-3 justify-end shrink-0">
        {!isPulse && (
          <button
            onClick={() => { clearNotifBadge(); openSheet('notification-inbox'); }}
            className="relative p-1.5 text-white/50 hover:text-white transition-colors active:scale-90"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#C8962C] text-black text-[9px] font-black rounded-full flex items-center justify-center leading-none border-2 border-[#050507]">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => openSheet('edit-profile')}
          className="relative h-8 w-8 rounded-full overflow-hidden border border-white/20 active:scale-95 transition-transform"
          aria-label="Profile"
        >
          {currentUser?.avatar_url ? (
            <img src={currentUser.avatar_url} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white/40" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
}

export default TopHUD;
