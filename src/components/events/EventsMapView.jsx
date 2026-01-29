import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
// createPageUrl no longer used after privacy URL refactor
import { getProfileUrl } from '@/lib/userPrivacy';
import { Calendar, MapPin, X, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [showLayer, setShowLayer] = useState('both'); // 'events', 'people', 'both'

  // Fetch active users with real-time polling
  const { data: activeUsers = [] } = useQuery({
    queryKey: ['active-users-map'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => 
        u.lat && 
        u.lng && 
        u.activity_status && 
        u.activity_status !== 'offline'
      );
    },
    refetchInterval: 5000
  });

  const { data: recentCheckIns = [] } = useQuery({
    queryKey: ['recent-checkins-map'],
    queryFn: () => base44.entities.BeaconCheckIn.list('-created_date', 50),
    refetchInterval: 10000
  });

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

  // Filter users within radius
  const nearbyUsers = useMemo(() => {
    if (!userLocation) return activeUsers;
    
    return activeUsers.filter(u => {
      const distance = haversineDistance(
        userLocation.lat,
        userLocation.lng,
        u.lat,
        u.lng
      );
      return distance <= radius;
    });
  }, [activeUsers, userLocation, radius]);

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

  // Create user avatar icon
  const createUserIcon = (user) => {
    const statusColors = {
      online: '#00D9FF',
      busy: '#FF6B35',
      looking_for_collabs: '#39FF14',
      at_event: '#FF1493'
    };
    const color = statusColors[user.activity_status] || '#00D9FF';
    
    const avatarHtml = user.avatar_url 
      ? `<img src="${user.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
      : `<span style="font-weight: bold; font-size: 14px;">${(user.full_name || 'U')[0]}</span>`;

    return L.divIcon({
      className: 'user-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid ${color};
          background: linear-gradient(135deg, #FF1493, #B026FF);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px ${color}, 0 0 5px rgba(0,0,0,0.5);
          overflow: hidden;
          color: white;
          position: relative;
        ">
          ${avatarHtml}
          <div style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid black;
            animation: pulse 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-black uppercase">RIGHT NOW</h2>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {nearbyEvents.length} events • {nearbyUsers.length} people online • {radius}km radius
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
          
          {/* Layer Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLayer('both')}
              className={`px-3 py-1.5 text-xs font-black uppercase border-2 transition-all ${
                showLayer === 'both'
                  ? 'bg-[#FF1493] border-[#FF1493] text-black'
                  : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              BOTH
            </button>
            <button
              onClick={() => setShowLayer('events')}
              className={`px-3 py-1.5 text-xs font-black uppercase border-2 transition-all ${
                showLayer === 'events'
                  ? 'bg-[#FF1493] border-[#FF1493] text-black'
                  : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              EVENTS ({nearbyEvents.length})
            </button>
            <button
              onClick={() => setShowLayer('people')}
              className={`px-3 py-1.5 text-xs font-black uppercase border-2 transition-all ${
                showLayer === 'people'
                  ? 'bg-[#FF1493] border-[#FF1493] text-black'
                  : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              PEOPLE ({nearbyUsers.length})
            </button>
          </div>
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
          {(showLayer === 'events' || showLayer === 'both') && nearbyEvents.map(event => (
            <Marker
              key={`event-${event.id}`}
              position={[event.lat, event.lng]}
              icon={createCustomIcon(event.mode)}
              eventHandlers={{
                click: () => {
                  setSelectedEvent(event);
                  setSelectedUser(null);
                }
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
                  <Link to={`/events/${encodeURIComponent(event.id)}`}>
                    <button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-white font-black text-xs py-2 px-3 uppercase">
                      View Event
                    </button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User markers */}
          {(showLayer === 'people' || showLayer === 'both') && nearbyUsers.map(user => (
            <Marker
              key={`user-${user.email}`}
              position={[user.lat, user.lng]}
              icon={createUserIcon(user)}
              eventHandlers={{
                click: () => {
                  setSelectedUser(user);
                  setSelectedEvent(null);
                }
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold">{(user.full_name || 'U')[0]}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-sm">{user.full_name}</h3>
                      <p className="text-xs text-gray-600 uppercase">{user.activity_status?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {user.bio && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{user.bio}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <Zap className="w-3 h-3" />
                    <span>Level {Math.floor((user.xp || 0) / 1000) + 1}</span>
                  </div>
                  <Link to={getProfileUrl(user)}>
                    <button className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black text-xs py-2 px-3 uppercase">
                      View Profile
                    </button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected User Card */}
      {selectedUser && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed right-0 top-32 bottom-0 w-full md:w-80 bg-black border-l-2 border-[#00D9FF] p-6 overflow-y-auto z-[1000]"
        >
          <button
            onClick={() => setSelectedUser(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden border-2 border-white">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold">{(selectedUser.full_name || 'U')[0]}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black">{selectedUser.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
                <span className="text-xs uppercase font-bold text-[#00D9FF]">
                  {selectedUser.activity_status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {selectedUser.bio && (
            <p className="text-sm text-white/80 mb-4">{selectedUser.bio}</p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-[#FFEB3B]" />
              <span>Level {Math.floor((selectedUser.xp || 0) / 1000) + 1} • {selectedUser.xp || 0} XP</span>
            </div>
            {selectedUser.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#FF1493]" />
                <span>{selectedUser.city}</span>
              </div>
            )}
          </div>

          {selectedUser.preferred_vibes && selectedUser.preferred_vibes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-white/40 uppercase mb-2">Vibes</p>
              <div className="flex flex-wrap gap-2">
                {selectedUser.preferred_vibes.map(vibe => (
                  <span key={vibe} className="px-2 py-1 bg-[#FFEB3B]/20 border border-[#FFEB3B]/40 text-[#FFEB3B] text-xs font-bold uppercase">
                    {vibe}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link to={getProfileUrl(user)}>
            <Button className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black">
              View Full Profile
            </Button>
          </Link>
        </motion.div>
      )}

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

          <Link to={`/events/${encodeURIComponent(selectedEvent.id)}`}>
            <Button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black">
              View Full Details
            </Button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}