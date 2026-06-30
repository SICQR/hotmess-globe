import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';
import { useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';

/**
 * useDeepLinkSheet - Auto-open sheets from push notification URLs
 *
 * Triggered by service worker navigation to URLs like:
 * - /?sheet=safety
 * - /ghosted?sheet=chat&thread=abc
 * - /?sheet=notification-inbox
 * - /?sheet=location-watcher&shareId=xyz
 * - /?sheet=profile&id=user123
 *
 * Runs after READY state AND whenever location.search changes — so it
 * fires both on cold open (bootState → READY) and when the app is already
 * open and a NOTIFICATION_CLICK navigates to a ?sheet= URL (Phil 2026-06-15).
 */
export function useDeepLinkSheet() {
  const { openSheet, activeSheet } = useSheet();
  const { bootState } = useBootGuard();
  const location = useLocation();

  // Keep a live ref to activeSheet so the 500ms setTimeout callback can
  // read the current value rather than the stale closure snapshot.
  // BUG 3 fix (2026-06-29): programmatic openSheet calls (e.g. polygon clicks)
  // update activeSheet before the timer fires. Checking the ref prevents
  // useDeepLinkSheet from clobbering already-opened sheets with empty props
  // and then stripping ?sheet= from the URL which caused closeSheet to fire.
  const activeSheetRef = useRef<string | null>(activeSheet);
  activeSheetRef.current = activeSheet;

  useEffect(() => {
    // Only run when user is fully authenticated and ready
    if (bootState !== BOOT_STATES.READY) {
      return;
    }

    // Read sheet param from URL
    const params = new URLSearchParams(location.search);
    const sheetType = params.get('sheet');

    if (!sheetType) {
      return;
    }

    // Wait for the app to settle before opening sheet
    // This prevents race conditions with route changes
    const timer = setTimeout(() => {
      // BUG 3 fix: if the target sheet is already open, this URL change was
      // caused by a programmatic openSheet call (polygon click, beacon tap,
      // etc.), not a push-notification deep link. Skip — we must not
      // overwrite the caller's props (which carry place/beacon objects that
      // cannot be serialised into URL params) or strip the ?sheet= param
      // (which would trigger closeSheet via Effect 2 in SheetContext).
      if (activeSheetRef.current === sheetType) {
        return;
      }

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
  }, [bootState, location.search, openSheet]);
}
