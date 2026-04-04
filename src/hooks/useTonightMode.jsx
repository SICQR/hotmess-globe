/**
 * useTonightMode - Detect if current time is "Tonight" mode (20:00-06:00)
 * 
 * Tonight mode adjusts UI:
 * - Stronger beacon emphasis
 * - Safety FAB more prominent
 * - Wetter Watch ticker default on
 * - Different color emphasis
 */

import { useState, useEffect, useMemo } from 'react';

// Tonight window: 8 PM to 6 AM local time
const TONIGHT_START_HOUR = 20; // 8 PM
const TONIGHT_END_HOUR = 6;    // 6 AM

/**
 * Check if a given hour is within "Tonight" window
 */
function isWithinTonightWindow(hour) {
  // Tonight spans midnight: 20:00 -> 23:59 OR 00:00 -> 05:59
  return hour >= TONIGHT_START_HOUR || hour < TONIGHT_END_HOUR;
}

/**
 * useTonightMode hook
 * 
 * @returns {Object} Tonight mode state and utilities
 * @returns {boolean} isTonight - Whether it's currently "Tonight" mode
 * @returns {boolean} isTonightOverride - Manual override active
 * @returns {function} setTonightOverride - Manually toggle Tonight mode
 * @returns {number} currentHour - Current hour (0-23)
 * @returns {string} timeUntilTonight - Human-readable time until Tonight starts
 */
export function useTonightMode() {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [tonightOverride, setTonightOverride] = useState(null); // null = auto, true/false = manual

  // Update hour every minute
  useEffect(() => {
    const updateHour = () => {
      setCurrentHour(new Date().getHours());
    };

    // Check every minute
    const interval = setInterval(updateHour, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate if Tonight based on time or override
  const isTonight = useMemo(() => {
    if (tonightOverride !== null) {
      return tonightOverride;
    }
    return isWithinTonightWindow(currentHour);
  }, [currentHour, tonightOverride]);

  // Calculate time until Tonight starts (for display)
  const timeUntilTonight = useMemo(() => {
    if (isTonight) return null;
    
    const now = new Date();
    const tonightStart = new Date(now);
    tonightStart.setHours(TONIGHT_START_HOUR, 0, 0, 0);
    
    // If we're past Tonight start today, it starts tomorrow
    if (now.getHours() >= TONIGHT_END_HOUR && now.getHours() < TONIGHT_START_HOUR) {
      // Same day
    } else {
      tonightStart.setDate(tonightStart.getDate() + 1);
    }
    
    const diffMs = tonightStart - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [currentHour, isTonight]);

  return {
    isTonight,
    isTonightOverride: tonightOverride !== null,
    setTonightOverride,
    currentHour,
    timeUntilTonight,
    // Constants for reference
    TONIGHT_START_HOUR,
    TONIGHT_END_HOUR,
  };
}

/**
 * TonightModeContext - For app-wide Tonight state
 */
import { createContext, useContext } from 'react';

const TonightModeContext = createContext(null);

export function TonightModeProvider({ children }) {
  const tonightState = useTonightMode();
  
  return (
    <TonightModeContext.Provider value={tonightState}>
      {children}
    </TonightModeContext.Provider>
  );
}

export function useTonightModeContext() {
  const context = useContext(TonightModeContext);
  if (!context) {
    // Return default if not in provider (graceful fallback)
    return {
      isTonight: isWithinTonightWindow(new Date().getHours()),
      isTonightOverride: false,
      setTonightOverride: () => {},
      currentHour: new Date().getHours(),
      timeUntilTonight: null,
    };
  }
  return context;
}

export default useTonightMode;
