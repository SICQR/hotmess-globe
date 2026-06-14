import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { LAYER } from '@/lib/layerSystem';
import { supabase } from '@/components/utils/supabaseClient';
import { User, Bell } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useNotifCount } from '@/hooks/useNotifCount';

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

      {/* Centre: empty spacer. Phil 2026-06-02 P0.3 — PulseSearch removed from
          the top bar and relocated to the rail (SearchRailIcon) per D35 §13.4.
          Search is `world_traversal`, opened via the rail tier, not a
          permanent topbar input field. */}
      <div className="flex-1" />

      {/* Right: Bell (left of avatar) + Profile Avatar.
          Phil 2026-06-14: bell back in TopHUD, to the left of the avatar.
          "Top right, left hand side of the profile pic — that way it's on all pages."
          On /pulse the Globe rail ALSO has a Bell, so it's intentionally duplicated
          there (different z-layer, users expect it in both places). */}
      <div className="flex items-center gap-3 justify-end shrink-0">

        {/* Notification Bell — left of profile avatar, every page */}
        {notifCount > 0 ? (
          <button
            type="button"
            onClick={() => { clearNotifBadge(); openSheet('notification-inbox'); }}
            aria-label={`${notifCount} unread notifications`}
            className="relative flex items-center justify-center w-8 h-8 rounded-full active:scale-95 transition-transform"
            style={{ background: 'rgba(200,150,44,0.12)', border: '1.5px solid #C8962C' }}
          >
            <Bell className="w-4 h-4" style={{ color: '#C8962C' }} />
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black text-[#050507] flex items-center justify-center" style={{ background: '#C8962C' }}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openSheet('notification-inbox')}
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-full active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Bell className="w-4 h-4 text-white/40" />
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
