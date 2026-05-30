/**
 * safeNavigate — wraps react-router navigate with a fallback.
 * If navigation throws (bad route, unmounted component), falls back to /more.
 */
export function safeNavigate(
  navigate: (path: string) => void,
  path: string,
  fallback = '/more',
): void {
  try {
    navigate(path);
  } catch {
    try {
      navigate(fallback);
    } catch {
      // last resort — should never happen
      window.location.href = fallback;
    }
  }
}
