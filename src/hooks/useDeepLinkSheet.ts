import { useEffect } from 'react';
import { useSheet } from '@/contexts/SheetContext';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';

/**
 * useDeepLinkSheet - Auto-open sheets from push notification URLs
 *
 * Triggered by service worker navigation to URLs like:
 * - /?sheet=safety
 * - /ghosted?sheet=chat&threadId=abc
 * - /?sheet=notification-inbox
 * - /?sheet=location-watcher&shareId=xyz
 * - /?sheet=profile&id=user123
 *
 * Runs once after READY state, reads URL params, opens the sheet,
 * then cleans the URL using replaceState.
 */
export function useDeepLinkSheet() {
  const { openSheet } = useSheet();
  const { bootState } = useBootGuard();

  useEffect(() => {
    // Only run when user is fully authenticated and ready
    if (bootState !== BOOT_STATES.READY) {
      return;
    }

    // Read sheet param from URL
    const params = new URLSearchParams(window.location.search);
    const sheetType = params.get('sheet');

    if (!sheetType) {
      return;
    }

    // Wait for the app to settle before opening sheet
    // This prevents race conditions with route changes
    const timer = setTimeout(() => {
      // Build props object from all query params except 'sheet'
      const sheetProps: Record<string, string> = {};

      // Add known props based on sheet type
      if (sheetType === 'chat' || sheetType === 'chat-sheet') {
        const threadId = params.get('threadId') || params.get('thread');
        if (threadId) sheetProps.threadId = threadId;
      } else if (sheetType === 'location-watcher') {
        const shareId = params.get('shareId') || params.get('share_id');
        if (shareId) sheetProps.shareId = shareId;
      } else if (sheetType === 'profile') {
        const id = params.get('id');
        if (id) sheetProps.id = id;
      }

      // Generic fallback: pass all other params as props
      params.forEach((value, key) => {
        if (key !== 'sheet' && !sheetProps[key]) {
          sheetProps[key] = value;
        }
      });

      // Open the sheet
      openSheet(sheetType, sheetProps);

      // Clean the URL — remove ?sheet= param and history entry
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [bootState, openSheet]);
}
