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
): boolean {
  if (!GATED_TYPES.includes(type)) return true;

  const onGhosted = pathname === '/ghosted' || pathname.startsWith('/ghosted/');
  const profileInStack = sheetStack.some((s) => s.type === 'profile');

  return onGhosted || profileInStack;
}
