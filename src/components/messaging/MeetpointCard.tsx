/**
 * MeetpointCard — inline meetpoint message in chat
 *
 * Rendered when msg.message_type === 'meetpoint'.
 * Dark satellite-map aesthetic matching design mockup.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Navigation, Car, Bus, Clock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export interface MeetpointCardProps {
  title: string;
  address?: string;
  lat: number;
  lng: number;
  distanceM?: number;
  etaMin: number;
  retracted?: boolean;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MeetpointCard({ title, address, lat, lng, distanceM, etaMin, retracted }: MeetpointCardProps) {
  const [remaining, setRemaining] = useState(etaMin * 60);
  const [sharePending, setSharePending] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser({ id: user.id, email: user.email });
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    setRemaining(etaMin * 60);
    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [etaMin]);

  const walkMin = etaMin;
  const driveMin = Math.max(1, Math.round(etaMin * 0.4));
  const transitMin = Math.max(2, Math.round(etaMin * 0.7));

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(title)}`;

  const handleRoute = useCallback(() => {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }, [mapsUrl]);

  const handleBookRide = useCallback(() => {
    window.open(uberUrl, '_blank', 'noopener,noreferrer');
  }, [uberUrl]);

  const handleShareLive = useCallback(async () => {
    if (!currentUser?.id) {
      toast.error('Log in to share your location');
      return;
    }

    setSharePending(true);
    try {
      // Get user's current location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
        });
      });

      const endTime = new Date(Date.now() + etaMin * 60 * 1000).toISOString();

      await supabase.from('location_shares').insert({
        user_id: currentUser.id,
        current_lat: pos.coords.latitude,
        current_lng: pos.coords.longitude,
        active: true,
        end_time: endTime,
      });

      const shareData = {
        title: `${currentUser?.email?.split('@')[0] || 'Someone'} is on the way`,
        text: `Arriving at ${title} in ${etaMin} min`,
        url: mapsUrl,
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} — ${mapsUrl}`);
        toast.success('Link copied to clipboard');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Could not share location');
      }
    } finally {
      setSharePending(false);
    }
  }, [currentUser, etaMin, title, mapsUrl]);

  const distanceLabel = distanceM != null
    ? distanceM >= 1000
      ? `${(distanceM / 1000).toFixed(1)} km`
      : `${Math.round(distanceM)} m`
    : null;

  // Compute OSM tile coordinates for zoom 14
  const zoom = 14;
  const tileX = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div className="rounded-2xl overflow-hidden border border-[#C8962C]/20 bg-[#1C1C1E] w-full max-w-xs shadow-lg shadow-black/30">
      {/* Dark satellite-style map tile */}
      <div className="relative h-32 overflow-hidden bg-[#0a0f18]">
        <img
          src={tileUrl}
          alt="Map"
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          style={{ filter: 'brightness(0.4) saturate(0.3) contrast(1.2)', opacity: 0.85 }}
        />
        {/* Gold radial glow at center */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(200,150,44,0.12) 0%, transparent 50%)' }} />
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-[#0a0f18]/60" />
        {/* Gold pin with glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 w-8 h-8 -m-0.5 rounded-full bg-[#C8962C]/30 blur-md animate-pulse" />
            <MapPin className="w-7 h-7 text-[#C8962C] drop-shadow-lg relative" style={{ filter: 'drop-shadow(0 0 8px rgba(200,150,44,0.6))' }} />
          </div>
        </div>
      </div>

      {retracted && (
        <div className="px-3 py-2 bg-white/5 flex items-center justify-center">
          <span className="text-[11px] text-white/40 font-bold">Meetpoint pulled</span>
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* Header label + title */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#C8962C] font-bold mb-0.5">Meet here</p>
          <p className="font-bold text-sm text-white truncate">{title}</p>
          {(address || distanceLabel) && (
            <p className="text-[11px] text-white/50 truncate mt-0.5">
              {[address, distanceLabel].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Transport modes */}
        <div className="flex items-center gap-3 text-[11px] text-white/60">
          <span className="flex items-center gap-1">
            🚶 <span className="font-bold text-white/80">{walkMin}m</span>
          </span>
          <span className="flex items-center gap-1">
            🚗 <span className="font-bold text-white/80">{driveMin}m</span>
          </span>
          <span className="flex items-center gap-1">
            🚌 <span className="font-bold text-white/80">{transitMin}m</span>
          </span>
        </div>

        {/* CTAs — premium gold primary, glass secondaries */}
        <div className="flex gap-2">
          <button
            onClick={handleRoute}
            className="flex-1 py-2.5 rounded-full text-black text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md"
            style={{ background: 'linear-gradient(135deg, #C8962C 0%, #D4A853 100%)', boxShadow: '0 4px 16px rgba(200,150,44,0.3)' }}
          >
            <Navigation className="w-3 h-3" />
            Route
          </button>
          <button
            onClick={handleBookRide}
            className="flex-1 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white text-xs font-bold active:scale-95 transition-transform"
          >
            Uber
          </button>
          <button
            onClick={handleShareLive}
            disabled={sharePending}
            className="flex-1 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            Share
          </button>
        </div>

        {/* Countdown / expired */}
        {remaining > 0 ? (
          <div className="flex items-center justify-center gap-2 py-1.5 rounded-lg bg-[#C8962C]/10 border border-[#C8962C]/20">
            <Clock className="w-3 h-3 text-[#C8962C]" />
            <span className="text-xs font-bold text-[#C8962C] tabular-nums">
              Sharing · {formatCountdown(remaining)} left
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[11px] text-white/40 font-bold">Meetpoint expired</span>
          </div>
        )}
      </div>
    </div>
  );
}
