/**
 * L2RouteSheet — bottom sheet showing route options to a destination.
 *
 * Shows: destination, ETA by mode, estimated fare, distance.
 * Actions: Go now (opens maps/provider), Book ride (deep link), Share ETA.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Car, Bike, Footprints, Clock, X,
  ExternalLink, Send, Check, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/components/utils/supabaseClient';
import { haversineKm, estimateTravel } from '@/lib/locationParser';
import { useCreateTravelSession } from '@/hooks/useTravelSession';

const AMBER = '#C8962C';

type TravelMode = 'walk' | 'bike' | 'ride';

interface RouteSheetProps {
  destination: {
    label: string;
    lat: number;
    lng: number;
    type?: string; // postcode | venue | pin | pulse_place
    slug?: string;
  };
  chatThreadId?: string;
  recipientUserId?: string;
  onClose: () => void;
}

const MODE_CONFIG: Record<TravelMode, { icon: React.ElementType; label: string; color: string }> = {
  walk: { icon: Footprints, label: 'Walk', color: '#39FF14' },
  bike: { icon: Bike, label: 'Bike', color: '#00C2E0' },
  ride: { icon: Car, label: 'Ride', color: AMBER },
};

export default function L2RouteSheet({ destination, chatThreadId, recipientUserId, onClose }: RouteSheetProps) {
  const [selectedMode, setSelectedMode] = useState<TravelMode>('ride');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [shared, setShared] = useState(false);
  const createSession = useCreateTravelSession();

  // Get user location
  useEffect(() => {
    // Try cached position first
    const cached = (window as any).__hm_last_pos;
    if (cached?.lat && cached?.lng) {
      setUserPos(cached);
    }
    // Also request fresh
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000 }
    );
  }, []);

  const distance = useMemo(() => {
    if (!userPos) return null;
    return haversineKm(userPos.lat, userPos.lng, destination.lat, destination.lng);
  }, [userPos, destination]);

  const travel = useMemo(() => {
    if (!distance) return null;
    return estimateTravel(distance);
  }, [distance]);

  const selectedTravel = travel?.[selectedMode];

  // Build provider deep links
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=${selectedMode === 'ride' ? 'driving' : selectedMode === 'bike' ? 'bicycling' : 'walking'}`;

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.label)}`;
  const boltUrl = `https://bolt.eu/en/ride/?destination_lat=${destination.lat}&destination_lng=${destination.lng}`;

  const handleGoNow = () => {
    if (selectedMode === 'ride') {
      // Open Uber deep link
      window.open(uberUrl, '_blank');
    } else {
      // Open Google Maps
      window.open(mapsUrl, '_blank');
    }
  };

  const handleShareETA = async () => {
    if (!selectedTravel || !userPos || shared) return;

    try {
      await createSession.mutateAsync({
        destination_type: destination.type || 'venue',
        destination_label: destination.label,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        origin_lat: userPos.lat,
        origin_lng: userPos.lng,
        mode: selectedMode,
        chat_thread_id: chatThreadId,
        recipient_user_id: recipientUserId,
        share_mode: 'eta_only',
        eta_minutes: selectedTravel.minutes,
        estimated_cost_min: selectedTravel.costMin,
        estimated_cost_max: selectedTravel.costMax,
        distance_km: distance ?? undefined,
      });

      // Send travel card message in chat
      if (chatThreadId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('chat_messages').insert({
            thread_id: chatThreadId,
            sender_email: session.user.email,
            content: `On the way to ${destination.label}`,
            message_type: 'travel',
            metadata: {
              destination_label: destination.label,
              destination_lat: destination.lat,
              destination_lng: destination.lng,
              mode: selectedMode,
              eta_minutes: selectedTravel.minutes,
              estimated_cost_min: selectedTravel.costMin,
              estimated_cost_max: selectedTravel.costMax,
              status: 'en_route',
            },
            created_date: new Date().toISOString(),
          });
        }
      }

      setShared(true);
      toast.success('ETA shared');
    } catch (err: any) {
      toast.error('Failed to share ETA');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end justify-center"
    >
      <motion.div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-h-[80vh] rounded-t-3xl overflow-y-auto z-10"
        style={{
          background: 'rgba(13,13,13,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: `1px solid rgba(200,150,44,0.15)`,
        }}
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Destination */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${AMBER}15` }}
            >
              <MapPin className="w-6 h-6" style={{ color: AMBER }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-lg truncate">{destination.label}</p>
              {distance !== null && (
                <p className="text-white/40 text-sm">
                  {distance < 1
                    ? `${Math.round(distance * 1000)}m away`
                    : `${distance.toFixed(1)} km away`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            {(Object.entries(MODE_CONFIG) as [TravelMode, typeof MODE_CONFIG.walk][]).map(([mode, config]) => {
              const t = travel?.[mode];
              if (!t) return null;
              const Icon = config.icon;
              const active = selectedMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`flex-1 rounded-xl p-3 transition-all active:scale-[0.97] ${
                    active ? 'ring-2' : ''
                  }`}
                  style={{
                    background: active ? `${config.color}15` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? `${config.color}40` : 'rgba(255,255,255,0.06)'}`,
                    ...(active ? { '--tw-ring-color': config.color } as React.CSSProperties : {}),
                  }}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: active ? config.color : 'rgba(255,255,255,0.3)' }} />
                  <p className="text-[11px] font-bold" style={{ color: active ? config.color : 'rgba(255,255,255,0.5)' }}>
                    {t.minutes} min
                  </p>
                  {t.costMax > 0 && (
                    <p className="text-[10px] mt-0.5" style={{ color: active ? `${config.color}80` : 'rgba(255,255,255,0.3)' }}>
                      {t.costMin === t.costMax
                        ? `\u00A3${t.costMin}`
                        : `\u00A3${t.costMin}–${t.costMax}`}
                    </p>
                  )}
                  <p className="text-[9px] mt-0.5 uppercase font-semibold tracking-wider" style={{ color: active ? config.color : 'rgba(255,255,255,0.25)' }}>
                    {config.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected mode detail */}
        {selectedTravel && (
          <div className="px-5 pb-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-xl">{selectedTravel.minutes} min</p>
                  <p className="text-white/40 text-sm">
                    {selectedMode === 'ride' && selectedTravel.costMax > 0
                      ? `\u00A3${selectedTravel.costMin}–\u00A3${selectedTravel.costMax}`
                      : selectedMode === 'walk' ? 'Free' : selectedTravel.costMax > 0 ? `~\u00A3${selectedTravel.costMax}` : ''}
                  </p>
                </div>
                <Clock className="w-6 h-6 text-white/20" />
              </div>

              {/* Provider options for ride mode */}
              {selectedMode === 'ride' && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => window.open(uberUrl, '_blank')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <span className="text-sm font-bold text-white">Uber</span>
                    <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
                  </button>
                  <button
                    onClick={() => window.open(boltUrl, '_blank')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <span className="text-sm font-bold text-white">Bolt</span>
                    <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-8 flex gap-3">
          <button
            onClick={handleGoNow}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.97] transition-transform"
            style={{ background: AMBER, color: '#000' }}
          >
            <Navigation className="w-4 h-4" />
            Open route
          </button>
          {chatThreadId && (
            <button
              onClick={handleShareETA}
              disabled={shared || createSession.isPending}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40"
              style={{
                background: shared ? 'rgba(200,150,44,0.08)' : 'rgba(200,150,44,0.12)',
                color: AMBER,
                border: `1px solid ${shared ? `${AMBER}20` : `${AMBER}30`}`,
              }}
            >
              {shared ? (
                <><Check className="w-4 h-4" /> Shared</>
              ) : createSession.isPending ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Share ETA</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
