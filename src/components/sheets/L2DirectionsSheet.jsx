/**
 * L2DirectionsSheet — Meetpoint / Directions
 * Shows a static OSM map tile with the destination pin.
 * Buttons: Route (in-app), Uber deep link, Share.
 */

import { useState, useEffect } from 'react';
import { Navigation, MapPin, ExternalLink, Share2 } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return { x, y };
}

export default function L2DirectionsSheet({ lat, lng, label, address }) {
  const { closeSheet } = useSheet();
  const [tileUrl, setTileUrl] = useState(null);

  const destLat = parseFloat(lat) || 51.5074;
  const destLng = parseFloat(lng) || -0.1278;
  const destLabel = label || 'Meetpoint';

  useEffect(() => {
    const zoom = 14;
    const { x, y } = latLngToTile(destLat, destLng, zoom);
    setTileUrl(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
  }, [destLat, destLng]);

  const handleRoute = () => {
    window.open(`https://maps.google.com/?daddr=${destLat},${destLng}`, '_blank');
  };

  const handleUber = () => {
    window.open(
      `uber://?action=setPickup&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}&dropoff[nickname]=${encodeURIComponent(destLabel)}`,
      '_blank'
    );
    // Fallback to uber.com if app not installed
    setTimeout(() => {
      window.open(`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}`, '_blank');
    }, 500);
  };

  const handleShare = async () => {
    const text = `${destLabel}\nhttps://maps.google.com/?q=${destLat},${destLng}`;
    if (navigator.share) {
      await navigator.share({ title: destLabel, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map tile */}
      <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden bg-[#1C1C1E]" style={{ height: 200 }}>
        {tileUrl && (
          <img
            src={tileUrl}
            alt="Map"
            className="w-full h-full object-cover opacity-80"
            crossOrigin="anonymous"
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />
        {/* Center pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center -mt-4">
            <div className="w-8 h-8 rounded-full bg-[#C8962C] border-2 border-white shadow-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-black fill-black" />
            </div>
            <div className="w-0.5 h-3 bg-[#C8962C]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8962C]/60" />
          </div>
        </div>
      </div>

      {/* Destination info */}
      <div className="px-4 py-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-[#C8962C]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">{destLabel}</p>
              {address && <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{address}</p>}
              <p className="text-white/30 text-[10px] mt-1">
                {destLat.toFixed(4)}, {destLng.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <button
          onClick={handleRoute}
          className="flex-1 bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Navigation className="w-4 h-4" />
          Route
        </button>
        <button
          onClick={handleUber}
          className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3.5 border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <ExternalLink className="w-4 h-4 text-white/60" />
          Uber
        </button>
        <button
          onClick={handleShare}
          className="flex-1 bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3.5 border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Share2 className="w-4 h-4 text-white/60" />
          Share
        </button>
      </div>
    </div>
  );
}
