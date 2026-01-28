/**
 * ManeuverIcon Component
 * 
 * Displays directional icons for turn-by-turn navigation.
 * Supports all Google Routes API maneuver types.
 */

import React from 'react';
import { 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpLeft, 
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  RotateCw,
  CircleDot,
  MapPin,
  Navigation,
  Footprints,
  Merge,
  Split,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Map Google Routes API maneuver types to icons and labels
const MANEUVER_CONFIG = {
  // Basic turns
  TURN_LEFT: { icon: CornerUpLeft, label: 'Turn left', color: 'text-cyan-400' },
  TURN_RIGHT: { icon: CornerUpRight, label: 'Turn right', color: 'text-cyan-400' },
  TURN_SLIGHT_LEFT: { icon: ArrowUpLeft, label: 'Slight left', color: 'text-cyan-400' },
  TURN_SLIGHT_RIGHT: { icon: ArrowUpRight, label: 'Slight right', color: 'text-cyan-400' },
  TURN_SHARP_LEFT: { icon: ArrowLeft, label: 'Sharp left', color: 'text-amber-400' },
  TURN_SHARP_RIGHT: { icon: ArrowRight, label: 'Sharp right', color: 'text-amber-400' },
  
  // U-turns
  UTURN_LEFT: { icon: RotateCcw, label: 'U-turn left', color: 'text-amber-400' },
  UTURN_RIGHT: { icon: RotateCw, label: 'U-turn right', color: 'text-amber-400' },
  U_TURN_LEFT: { icon: RotateCcw, label: 'U-turn left', color: 'text-amber-400' },
  U_TURN_RIGHT: { icon: RotateCw, label: 'U-turn right', color: 'text-amber-400' },
  
  // Straight/Continue
  STRAIGHT: { icon: ArrowUp, label: 'Continue straight', color: 'text-white' },
  CONTINUE: { icon: ArrowUp, label: 'Continue', color: 'text-white' },
  HEAD: { icon: Navigation, label: 'Head', color: 'text-white' },
  NAME_CHANGE: { icon: ArrowUp, label: 'Continue', color: 'text-white' },
  
  // Ramps/Highway
  RAMP_LEFT: { icon: ArrowDownLeft, label: 'Take ramp left', color: 'text-purple-400' },
  RAMP_RIGHT: { icon: ArrowDownRight, label: 'Take ramp right', color: 'text-purple-400' },
  ON_RAMP_LEFT: { icon: ArrowDownLeft, label: 'Enter ramp left', color: 'text-purple-400' },
  ON_RAMP_RIGHT: { icon: ArrowDownRight, label: 'Enter ramp right', color: 'text-purple-400' },
  OFF_RAMP_LEFT: { icon: ArrowUpLeft, label: 'Exit left', color: 'text-purple-400' },
  OFF_RAMP_RIGHT: { icon: ArrowUpRight, label: 'Exit right', color: 'text-purple-400' },
  
  // Roundabouts
  ROUNDABOUT_LEFT: { icon: RotateCcw, label: 'Roundabout left', color: 'text-blue-400' },
  ROUNDABOUT_RIGHT: { icon: RotateCw, label: 'Roundabout right', color: 'text-blue-400' },
  ROUNDABOUT_STRAIGHT: { icon: CircleDot, label: 'Roundabout straight', color: 'text-blue-400' },
  
  // Merge/Fork
  MERGE: { icon: Merge, label: 'Merge', color: 'text-white' },
  FORK_LEFT: { icon: Split, label: 'Fork left', color: 'text-cyan-400' },
  FORK_RIGHT: { icon: Split, label: 'Fork right', color: 'text-cyan-400' },
  
  // Start/End
  DEPART: { icon: Footprints, label: 'Start', color: 'text-green-400' },
  ARRIVE: { icon: MapPin, label: 'Arrive', color: 'text-pink-500' },
  DESTINATION: { icon: Flag, label: 'Destination', color: 'text-pink-500' },
  
  // Ferry
  FERRY: { icon: Navigation, label: 'Take ferry', color: 'text-blue-400' },
  FERRY_TRAIN: { icon: Navigation, label: 'Take ferry train', color: 'text-blue-400' },
  
  // Fallback
  UNKNOWN: { icon: ArrowUp, label: 'Continue', color: 'text-white/60' },
};

// Normalize maneuver string to match our config keys
const normalizeManeuver = (maneuver) => {
  if (!maneuver) return 'UNKNOWN';
  const normalized = String(maneuver).toUpperCase().replace(/-/g, '_');
  return MANEUVER_CONFIG[normalized] ? normalized : 'UNKNOWN';
};

export function ManeuverIcon({ 
  maneuver, 
  size = 'md',
  className,
  showBackground = true,
}) {
  const normalizedManeuver = normalizeManeuver(maneuver);
  const config = MANEUVER_CONFIG[normalizedManeuver];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
  };
  
  if (!showBackground) {
    return (
      <Icon 
        className={cn(iconSizes[size], config.color, className)} 
        strokeWidth={2.5}
      />
    );
  }
  
  return (
    <div 
      className={cn(
        sizeClasses[size],
        'flex items-center justify-center rounded-xl',
        'bg-white/10 border border-white/20',
        className
      )}
    >
      <Icon 
        className={cn(iconSizes[size], config.color)} 
        strokeWidth={2.5}
      />
    </div>
  );
}

// Get the label for a maneuver type
export function getManeuverLabel(maneuver) {
  const normalizedManeuver = normalizeManeuver(maneuver);
  return MANEUVER_CONFIG[normalizedManeuver]?.label || 'Continue';
}

// Get the color class for a maneuver type
export function getManeuverColor(maneuver) {
  const normalizedManeuver = normalizeManeuver(maneuver);
  return MANEUVER_CONFIG[normalizedManeuver]?.color || 'text-white';
}

// Check if maneuver is a "turning" type (for voice priority)
export function isTurnManeuver(maneuver) {
  const turns = [
    'TURN_LEFT', 'TURN_RIGHT', 'TURN_SLIGHT_LEFT', 'TURN_SLIGHT_RIGHT',
    'TURN_SHARP_LEFT', 'TURN_SHARP_RIGHT', 'UTURN_LEFT', 'UTURN_RIGHT',
    'U_TURN_LEFT', 'U_TURN_RIGHT', 'ROUNDABOUT_LEFT', 'ROUNDABOUT_RIGHT',
    'FORK_LEFT', 'FORK_RIGHT', 'RAMP_LEFT', 'RAMP_RIGHT'
  ];
  return turns.includes(normalizeManeuver(maneuver));
}

// Check if maneuver is arrival
export function isArrivalManeuver(maneuver) {
  const arrivals = ['ARRIVE', 'DESTINATION'];
  return arrivals.includes(normalizeManeuver(maneuver));
}

export default ManeuverIcon;
