import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Activity, X, Filter } from 'lucide-react';

export default function CityDiscovery({ 
  cities = [], 
  beacons = [],
  onCitySelect,
  onClose 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');

  // Calculate activity per city
  const cityActivity = useMemo(() => {
    const activity = {};
    beacons.forEach(beacon => {
      if (beacon.city) {
        activity[beacon.city] = (activity[beacon.city] || 0) + 1;
      }
    });
    return activity;
  }, [beacons]);

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    let filtered = cities;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(city => 
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      const tier = parseInt(tierFilter);
      filtered = filtered.filter(city => city.tier === tier);
    }

    // Activity filter
    if (activityFilter !== 'all') {
      filtered = filtered.filter(city => {
        const count = cityActivity[city.name] || 0;
        if (activityFilter === 'high') return count >= 3;
        if (activityFilter === 'medium') return count >= 1 && count < 3;
        if (activityFilter === 'none') return count === 0;
        return true;
      });
    }

    // Sort by activity level (descending)
    return filtered.sort((a, b) => {
      const countA = cityActivity[a.name] || 0;
      const countB = cityActivity[b.name] || 0;
      return countB - countA;
    });
  }, [cities, searchQuery, tierFilter, activityFilter, cityActivity]);

  return (
    <div className="flex flex-col h-full bg-black/95 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold tracking-wider uppercase text-sm">
            City Discovery
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cities..."
            className="w-full bg-white/5 text-white pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:border-[#FF1493] focus:outline-none text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-[#FF1493] focus:outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
          </select>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-lg border border-white/10 focus:border-[#FF1493] focus:outline-none"
          >
            <option value="all">All Activity</option>
            <option value="high">High (3+)</option>
            <option value="medium">Medium (1-2)</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* City List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {filteredCities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/30 text-sm">No cities found</p>
            </div>
          ) : (
            filteredCities.map((city, idx) => {
              const activityCount = cityActivity[city.name] || 0;
              const activityLevel = activityCount >= 3 ? 'high' : activityCount >= 1 ? 'medium' : 'none';

              return (
                <motion.button
                  key={city.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onCitySelect?.(city)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left group"
                >
                  {/* City Icon */}
                  <div 
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                      ${city.active 
                        ? 'bg-[#FF1493]/20 border border-[#FF1493]/40' 
                        : 'bg-white/5 border border-white/10'
                      }
                    `}
                  >
                    <MapPin 
                      className={`w-5 h-5 ${city.active ? 'text-[#FF1493]' : 'text-white/60'}`} 
                    />
                  </div>

                  {/* City Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-semibold truncate">
                        {city.name}
                      </span>
                      {city.active && (
                        <span className="px-1.5 py-0.5 rounded bg-[#FF1493]/20 text-[#FF1493] text-[8px] tracking-wider uppercase font-bold">
                          ACTIVE
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[8px] tracking-wider uppercase font-bold">
                        T{city.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Activity className="w-3 h-3" />
                      <span>
                        {activityCount} {activityCount === 1 ? 'beacon' : 'beacons'}
                      </span>
                      {activityLevel === 'high' && (
                        <span className="text-[#FF1493]">• High Activity</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg 
                    className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/10 bg-black/50">
        <div className="flex items-center justify-between text-xs">
          <div className="text-white/40">
            <span className="text-white font-semibold">{filteredCities.length}</span> cities
          </div>
          <div className="text-white/40">
            <span className="text-white font-semibold">
              {Object.values(cityActivity).reduce((a, b) => a + b, 0)}
            </span> total beacons
          </div>
        </div>
      </div>
    </div>
  );
}