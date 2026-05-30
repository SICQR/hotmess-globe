/**
 * DeferredProfileNudge — Light prompt for users who completed onboarding
 * without setting a display_name (the QuickSetupScreen no longer asks).
 *
 * Surfaces on /pulse and /ghosted, the two main routes where missing
 * names hurt the social loop ("who Boo'd them?"). Dismissible per-device
 * via localStorage. Re-shows once if the user has been around for more
 * than a week without setting a name.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UserCircle2, X } from 'lucide-react';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { useSheet } from '@/contexts/SheetContext';

const DISMISS_KEY = 'hm_profile_nudge_dismissed_v1';
const DISMISS_TIME_KEY = 'hm_profile_nudge_dismissed_at';
const RE_SHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ELIGIBLE_ROUTES = ['/pulse', '/ghosted', '/'];

export function DeferredProfileNudge() {
  const { profile } = useBootGuard();
  const { openSheet } = useSheet();
  const location = useLocation();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setHidden(true);
      return;
    }
    if (profile.display_name && profile.display_name.trim().length > 0) {
      setHidden(true);
      return;
    }
    if (!ELIGIBLE_ROUTES.includes(location.pathname)) {
      setHidden(true);
      return;
    }
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
      const dismissedAt = Number(localStorage.getItem(DISMISS_TIME_KEY) || 0);
      const expired = dismissedAt > 0 && Date.now() - dismissedAt > RE_SHOW_AFTER_MS;
      setHidden(dismissed && !expired);
    } catch {
      setHidden(false);
    }
  }, [profile?.id, profile?.display_name, location.pathname]);

  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
      localStorage.setItem(DISMISS_TIME_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  return (
    <div
      className="fixed left-4 right-4 z-[55] flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-[#0D0D0D]/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      role="region"
      aria-label="Add a name to your profile"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(200,150,44,0.15)' }}
      >
        <UserCircle2 className="w-5 h-5" style={{ color: '#C8962C' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-semibold leading-tight">
          Add a name
        </p>
        <p className="text-white/50 text-[11px] leading-tight mt-0.5">
          So people know who Boo'd them.
        </p>
      </div>
      <button
        onClick={() => {
          dismiss();
          openSheet('edit-profile', {});
        }}
        className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-black"
        style={{ backgroundColor: '#C8962C' }}
      >
        Add
      </button>
      <button
        onClick={dismiss}
        className="p-1.5 rounded-lg text-white/30 hover:text-white/60"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default DeferredProfileNudge;
