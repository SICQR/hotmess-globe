import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Lock, ChevronRight, Play, Users, MessageCircle } from 'lucide-react';
import { TrackPlayer } from '@/components/music/TrackPlayer';
import { useGhostedGrid } from '@/hooks/useGhostedGrid';
import { useGPS } from '@/hooks/useGPS';
import { useSheet } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { GhostedCard } from '@/components/ghosted/GhostedCard';
import { supabase } from '@/components/utils/supabaseClient';

import LocationConsentScreen from '@/components/onboarding/screens/LocationConsentScreen';

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

  // Generate random heights for music visualizer bars
  const bars = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    height: 10 + Math.random() * 20,
    delay: Math.random() * 0.5,
    duration: 0.8 + Math.random() * 0.8,
  }));

  const { unreadCount } = useUnreadCount();

  return (
    <div className="relative h-full w-full bg-[#050507] flex flex-col overflow-hidden">
      
      {/* Scrollable Container */}
      <div 
        className="flex-1 overflow-y-auto pt-6 pb-24 px-1"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />

        <div className="px-4 mb-4 text-center mt-6">
          
          {/* Subtle Visualizer (Ghosted Music Hook) */}
          <div className="flex items-center justify-center gap-[3px] mb-8 h-8 opacity-50">
            {bars.map((bar) => (
              <motion.div
                key={bar.id}
                className="w-1 bg-[#C8962C] rounded-full mix-blend-screen"
                initial={{ height: 4 }}
                animate={{ height: [4, bar.height, 4] }}
                transition={{
                  duration: bar.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: bar.delay
                }}
              />
            ))}
          </div>

          <h2 className="text-[26px] font-black text-white px-4 leading-[1.1] tracking-tight mb-2 uppercase">
            Some messages don’t come back.
          </h2>
          <p className="text-white/40 text-[10px] font-black tracking-[0.2em] mb-8 uppercase">
            You felt that.
          </p>

          <TrackPlayer 
            trackTitle="GHOSTED — VOL 1"
            trackSource="https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/records-audio/1764584744541-Ghosted%20(are%20you%20looking_)%20blended%20version%20(Remastered).mp3" 
            artistName="GHOSTED"
            className="mb-8"
            themeColor="#C8962C"
          />

          {/* Filter Chips */}
          <div className="flex justify-center gap-4 mb-8">
            <button 
              onClick={() => setFilter('recent')}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${filter === 'recent' ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}
            >
              Recent
            </button>
            <button 
              onClick={handleToggleNearby}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all border ${filter === 'nearby' ? 'bg-[#C8962C] border-[#C8962C] text-black' : 'bg-transparent border-white/10 text-white/40'}`}
            >
              Nearby
            </button>
          </div>
        </div>

        {/* The Live Grid */}
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
          <div className="grid grid-cols-3 gap-1 px-0.5">
            {cards.map((card, i) => (
              <GhostedCard
                key={card.id}
                {...card}
                index={i}
                isBood={isTapped(card.id, 'boo')}
                isMutual={isMutualBoo(card.id)}
                onTap={(id) => openSheet('ghosted-preview', { uid: id })}
              />
            ))}
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
