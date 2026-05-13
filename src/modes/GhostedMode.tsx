import React from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle } from 'lucide-react';
import { useGhostedGrid } from '@/hooks/useGhostedGrid';
import { useGPS } from '@/hooks/useGPS';
import { useSheet } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { GhostedCard } from '@/components/ghosted/GhostedCard';
import { SignalStrip } from '@/components/ghosted/SignalStrip';
import { supabase } from '@/components/utils/supabaseClient';

import LocationConsentScreen from '@/components/onboarding/screens/LocationConsentScreen';

const GHOSTED_VOL_1 = 'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/records-audio/1764584744541-Ghosted%20(are%20you%20looking_)%20blended%20version%20(Remastered).mp3';

export default function GhostedMode() {
  const { position } = useGPS();
  const { openSheet } = useSheet();
  const [filter, setFilter] = React.useState<'nearby' | 'recent'>('recent');
  const [showLocationGating, setShowLocationGating] = React.useState(false);
  const [locationConsent, setLocationConsent] = React.useState<boolean | null>(null);

  const { cards, isLoading, refetch } = useGhostedGrid(
    filter === 'nearby' ? 'nearby' : 'live', 
    position?.lat ?? null, 
    position?.lng ?? null, 
    null
  );
  
  const [myUserId, setMyUserId] = React.useState<string | null>(null);
  const [myEmail, setMyEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMyUserId(session.user.id);
        setMyEmail(session.user.email ?? null);
        
        // Fetch location consent status from profiles table
        supabase.from('profiles')
          .select('location_consent')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) console.error('[Ghosted] Error fetching consent:', error);
            setLocationConsent(!!data?.location_consent);
          });
      }
    });
  }, []);

  const handleToggleNearby = () => {
    if (locationConsent === true) {
      setFilter(filter === 'nearby' ? 'recent' : 'nearby');
    } else if (locationConsent === false) {
      setShowLocationGating(true);
    }
    // If null, we are still loading, do nothing yet
  };

  const handleLocationAllow = async () => {
    if (!myUserId) {
      console.error('[Ghosted] No user ID for consent update');
      return;
    }
    
    // Update profiles table
    const { error } = await supabase.from('profiles').update({
      location_consent: true,
      location_consent_at: new Date().toISOString()
    }).eq('id', myUserId);
    
    if (error) {
      console.error('[Ghosted] Error saving consent to profiles:', error);
      alert('Failed to save location choice: ' + (error.message || 'Unknown error'));
      return;
    }
    
    setLocationConsent(true);
    setShowLocationGating(false);
    setFilter('nearby');
    
    // Trigger GPS
    navigator.geolocation.getCurrentPosition(
      () => refetch(),
      (err) => console.warn('[Ghosted] Geolocation trigger failed:', err)
    );
  };

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

        {/* ── SIGNAL STRIP — ambient transmission, never hero. Phil exec
            review 2026-05-13: this used to be a giant TrackPlayer that
            read as the primary product. Compressed to a 44px row that
            sits above the filter and the live field. */}
        <SignalStrip
          src={GHOSTED_VOL_1}
          title="GHOSTED — Vol 1"
          artist="GHOSTED"
        />

        {/* ── FILTER STATE — Recent / Nearby. Tight, minimal. ─────────── */}
        <div className="flex justify-center gap-3 pt-4 pb-3">
          <button
            onClick={() => setFilter('recent')}
            className="text-[10px] tracking-[0.28em] uppercase transition-colors"
            style={{
              padding: '6px 14px',
              borderRadius: 2,
              fontWeight: 500,
              background: filter === 'recent' ? 'rgba(200,150,44,0.10)' : 'transparent',
              border: filter === 'recent'
                ? '0.5px solid rgba(200,150,44,0.45)'
                : '0.5px solid rgba(255,255,255,0.08)',
              color: filter === 'recent' ? '#C8962C' : 'rgba(255,255,255,0.42)',
            }}
          >
            Recent
          </button>
          <button
            onClick={handleToggleNearby}
            className="text-[10px] tracking-[0.28em] uppercase transition-colors"
            style={{
              padding: '6px 14px',
              borderRadius: 2,
              fontWeight: 500,
              background: filter === 'nearby' ? 'rgba(200,150,44,0.10)' : 'transparent',
              border: filter === 'nearby'
                ? '0.5px solid rgba(200,150,44,0.45)'
                : '0.5px solid rgba(255,255,255,0.08)',
              color: filter === 'nearby' ? '#C8962C' : 'rgba(255,255,255,0.42)',
            }}
          >
            Nearby
          </button>
        </div>

        {/* ── LIVE FIELD — the emotional center. Orbit mechanics: zero
            gutters, deterministic per-index opacity jitter so the grid
            doesn't read as uniform "app tiles." Full orbit pass (active
            card 1.06×, partial-clip, intersection-observer focus) is
            queued separately. */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Users className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.12)' }} />
            <p className="text-white/25 text-sm font-medium">
              It's quiet around here.
            </p>
          </motion.div>
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
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#C8962C] animate-pulse" />
          )}
        </div>
      </motion.button>

      {/* Location Permission Gating Overlay */}
      {showLocationGating && (
        <div className="z-[100]">
          <LocationConsentScreen 
            onAllow={handleLocationAllow} 
            onSkip={() => setShowLocationGating(false)} 
            progress={0} 
          />
        </div>
      )}
    </div>
  );
}
