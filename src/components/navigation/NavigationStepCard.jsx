/**
 * NavigationStepCard Component
 * 
 * Displays a single navigation step with maneuver icon,
 * instruction text, and distance/duration info.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ManeuverIcon, getManeuverLabel } from './ManeuverIcon';
import { Clock, Ruler } from 'lucide-react';

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
};

export function NavigationStepCard({
  step,
  stepNumber,
  isCurrentStep = false,
  isCompleted = false,
  isUpcoming = false,
  showDetails = true,
  compact = false,
  onClick,
  className,
}) {
  if (!step) return null;

  const {
    instruction,
    maneuver,
    distance_meters,
    duration_seconds,
    street_name,
  } = step;

  const distance = formatDistance(distance_meters);
  const duration = formatDuration(duration_seconds);
  
  // Build instruction text
  const displayInstruction = instruction || getManeuverLabel(maneuver);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative transition-all duration-200',
        'border rounded-lg overflow-hidden',
        isCurrentStep && 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20',
        isCompleted && 'border-white/10 bg-white/5 opacity-50',
        isUpcoming && 'border-white/10 bg-white/5',
        !isCurrentStep && !isCompleted && !isUpcoming && 'border-white/10 bg-white/5',
        onClick && 'cursor-pointer hover:border-white/30',
        compact ? 'p-2' : 'p-3',
        className
      )}
    >
      {/* Current step indicator */}
      {isCurrentStep && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
      )}
      
      <div className="flex items-start gap-3">
        {/* Step number and icon */}
        <div className="flex flex-col items-center gap-1">
          {stepNumber !== undefined && (
            <span className={cn(
              'text-xs font-bold',
              isCurrentStep ? 'text-cyan-400' : 'text-white/40'
            )}>
              {stepNumber}
            </span>
          )}
          <ManeuverIcon 
            maneuver={maneuver} 
            size={compact ? 'sm' : 'md'}
            className={isCompleted ? 'opacity-50' : ''}
          />
        </div>
        
        {/* Instruction content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium leading-snug',
            compact ? 'text-sm' : 'text-base',
            isCurrentStep ? 'text-white' : isCompleted ? 'text-white/50' : 'text-white/90'
          )}>
            {displayInstruction}
          </p>
          
          {street_name && (
            <p className={cn(
              'text-white/50 mt-0.5',
              compact ? 'text-xs' : 'text-sm'
            )}>
              onto {street_name}
            </p>
          )}
          
          {/* Distance and duration */}
          {showDetails && (distance || duration) && (
            <div className={cn(
              'flex items-center gap-3 mt-2',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {distance && (
                <span className="flex items-center gap-1 text-white/60">
                  <Ruler className="w-3 h-3" />
                  {distance}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1 text-white/60">
                  <Clock className="w-3 h-3" />
                  {duration}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Completed checkmark */}
        {isCompleted && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini version for "next step" preview
export function NavigationStepMini({ step, className }) {
  if (!step) return null;
  
  const displayInstruction = step.instruction || getManeuverLabel(step.maneuver);
  const distance = formatDistance(step.distance_meters);
  
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <ManeuverIcon maneuver={step.maneuver} size="sm" showBackground={false} />
      <span className="text-white/70 truncate">{displayInstruction}</span>
      {distance && (
        <span className="text-white/40 flex-shrink-0">{distance}</span>
      )}
    </div>
  );
}

export default NavigationStepCard;
