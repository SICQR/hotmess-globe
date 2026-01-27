import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import {
  calculateLevel,
  isFeatureUnlocked,
  getFeatureStatus,
  getUnlockedFeatures,
  getLockedFeatures,
  getNextUnlock,
  DEFAULT_UNLOCKS,
  levelProgress,
  xpToNextLevel,
} from '@/lib/levelUnlocks';

/**
 * Hook to check if a specific feature is unlocked for the current user
 */
export function useFeatureUnlock(featureKey) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.User.me(),
    staleTime: 60000,
  });

  const status = useMemo(() => {
    if (!user) return { unlocked: false, loading: true };
    return {
      ...getFeatureStatus(user.xp, featureKey),
      loading: false,
    };
  }, [user, featureKey]);

  return {
    ...status,
    isLoading,
  };
}

/**
 * Hook to get all unlock information for the current user
 */
export function useUserUnlocks() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.User.me(),
    staleTime: 60000,
  });

  const unlocks = useMemo(() => {
    if (!user) {
      return {
        level: 1,
        xp: 0,
        progress: 0,
        xpToNext: 1000,
        unlockedFeatures: [],
        lockedFeatures: DEFAULT_UNLOCKS,
        nextUnlock: DEFAULT_UNLOCKS[0],
      };
    }

    const xp = user.xp || 0;
    const level = calculateLevel(xp);

    return {
      level,
      xp,
      progress: levelProgress(xp),
      xpToNext: xpToNextLevel(xp),
      unlockedFeatures: getUnlockedFeatures(xp),
      lockedFeatures: getLockedFeatures(xp),
      nextUnlock: getNextUnlock(xp),
    };
  }, [user]);

  return {
    ...unlocks,
    isLoading,
    user,
  };
}

/**
 * Component that renders content only if a feature is unlocked
 */
export function FeatureGate({ featureKey, children, fallback = null, showLocked = false }) {
  const { unlocked, requiredLevel, loading } = useFeatureUnlock(featureKey);

  if (loading) return null;

  if (!unlocked) {
    if (showLocked && requiredLevel) {
      return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
          <div className="text-2xl mb-2">🔒</div>
          <p className="text-sm text-white/60">
            Unlocks at Level {requiredLevel}
          </p>
        </div>
      );
    }
    return fallback;
  }

  return children;
}

/**
 * Hook to check multiple features at once
 */
export function useMultipleFeatureUnlocks(featureKeys) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.User.me(),
    staleTime: 60000,
  });

  const statuses = useMemo(() => {
    if (!user) {
      return featureKeys.reduce((acc, key) => {
        acc[key] = { unlocked: false, loading: true };
        return acc;
      }, {});
    }

    return featureKeys.reduce((acc, key) => {
      acc[key] = getFeatureStatus(user.xp, key);
      return acc;
    }, {});
  }, [user, featureKeys]);

  return {
    statuses,
    isLoading,
    isAnyUnlocked: Object.values(statuses).some(s => s.unlocked),
    areAllUnlocked: Object.values(statuses).every(s => s.unlocked),
  };
}

export default useFeatureUnlock;
