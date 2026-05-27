import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Music, Radio } from 'lucide-react';
import { useGhostedGrid } from '@/hooks/useGhostedGrid';
import { useGPS } from '@/hooks/useGPS';
import { useSheet } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { GhostedCard } from '@/components/ghosted/GhostedCard';
import { GhostedRecentStories } from '@/components/ghosted/GhostedRecentStories';
import { supabase } from '@/components/utils/supabaseClient';


// Right-rail control for the Ghosted page. Visual pattern mirrors the Pulse
// rail's RailButton (src/pages/Globe.jsx): icons-only pill, label slides out
// on hover. Kept as its own component so the Pulse rail wiring is never touched.
function GhostedRailButton({ icon: Icon, label, onClick }: { icon: React.FC<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-pull-refresh-ignore
      className="group pointer-events-auto flex items-center justify-end gap-0 hover:gap-2 h-11 px-3 bg-black/60 border border-white/20 backdrop-blur-md rounded-full text-white shadow-lg overflow-hidden transition-all hover:bg-white hover:text-black"
    >
      <span className="max-w-0 group-hover:max-w-[120px] overflow-hidden whitespace-nowrap text-[11px] font-black uppercase tracking-wider transition-[max-width] duration-200">{label}</span>
      <span className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
      </span>
    </button>
  );
}

export default function GhostedMode() {
  const navigate = useNavigate();
  const { position } = useGPS();
  const { openSheet } = useSheet();

  // Grid auto-uses location when available (Phil 2026-05-26: removed the
  // pointless Nearby toggle — the grid works on location anyway). Falls back
  // to recent if no GPS yet.
  const tab = position?.lat != null && position?.lng != null ? 'nearby' : 'recent';
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const { cards, isLoading } = useGhostedGrid(
    tab,
    position?.lat ?? null,
    position?.lng ?? null,
    activeFilter,
  );
  
  const [myUserId, setMyUserId] = React.useState<string | null>(null);
  const [myEmail, setMyEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMyUserId(session.user.id);
        setMyEmail(session.user.email ?? null);
      }
    });
  }, []);

  // Backfill prompt for the 142 users with consent ticked but no location
  // point ever captured (gap between consent flag and actual GPS write,
  // fixed at source for new users in PR #444 — backfill for existing users
  // surfaces here as a one-shot dismissable banner).
  const [needsLocation, setNeedsLocation] = React.useState(false);
  const [locationDismissed, setLocationDismissed] = React.useState<boolean>(
    () => {
      try { return window.localStorage.getItem('hm_loc_banner_dismissed') === '1'; }
      catch { return false; }
    }
  );
  const [enableLocPending, setEnableLocPending] = React.useState(false);
  React.useEffect(() => {
    if (!myUserId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('location, location_consent')
      .eq('id', myUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        // location is null OR location_consent off → can't appear on Ghosted
        setNeedsLocation(!data.location || data.location_consent === false);
      });
    return () => { cancelled = true; };
  }, [myUserId]);

  const handleEnableLocation = React.useCallback(() => {
    if (enableLocPending || !('geolocation' in navigator)) return;
    setEnableLocPending(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await supabase.rpc('update_my_location', {
            p_lng: pos.coords.longitude,
            p_lat: pos.coords.latitude,
          });
          setNeedsLocation(false);
          try { window.localStorage.removeItem('hm_loc_banner_dismissed'); } catch {}
        } catch (e) {
          console.warn('[Ghosted] update_my_location failed:', e);
        } finally {
          setEnableLocPending(false);
        }
      },
      () => { setEnableLocPending(false); },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  }, [enableLocPending]);

  const handleDismissLocBanner = React.useCallback(() => {
    try { window.localStorage.setItem('hm_loc_banner_dismissed', '1'); } catch {}
    setLocationDismissed(true);
  }, []);

  const { isTapped, isMutualBoo } = useTaps(myUserId, myEmail);
  const { unreadCount } = useUnreadCount();

  return (
    <div className="relative h-full w-full bg-[#050507] flex flex-col overflow-hidden">

      {/* Scrollable Container */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />


        {/* ── RECENT — IG/Grindr-style avatar row of recent chats + active
            beacon-droppers (gold ring = active beacon). Always-on, above the
            grid, no "Recent" label. Tap an avatar -> their profile (where
            their active beacons are listed). Renders nothing when there's
            nobody to show, so the grid below always carries the page. */}
        <GhostedRecentStories currentUserEmail={myEmail} currentUserId={myUserId} />

        {/* Filter chips — Brief 03 doctrine. Tap to toggle; second tap clears.
            Filter logic lives in useGhostedGrid (server-side row filter).
            Doctrine: no popularity counts on chips (no "ALL · 247"). */}
        <div
          className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `.gh-filters::-webkit-scrollbar{display:none}` }} />
          {[
            { key: null, label: 'ALL' },
            { key: 'online', label: 'ONLINE' },
            { key: 'new', label: 'NEW' },
            { key: 'looking', label: 'LOOKING' },
            { key: 'hang', label: 'HANG' },
            { key: 'tonight', label: 'TONIGHT' },
          ].map((chip) => {
            const isActive = activeFilter === chip.key || (chip.key === null && !activeFilter);
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setActiveFilter(chip.key === activeFilter ? null : chip.key)}
                data-pull-refresh-ignore
                className="shrink-0 px-3 h-7 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors"
                style={{
                  background: isActive ? '#C8962C' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
                  border: isActive ? '1px solid #C8962C' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Backfill prompt — signed-in users without a location point won't
            appear on Ghosted at all (RPC filter). One-shot, dismissable. */}
        {needsLocation && !locationDismissed && (
          <div
            className="mx-3 mt-2 mb-1 p-3 rounded-xl flex items-center gap-3 text-[12px]"
            style={{ background: 'rgba(200,150,44,0.10)', border: '1px solid rgba(200,150,44,0.30)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[#C8962C] font-bold tracking-wide uppercase text-[11px] mb-0.5">Be seen</div>
              <div className="text-white/75 leading-snug">Enable location so others can see you nearby. Approximate only.</div>
            </div>
            <button
              type="button"
              onClick={handleEnableLocation}
              disabled={enableLocPending}
              className="shrink-0 px-3 h-8 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: '#C8962C', color: '#000', opacity: enableLocPending ? 0.6 : 1 }}
            >
              {enableLocPending ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={handleDismissLocBanner}
              aria-label="Dismiss"
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80"
            >
              ×
            </button>
          </div>
        )}


        {/* ── LIVE FIELD — the emotional center. Orbit mechanics: zero
            gutters, deterministic per-index opacity jitter so the grid
            doesn't read as uniform "app tiles." Full orbit pass (active
            card 1.06×, partial-clip, intersection-observer focus) is
            queued separately. */}
        {isLoading && cards.length === 0 ? (
          <div className="grid grid-cols-3 gap-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0">
            {cards.map((card, i) => {
              // Index-based jitter — quietly breaks "app grid" feel without
              // requiring scroll detection. Pattern repeats every 7 cards
              // so the field has rhythm but no obvious tile.
              const cycle = i % 7;
              const dim   = cycle === 1 || cycle === 4 ? 0.82 : cycle === 6 ? 0.92 : 1.0;
              const scale = cycle === 2 ? 1.015 : cycle === 5 ? 0.985 : 1.0;
              return (
                <div
                  key={card.id}
                  style={{
                    opacity: dim,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                  }}
                >
                  <GhostedCard
                    {...card}
                    index={i}
                    isBood={isTapped(card.id, 'boo')}
                    isMutual={isMutualBoo(card.id)}
                    onTap={(id) => openSheet('profile', { uid: id })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Inline empty hint — never replaces the grid scaffold (Phil 2026-05-26:
            'the grid should always be there'). Just a soft note when zero cards. */}
        {!isLoading && cards.length === 0 && (
          <p className="text-center text-white/25 text-[11px] tracking-wider uppercase py-3">
            Field quiet · pull to refresh
          </p>
        )}
      </div>

      {/* Right control rail — page-aware (Phil 2026-05-25): Ghosted gains a
          rail with Music + Radio. Styled to match the Pulse rail (right-edge
          vertical icon stack, hover-expand labels). The previously in-page
          music/radio entry points (the GHOSTED radio play + /music nav) now
          live here so there's one consistent control surface and no duplicate
          buttons elsewhere on the page. */}
      <div className="absolute top-[calc(88px+env(safe-area-inset-top,0px))] right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
        <GhostedRailButton icon={Music} label="Music" onClick={() => navigate('/music')} />
        <GhostedRailButton icon={Radio} label="Radio" onClick={() => navigate('/radio')} />
      </div>

      {/* Floating Inbox/Messages button — shifted specifically into GhostedMode per Zia's request */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => openSheet('chat')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#C8962C] rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(200,150,44,0.3)] z-[50]"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
          {/* Subtle indicator if unread */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#C8962C] animate-pulse" style={{ background: '#FF3B30' }} />
          )}
        </div>
      </motion.button>

    </div>
  );
}
