import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Calendar, MapPin, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function EventsMapView({ events, userLocation, radius = 5, onClose }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filter events with valid coordinates
  const mappableEvents = useMemo(() => {
    return events.filter(e => e.lat && e.lng);
  }, [events]);

  // Calculate distance
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Filter events within radius
  const nearbyEvents = useMemo(() => {
    if (!userLocation) return mappableEvents;
    
    return mappableEvents.filter(e => {
      const distance = haversineDistance(
        userLocation.lat, 
        userLocation.lng, 
        e.lat, 
        e.lng
      );
      return distance <= radius;
    });
  }, [mappableEvents, userLocation, radius]);

  // Default center (London)
  const center = userLocation || { lat: 51.5074, lng: -0.1278 };

  // Create custom icon based on event type
  const getMarkerColor = (mode) => {
    const colors = {
      crowd: '#FF1493',
      hookup: '#FF073A',
      drop: '#FF6B35',
      ticket: '#B026FF',
      radio: '#00D9FF',
      default: '#FFEB3B'
    };
    return colors[mode] || colors.default;
  };

  const createCustomIcon = (mode) => {
    const color = getMarkerColor(mode);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    });
  };

  if (mappableEvents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/60 mb-4">No events with location data available</p>
          <Button onClick={onClose} className="bg-[#FF1493] text-black font-black">
            Back to List
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-black/95 backdrop-blur-xl border-b-2 border-[#FF1493] p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h2 className="text-2xl font-black uppercase">Events Near Me</h2>
            <p className="text-xs text-white/40 uppercase tracking-wider">
              {nearbyEvents.length} events within {radius}km
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="h-full pt-20">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* User location circle */}
          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={radius * 1000}
                pathOptions={{
                  color: '#00D9FF',
                  fillColor: '#00D9FF',
                  fillOpacity: 0.1,
                  weight: 2
                }}
              />
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: `<div style="
                    background-color: #00D9FF;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 20px #00D9FF;
                  "></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })}
              >
                <Popup>
                  <div className="text-black font-bold text-sm">Your Location</div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Event markers */}
          {nearbyEvents.map(event => (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={createCustomIcon(event.mode)}
              eventHandlers={{
                click: () => setSelectedEvent(event)
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-black text-sm mb-2">{event.title}</h3>
                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    {event.event_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(event.event_date), 'MMM d, HH:mm')}</span>
                      </div>
                    )}
                    {event.venue_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{event.venue_name}</span>
                      </div>
                    )}
                  </div>
                  <Link to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                    <button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-white font-black text-xs py-2 px-3 uppercase">
                      View Event
                    </button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected Event Card */}
      {selectedEvent && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed right-0 top-20 bottom-0 w-full md:w-96 bg-black border-l-2 border-[#FF1493] p-6 overflow-y-auto z-[1000]"
        >
          <button
            onClick={() => setSelectedEvent(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {selectedEvent.image_url && (
            <img
              src={selectedEvent.image_url}
              alt={selectedEvent.title}
              className="w-full h-48 object-cover mb-4 border-2 border-white"
            />
          )}

          <h2 className="text-2xl font-black mb-3">{selectedEvent.title}</h2>

          {selectedEvent.description && (
            <p className="text-sm text-white/80 mb-4">{selectedEvent.description}</p>
          )}

          <div className="space-y-2 mb-4">
            {selectedEvent.event_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#FF1493]" />
                <span>{format(new Date(selectedEvent.event_date), 'EEEE, MMMM d, yyyy - HH:mm')}</span>
              </div>
            )}
            {selectedEvent.venue_name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#FF1493]" />
                <span>{selectedEvent.venue_name}, {selectedEvent.city}</span>
              </div>
            )}
          </div>

          <Link to={createPageUrl(`BeaconDetail?id=${selectedEvent.id}`)}>
            <Button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black">
              View Full Details
            </Button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}