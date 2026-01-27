/**
 * RouteProgress Component
 * 
 * Visual progress bar showing how far along the route the user is.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function RouteProgress({
  totalDistance,
  remainingDistance,
  currentStepIndex,
  totalSteps,
  className,
}) {
  // Calculate progress percentage
  const progressPercent = totalDistance && remainingDistance !== null
    ? Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100))
    : currentStepIndex !== null && totalSteps
      ? Math.max(0, Math.min(100, (currentStepIndex / totalSteps) * 100))
      : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Start</span>
        {currentStepIndex !== null && totalSteps && (
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
        )}
        <span>Arrive</span>
      </div>
    </div>
  );
}

export default RouteProgress;
