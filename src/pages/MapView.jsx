import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView() {
  const [cityFilter, setCityFilter] = useState('all');

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons-map'],
    queryFn: () => base44.entities.Beacon.filter({ active: true })
  });

  const cities = [...new Set(beacons.map(b => b.city))];
  const filteredBeacons = cityFilter === 'all' ? beacons : beacons.filter(b => b.city === cityFilter);

  const centerLat = filteredBeacons.length > 0 
    ? filteredBeacons.reduce((sum, b) => sum + b.lat, 0) / filteredBeacons.length 
    : 51.5074;
  const centerLng = filteredBeacons.length > 0 
    ? filteredBeacons.reduce((sum, b) => sum + b.lng, 0) / filteredBeacons.length 
    : -0.1278;

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-xl border-b border-white/10 p-4 z-[1000]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-[#FF1493]" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Map View</h1>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-white/60" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px] bg-black border-white/20 text-white">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredBeacons.map(beacon => (
            <Marker key={beacon.id} position={[beacon.lat, beacon.lng]}>
              <Popup>
                <div className="text-black">
                  <h3 className="font-bold mb-1">{beacon.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{beacon.city}</p>
                  <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                    <button className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800">
                      View Details
                    </button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}