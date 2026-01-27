/**
 * FullScreenNavigation Component
 * 
 * Full-screen navigation mode with map taking up most of the viewport,
 * current instruction overlay, and swipe-up step list.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  X, 
  ChevronUp, 
  ChevronDown,
  Volume2,
  VolumeX,
  Navigation,
  Compass,
  Locate,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationHeader } from './NavigationHeader';
import { NavigationStepCard } from './NavigationStepCard';
import { RouteProgress } from './RouteProgress';
import { ArrivalCard } from './ArrivalCard';

// Calculate distance between two points
const haversineMeters = (a, b) => {
  if (!a || !b) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
};

// Find which step the user is currently on based on their position
const findCurrentStep = (userPosition, steps, polylinePoints) => {
  if (!userPosition || !steps?.length) return { stepIndex: 0, distanceToTurn: null };

  // Find the nearest step start location
  let bestStepIndex = 0;
  let bestDistance = Infinity;
  let distanceToNextTurn = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStart = step.start_location;
    
    if (stepStart) {
      const dist = haversineMeters(userPosition, stepStart);
      if (dist !== null && dist < bestDistance) {
        bestDistance = dist;
        bestStepIndex = i;
      }
    }
  }

  // Calculate distance to the end of current step (next turn)
  const currentStep = steps[bestStepIndex];
  if (currentStep?.end_location) {
    distanceToNextTurn = haversineMeters(userPosition, currentStep.end_location);
  }

  return { stepIndex: bestStepIndex, distanceToTurn: distanceToNextTurn };
};

// Check if user has arrived (within threshold of destination)
const checkArrival = (userPosition, destination, threshold = 30) => {
  if (!userPosition || !destination) return false;
  const dist = haversineMeters(userPosition, destination);
  return dist !== null && dist <= threshold;
};

// Check if user is off route
const checkOffRoute = (userPosition, polylinePoints, threshold = 50) => {
  if (!userPosition || !polylinePoints?.length) return false;
  
  // Find minimum distance to any polyline point
  let minDist = Infinity;
  for (const point of polylinePoints) {
    const dist = haversineMeters(userPosition, { lat: point[0], lng: point[1] });
    if (dist !== null && dist < minDist) {
      minDist = dist;
    }
  }
  
  return minDist > threshold;
};

export function FullScreenNavigation({
  steps = [],
  currentStepIndex = 0,
  distanceToTurn,
  totalRemainingDistance,
  totalRemainingDuration,
  destinationLabel,
  userPosition,
  destination,
  polylinePoints = [],
  isNavigating = false,
  isArrived = false,
  isOffRoute = false,
  voiceEnabled = false,
  onVoiceToggle,
  onRecenter,
  onExit,
  onStepClick,
  children, // Map component
  className,
}) {
  const [isStepListExpanded, setIsStepListExpanded] = useState(false);
  const stepListRef = useRef(null);
  
  const currentStep = steps[currentStepIndex] || null;
  const nextStep = steps[currentStepIndex + 1] || null;
  
  // Scroll to current step in list when it changes
  useEffect(() => {
    if (stepListRef.current && isStepListExpanded) {
      const stepElement = stepListRef.current.querySelector(`[data-step-index="${currentStepIndex}"]`);
      if (stepElement) {
        stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepIndex, isStepListExpanded]);

  return (
    <div className={cn('fixed inset-0 z-50 bg-black flex flex-col', className)}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Voice toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceToggle}
              className={cn(
                'bg-black/50 hover:bg-black/70',
                voiceEnabled ? 'text-cyan-400' : 'text-white/50'
              )}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            {/* Recenter button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRecenter}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <Locate className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative">
        {children}
        
        {/* Off-route warning overlay */}
        <AnimatePresence>
          {isOffRoute && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-4 right-4 z-10"
            >
              <div className="bg-amber-500/90 text-black p-3 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold">You're off route</p>
                  <p className="text-sm opacity-80">Recalculating...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation panel */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-20"
        animate={{ height: isStepListExpanded ? '70vh' : 'auto' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Pull handle */}
        <button
          onClick={() => setIsStepListExpanded(!isStepListExpanded)}
          className="w-full py-2 flex justify-center bg-gradient-to-t from-black to-black/90"
        >
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </button>
        
        <div className="bg-black/95 backdrop-blur-lg border-t border-white/10">
          {/* Arrival card */}
          <AnimatePresence>
            {isArrived && (
              <div className="p-4">
                <ArrivalCard
                  destinationLabel={destinationLabel}
                  totalDistance={totalRemainingDistance}
                  totalDuration={totalRemainingDuration}
                  onClose={onExit}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Navigation header */}
          {!isArrived && (
            <div className="p-4">
              <NavigationHeader
                currentStep={currentStep}
                nextStep={nextStep}
                distanceToTurn={distanceToTurn}
                totalRemainingDistance={totalRemainingDistance}
                totalRemainingDuration={totalRemainingDuration}
                destinationLabel={destinationLabel}
                isNavigating={isNavigating}
              />
            </div>
          )}

          {/* Progress bar */}
          {!isArrived && steps.length > 0 && (
            <div className="px-4 pb-2">
              <RouteProgress
                currentStepIndex={currentStepIndex}
                totalSteps={steps.length}
              />
            </div>
          )}

          {/* Expandable step list */}
          <AnimatePresence>
            {isStepListExpanded && !isArrived && (
              <motion.div
                ref={stepListRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-y-auto max-h-[50vh] px-4 pb-4 space-y-2"
              >
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm font-bold text-white/70 uppercase tracking-wider">
                    All Steps
                  </span>
                  <button
                    onClick={() => setIsStepListExpanded(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                
                {steps.map((step, index) => (
                  <div
                    key={index}
                    data-step-index={index}
                  >
                    <NavigationStepCard
                      step={step}
                      stepNumber={index + 1}
                      isCurrentStep={index === currentStepIndex}
                      isCompleted={index < currentStepIndex}
                      isUpcoming={index > currentStepIndex}
                      compact
                      onClick={() => onStepClick?.(index)}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand button when collapsed */}
          {!isStepListExpanded && !isArrived && steps.length > 1 && (
            <button
              onClick={() => setIsStepListExpanded(true)}
              className="w-full py-3 flex items-center justify-center gap-2 text-white/50 hover:text-white border-t border-white/10"
            >
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm">View all {steps.length} steps</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Export helper functions for use in parent components
export { findCurrentStep, checkArrival, checkOffRoute, haversineMeters };

export default FullScreenNavigation;
