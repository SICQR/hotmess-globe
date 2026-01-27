/**
 * NavigationHeader Component
 * 
 * Displays the current navigation instruction prominently,
 * with distance countdown and next step preview.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ManeuverIcon, getManeuverLabel, isArrivalManeuver } from './ManeuverIcon';
import { NavigationStepMini } from './NavigationStepCard';
import { MapPin, Navigation, Clock, Ruler } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatDistanceToTurn = (meters) => {
  if (!Number.isFinite(meters)) return null;
  if (meters < 50) return 'Now';
  if (meters < 100) return `${Math.round(meters / 10) * 10}m`;
  if (meters < 1000) return `${Math.round(meters / 50) * 50}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatETA = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '<1 min';
  if (mins === 1) return '1 min';
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (remainMins === 0) return `${hrs}h`;
  return `${hrs}h ${remainMins}m`;
};

export function NavigationHeader({
  currentStep,
  nextStep,
  distanceToTurn,
  totalRemainingDistance,
  totalRemainingDuration,
  destinationLabel,
  isNavigating = false,
  isArrived = false,
  className,
}) {
  // Arrival state
  if (isArrived) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'bg-gradient-to-r from-pink-500/20 to-purple-500/20',
          'border border-pink-500/30 rounded-xl p-4',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-pink-500/20 border-2 border-pink-500 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-pink-500" />
          </div>
          <div>
            <p className="text-xl font-black text-white">You have arrived!</p>
            {destinationLabel && (
              <p className="text-white/60 mt-1">{destinationLabel}</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // No current step
  if (!currentStep) {
    return (
      <div className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-4',
        className
      )}>
        <div className="flex items-center gap-3 text-white/50">
          <Navigation className="w-6 h-6" />
          <span>Calculating route...</span>
        </div>
      </div>
    );
  }

  const instruction = currentStep.instruction || getManeuverLabel(currentStep.maneuver);
  const distanceDisplay = formatDistanceToTurn(distanceToTurn ?? currentStep.distance_meters);
  const isAboutToTurn = distanceToTurn !== null && distanceToTurn < 50;
  const isArrival = isArrivalManeuver(currentStep.maneuver);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main instruction card */}
      <motion.div
        layout
        className={cn(
          'rounded-xl overflow-hidden',
          isAboutToTurn 
            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50' 
            : isArrival
              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-2 border-pink-500/50'
              : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30'
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Maneuver icon */}
            <ManeuverIcon 
              maneuver={currentStep.maneuver} 
              size="lg"
              className={cn(
                isAboutToTurn && 'animate-pulse',
                isArrival && 'border-pink-500/50'
              )}
            />
            
            {/* Instruction text */}
            <div className="flex-1 min-w-0">
              {/* Distance to turn */}
              {distanceDisplay && (
                <AnimatePresence mode="wait">
                  <motion.p
                    key={distanceDisplay}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn(
                      'text-3xl font-black tracking-tight',
                      isAboutToTurn ? 'text-amber-400' : isArrival ? 'text-pink-400' : 'text-cyan-400'
                    )}
                  >
                    {distanceDisplay}
                  </motion.p>
                </AnimatePresence>
              )}
              
              {/* Main instruction */}
              <p className="text-lg font-bold text-white mt-1 leading-tight">
                {instruction}
              </p>
              
              {/* Street name if available */}
              {currentStep.street_name && (
                <p className="text-white/60 text-sm mt-1">
                  onto {currentStep.street_name}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Next step preview */}
        {nextStep && !isArrival && (
          <div className="px-4 py-2 bg-black/30 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 uppercase tracking-wider">Then</span>
              <NavigationStepMini step={nextStep} className="flex-1" />
            </div>
          </div>
        )}
      </motion.div>
      
      {/* Route summary bar */}
      {isNavigating && (totalRemainingDistance || totalRemainingDuration) && (
        <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-4 text-sm">
            {totalRemainingDistance && (
              <span className="flex items-center gap-1.5 text-white/70">
                <Ruler className="w-4 h-4 text-cyan-400" />
                {totalRemainingDistance < 1000 
                  ? `${Math.round(totalRemainingDistance)}m` 
                  : `${(totalRemainingDistance / 1000).toFixed(1)}km`}
              </span>
            )}
            {totalRemainingDuration && (
              <span className="flex items-center gap-1.5 text-white/70">
                <Clock className="w-4 h-4 text-cyan-400" />
                {formatETA(totalRemainingDuration)}
              </span>
            )}
          </div>
          {destinationLabel && (
            <span className="text-sm text-white/50 truncate max-w-[150px]">
              → {destinationLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default NavigationHeader;
