/**
 * careNudges -- contextual wellbeing nudge triggers
 *
 * Call these at the relevant points in the app:
 * - After ending Go Live late at night
 * - After a late-night HNH purchase
 *
 * SOS recovery is already handled by SafetyRecoveryScreen.
 */

import { toast } from 'sonner';

const LATE_NIGHT_START = 23; // 11pm
const LATE_NIGHT_END = 5; // 5am

function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= LATE_NIGHT_START || hour < LATE_NIGHT_END;
}

/**
 * Show a care nudge after ending Go Live late at night.
 * Call this from the Go Live end handler.
 */
export function nudgeAfterLateGoLive(): void {
  if (!isLateNight()) return;

  // Debounce: only show once per 4 hours
  const key = 'hm_care_nudge_golive';
  const lastShown = Number(localStorage.getItem(key) || '0');
  if (Date.now() - lastShown < 4 * 60 * 60 * 1000) return;
  localStorage.setItem(key, String(Date.now()));

  setTimeout(() => {
    toast('How are you feeling? Check in with yourself.', {
      duration: 6000,
      action: {
        label: 'Hand N Hand',
        onClick: () => window.location.assign('/care'),
      },
      style: {
        background: '#1C1C1E',
        color: '#fff',
        border: '1px solid rgba(200,150,44,0.2)',
      },
    });
  }, 2000);
}

/**
 * Show a care nudge after a late-night HNH purchase.
 * Call this from the purchase success handler.
 */
export function nudgeAfterLatePurchase(): void {
  if (!isLateNight()) return;

  const key = 'hm_care_nudge_purchase';
  const lastShown = Number(localStorage.getItem(key) || '0');
  if (Date.now() - lastShown < 4 * 60 * 60 * 1000) return;
  localStorage.setItem(key, String(Date.now()));

  setTimeout(() => {
    toast('Take care of yourself tonight.', {
      duration: 6000,
      action: {
        label: 'Hand N Hand',
        onClick: () => window.location.assign('/care'),
      },
      style: {
        background: '#1C1C1E',
        color: '#fff',
        border: '1px solid rgba(200,150,44,0.2)',
      },
    });
  }, 1500);
}
