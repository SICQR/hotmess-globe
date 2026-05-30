/**
 * ChatTravelCard — inline travel card rendered in chat when a location is detected.
 *
 * Shows: destination, ETA, distance, estimated cost, mode chips.
 * Actions: Route, Book ride, Share ETA.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Car, Bike, Footprints, Clock, Send } from 'lucide-react';
import type { ParsedLocation } from '@/lib/locationParser';
import { estimateTravel, haversineKm } from '@/lib/locationParser';

const AMBER = '#C8962C';

interface ChatTravelCardProps {
  location: ParsedLocation;
  isMe: boolean;
  userLat?: number;
  userLng?: number;
  onRoute?: () => void;
  onShareETA?: () => void;
}

export default function ChatTravelCard({
  location,
  isMe,
  userLat,
  userLng,
  onRoute,
  onShareETA,
}: ChatTravelCardProps) {
  const distance = useMemo(() => {
    if (!userLat || !userLng || !location.lat || !location.lng) return null;
    return haversineKm(userLat, userLng, location.lat, location.lng);
  }, [userLat, userLng, location.lat, location.lng]);

  const travel = useMemo(() => {
    if (!distance) return null;
    return estimateTravel(distance);
  }, [distance]);

  const typeIcon = location.type === 'venue' ? '📍' : location.type === 'postcode' ? '📮' : '📌';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`max-w-[85%] rounded-2xl overflow-hidden border ${
        isMe ? 'bg-[#C8962C]/10 border-[#C8962C]/25' : 'bg-[#1C1C1E] border-white/10'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{location.label}</p>
            {distance !== null && (
              <p className="text-white/40 text-[11px] mt-0.5">
                {distance < 1
                  ? `${Math.round(distance * 1000)}m away`
                  : `${distance.toFixed(1)} km away`}
              </p>
            )}
          </div>
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
        </div>
      </div>

      {/* Mode chips — show travel estimates */}
      {travel && (
        <div className="px-4 pb-2 flex gap-2">
          {travel.walk && (
            <ModeChip
              icon={<Footprints className="w-3 h-3" />}
              label="Walk"
              time={`${travel.walk.minutes} min`}
            />
          )}
          {travel.bike && (
            <ModeChip
              icon={<Bike className="w-3 h-3" />}
              label="Bike"
              time={`${travel.bike.minutes} min`}
              cost={travel.bike.costMax > 0 ? `~\u00A3${travel.bike.costMax.toFixed(0)}` : undefined}
            />
          )}
          {travel.ride && (
            <ModeChip
              icon={<Car className="w-3 h-3" />}
              label="Ride"
              time={`${travel.ride.minutes} min`}
              cost={`\u00A3${travel.ride.costMin}–${travel.ride.costMax}`}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        {onRoute && (
          <button
            onClick={onRoute}
            className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase active:scale-[0.97] transition-transform"
            style={{ background: AMBER, color: '#000' }}
          >
            <Navigation className="w-3.5 h-3.5" />
            Route
          </button>
        )}
        {onShareETA && isMe && (
          <button
            onClick={onShareETA}
            className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(200,150,44,0.12)', color: AMBER, border: '1px solid rgba(200,150,44,0.2)' }}
          >
            <Send className="w-3.5 h-3.5" />
            Share ETA
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ModeChip({
  icon,
  label,
  time,
  cost,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  cost?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8">
      <span className="text-white/50">{icon}</span>
      <div>
        <p className="text-white/80 text-[10px] font-semibold leading-tight">{time}</p>
        {cost && <p className="text-white/40 text-[9px] leading-tight">{cost}</p>}
      </div>
    </div>
  );
}
