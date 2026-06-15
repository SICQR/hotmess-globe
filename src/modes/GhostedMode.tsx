import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useGhostedGrid } from '@/hooks/useGhostedGrid';
import { useGPS } from '@/hooks/useGPS';
import { useSheet } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useBoostedUserIds } from '@/hooks/useBoostedUserIds';
import { useUserBenefits } from '@/hooks/useUserBenefits';
import { GhostedCard } from '@/components/ghosted/GhostedCard';
import { GhostedRecentStories } from '@/components/ghosted/GhostedRecentStories';
import { GhostedActivityRibbon } from '@/components/ghosted/GhostedActivityRibbon';
// Phil 2026-06-03 — CareOnTheGroundStrip folded into GhostedRecentStories.
// Single-primitive rule (D53 §1.4). The component file itself is left in
// the tree for one more PR's worth of grace before deletion; the import
// is removed here so no consumers remain.
import { AtmosphericImageCard } from '@/components/brand/AtmosphericImageCard';
import { supabase } from '@/components/utils/supabaseClient';


export default function GhostedMode() {
  const navigate = useNavigate();
  const { position } = useGPS();
  const { openSheet } = useSheet();

  const tab = position?.lat != null && position?.lng != null ? 'nearby' : 'recent';
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const { cards, isLoading, refetch } = useGhostedGrid(
    tab,
    position?.lat ?? null,
    position?.lng ?? null,
    activeFilter,
  );

  React.useEffect(() => {
    const handler = () => { try { refetch(); } catch { /* noop */ } };
    window.addEventListener('hm:ptr-refresh', handler as EventListener);
    return () => window.removeEventListener('hm:ptr-refresh', handler as EventListener);
  }, [refetch]);

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
  const { unreadCount, clearTapsBadge, fetchChatCount } = useUnreadCount();

  React.useEffect(() => {
    clearTapsBadge();
  }, [clearTapsBadge]);

  const boostedUserIds = useBoostedUserIds();

  const benefits = useUserBenefits();
  const hasFullGhosted = !!benefits.has_full_ghosted;
  const previewLimit = typeof benefits.ghosted_preview_limit === 'number' ? benefits.ghosted_preview_limit : 3;
  const isCardFogged = (index: number) => !hasFullGhosted && previewLimit !== -1 && index >= previewLimit;

  return (
    <div className="relative h-full w-full bg-[#050507] flex flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{__html:
        '.gh-no-sb::-webkit-scrollbar{display:none}' +
        '.gh-filters::-webkit-scrollbar{display:none}'
      }} />

      {/* Scrollable Container — Phil 2026-06-15: removed right rail (Music/Radio
          floating buttons) that was overlapping column 3 of the grid. Bottom nav
          has Music; stories row has Radio. Rail was redundant AND breaking layout. */}
      <div
        className="gh-no-sb flex-1 overflow-y-auto overflow-x-hidden pb-24"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-y',
        }}
      >
        <GhostedRecentStories currentUserEmail={myEmail} currentUserId={myUserId} />
        <GhostedActivityRibbon />

        <div
          className="gh-filters px-3 pt-2 pb-1 flex gap-2 overflow-x-auto"
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x',
          }}
        >
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

        {isLoading && cards.length === 0 ? (
          <div className="grid grid-cols-3 gap-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0">
            {(boostedUserIds.size === 0
              ? cards
              : [...cards].sort((a, b) => {
                  const aBoosted = boostedUserIds.has(a.id) ? 1 : 0;
                  const bBoosted = boostedUserIds.has(b.id) ? 1 : 0;
                  return bBoosted - aBoosted;
                })
            ).map((card, i) => {
              const cycle = i % 7;
              const dim   = cycle === 1 || cycle === 4 ? 0.82 : cycle === 6 ? 0.92 : 1.0;
              const scale = cycle === 2 ? 1.015 : cycle === 5 ? 0.985 : 1.0;
              const fogged = isCardFogged(i);
              return (
                <div
                  key={card.id}
                  className="relative"
                  style={{
                    opacity: fogged ? 0.55 : dim,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                  }}
                >
                  <GhostedCard
                    {...card}
                    index={i}
                    isBood={isTapped(card.id, 'boo')}
                    isMutual={isMutualBoo(card.id)}
                    isBoosted={boostedUserIds.has(card.id)}
                    onTap={(id) => {
                      if (fogged) {
                        navigate('/upgrade');
                      } else {
                        openSheet('profile', { id });
                      }
                    }}
                  />
                  {fogged && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backdropFilter: 'blur(14px) saturate(0.6)',
                        WebkitBackdropFilter: 'blur(14px) saturate(0.6)',
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.55) 100%)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && cards.length === 0 && (
          <div className="px-3 pt-3 pb-1 space-y-3">
            <AtmosphericImageCard
              imageUrl="https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/ghosted/no-signal-yet.png"
              copy="No signal yet. Go make one."
              aspect="16/9"
            />
            <p className="text-center text-white/25 text-[11px] tracking-wider uppercase pt-1">
              Field quiet · pull to refresh
            </p>
          </div>
        )}
      </div>

      {/* Floating Inbox/Messages button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { fetchChatCount(); openSheet('chat'); }}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#C8962C] rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(200,150,44,0.3)] z-[50]"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
          {unreadCount > 0 && (
            <div
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full border-2 border-[#C8962C] flex items-center justify-center text-[10px] font-black text-white animate-pulse"
              style={{ background: '#FF3B30' }}
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </motion.button>

    </div>
  );
}
