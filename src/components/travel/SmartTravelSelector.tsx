import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Bike, 
  FootprintsIcon as Walking,
  Navigation,
  Clock,
  Star,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { springConfig } from '@/lib/animations';

// Uber-style ride icon
const UberIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm1-8H8V7h8v2z"/>
  </svg>
);

export type TravelMode = 'walk' | 'bike' | 'drive' | 'uber' | 'transit';

interface TravelOption {
  mode: TravelMode;
  durationMinutes: number;
  distanceKm: number;
  price?: { min: number; max: number; currency: string };
  label: string;
}

interface SmartRecommendation {
  mode: TravelMode;
  reason: string;
  priority: 'safety' | 'speed' | 'cost' | 'eco';
}

interface SmartTravelSelectorProps {
  options: TravelOption[];
  destination: {
    name?: string;
    address?: string;
    lat: number;
    lng: number;
  };
  onSelect?: (mode: TravelMode) => void;
  onLaunchDirections?: (mode: TravelMode) => void;
  onRequestRide?: () => void;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: { isGood: boolean; condition?: string };
  userPreferences?: {
    preferredMode?: TravelMode;
    avoidWalking?: boolean;
    maxWalkMinutes?: number;
  };
  className?: string;
}

/**
 * Get smart recommendation based on context
 */
function getSmartRecommendation(
  options: TravelOption[],
  context: {
    timeOfDay?: string;
    weather?: { isGood: boolean };
    userPrefs?: { preferredMode?: TravelMode; avoidWalking?: boolean; maxWalkMinutes?: number };
  }
): SmartRecommendation | null {
  const { timeOfDay, weather, userPrefs } = context;
  
  const walkOption = options.find(o => o.mode === 'walk');
  const bikeOption = options.find(o => o.mode === 'bike');
  const uberOption = options.find(o => o.mode === 'uber');
  const driveOption = options.find(o => o.mode === 'drive');

  // Late night (10pm-4am) + > 1km = Uber for safety
  if (timeOfDay === 'night' && walkOption && walkOption.distanceKm > 1) {
    return {
      mode: 'uber',
      reason: 'Safe choice for late night',
      priority: 'safety',
    };
  }

  // Very close (< 500m) = Walk
  if (walkOption && walkOption.distanceKm < 0.5 && !userPrefs?.avoidWalking) {
    return {
      mode: 'walk',
      reason: 'Just around the corner',
      priority: 'speed',
    };
  }

  // Good weather + reasonable distance = Bike
  if (weather?.isGood && bikeOption && bikeOption.distanceKm < 3) {
    return {
      mode: 'bike',
      reason: 'Perfect biking weather',
      priority: 'eco',
    };
  }

  // User preference if specified
  if (userPrefs?.preferredMode) {
    const preferred = options.find(o => o.mode === userPrefs.preferredMode);
    if (preferred) {
      return {
        mode: userPrefs.preferredMode,
        reason: 'Your preferred travel mode',
        priority: 'speed',
      };
    }
  }

  // Default to fastest option
  const fastest = [...options].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  if (fastest) {
    return {
      mode: fastest.mode,
      reason: 'Fastest option',
      priority: 'speed',
    };
  }

  return null;
}

const modeConfig: Record<TravelMode, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  walk: {
    icon: Walking,
    label: 'Walk',
    color: 'text-[#39FF14]',
    bgColor: 'bg-[#39FF14]',
  },
  bike: {
    icon: Bike,
    label: 'Bike',
    color: 'text-[#00D9FF]',
    bgColor: 'bg-[#00D9FF]',
  },
  drive: {
    icon: Car,
    label: 'Drive',
    color: 'text-[#FF1493]',
    bgColor: 'bg-[#FF1493]',
  },
  uber: {
    icon: Car,
    label: 'Uber',
    color: 'text-white',
    bgColor: 'bg-black',
  },
  transit: {
    icon: Navigation,
    label: 'Transit',
    color: 'text-[#B026FF]',
    bgColor: 'bg-[#B026FF]',
  },
};

/**
 * SmartTravelSelector - Intelligent travel mode selection
 */
export function SmartTravelSelector({
  options,
  destination,
  onSelect,
  onLaunchDirections,
  onRequestRide,
  timeOfDay,
  weather,
  userPreferences,
  className,
}: SmartTravelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TravelMode | null>(null);

  // Get smart recommendation
  const recommendation = useMemo(() => 
    getSmartRecommendation(options, {
      timeOfDay,
      weather,
      userPrefs: userPreferences,
    }),
    [options, timeOfDay, weather, userPreferences]
  );

  const recommendedOption = recommendation 
    ? options.find(o => o.mode === recommendation.mode)
    : null;

  const otherOptions = options.filter(o => o.mode !== recommendation?.mode);

  const handleSelect = (mode: TravelMode) => {
    setSelectedMode(mode);
    onSelect?.(mode);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPrice = (price?: { min: number; max: number; currency: string }) => {
    if (!price) return null;
    const symbol = price.currency === 'GBP' ? '£' : price.currency === 'EUR' ? '€' : '$';
    return `${symbol}${price.min}-${price.max}`;
  };

  const TimeIcon = timeOfDay === 'night' ? Moon : Sun;

  return (
    <div className={cn('smart-travel-selector', className)}>
      {/* Time of Day Indicator */}
      {timeOfDay && (
        <div className="flex items-center gap-2 mb-3 text-white/60 text-xs">
          <TimeIcon className="w-3 h-3" />
          <span className="uppercase tracking-wider">
            {timeOfDay === 'night' ? 'Late Night Travel' : `${timeOfDay} Travel`}
          </span>
        </div>
      )}

      {/* Recommended Option */}
      {recommendedOption && recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            <span className="text-[10px] text-[#FFD700] font-bold uppercase tracking-wider">
              Recommended
            </span>
            {recommendation.priority === 'safety' && (
              <Shield className="w-3 h-3 text-[#39FF14] ml-1" />
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelect(recommendedOption.mode)}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all',
              selectedMode === recommendedOption.mode
                ? 'border-[#FF1493] bg-[#FF1493]/10'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  modeConfig[recommendedOption.mode].bgColor,
                  recommendedOption.mode === 'uber' ? 'text-white' : 'text-black'
                )}>
                  {React.createElement(modeConfig[recommendedOption.mode].icon, {
                    className: 'w-6 h-6'
                  })}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-lg">
                      {modeConfig[recommendedOption.mode].label}
                    </span>
                    <span className="text-white/60">•</span>
                    <span className="font-bold text-white">
                      {formatDuration(recommendedOption.durationMinutes)}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{recommendation.reason}</p>
                </div>
              </div>

              <div className="text-right">
                {recommendedOption.price && (
                  <div className="text-lg font-black text-white mb-1">
                    {formatPrice(recommendedOption.price)}
                  </div>
                )}
                {recommendedOption.mode === 'uber' ? (
                  <Button
                    size="sm"
                    variant="hotGradient"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRide?.();
                    }}
                    className="text-xs"
                  >
                    Request
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchDirections?.(recommendedOption.mode);
                    }}
                    className="text-xs border-white/30 text-white"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Go
                  </Button>
                )}
              </div>
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Other Options */}
      {otherOptions.length > 0 && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full py-2 text-white/60 text-sm hover:text-white transition-colors"
          >
            <span className="uppercase tracking-wider text-xs font-bold">
              {isExpanded ? 'Hide options' : 'Other options'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={springConfig.gentle}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {otherOptions.map((option) => {
                    const config = modeConfig[option.mode];
                    const isSelected = selectedMode === option.mode;

                    return (
                      <motion.button
                        key={option.mode}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect(option.mode)}
                        className={cn(
                          'p-3 rounded-lg border transition-all text-center',
                          isSelected
                            ? 'border-[#FF1493] bg-[#FF1493]/10'
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center',
                          config.bgColor,
                          option.mode === 'uber' ? 'text-white' : 'text-black'
                        )}>
                          {React.createElement(config.icon, { className: 'w-5 h-5' })}
                        </div>
                        <div className="text-white font-bold text-sm">
                          {formatDuration(option.durationMinutes)}
                        </div>
                        <div className="text-white/50 text-xs">
                          {config.label}
                        </div>
                        {option.price && (
                          <div className="text-[#FFD700] text-xs mt-1 font-bold">
                            {formatPrice(option.price)}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Destination Info */}
      {destination.name && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 text-[#00D9FF] mt-0.5" />
            <div>
              <p className="text-white font-bold">{destination.name}</p>
              {destination.address && (
                <p className="text-white/50 text-sm">{destination.address}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TravelModeQuickSelect - Compact horizontal selector
 */
interface TravelModeQuickSelectProps {
  options: TravelOption[];
  selectedMode?: TravelMode;
  onSelect?: (mode: TravelMode) => void;
  className?: string;
}

export function TravelModeQuickSelect({
  options,
  selectedMode,
  onSelect,
  className,
}: TravelModeQuickSelectProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const config = modeConfig[option.mode];
        const isSelected = selectedMode === option.mode;

        return (
          <button
            key={option.mode}
            onClick={() => onSelect?.(option.mode)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              isSelected
                ? 'border-[#FF1493] bg-[#FF1493]/10 text-white'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
            )}
          >
            {React.createElement(config.icon, { className: 'w-4 h-4' })}
            <span className="text-sm font-bold">
              {option.durationMinutes} min
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SmartTravelSelector;
