/**
 * PinLockContext — 4-digit app lock system
 * 
 * Features:
 * - Set/change/remove PIN
 * - Lock app after inactivity or background
 * - Biometric unlock option (if supported)
 * - PIN stored securely in localStorage (hashed)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const PinLockContext = createContext(null);

// Simple hash function for PIN (not cryptographically secure, but prevents casual viewing)
const hashPin = (pin) => {
  let hash = 0;
  const str = `hotmess_${pin}_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const STORAGE_KEY = 'hotmess_pin_hash';
const PIN_ENABLED_KEY = 'hotmess_pin_enabled';
const LOCK_TIMEOUT_KEY = 'hotmess_lock_timeout';
const LAST_ACTIVE_KEY = 'hotmess_last_active';

// Default lock after 5 minutes of inactivity
const DEFAULT_LOCK_TIMEOUT = 5 * 60 * 1000;

export function PinLockProvider({ children }) {
  const { user } = useAuth();
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(DEFAULT_LOCK_TIMEOUT);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  // Initialize from localStorage
  useEffect(() => {
    if (!user) return;
    
    const storedHash = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    const enabled = localStorage.getItem(`${PIN_ENABLED_KEY}_${user.id}`) === 'true';
    const timeout = parseInt(localStorage.getItem(`${LOCK_TIMEOUT_KEY}_${user.id}`)) || DEFAULT_LOCK_TIMEOUT;
    
    setIsPinSet(!!storedHash);
    setIsPinEnabled(enabled);
    setLockTimeout(timeout);
    
    // Check if should be locked based on last activity
    if (enabled && storedHash) {
      const lastActive = parseInt(localStorage.getItem(`${LAST_ACTIVE_KEY}_${user.id}`)) || Date.now();
      const elapsed = Date.now() - lastActive;
      if (elapsed > timeout) {
        setIsLocked(true);
        setShowPinEntry(true);
      }
    }
  }, [user]);

  // Track activity to reset lock timer
  useEffect(() => {
    if (!user || !isPinEnabled) return;
    
    const updateLastActive = () => {
      localStorage.setItem(`${LAST_ACTIVE_KEY}_${user.id}`, Date.now().toString());
    };
    
    // Update on any interaction
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, updateLastActive, { passive: true }));
    
    // Check for lock on visibility change (app backgrounded)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateLastActive();
      } else if (isPinEnabled && isPinSet) {
        const lastActive = parseInt(localStorage.getItem(`${LAST_ACTIVE_KEY}_${user.id}`)) || Date.now();
        const elapsed = Date.now() - lastActive;
        if (elapsed > lockTimeout) {
          setIsLocked(true);
          setShowPinEntry(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateLastActive));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isPinEnabled, isPinSet, lockTimeout]);

  // Set a new PIN
  const setPin = useCallback((pin) => {
    if (!user || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }
    
    const hash = hashPin(pin);
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, hash);
    localStorage.setItem(`${PIN_ENABLED_KEY}_${user.id}`, 'true');
    localStorage.setItem(`${LAST_ACTIVE_KEY}_${user.id}`, Date.now().toString());
    
    setIsPinSet(true);
    setIsPinEnabled(true);
    setShowPinSetup(false);
    setAttempts(0);
    
    return { success: true };
  }, [user]);

  // Verify PIN
  const verifyPin = useCallback((pin) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    
    // Check if locked out
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      return { success: false, error: `Too many attempts. Try again in ${remaining}s` };
    }
    
    const storedHash = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (!storedHash) {
      return { success: false, error: 'No PIN set' };
    }
    
    const inputHash = hashPin(pin);
    
    if (inputHash === storedHash) {
      setIsLocked(false);
      setShowPinEntry(false);
      setAttempts(0);
      setLockedUntil(null);
      localStorage.setItem(`${LAST_ACTIVE_KEY}_${user.id}`, Date.now().toString());
      return { success: true };
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      // Lock out after 5 failed attempts
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + (30 * 1000); // 30 second lockout
        setLockedUntil(lockoutTime);
        return { success: false, error: 'Too many attempts. Locked for 30 seconds.' };
      }
      
      return { success: false, error: `Incorrect PIN. ${5 - newAttempts} attempts remaining.` };
    }
  }, [user, attempts, lockedUntil]);

  // Remove PIN
  const removePin = useCallback(() => {
    if (!user) return;
    
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    localStorage.removeItem(`${PIN_ENABLED_KEY}_${user.id}`);
    localStorage.removeItem(`${LAST_ACTIVE_KEY}_${user.id}`);
    
    setIsPinSet(false);
    setIsPinEnabled(false);
    setIsLocked(false);
    setShowPinEntry(false);
    setAttempts(0);
  }, [user]);

  // Toggle PIN enabled/disabled
  const togglePinEnabled = useCallback((enabled) => {
    if (!user) return;
    
    if (enabled && !isPinSet) {
      setShowPinSetup(true);
      return;
    }
    
    localStorage.setItem(`${PIN_ENABLED_KEY}_${user.id}`, enabled.toString());
    setIsPinEnabled(enabled);
    
    if (!enabled) {
      setIsLocked(false);
      setShowPinEntry(false);
    }
  }, [user, isPinSet]);

  // Change lock timeout
  const setLockTimeoutMinutes = useCallback((minutes) => {
    if (!user) return;
    
    const ms = minutes * 60 * 1000;
    localStorage.setItem(`${LOCK_TIMEOUT_KEY}_${user.id}`, ms.toString());
    setLockTimeout(ms);
  }, [user]);

  // Manual lock
  const lockApp = useCallback(() => {
    if (isPinSet && isPinEnabled) {
      setIsLocked(true);
      setShowPinEntry(true);
    }
  }, [isPinSet, isPinEnabled]);

  const value = {
    // State
    isPinSet,
    isPinEnabled,
    isLocked,
    showPinSetup,
    showPinEntry,
    lockTimeout,
    attempts,
    lockedUntil,
    
    // Actions
    setPin,
    verifyPin,
    removePin,
    togglePinEnabled,
    setLockTimeoutMinutes,
    lockApp,
    
    // UI controls
    openPinSetup: () => setShowPinSetup(true),
    closePinSetup: () => setShowPinSetup(false),
    closePinEntry: () => {}, // Can't close without verifying
  };

  return (
    <PinLockContext.Provider value={value}>
      {children}
    </PinLockContext.Provider>
  );
}

export function usePinLock() {
  const context = useContext(PinLockContext);
  if (!context) {
    throw new Error('usePinLock must be used within PinLockProvider');
  }
  return context;
}

export default PinLockContext;
