import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TravelModeKey, TRAVEL_MODE_CONFIG } from '@/utils/travelRecommendations';
import type { TravelTimeResponse } from '../types';

type Props = {
  viewerLocation: { lat: number; lng: number } | null;
  travelTime: TravelTimeResponse | null;
  isTravelTimeLoading: boolean;
  primaryLabel: string | null;
  primaryMode: TravelModeKey | null;
  orderedModes: TravelModeKey[];
  onOpenMode: (mode: TravelModeKey) => void;
  /** Show ride service options (Uber/Lyft) */
  showRideServices?: boolean;
  /** Show transit option */
  showTransit?: boolean;
};

const modeLabel = (mode: TravelModeKey) => {
  const labels: Record<TravelModeKey, string> = {
    foot: 'Walk',
    cab: 'Cab',
    bike: 'Bike',
    uber: 'Uber',
    lyft: 'Lyft',
    transit: 'Transit',
  };
  return labels[mode] || mode;
};

const modeIcon = (mode: TravelModeKey) => {
  const icons: Record<TravelModeKey, string> = {
    foot: '🚶',
    cab: '🚕',
    bike: '🚴',
    uber: '📱',
    lyft: '🚗',
    transit: '🚇',
  };
  return icons[mode] || '🚗';
};

const toMinsLabel = (seconds: number | null | undefined) => {
  if (!Number.isFinite(seconds)) return '—';
  return `${Math.max(1, Math.round(Number(seconds) / 60))}m`;
};

/**
 * Loading skeleton for travel time buttons
 */
function TravelTimeSkeleton() {
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-11 sm:h-12 w-full rounded-md bg-white/10" />
      ))}
    </div>
  );
}

/**
 * Displays travel time options with mode buttons
 * Mobile-optimized with larger touch targets (44px minimum)
 */
export function TravelTimePanel({
  viewerLocation,
  travelTime,
  isTravelTimeLoading,
  primaryLabel,
  primaryMode,
  orderedModes,
  onOpenMode,
  showRideServices = true,
  showTransit = true,
}: Props) {
  const hasTravelTimes = !!travelTime;

  const modeMins = (mode: TravelModeKey) => {
    const modeMap: Record<TravelModeKey, number | null | undefined> = {
      foot: travelTime?.walking?.durationSeconds,
      cab: travelTime?.driving?.durationSeconds,
      bike: travelTime?.bicycling?.durationSeconds,
      transit: travelTime?.transit?.durationSeconds,
      uber: travelTime?.uber?.durationSeconds ?? travelTime?.driving?.durationSeconds,
      lyft: travelTime?.lyft?.durationSeconds ?? travelTime?.driving?.durationSeconds,
    };
    return toMinsLabel(modeMap[mode]);
  };

  // Filter modes based on availability and settings
  const visibleModes = orderedModes.filter(mode => {
    if (mode === 'transit' && !showTransit) return false;
    if ((mode === 'uber' || mode === 'lyft') && !showRideServices) return false;
    return true;
  });

  // Determine if a mode is disabled
  const isModeDisabled = (mode: TravelModeKey) => {
    if (mode === 'uber') return !travelTime?.uber && !travelTime?.driving;
    if (mode === 'lyft') return !travelTime?.lyft && !travelTime?.driving;
    if (mode === 'transit') return !travelTime?.transit;
    return false;
  };

  // Get button variant based on mode type
  const getModeVariant = (mode: TravelModeKey, isPrimary: boolean) => {
    if (isPrimary) return 'cyan';
    if (mode === 'uber') return 'glass';
    if (mode === 'lyft') return 'glass';
    return 'glass';
  };

  return (
    <div className="mt-3">
      <div className="text-[11px] sm:text-xs text-white/70">
        {viewerLocation ? (
          isTravelTimeLoading ? (
            'Loading travel time…'
          ) : primaryLabel ? (
            primaryLabel
          ) : (
            'Travel time unavailable'
          )
        ) : (
          'Enable location for ETAs'
        )}
      </div>

      {/* Loading skeleton */}
      {isTravelTimeLoading && viewerLocation && <TravelTimeSkeleton />}

      {/* Travel time buttons - responsive grid with larger touch targets */}
      {hasTravelTimes && !isTravelTimeLoading && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {visibleModes.slice(0, 6).map((mode) => {
            const isPrimary = mode === primaryMode;
            const isDisabled = isModeDisabled(mode);
            const mins = modeMins(mode);

            return (
              <Button
                key={mode}
                type="button"
                variant={getModeVariant(mode, isPrimary)}
                disabled={isDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenMode(mode);
                }}
                className={`
                  min-h-[44px] h-11 sm:h-12 px-3 text-sm
                  justify-between
                  ${isPrimary ? 'ring-1 ring-cyan-400/50' : 'border-white/15'}
                  ${mode === 'lyft' ? 'hover:bg-[#FF00BF]/20' : ''}
                `}
                aria-label={`${modeLabel(mode)} - ${mins === '—' ? 'unavailable' : mins}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{modeIcon(mode)}</span>
                  <span className="font-medium">{modeLabel(mode)}</span>
                </span>
                <span className={`font-mono text-xs sm:text-sm ${isPrimary ? 'text-black' : 'text-white/80'}`}>
                  {mins}
                </span>
              </Button>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-[10px] sm:text-[11px] text-white/55">
        Estimates • Ask first. Confirm yes.
      </div>
    </div>
  );
}
