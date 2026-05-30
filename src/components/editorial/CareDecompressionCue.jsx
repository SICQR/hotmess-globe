import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

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
  const [dismissed, setDismissed] = useState(false);
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
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1.5 bg-white/5 rounded-full text-white/40 hover:bg-white/15 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
