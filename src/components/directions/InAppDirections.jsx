import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Footprints, 
  Bike, 
  Car, 
  X, 
  Maximize2, 
  Minimize2,
  Clock,
  MapPin,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchRoutingDirections } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { decodeGooglePolyline } from '@/utils/googlePolyline';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { cn } from '@/lib/utils';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * InAppDirections - Embeddable map component for profiles/events
 * 
 * Shows directions to a location without leaving the app
 * Supports walking, biking, driving, and Uber deep link
 */

const TRAVEL_MODES = [
  { id: 'foot', label: 'Walk', icon: Footprints, apiMode: 'WALK', color: '#39FF14' },
  { id: 'bike', label: 'Bike', icon: Bike, apiMode: 'BICYCLE', color: '#00D9FF' },
  { id: 'drive', label: 'Drive', icon: Car, apiMode: 'DRIVE', color: '#FF1493' },
];

const makePinIcon = ({ label, color, glow }) => {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `
      <div style="
        width:36px;height:36px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background: rgba(0,0,0,0.8);
        border: 2px solid ${color};
        box-shadow: 0 0 12px ${glow || color};
        backdrop-filter: blur(4px);
        color: ${color};
        font-weight: 900;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      ">${label}</div>
    `.trim(),
  });
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// Component to fit map bounds to route
const FitBounds = ({ origin, destination }) => {
  const map = useMap();
  
  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, origin, destination]);
  
  return null;
};

export default function InAppDirections({
  destination,
  destinationName,
  destinationAddress,
  onClose,
  compact = false,
  expandable = true,
  className,
}) {
  const [mode, setMode] = useState('foot');
  const [isExpanded, setIsExpanded] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [locationError, setLocationError] = useState(null);
  
  // Get user's location
  useEffect(() => {
    if (!destination) return;
    
    safeGetViewerLatLng(
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      { retries: 2, logKey: 'in-app-directions' }
    ).then((loc) => {
      if (loc) {
        setOrigin({ lat: loc.lat, lng: loc.lng });
        setLocationError(null);
      } else {
        setLocationError('Enable location to see directions');
      }
    });
  }, [destination]);
  
  // Fetch directions
  const modeConfig = TRAVEL_MODES.find(m => m.id === mode);
  const canFetch = !!origin && !!destination;
  
  const { data: directions, isLoading, error } = useQuery({
    queryKey: ['directions', mode, origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: () => fetchRoutingDirections({ 
      origin, 
      destination, 
      mode: modeConfig?.apiMode || 'WALK',
      ttlSeconds: 120 
    }),
    enabled: canFetch,
    retry: false,
    staleTime: 60000,
  });
  
  // Decode polyline
  const polylinePoints = useMemo(() => {
    const encoded = directions?.polyline?.encoded;
    if (typeof encoded === 'string' && encoded.trim()) {
      return decodeGooglePolyline(encoded).map((p) => [p.lat, p.lng]);
    }
    
    const pts = directions?.polyline?.points;
    if (Array.isArray(pts) && pts.length) {
      return pts
        .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
        .map((p) => [p.lat, p.lng]);
    }
    
    // Fallback to straight line
    if (origin && destination) {
      return [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ];
    }
    
    return [];
  }, [directions?.polyline, origin, destination]);
  
  // Map center
  const mapCenter = useMemo(() => {
    if (destination) return [destination.lat, destination.lng];
    return [51.5074, -0.1278]; // London fallback
  }, [destination]);
  
  // Marker icons
  const originIcon = useMemo(
    () => makePinIcon({ label: 'YOU', color: '#00D9FF', glow: 'rgba(0,217,255,0.6)' }),
    []
  );
  const destinationIcon = useMemo(
    () => makePinIcon({ label: 'GO', color: '#FF1493', glow: 'rgba(255,20,147,0.6)' }),
    []
  );
  
  // Uber deep link
  const uberUrl = useMemo(() => {
    if (!destination) return null;
    return buildUberDeepLink({ 
      dropoffLat: destination.lat, 
      dropoffLng: destination.lng, 
      dropoffNickname: destinationName || 'Destination' 
    });
  }, [destination, destinationName]);
  
  // Open full directions page
  const openFullDirections = () => {
    const params = new URLSearchParams();
    params.set('lat', String(destination.lat));
    params.set('lng', String(destination.lng));
    if (destinationName) params.set('label', destinationName);
    params.set('mode', mode);
    window.location.href = `/directions?${params.toString()}`;
  };
  
  if (!destination) return null;
  
  const duration = formatDuration(directions?.duration_seconds);
  const distance = formatDistance(directions?.distance_meters);
  
  // Compact view - just shows ETA buttons
  if (compact && !isExpanded) {
    return (
      <div className={cn("bg-black border-2 border-white/10", className)}>
        <div className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin className="w-4 h-4 text-[#FF1493]" />
            <span className="truncate max-w-[120px]">{destinationName || 'Destination'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {TRAVEL_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-xs font-bold border transition-all",
                  mode === m.id
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-transparent border-white/10 text-white/50 hover:text-white hover:border-white/20"
                )}
              >
                <m.icon className="w-3 h-3" />
                {mode === m.id && duration && <span>{duration}</span>}
              </button>
            ))}
            
            {expandable && (
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 text-white/40 hover:text-white transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Expanded view - full map
  return (
    <motion.div
      initial={compact ? { opacity: 0, scale: 0.95 } : false}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-black border-2 border-[#FF1493]",
        isExpanded ? "fixed inset-4 z-50" : "",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-[#FF1493]" />
          <div>
            <h3 className="font-black text-sm uppercase text-white">
              {destinationName || 'Directions'}
            </h3>
            {destinationAddress && (
              <p className="text-xs text-white/50 truncate max-w-[200px]">{destinationAddress}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Travel Mode Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/10">
        {TRAVEL_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold border-2 transition-all",
              mode === m.id
                ? "bg-white/10 border-white/30 text-white"
                : "bg-transparent border-white/10 text-white/50 hover:text-white hover:border-white/20"
            )}
          >
            <m.icon className="w-4 h-4" style={{ color: mode === m.id ? m.color : undefined }} />
            <span>{m.label}</span>
          </button>
        ))}
        
        {/* Uber button */}
        <button
          onClick={() => uberUrl && window.open(uberUrl, '_blank')}
          disabled={!uberUrl}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold border-2 border-white/10 bg-transparent text-white/50 hover:text-white hover:border-white/20 transition-all"
        >
          <Car className="w-4 h-4" />
          <span>Uber</span>
          <ExternalLink className="w-3 h-3 opacity-50" />
        </button>
      </div>
      
      {/* Map */}
      <div className={cn("relative", isExpanded ? "h-[calc(100%-180px)]" : "h-[250px]")}>
        {locationError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <div className="text-center p-4">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm">{locationError}</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {origin && destination && <FitBounds origin={origin} destination={destination} />}
            
            {origin && <Marker position={[origin.lat, origin.lng]} icon={originIcon} />}
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
            
            {polylinePoints.length >= 2 && (
              <>
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{ color: modeConfig?.color || '#FF1493', weight: 8, opacity: 0.3 }}
                />
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{ color: modeConfig?.color || '#FF1493', weight: 5, opacity: 0.9 }}
                />
              </>
            )}
          </MapContainer>
        )}
        
        {isLoading && (
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/80 px-3 py-1.5 text-xs text-white/60">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading route...</span>
          </div>
        )}
      </div>
      
      {/* Route Info */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-lg font-black text-white">{duration}</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/60">{distance}</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={openFullDirections}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Full Directions
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * DirectionsButton - Compact button that opens directions
 */
export function DirectionsButton({
  destination,
  destinationName,
  variant = 'outline',
  size = 'sm',
  className,
}) {
  const [showDirections, setShowDirections] = useState(false);
  
  if (!destination?.lat || !destination?.lng) return null;
  
  return (
    <>
      <Button
        onClick={() => setShowDirections(true)}
        variant={variant}
        size={size}
        className={cn("border-white/20 text-white hover:bg-white/10", className)}
      >
        <Navigation className="w-4 h-4 mr-1" />
        Directions
      </Button>
      
      <AnimatePresence>
        {showDirections && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDirections(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <InAppDirections
                destination={destination}
                destinationName={destinationName}
                onClose={() => setShowDirections(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * ETABadges - Compact ETA display for profile cards
 */
export function ETABadges({ etas, onModeSelect, className }) {
  if (!etas || Object.keys(etas).length === 0) return null;
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {etas.walk && (
        <button
          onClick={() => onModeSelect?.('foot')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Footprints className="w-3 h-3" />
          <span>{Math.round(etas.walk / 60)}m</span>
        </button>
      )}
      {etas.bike && (
        <button
          onClick={() => onModeSelect?.('bike')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Bike className="w-3 h-3" />
          <span>{Math.round(etas.bike / 60)}m</span>
        </button>
      )}
      {etas.drive && (
        <button
          onClick={() => onModeSelect?.('drive')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Car className="w-3 h-3" />
          <span>{Math.round(etas.drive / 60)}m</span>
        </button>
      )}
    </div>
  );
}
