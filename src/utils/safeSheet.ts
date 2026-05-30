/**
 * safeOpenSheet — wraps openSheet with a fallback action.
 * If the sheet fails to open (unregistered, policy block), runs fallback.
 */
export function safeOpenSheet(
  openSheet: (name: string, props?: Record<string, unknown>) => void,
  name: string,
  props: Record<string, unknown> = {},
  fallback?: () => void,
): void {
  try {
    openSheet(name, props);
  } catch {
    if (fallback) fallback();
  }
}
