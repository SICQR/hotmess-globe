/**
 * HOTMESS Safety — haptic doctrine v1.
 *
 * Phil's rule: "Someone steady squeezing your shoulder once. Not emergency
 * broadcast system."
 *
 * Named tokens map onto Apple's UIImpactFeedbackStyle vocabulary so a future
 * Capacitor/RN bridge can swap the implementation without renaming callers.
 * On the web we use navigator.vibrate() with vibration durations tuned to
 * approximate each Apple style on the limited Android haptic engines that
 * support it. iOS Safari silently no-ops vibrate() — that is the safe default.
 *
 * Cardinal rules:
 *   - Only ONE strong haptic in the whole system: notificationError on
 *     completed SOS send. Never stack strong haptics with flashing red and
 *     loud audio — that creates panic.
 *   - Aftercare uses ALMOST NO haptics. Subtle tap on breath start, tiny
 *     pulse on session complete. Nothing else.
 *   - Heartbeat-like cadence on hold progression, NOT machine-gun.
 */

function vib(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { /* iOS Safari no-ops; older Androids may throw */ }
}

/** Entry-to-controlled-space tap. You opened /safety. */
export function impactLight() { vib(8); }

/** Soft release. You let go of the SOS button before completion. */
export function impactSoft() { vib(5); }

/** Arming press — finger touches the SOS button. Not alarming. */
export function impactMedium() { vib(22); }

/** Heartbeat tick used inside the 3-second hold. Subtle, not a tick-tick-tick. */
export function selectionChanged(weight = 1) {
  // weight 1 = light tick, weight 2 = slightly heavier, weight 3 = deep pulse.
  if (weight <= 1) vib(10);
  else if (weight === 2) vib(16);
  else vib(28);
}

/**
 * Completion of a SOS send. The ONLY strong haptic in the system. Should
 * feel undeniable and final — but it must not stack with audio/flash.
 * Web pattern approximates iOS UINotificationFeedbackType.error: two heavy
 * thumps + a longer settle, total ~600ms.
 */
export function notificationError() { vib([120, 30, 120, 30, 220]); }

/**
 * Someone is here. Gentle double pulse when a trusted contact opens or
 * acknowledges the alert. Phil: "This is emotionally huge."
 */
export function gentleDoublePulse() { vib([20, 60, 20]); }
