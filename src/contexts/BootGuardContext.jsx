import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/components/utils/supabaseClient';
import logger from '@/utils/logger';

/**
 * BootGuardContext - OS Runtime Boot State Machine
 * 
 * LAW 1: OS runtime MUST NOT mount unless all profile gates pass:
 * - age_confirmed = true
 * - onboarding_complete = true  
 * - consent_location = true
 * - consent_safety = true
 * - is_suspended = false
 * 
 * Boot states (never break this order):
 * 1. LOADING - Initial app load, checking auth session
 * 2. UNAUTHENTICATED - No session, public shell allowed (AgeGate, Auth, Legal)
 * 3. NEEDS_AGE - User is authenticated but age_confirmed = false
 * 4. NEEDS_ONBOARDING - User is authenticated but onboarding_complete = false
 * 5. READY - All gates pass, mount OS runtime
 * 
 * CRITICAL: Unauthenticated users MUST NOT be gated.
 * Only enforce profile flags AFTER auth session exists.
 */

// Boot state constants
export const BOOT_STATES = {
  LOADING: 'LOADING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  NEEDS_AGE: 'NEEDS_AGE',
  NEEDS_ONBOARDING: 'NEEDS_ONBOARDING',
  SUSPENDED: 'SUSPENDED',
  READY: 'READY'
};

const BootGuardContext = createContext();

export const BootGuardProvider = ({ children }) => {
  const [bootState, setBootState] = useState(BOOT_STATES.LOADING);
  const [user, setUser] = useState(null);
  const [profileFlags, setProfileFlags] = useState(null);
  const [error, setError] = useState(null);

  const checkBootState = useCallback(async () => {
    try {
      logger.debug('BootGuard: Starting boot sequence');
      setBootState(BOOT_STATES.LOADING);
      setError(null);

      // Step 1: Check if user has an auth session
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        logger.debug('BootGuard: No auth session → UNAUTHENTICATED (public shell allowed)');
        setUser(null);
        setProfileFlags(null);
        setBootState(BOOT_STATES.UNAUTHENTICATED);
        return;
      }

      // Step 2: User has session, fetch profile with flags
      logger.debug('BootGuard: Auth session exists, fetching profile');
      const currentUser = await base44.auth.me();
      
      if (!currentUser) {
        logger.warn('BootGuard: Auth session exists but profile fetch failed');
        setUser(null);
        setProfileFlags(null);
        setBootState(BOOT_STATES.UNAUTHENTICATED);
        return;
      }

      setUser(currentUser);

      // Step 3: Sync local age confirmation from sessionStorage (if exists)
      // This prevents age-gate loops after the user confirmed age pre-auth
      let ageConfirmed = currentUser.age_confirmed ?? false;
      if (!ageConfirmed) {
        try {
          const localAgeVerified = sessionStorage.getItem('age_verified') === 'true';
          if (localAgeVerified) {
            logger.info('BootGuard: Syncing local age confirmation to profile');
            await base44.auth.updateMe({ age_confirmed: true });
            ageConfirmed = true;
          }
        } catch (err) {
          logger.warn('BootGuard: Failed to sync age confirmation', { error: err.message });
        }
      }

      // Step 4: Extract profile flags (with backward compatibility)
      const flags = {
        age_confirmed: ageConfirmed,
        onboarding_complete: currentUser.onboarding_complete ?? currentUser.has_agreed_terms ?? false,
        consent_location: currentUser.consent_location ?? currentUser.has_consented_gps ?? false,
        consent_safety: currentUser.consent_safety ?? currentUser.has_consented_data ?? false,
        is_suspended: currentUser.is_suspended ?? false
      };

      setProfileFlags(flags);
      logger.debug('BootGuard: Profile flags', flags);

      // Step 5: Determine boot state based on profile flags
      if (flags.is_suspended) {
        logger.warn('BootGuard: User is suspended → SUSPENDED');
        setBootState(BOOT_STATES.SUSPENDED);
        return;
      }

      if (!flags.age_confirmed) {
        logger.info('BootGuard: Age not confirmed → NEEDS_AGE');
        setBootState(BOOT_STATES.NEEDS_AGE);
        return;
      }

      if (!flags.onboarding_complete || !flags.consent_location || !flags.consent_safety) {
        logger.info('BootGuard: Onboarding incomplete → NEEDS_ONBOARDING', {
          onboarding_complete: flags.onboarding_complete,
          consent_location: flags.consent_location,
          consent_safety: flags.consent_safety
        });
        setBootState(BOOT_STATES.NEEDS_ONBOARDING);
        return;
      }

      // Step 6: All gates pass → READY
      logger.info('BootGuard: All gates pass → READY (mount OS runtime)');
      setBootState(BOOT_STATES.READY);

    } catch (err) {
      logger.error('BootGuard: Boot sequence failed', { error: err.message });
      setError(err);
      setBootState(BOOT_STATES.UNAUTHENTICATED);
    }
  }, []); // Empty dependency array to stabilize function reference

  useEffect(() => {
    checkBootState();
  }, [checkBootState]);

  const refreshBootState = useCallback(() => {
    return checkBootState();
  }, [checkBootState]);

  const value = {
    bootState,
    user,
    profileFlags,
    error,
    refreshBootState,
    isLoading: bootState === BOOT_STATES.LOADING,
    isUnauthenticated: bootState === BOOT_STATES.UNAUTHENTICATED,
    needsAge: bootState === BOOT_STATES.NEEDS_AGE,
    needsOnboarding: bootState === BOOT_STATES.NEEDS_ONBOARDING,
    isSuspended: bootState === BOOT_STATES.SUSPENDED,
    isReady: bootState === BOOT_STATES.READY
  };

  return (
    <BootGuardContext.Provider value={value}>
      {children}
    </BootGuardContext.Provider>
  );
};

export const useBootGuard = () => {
  const context = useContext(BootGuardContext);
  if (!context) {
    throw new Error('useBootGuard must be used within a BootGuardProvider');
  }
  return context;
};

export default BootGuardContext;
