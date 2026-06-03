/**
 * GlobalRail — global right-edge icon stack (D16 §10.1 Tier 2)
 *
 * Mounted once in Layout, positioned at the top-right zone safely away from
 * the SafetyFAB (which lives bottom-right). Two icons stacked vertically:
 *
 *   Bell  → opens notification-inbox sheet, unread badge from notifications
 *   Search → opens GlobalSearch overlay (window event dispatched)
 *
 * Phil ratified 2026-06-03 (Z): the rail icons must NOT live inside any
 * page's local rail (Ghosted/Market/Pulse). Single global mount, hidden on
 * routes where it doesn't apply (signup/onboarding/legal).
 *
 * The bell route opens the existing notification-inbox sheet which reads from
 * the notifications table. With the boo trigger now writing type='boo' rows
 * into notifications on every tap insert, booers will surface here.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

// Hide rail on these routes — signup, onboarding, legal, redeem flows
const RAIL_HIDDEN_ROUTES = [
  '/', // root pre-auth handled separately via user gate
  '/auth',
  '/redeem',
  '/privacy',
  '/terms',
  '/contact',
  '/about',
  '/safety',
];

function isRailHiddenForPath(pathname) {
  const p = (pathname || '').replace(/\/$/, '') || '/';
  // Hide on legal/onboarding routes
  for (const route of RAIL_HIDDEN_ROUTES) {
    if (p === route || p.startsWith(route + '/')) return true;
  }
  return false;
}

export default function GlobalRail() {
  const { pathname } = useLocation();
  const { openSheet } = useSheet();
  const [unread, setUnread] = useState(0);
  const [userEmail, setUserEmail] = useState(null);

  // Get current user email
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data?.user?.email) setUserEmail(data.user.email);
    });
    return () => { mounted = false; };
  }, []);

  // Load unread notification count + subscribe to inserts
  useEffect(() => {
    if (!userEmail) return;
    let mounted = true;

    const loadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('read', false);
      if (mounted && typeof count === 'number') setUnread(count);
    };
    loadCount();

    const channel = supabase
      .channel('global-rail-unread')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (!mounted) return;
          if (payload.new?.user_email === userEmail && !payload.new?.read) {
            setUnread((n) => n + 1);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          if (!mounted) return;
          // Refresh count on read transitions
          if (payload.new?.user_email === userEmail) {
            loadCount();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  const handleBellTap = useCallback(() => {
    openSheet('notification-inbox');
  }, [openSheet]);

  const handleSearchTap = useCallback(() => {
    // GlobalSearch already mounted in Layout; dispatch event to open
    try {
      window.dispatchEvent(new CustomEvent('global-search:open'));
    } catch (e) { /* non-fatal */ }
  }, []);

  // HOTFIX 2026-06-03 round 5: drop the userEmail gate. Layout already
  // gates the GlobalRail mount behind `{user && <GlobalRail />}`, so user
  // is guaranteed when this component renders. The internal userEmail
  // check was racing supabase.auth.getUser() and never resolving in time,
  // leaving the rail invisible. The unread-count effect still loads
  // async — badge just shows 0 until it lands.
  if (isRailHiddenForPath(pathname)) return null;

  return (
    <div
      // HOTFIX 2026-06-03 round 3: explicit width + pointer-events-none keeps
      // the container hit-box constrained to the two button column. Without
      // width:fit-content, fixed+flex can extend the hit region across the
      // viewport in some Safari/Chromium layouts, blocking taps on the
      // Ghosted card grid below.
      className="fixed right-3 z-[35] flex flex-col items-end gap-2 pointer-events-none"
      style={{
        top: `calc(96px + env(safe-area-inset-top, 0px))`,
        width: 'fit-content',
        height: 'fit-content',
      }}
      aria-label="Quick actions"
    >
      {/* SEARCH */}
      <button
        type="button"
        onClick={handleSearchTap}
        aria-label="Search"
        data-pull-refresh-ignore
        className="pointer-events-auto group flex items-center justify-center w-11 h-11 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-white shadow-lg transition-all hover:bg-white hover:text-black active:scale-95"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
      </button>

      {/* BELL — with unread badge */}
      <button
        type="button"
        onClick={handleBellTap}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        data-pull-refresh-ignore
        className="pointer-events-auto group relative flex items-center justify-center w-11 h-11 rounded-full bg-black/60 border border-white/15 backdrop-blur-md text-white shadow-lg transition-all hover:bg-white hover:text-black active:scale-95"
      >
        <Bell className="w-5 h-5" strokeWidth={2} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C8962C] text-black text-[10px] font-black flex items-center justify-center leading-none border border-black"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
