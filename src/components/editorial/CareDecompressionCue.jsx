import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

// Care-first emotional rendering (docs/GLOBE_EMOTIONAL_RENDERING_AND_NIGHTLIFE_PSYCHOLOGY.md):
// "care dressed as kink" — a calm, low-stimulation cue in local mode that keeps care
// quietly present and shifts toward decompression as the night gets late. No pulse,
// no pressure, dismissible. Pure presentational; copy adapts to the hour.
export function careCopy(hour) {
  const h = Number.isFinite(hour) ? hour : 22;
  if (h >= 0 && h < 6) return 'The night is winding down — sober rooms and aftercare are close by.';
  if (h >= 6 && h < 17) return 'Care is never far — sober support and quiet spaces sit beside the scene.';
  return 'However the night goes — aftercare, sober rooms and a soft landing are nearby.';
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
