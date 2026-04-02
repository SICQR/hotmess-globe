/**
 * L2DirectionsSheet — Meetpoint / Directions
 * Uses InAppDirections component for in-app map routing.
 * Also supports Uber deep link and sharing.
 */

import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import InAppDirections from '@/components/directions/InAppDirections';

export default function L2DirectionsSheet({ lat, lng, label, address }) {
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
      {/* In-app directions map */}
      <div className="rounded-2xl overflow-hidden">
        <InAppDirections
          destination={{ lat: destLat, lng: destLng }}
          destinationName={destLabel}
          destinationAddress={address}
          compact={false}
          expandable={true}
          onClose={closeSheet}
        />
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full bg-white/8 text-white font-bold text-sm rounded-2xl py-3.5 border border-white/15 flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Share2 className="w-4 h-4 text-white/60" />
        Share Location
      </button>
    </div>
  );
}
