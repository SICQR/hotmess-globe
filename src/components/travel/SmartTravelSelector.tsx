import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Footprints, 
  Car, 
  Bike, 
  Train,
  Navigation,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { springConfig, travelModeTransition } from '@/lib/animations';
import { buildUberDeepLink, buildLyftDeepLink } from '@/utils/uberDeepLink';

type TravelMode = 'walk' | 'bike' | 'drive' | 'transit' | 'uber' | 'lyft';

interface TravelModeData {
  mode: TravelMode;
  durationSeconds: number;
  label: string;
}

interface SmartTravelSelectorProps {
  destination: {
    lat: number;
    lng: number;
    name?: string;
  };
  origin?: {
    lat: number;
    lng: number;
  };
  travelTimes?: {
    walking?: TravelModeData | null;
    bicycling?: TravelModeData | null;
    driving?: TravelModeData | null;
    transit?: TravelModeData | null;
    uber?: TravelModeData | null;
    lyft?: TravelModeData | null;
  };
  onNavigate?: (mode: TravelMode) => void;
  className?: string;
  compact?: boolean;
  /** Show transit option */
  showTransit?: boolean;
  /** Show ride services (Uber/Lyft) */
  showRideServices?: boolean;
}

// Mode configuration
const modeConfig: Record<TravelMode, {
  icon: typeof Footprints;
  label: string;
  color: string;
  bgColor: string;
  external?: boolean;
}> = {
  walk: {
    icon: Footprints,
    label: 'Walk',
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/20',
  },
  bike: {
    icon: Bike,
    label: 'Bike',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  drive: {
    icon: Car,
    label: 'Drive',
    color: 'text-white',
    bgColor: 'bg-white/10',
  },
  transit: {
    icon: Train,
    label: 'Transit',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  uber: {
    icon: Car,
    label: 'Uber',
    color: 'text-black',
    bgColor: 'bg-white',
    external: true,
  },
  lyft: {
    icon: Car,
    label: 'Lyft',
    color: 'text-white',
    bgColor: 'bg-[#FF00BF]',
    external: true,
  },
};

// Smart recommendation logic
const getSmartRecommendation = (
  travelTimes: SmartTravelSelectorProps['travelTimes'],
  timeOfDay?: number,
  showTransit?: boolean,
  showRideServices?: boolean
): { mode: TravelMode; reason: string } | null => {
  if (!travelTimes) return null;

  const hour = timeOfDay ?? new Date().getHours();
  const isLateNight = hour >= 22 || hour < 5;
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

  const walkMins = travelTimes.walking?.durationSeconds
    ? Math.ceil(travelTimes.walking.durationSeconds / 60)
    : null;
  const bikeMins = travelTimes.bicycling?.durationSeconds
    ? Math.ceil(travelTimes.bicycling.durationSeconds / 60)
    : null;
  const driveMins = travelTimes.driving?.durationSeconds
    ? Math.ceil(travelTimes.driving.durationSeconds / 60)
    : null;
  const transitMins = travelTimes.transit?.durationSeconds
    ? Math.ceil(travelTimes.transit.durationSeconds / 60)
    : null;

  // Late night + > 10 min walk = suggest ride service for safety
  if (isLateNight && walkMins && walkMins > 10 && showRideServices !== false) {
    return { mode: 'uber', reason: 'Safe choice for late night' };
  }

  // Very close = walk
  if (walkMins && walkMins <= 5) {
    return { mode: 'walk', reason: 'Just around the corner' };
  }

  // Rush hour + transit available = suggest transit
  if (isRushHour && transitMins && transitMins < (driveMins ?? 999) && showTransit !== false) {
    return { mode: 'transit', reason: 'Avoid rush hour traffic' };
  }

  // Medium distance, good for biking (not late night)
  if (bikeMins && bikeMins <= 15 && (!walkMins || walkMins > 15) && !isLateNight) {
    return { mode: 'bike', reason: 'Quick bike ride' };
  }

  // Transit is fastest and available
  if (transitMins && showTransit !== false && transitMins < (driveMins ?? 999) && transitMins < (walkMins ?? 999)) {
    return { mode: 'transit', reason: 'Fastest option' };
  }

  // Default to fastest option
  const modes: { mode: TravelMode; mins: number }[] = [];
  if (walkMins) modes.push({ mode: 'walk', mins: walkMins });
  if (bikeMins && !isLateNight) modes.push({ mode: 'bike', mins: bikeMins });
  if (driveMins) modes.push({ mode: 'drive', mins: driveMins });
  if (transitMins && showTransit !== false) modes.push({ mode: 'transit', mins: transitMins });

  if (modes.length === 0) return null;

  const fastest = modes.sort((a, b) => a.mins - b.mins)[0];
  return { mode: fastest.mode, reason: 'Fastest option' };
};

// Format duration
const formatDuration = (seconds: number | undefined): string => {
  if (!seconds) return '—';
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

/**
 * SmartTravelSelector - Intelligent travel mode selector
 * Auto-recommends based on time of day, distance, and context
 */
export function SmartTravelSelector({
  destination,
  origin,
  travelTimes,
  onNavigate,
  className,
  compact = false,
  showTransit = true,
  showRideServices = true,
}: SmartTravelSelectorProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  // Get smart recommendation
  const recommendation = useMemo(
    () => getSmartRecommendation(travelTimes, undefined, showTransit, showRideServices),
    [travelTimes, showTransit, showRideServices]
  );

  // Build available modes
  const availableModes = useMemo(() => {
    const modes: { mode: TravelMode; duration: number | null }[] = [];
    
    if (travelTimes?.walking) {
      modes.push({ mode: 'walk', duration: travelTimes.walking.durationSeconds });
    }
    if (travelTimes?.bicycling) {
      modes.push({ mode: 'bike', duration: travelTimes.bicycling.durationSeconds });
    }
    if (travelTimes?.driving) {
      modes.push({ mode: 'drive', duration: travelTimes.driving.durationSeconds });
    }
    // Transit
    if (travelTimes?.transit && showTransit) {
      modes.push({ mode: 'transit', duration: travelTimes.transit.durationSeconds });
    }
    // Uber is always available if we have driving time
    if (showRideServices && (travelTimes?.driving || travelTimes?.uber)) {
      modes.push({ 
        mode: 'uber', 
        duration: travelTimes?.uber?.durationSeconds ?? travelTimes?.driving?.durationSeconds ?? null 
      });
    }
    // Lyft - similar to Uber
    if (showRideServices && (travelTimes?.driving || travelTimes?.lyft)) {
      modes.push({ 
        mode: 'lyft', 
        duration: travelTimes?.lyft?.durationSeconds ?? travelTimes?.driving?.durationSeconds ?? null 
      });
    }

    return modes;
  }, [travelTimes, showTransit, showRideServices]);

  // Handle mode selection
  const handleModeClick = useCallback(
    (mode: TravelMode) => {
      if (mode === 'uber' && destination) {
        // Open Uber deep link
        const uberUrl = buildUberDeepLink({
          dropoffLat: destination.lat,
          dropoffLng: destination.lng,
          dropoffNickname: destination.name,
        });
        if (uberUrl) window.open(uberUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      
      if (mode === 'lyft' && destination) {
        // Open Lyft deep link
        const lyftUrl = buildLyftDeepLink({
          dropoffLat: destination.lat,
          dropoffLng: destination.lng,
          dropoffNickname: destination.name,
        });
        if (lyftUrl) window.open(lyftUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      
      onNavigate?.(mode);
    },
    [destination, onNavigate]
  );

  if (!travelTimes || availableModes.length === 0) {
    return (
      <div className={cn('p-4 rounded-xl bg-white/5 border border-white/10', className)}>
        <div className="flex items-center gap-2 text-white/50">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Enable location for travel times</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-white/5 border border-white/10 overflow-hidden', className)}>
      {/* Recommended option */}
      {recommendation && (
        <motion.div
          className="p-4 bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border-b border-white/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#E62020] uppercase tracking-wide">
              Recommended
            </span>
            <span className="text-xs text-white/50">{recommendation.reason}</span>
          </div>
          
          <Button
            variant={
              recommendation.mode === 'uber' ? 'premium' : 
              recommendation.mode === 'lyft' ? 'hotGradient' :
              recommendation.mode === 'transit' ? 'cyanGradient' :
              'hotGradient'
            }
            className="w-full justify-between travel-mode-btn--recommended min-h-[48px]"
            onClick={() => handleModeClick(recommendation.mode)}
          >
            <span className="flex items-center gap-2">
              {React.createElement(modeConfig[recommendation.mode].icon, { className: 'w-5 h-5' })}
              <span className="font-bold">{modeConfig[recommendation.mode].label}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono">
                {formatDuration(
                  recommendation.mode === 'walk' ? travelTimes?.walking?.durationSeconds :
                  recommendation.mode === 'bike' ? travelTimes?.bicycling?.durationSeconds :
                  recommendation.mode === 'transit' ? travelTimes?.transit?.durationSeconds :
                  recommendation.mode === 'uber' ? (travelTimes?.uber?.durationSeconds ?? travelTimes?.driving?.durationSeconds) :
                  recommendation.mode === 'lyft' ? (travelTimes?.lyft?.durationSeconds ?? travelTimes?.driving?.durationSeconds) :
                  travelTimes?.driving?.durationSeconds
                )}
              </span>
              {modeConfig[recommendation.mode].external && <ExternalLink className="w-4 h-4" />}
            </span>
          </Button>
        </motion.div>
      )}

      {/* Expand/collapse toggle for compact mode */}
      {compact && (
        <button
          className="w-full p-2 flex items-center justify-center gap-1 text-white/50 hover:text-white/70 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs">Other options</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      {/* All options */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            variants={travelModeTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-4 pt-2"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {availableModes.map(({ mode, duration }) => {
                const config = modeConfig[mode];
                const isRecommended = recommendation?.mode === mode;
                const isExternal = config.external;
                
                return (
                  <motion.button
                    key={mode}
                    className={cn(
                      'travel-mode-btn p-3 rounded-xl flex flex-col items-center gap-1 min-h-[80px]',
                      'border transition-all touch-manipulation',
                      isRecommended
                        ? 'bg-white/10 border-white/20 ring-1 ring-[#E62020]/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/15',
                      mode === 'uber' && 'bg-white text-black border-white',
                      mode === 'lyft' && 'bg-[#FF00BF] text-white border-[#FF00BF]'
                    )}
                    onClick={() => handleModeClick(mode)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springConfig.snappy}
                    aria-label={`${config.label} - ${formatDuration(duration ?? undefined)}`}
                  >
                    {React.createElement(config.icon, { 
                      className: cn('w-5 h-5', mode === 'uber' ? 'text-black' : mode === 'lyft' ? 'text-white' : config.color)
                    })}
                    <span className={cn('text-xs font-medium', mode === 'uber' ? 'text-black' : mode === 'lyft' ? 'text-white' : 'text-white')}>
                      {config.label}
                    </span>
                    <span className={cn('text-sm font-mono font-bold', mode === 'uber' ? 'text-black' : mode === 'lyft' ? 'text-white' : 'text-white')}>
                      {formatDuration(duration ?? undefined)}
                    </span>
                    {isExternal && (
                      <span className={cn('text-[10px]', mode === 'uber' ? 'text-black/60' : 'text-white/70')}>
                        Opens app
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            {/* Navigate button */}
            {onNavigate && (
              <Button
                variant="glass"
                className="w-full mt-3"
                onClick={() => onNavigate(recommendation?.mode ?? 'walk')}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Open Directions
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="px-4 pb-3 text-[10px] text-white/40 text-center">
        Estimates only • Always confirm before traveling
      </div>
    </div>
  );
}

export default SmartTravelSelector;
