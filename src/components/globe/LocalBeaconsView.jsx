import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

const getModeColor = (mode) => {
  const colors = {
    hookup: '#FF073A',
    crowd: '#B026FF',
    drop: '#FF6B35',
    ticket: '#FFEB3B',
    radio: '#00D9FF',
    care: '#39FF14'
  };
  return colors[mode] || '#C8962C';
};

export default function LocalBeaconsView({ centerBeacon, allBeacons, onClose, onBeaconSelect }) {
  const SEARCH_RADIUS = 5; // 5km radius

  // Filter beacons within radius
  const nearbyBeacons = useMemo(() => {
    if (!centerBeacon) return [];

    return allBeacons
      .filter(b => b.id !== centerBeacon.id) // Exclude center beacon
      .map(b => ({
        ...b,
        distance: calculateDistance(
          centerBeacon.lat,
          centerBeacon.lng,
          b.lat,
          b.lng
        )
      }))
      .filter(b => b.distance <= SEARCH_RADIUS)
      .sort((a, b) => a.distance - b.distance);
  }, [centerBeacon, allBeacons]);

  if (!centerBeacon) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-black uppercase text-white mb-1">
              {centerBeacon.title}
            </h3>
            <p className="text-xs text-white/60 uppercase tracking-wider">
              {centerBeacon.city} • {SEARCH_RADIUS}km radius
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Beacon Card */}
        <div 
          className="relative overflow-hidden rounded-lg border-2 cursor-pointer group"
          style={{ borderColor: getModeColor(centerBeacon.mode) }}
          onClick={() => onBeaconSelect(centerBeacon)}
        >
          {centerBeacon.image_url && (
            <div className="aspect-video w-full bg-black">
              <img 
                src={centerBeacon.image_url} 
                alt={centerBeacon.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
              />
            </div>
          )}
          <div className="p-3 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                style={{ backgroundColor: getModeColor(centerBeacon.mode) }}
              >
                {centerBeacon.mode || centerBeacon.kind}
              </div>
              {centerBeacon.intensity && (
                <div className="text-[10px] text-white/60">
                  {Math.round(centerBeacon.intensity * 100)}% intensity
                </div>
              )}
            </div>
            <p className="text-xs text-white/80 line-clamp-2">{centerBeacon.description}</p>
          </div>
        </div>
      </div>

      {/* Nearby Beacons List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black uppercase text-white/60">
            Nearby ({nearbyBeacons.length})
          </h4>
        </div>

        {nearbyBeacons.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">No beacons nearby</p>
            <p className="text-xs text-white/30 mt-1">Within {SEARCH_RADIUS}km radius</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyBeacons.map((beacon) => (
              <motion.div
                key={beacon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group cursor-pointer"
                onClick={() => onBeaconSelect(beacon)}
              >
                <div className="p-3 rounded-lg border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-start gap-3">
                    {/* Distance Badge */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-white/20">
                        <Navigation className="w-3 h-3 text-[#00D9FF]" />
                        <span className="text-xs font-bold">{formatDistance(beacon.distance)}</span>
                      </div>
                    </div>

                    {/* Beacon Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h5 className="text-sm font-bold text-white truncate">{beacon.title}</h5>
                        <div 
                          className="px-2 py-0.5 rounded text-[9px] font-black uppercase flex-shrink-0"
                          style={{ backgroundColor: getModeColor(beacon.mode) }}
                        >
                          {beacon.mode || beacon.kind}
                        </div>
                      </div>

                      {beacon.description && (
                        <p className="text-xs text-white/60 line-clamp-2 mb-2">
                          {beacon.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-white/40">
                        {beacon.venue_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {beacon.venue_name}
                          </span>
                        )}
                        {beacon.event_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(beacon.event_date).toLocaleDateString()}
                          </span>
                        )}
                        {beacon.intensity && (
                          <span>{Math.round(beacon.intensity * 100)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <Link to={createPageUrl('Events')}>
          <Button className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase">
            View All Events
          </Button>
        </Link>
      </div>
    </div>
  );
}