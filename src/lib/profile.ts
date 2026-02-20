/**
 * Profile Authority Contract (Stage 4)
 * 
 * Single entry point for all profile open operations.
 * Replaces scattered profile opening logic across components.
 * 
 * @see docs/PROFILE_MAP_AUTHORITY.md
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ProfileSource = 
  | 'grid'      // ProfilesGrid tap
  | 'globe'     // Globe beacon tap
  | 'map'       // Map marker tap
  | 'search'    // Search result tap
  | 'deeplink'  // Direct URL
  | 'chat'      // Message thread tap
  | 'mention'   // @mention tap
  | 'social'    // Social feed tap
  | 'event'     // Event attendee tap
  | 'other';    // Fallback

export interface ProfileOpenOptions {
  /** User ID (profile.id or account_id) */
  userId: string;
  
  /** Where the open was triggered from (for analytics) */
  source: ProfileSource;
  
  /** Prefer sheet overlay over route navigation (default: true on mobile) */
  preferSheet?: boolean;
  
  /** Email for legacy deep link compatibility */
  email?: string;
  
  /** Additional context to pass to profile sheet */
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const isMobileWidth = () => 
  typeof window !== 'undefined' && window.innerWidth < 768;

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useProfileOpener
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Single entry point for opening profiles.
 * 
 * @example
 * ```tsx
 * const { openProfile, closeProfile, isOpen } = useProfileOpener();
 * 
 * // From grid card
 * openProfile({ userId: profile.id, source: 'grid' });
 * 
 * // From globe beacon
 * openProfile({ userId: beacon.user_id, source: 'globe', preferSheet: true });
 * 
 * // From deep link (route)
 * openProfile({ userId, source: 'deeplink', preferSheet: false });
 * ```
 */
export function useProfileOpener() {
  const navigate = useNavigate();
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();

  const openProfile = useCallback((options: ProfileOpenOptions) => {
    const { userId, source, preferSheet, email, context } = options;
    
    // Default: prefer sheet on mobile
    const shouldUseSheet = preferSheet ?? isMobileWidth();
    
    // Log for analytics (could be enhanced with proper analytics)
    if (import.meta.env.DEV) {
      console.log(`[Profile] Opening ${userId} from ${source}${shouldUseSheet ? ' (sheet)' : ' (route)'}`);
    }
    
    if (shouldUseSheet) {
      // Open as L2ProfileSheet (preferred on mobile)
      openSheet(SHEET_TYPES.PROFILE, {
        uid: userId,
        email,
        source,
        ...context,
      });
    } else {
      // Navigate to profile route (desktop or deeplink)
      const params: Record<string, string> = {};
      if (email) {
        params.email = email;
      } else if (userId) {
        params.uid = userId;
      }
      navigate(`/Profile?${createSearchParams(params).toString()}`);
    }
  }, [navigate, openSheet]);

  const closeProfile = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  const isOpen = useMemo(() => 
    isSheetOpen(SHEET_TYPES.PROFILE),
    [isSheetOpen]
  );

  const currentUserId = useMemo(() => 
    (sheetProps as Record<string, unknown>)?.uid as string | null ?? null,
    [sheetProps]
  );

  return {
    openProfile,
    closeProfile,
    isOpen,
    currentUserId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE FUNCTION (for non-hook contexts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Imperative profile open (for use outside React context).
 * NOTE: This uses window.history directly and should be avoided when possible.
 * Prefer useProfileOpener hook.
 */
export function openProfileRoute(userId: string, email?: string): void {
  const params = new URLSearchParams();
  if (email) {
    params.set('email', email);
  } else if (userId) {
    params.set('uid', userId);
  }
  window.history.pushState(null, '', `/Profile?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default {
  useProfileOpener,
  openProfileRoute,
};
