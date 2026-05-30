/**
 * L2DirectionsSheet — wraps InAppDirections inside the L2 peek-sheet system.
 *
 * Style note (Phil locked 2026-05-30): InAppDirections is now chromeless to
 * match the L2ClusterPreviewSheet aesthetic — no inner border, no X button,
 * no maximize/minimize. Dismiss is the L2SheetContainer's pull-down. This
 * wrapper renders the chromeless component flat into the sheet body, plus
 * a Share Location action in the same pill style as cluster's "Zoom closer".
 */

import { Share2 } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import InAppDirections from '@/components/directions/InAppDirections';

export default function L2DirectionsSheet({ lat, lng, label, address }) {
  // closeSheet kept available for future explicit-dismiss callers; current
  // pull-down dismiss is provided by L2SheetContainer's drag controls.
  // eslint-disable-next-line no-unused-vars
  const { closeSheet } = useSheet();

  const destLat = parseFloat(lat) || 51.5074;
  const destLng = parseFloat(lng) || -0.1278;
  const destLabel = label || 'Meetpoint';

  const handleShare = async () => {
    const text = `${destLabel}\nhttps://maps.google.com/?q=${destLat},${destLng}`;
    if (navigator.share) {
      await navigator.share({ title: destLabel, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      <InAppDirections
        destination={{ lat: destLat, lng: destLng }}
        destinationName={destLabel}
        destinationAddress={address}
      />

      {/* Share action — matches cluster preview's "Zoom closer" button style. */}
      <div className="px-4 pt-1 pb-6">
        <button
          onClick={handleShare}
          className="w-full bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
        >
          <Share2 className="w-4 h-4 text-white/50" />
          Share Location
        </button>
      </div>
    </div>
  );
}
