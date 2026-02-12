/**
 * TonightContext - Time-aware UI for nightlife app
 * 
 * The app should look and act differently at 11pm vs 11am:
 * - NIGHT MODE (10pm - 5am): Full nightlife experience, events prominent
 * - DAY MODE (5am - 10pm): Calmer vibe, planning focus
 * 
 * Features:
 * - Auto-detects time of day
 * - Manual override available
 * - Different color intensities
 * - "What's on TONIGHT" vs "Plan your night"
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const TonightContext = createContext(null);

// Night hours: 10pm (22) to 5am (5)
const NIGHT_START = 22; // 10pm
const NIGHT_END = 5;    // 5am

// Mode configurations
const MODE_CONFIG = {
  night: {
    name: 'TONIGHT',
    greeting: "IT'S GO TIME",
    cta: "WHAT'S ON NOW",
    eventsLabel: 'HAPPENING NOW',
    glowIntensity: 1.0,
    pulseSpeed: 'fast',
    colors: {
      primary: '#FF1493',    // Hot pink - full intensity
      accent: '#00D9FF',     // Cyan
      glow: 'rgba(255, 20, 147, 0.4)',
    },
    features: {
      liveBeacons: true,
      nearbyGrid: true,
      urgentEvents: true,
      ghostedBoost: true,
    }
  },
  day: {
    name: 'PLAN',
    greeting: 'PLAN YOUR NIGHT',
    cta: "SEE WHAT'S COMING",
    eventsLabel: 'UPCOMING',
    glowIntensity: 0.5,
    pulseSpeed: 'slow',
    colors: {
      primary: '#FF1493',    // Same pink but used sparingly
      accent: '#B026FF',     // Purple for day mode
      glow: 'rgba(176, 38, 255, 0.2)',
    },
    features: {
      liveBeacons: false,
      nearbyGrid: false,
      urgentEvents: false,
      ghostedBoost: false,
    }
  }
};

export function TonightProvider({ children }) {
  const [manualOverride, setManualOverride] = useState(null); // 'night' | 'day' | null
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Update hour every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Determine if it's night time
  const isNightTime = useMemo(() => {
    if (manualOverride) {
      return manualOverride === 'night';
    }
    // 10pm (22) to 5am (5)
    return currentHour >= NIGHT_START || currentHour < NIGHT_END;
  }, [currentHour, manualOverride]);

  // Get current mode config
  const mode = isNightTime ? 'night' : 'day';
  const config = MODE_CONFIG[mode];

  // Calculate time until mode change
  const timeUntilChange = useMemo(() => {
    const now = new Date();
    const targetHour = isNightTime ? NIGHT_END : NIGHT_START;
    
    let target = new Date(now);
    target.setHours(targetHour, 0, 0, 0);
    
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, total: diff };
  }, [currentHour, isNightTime]);

  // Manual toggle for testing/user preference
  const toggleMode = () => {
    if (manualOverride === 'night') {
      setManualOverride('day');
    } else if (manualOverride === 'day') {
      setManualOverride(null); // Return to auto
    } else {
      setManualOverride(isNightTime ? 'day' : 'night');
    }
  };

  const resetToAuto = () => {
    setManualOverride(null);
  };

  const value = {
    // Current state
    isNightMode: isNightTime,
    mode,
    config,
    currentHour,
    
    // Mode properties (shortcuts)
    greeting: config.greeting,
    cta: config.cta,
    eventsLabel: config.eventsLabel,
    glowIntensity: config.glowIntensity,
    pulseSpeed: config.pulseSpeed,
    colors: config.colors,
    features: config.features,
    
    // Time info
    timeUntilChange,
    
    // Manual controls
    manualOverride,
    toggleMode,
    resetToAuto,
    isAutoMode: manualOverride === null,
  };

  return (
    <TonightContext.Provider value={value}>
      {children}
    </TonightContext.Provider>
  );
}

export function useTonight() {
  const context = useContext(TonightContext);
  if (!context) {
    throw new Error('useTonight must be used within TonightProvider');
  }
  return context;
}

// Helper hook for conditional night styling
export function useNightClass(nightClass, dayClass = '') {
  const { isNightMode } = useTonight();
  return isNightMode ? nightClass : dayClass;
}

// Export config for use elsewhere
export { MODE_CONFIG };
