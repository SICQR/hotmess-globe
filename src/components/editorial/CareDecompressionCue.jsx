import React, { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';

// P0 2026-06-01 — beta users were getting blocked by stacked persistent cards.
// Once dismissed, this cue should stay dismissed for the session AND auto-
// dismiss after a few seconds if the user just wants to use the map.
const SESSION_KEY = 'hm_care_cue_dismissed';
const AUTO_DISMISS_MS = 6000;

// Care-first emotional rendering — D15 voice (docs/doctrine/15-care-language-doctrine.md).
// Calm, low-stimulation cue that keeps care quietly present and shifts tone as the
// night moves. No pulse, no pressure, dismissible. Copy adapts to the hour.
//
// D15 §0: care shouldn't sound sanitised — should sound like nightlife people
// taking care of each other in nightlife language. Every line below passes the
// smoking-area test. No "sober rooms", no "sober support", no "quiet spaces",
// no "soft landing" — those failed the test (D15 §5 forbidden vocabulary).
export function careCopy(hour) {
  const h = Number.isFinite(hour) ? hour : 22;
  // Late / wind-down hours: people coming down, going home, holding on.
  if (h >= 0 && h < 6) return 'Coming down. Aftercare close by. Stay near.';
  // Daytime: aftercare and walk-ins are reachable, no fuss.
  if (h >= 6 && h < 17) return "Aftercare's open. Walk-in. Step inside if you need it.";
  // Evening into night: the lift, but care stays in reach for whatever the night becomes.
  return "Care close by. Whatever tonight becomes — still open.";
}

export default function CareDecompressionCue() {
  const [dismissed, setDismissed] = useState(() => {
    // Honor previous-session dismissal so the cue doesn't reappear on every
    // pulse:flyto / localFocus remount within the same browsing session.
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* incognito ok */ }
  };

  // Auto-dismiss after AUTO_DISMISS_MS so the map becomes unobstructed for
  // beta users who just want to start exploring.
  useEffect(() => {
    if (dismissed) return undefined;
    const id = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [dismissed]);

  if (dismissed) return null;
  const copy = careCopy(new Date().getHours());
  return (
    <div
      className="absolute bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[122] w-[min(92vw,440px)] flex items-center gap-3 bg-[#0a1420]/80 border border-white/10 backdrop-blur-md rounded-full pl-4 pr-2 py-2 shadow-lg"
      data-pull-refresh-ignore
    >
      <Heart className="w-4 h-4 flex-shrink-0 text-[#7fb0d8]" />
      <p className="text-white/70 text-[11px] leading-snug flex-1">{copy}</p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1.5 bg-white/5 rounded-full text-white/40 hover:bg-white/15 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
