// XP gain animations removed — gamification UI hidden
export default function XPGainAnimation({ onComplete }) {
  // No-op: call onComplete immediately if provided
  if (onComplete) setTimeout(onComplete, 0);
  return null;
}
