import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { MapPin, Zap, Filter, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Beacons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const { data: beacons = [], isLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date'),
  });

  const filteredBeacons = beacons.filter(beacon => {
    const matchesSearch = beacon.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         beacon.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKind = kindFilter === 'all' || beacon.kind === kindFilter;
    const matchesCity = cityFilter === 'all' || beacon.city === cityFilter;
    return matchesSearch && matchesKind && matchesCity;
  });

  const cities = [...new Set(beacons.map(b => b.city))];

  const BEACON_COLORS = {
    event: '#FF1493',
    venue: '#FF1493',
    hookup: '#FF073A',
    drop: '#FF6B35',
    popup: '#B026FF',
    private: '#00D9FF',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/60">Loading beacons...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Beacons
            </h1>
            <p className="text-white/60">{filteredBeacons.length} active beacons</p>
          </div>
          <Link to={createPageUrl('CreateBeacon')}>
            <Button className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search beacons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black border-white/20 text-white"
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="bg-black border-white/20 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="hookup">Hookup</SelectItem>
                <SelectItem value="drop">Drop</SelectItem>
                <SelectItem value="popup">Popup</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="bg-black border-white/20 text-white">
                <SelectValue placeholder="City" />
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

        {/* Beacons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBeacons.map((beacon, idx) => (
            <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: BEACON_COLORS[beacon.kind] || '#FF1493',
                      color: '#000'
                    }}
                  >
                    {beacon.kind}
                  </span>
                  {beacon.xp_scan && (
                    <span className="text-xs text-[#FFEB3B] font-bold">+{beacon.xp_scan} XP</span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold mb-2">{beacon.title}</h3>
                
                {beacon.description && (
                  <p className="text-sm text-white/60 mb-3 line-clamp-2">
                    {beacon.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{beacon.city}</span>
                  </div>
                  {beacon.intensity && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#FF1493]" />
                      <span className="text-xs font-bold">{Math.round(beacon.intensity * 100)}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {filteredBeacons.length === 0 && (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No beacons found</p>
          </div>
        )}
      </div>
    </div>
  );
}