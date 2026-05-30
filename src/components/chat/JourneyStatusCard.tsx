/**
 * JourneyStatusCard — renders in chat showing travel status.
 *
 * States: en_route | nearby | arrived | cancelled
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Check, X, Clock } from 'lucide-react';

const AMBER = '#C8962C';

interface JourneyStatusCardProps {
  metadata: {
    destination_label: string;
    mode?: string;
    eta_minutes?: number;
    estimated_cost_min?: number;
    estimated_cost_max?: number;
    status: string;
    arrival_time?: string;
  };
  isMe: boolean;
  otherName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  en_route: { label: 'On the way', color: AMBER, icon: Navigation, bg: 'rgba(200,150,44,0.1)' },
  nearby: { label: 'Nearby', color: '#39FF14', icon: MapPin, bg: 'rgba(57,255,20,0.08)' },
  arrived: { label: 'Arrived', color: '#30D158', icon: Check, bg: 'rgba(48,209,88,0.08)' },
  cancelled: { label: 'Cancelled', color: '#FF3B30', icon: X, bg: 'rgba(255,59,48,0.08)' },
  booked: { label: 'Ride booked', color: AMBER, icon: Clock, bg: 'rgba(200,150,44,0.08)' },
};

export default function JourneyStatusCard({ metadata, isMe, otherName }: JourneyStatusCardProps) {
  const status = metadata.status || 'en_route';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.en_route;
  const Icon = config.icon;

  const modeLabel = metadata.mode === 'walk' ? 'Walking' : metadata.mode === 'bike' ? 'Cycling' : 'Ride';

  // Estimate arrival time
  const arrivalTime = metadata.arrival_time || (() => {
    if (!metadata.eta_minutes) return null;
    const arrival = new Date(Date.now() + metadata.eta_minutes * 60000);
    return arrival.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="max-w-[85%] rounded-2xl overflow-hidden"
      style={{ background: config.bg, border: `1px solid ${config.color}25` }}
    >
      <div className="px-4 py-3">
        {/* Status header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `${config.color}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: config.color }}>
              {config.label}
            </p>
            <p className="text-[10px] text-white/40">
              {isMe ? `to ${metadata.destination_label}` : `${otherName || 'They'} → ${metadata.destination_label}`}
            </p>
          </div>
        </div>

        {/* Details */}
        {status !== 'cancelled' && status !== 'arrived' && (
          <div className="flex items-center gap-4 ml-10">
            {metadata.eta_minutes && (
              <div>
                <p className="text-white font-bold text-lg">{metadata.eta_minutes} min</p>
                <p className="text-white/30 text-[10px]">ETA</p>
              </div>
            )}
            {arrivalTime && (
              <div>
                <p className="text-white font-medium text-sm">{arrivalTime}</p>
                <p className="text-white/30 text-[10px]">Arriving</p>
              </div>
            )}
            {metadata.mode && (
              <div className="ml-auto">
                <p className="text-white/50 text-xs">{modeLabel}</p>
              </div>
            )}
          </div>
        )}

        {/* Progress bar for en_route */}
        {(status === 'en_route' || status === 'booked') && (
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: `${config.color}15` }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: config.color }}
              initial={{ width: '10%' }}
              animate={{ width: status === 'en_route' ? '60%' : '20%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
