import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
 * Right: Notification Bell + Profile Avatar
 */
export function TopHUD({ safetyStatus = 'safe' }: TopHUDProps) {
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
      className={`fixed top-0 left-0 right-0 ${LAYER.HUD} flex h-12 items-center justify-between px-3 sm:px-4 bg-[#050507]/90 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top,0px)]`}
    >
      {/* Left: HOTMESS Logo */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xl font-black tracking-tighter text-white">
          HOT<span className="text-[#C8962C]">MESS</span>
        </span>
      </div>

      {/* Right: Notification Bell & Profile Avatar */}
      <div className="flex items-center gap-3 justify-end flex-1">
        <button
          onClick={() => { clearNotifBadge(); openSheet('notification-inbox'); }}
          className="relative p-1.5 text-white/50 hover:text-white transition-colors active:scale-90"
        >
          <Bell className="w-5 h-5" />
          {notifCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#C8962C] text-black text-[9px] font-black rounded-full flex items-center justify-center leading-none border-2 border-[#050507]">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>

        <button
          onClick={() => openSheet('edit-profile')}
          className="relative h-8 w-8 rounded-full overflow-hidden border border-white/20 active:scale-95 transition-transform"
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
