/**
 * sheetPolicy — UI layer enforcement
 *
 * Rule: chat/video/travel sheets ONLY from /ghosted path OR when a profile sheet
 * is already in the stack (i.e. opened via Ghosted → ProfileDetail → Message flow).
 *
 * All other callers get a toast and the sheet is blocked.
 */

/** Sheet types that require the ghosted-path or profile-in-stack context */
const GATED_TYPES: readonly string[] = ['chat', 'video', 'travel'];

/**
 * Returns true if the requested sheet type is allowed to open.
 *
 * @param type        Sheet key (e.g. 'chat', 'profile', 'event')
 * @param pathname    Current window.location.pathname (from useLocation)
 * @param sheetStack  Current LIFO sheet stack (array of { type: string })
 */
export function canOpenSheet(
  type: string,
  pathname: string,
  sheetStack: Array<{ type: string }>,
  activeSheet?: string | null,
): boolean {
  if (!GATED_TYPES.includes(type)) return true;

  // Allowed surfaces for chat/video/travel sheets:
  //   1. /ghosted (and nested /ghosted/* routes) — primary discovery context
  //   2. /profile/:id — entity-aware profile route (carousel + globe-click destinations)
  //   3. Profile sheet open in stack OR as activeSheet — so the Message button on a
  //      profile sheet opens chat directly. Pre-mutual-boo gating is the caller's
  //      job (handleMessage shouldn't even fire pre-mutual; that check lives in the
  //      action button rendering, not here).
  const onGhosted = pathname === '/ghosted' || pathname.startsWith('/ghosted/');
  const onProfile = pathname.startsWith('/profile/');
  const profileInStack = sheetStack.some((s) => s.type === 'profile');
  const profileActive = activeSheet === 'profile';

  return onGhosted || onProfile || profileInStack || profileActive;
}

