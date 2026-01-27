/**
 * ArrivalCard Component
 * 
 * Displayed when the user has arrived at their destination.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle2, PartyPopper, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ArrivalCard({
  destinationLabel,
  totalDistance,
  totalDuration,
  onClose,
  onViewProfile,
  className,
}) {
  const formatDistance = (meters) => {
    if (!Number.isFinite(meters)) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds)) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={cn(
        'bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20',
        'border-2 border-pink-500/50 rounded-2xl overflow-hidden',
        'shadow-2xl shadow-pink-500/20',
        className
      )}
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <div className="relative p-6 text-center">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-white mb-2"
        >
          You've Arrived!
        </motion.h2>

        {/* Destination */}
        {destinationLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 text-white/70 mb-4"
          >
            <MapPin className="w-4 h-4 text-pink-400" />
            <span>{destinationLabel}</span>
          </motion.div>
        )}

        {/* Trip stats */}
        {(totalDistance || totalDuration) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4 text-sm text-white/50 mb-6"
          >
            {totalDistance && (
              <span>🚶 {formatDistance(totalDistance)}</span>
            )}
            {totalDuration && (
              <span>⏱️ {formatDuration(totalDuration)}</span>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-2"
        >
          {onViewProfile && (
            <Button
              onClick={onViewProfile}
              variant="hot"
              className="flex-1 font-bold"
            >
              <Star className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Done
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ArrivalCard;
