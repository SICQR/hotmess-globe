import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { MapPin, Zap, Search, Plus, Filter, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BeaconListSkeleton } from '@/components/skeletons/PageSkeletons';
import EmptyState, { ErrorState } from '@/components/ui/EmptyState';

export default function Beacons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const { data: beacons = [], isLoading, error, refetch } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date'),
    retry: 2,
  });

  const filteredBeacons = beacons.filter(beacon => {
    const matchesSearch = beacon.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         beacon.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesKind = kindFilter === 'all' || beacon.kind === kindFilter;
    const matchesCity = cityFilter === 'all' || beacon.city === cityFilter;
    return matchesSearch && matchesKind && matchesCity;
  });

  const cities = [...new Set(beacons.map(b => b.city).filter(Boolean))];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-12 w-48 bg-white/10 rounded mb-8 animate-pulse" />
          <div className="flex gap-4 mb-8">
            <div className="h-10 w-40 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
          </div>
          <BeaconListSkeleton count={8} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <ErrorState
          title="Couldn't load beacons"
          description="We had trouble fetching location drops."
          type="network"
          onRetry={() => refetch()}
          error={error}
        />
      </div>
    );
  }

  const BEACON_COLORS = {
    event: '#FF1493',
    venue: '#FF1493',
    hookup: '#FF073A',
    drop: '#FF6B35',
    popup: '#B026FF',
    private: '#00D9FF',
  };

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/50 via-black to-pink-950/30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-7xl mx-auto"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-400 mb-4">LOCATION DROPS</p>
              <h1 className="text-5xl md:text-7xl font-black italic mb-4">
                BEACONS<span className="text-cyan-500">.</span>
              </h1>
              <p className="text-xl text-white/60 max-w-xl">
                Drop a pin. Signal your presence. Find what's happening around you.
              </p>
              <p className="text-base text-white/40 mt-2">{filteredBeacons.length} active beacons</p>
            </div>
            
            <div className="flex gap-3">
              <Link to="/pulse">
                <Button variant="outline" className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase">
                  <Globe className="w-5 h-5 mr-2" />
                  MAP VIEW
                </Button>
              </Link>
              <Link
                to={createPageUrl('CreateBeacon')}
                onClick={async (e) => {
                  const ok = await base44.auth.requireProfile(createPageUrl('CreateBeacon'));
                  if (!ok) e.preventDefault();
                }}
              >
                <Button variant="cyan" className="font-black uppercase">
                  <Plus className="w-5 h-5 mr-2" />
                  CREATE
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. FILTERS */}
      <section className="px-6 py-6 bg-black border-y border-white/10 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-cyan-500" />
            <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search beacons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white h-12"
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
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
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 3. BEACONS GRID */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredBeacons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBeacons.map((beacon, idx) => (
                <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl p-6 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: BEACON_COLORS[beacon.kind] || '#FF1493',
                          color: '#000'
                        }}
                      >
                        {beacon.kind}
                      </span>
                      {beacon.xp_scan && (
                        <span className="text-sm text-yellow-400 font-black">+{beacon.xp_scan} XP</span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-black mb-2 group-hover:text-cyan-400 transition-colors">
                      {beacon.title}
                    </h3>
                    
                    {beacon.description && (
                      <p className="text-sm text-white/50 mb-4 line-clamp-2">
                        {beacon.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="w-4 h-4 text-cyan-500" />
                        <span>{beacon.city || 'Unknown'}</span>
                      </div>
                      {beacon.intensity && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-black text-pink-500">{Math.round(beacon.intensity * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              preset="beacons"
              description={searchQuery ? 'Try different search terms' : 'Be the first to drop a beacon in your area'}
              action={async () => {
                const ok = await base44.auth.requireProfile(createPageUrl('CreateBeacon'));
                if (ok) window.location.href = createPageUrl('CreateBeacon');
              }}
              actionLabel="Create Beacon"
            />
          )}
        </div>
      </section>
    </div>
  );
}
