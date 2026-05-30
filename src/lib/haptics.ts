/**
 * HOTMESS Haptic Feedback Utility
 *
 * Centralized haptic patterns for consistent tactile feedback.
 * Falls back gracefully when vibration API is unavailable.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Light tap — tab switches, filter apply, send message */
export function hapticLight() {
  if (canVibrate) navigator.vibrate(10);
}

/** Medium tap — boo/tap on profile, long-press activate, add to cart */
export function hapticMedium() {
  if (canVibrate) navigator.vibrate(50);
}

/** Heavy tap — SOS complete */
export function hapticHeavy() {
  if (canVibrate) navigator.vibrate(100);
}

/** Pattern — sheet dismiss, pull-to-refresh trigger */
export function hapticPattern() {
  if (canVibrate) navigator.vibrate([10, 5, 10]);
}

/** Snap back — sheet snap-back */
export function hapticSnap() {
  if (canVibrate) navigator.vibrate(5);
}

/** Cart add — slightly heavier than light */
export function hapticCart() {
  if (canVibrate) navigator.vibrate(30);
}

/** Generic vibrate with custom pattern */
export function hapticCustom(pattern: number | number[]) {
  if (canVibrate) navigator.vibrate(pattern);
}

export default {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  pattern: hapticPattern,
  snap: hapticSnap,
  cart: hapticCart,
  custom: hapticCustom,
};
