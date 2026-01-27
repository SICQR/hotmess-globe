import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Circle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function GlobeSearch({
  beacons = [],
  cities = [],
  onSearchResults,
  onClearSearch,
  onRadiusSearch
}) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [radiusMode, setRadiusMode] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const searchRef = useRef(null);

  // Search logic
  const searchResults = useMemo(() => {
    if (!query.trim()) return { beacons: [], cities: [] };

    const lowerQuery = query.toLowerCase();
    
    const matchedCities = cities.filter(city =>
      city.name.toLowerCase().includes(lowerQuery)
    );

    const matchedBeacons = beacons.filter(beacon =>
      (beacon.title?.toLowerCase().includes(lowerQuery)) ||
      (beacon.city?.toLowerCase().includes(lowerQuery)) ||
      (beacon.description?.toLowerCase().includes(lowerQuery))
    );

    return {
      cities: matchedCities.slice(0, 5),
      beacons: matchedBeacons.slice(0, 10)
    };
  }, [query, beacons, cities]);

  const totalResults = searchResults.cities.length + searchResults.beacons.length;

  // Handle search submission
  const handleSearch = () => {
    if (totalResults > 0) {
      onSearchResults?.({
        beacons: searchResults.beacons,
        cities: searchResults.cities,
        query
      });
      setShowResults(false);
    }
  };

  // Handle radius search
  const handleRadiusSearch = (center) => {
    setSelectedCenter(center);
    
    // Calculate beacons within radius
    const results = beacons.filter(beacon => {
      const distance = calculateDistance(
        center.lat, center.lng,
        beacon.lat, beacon.lng
      );
      return distance <= radiusKm;
    });

    onRadiusSearch?.({
      center,
      radiusKm,
      beacons: results
    });
    
    setRadiusMode(false);
    setQuery('');
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    setRadiusMode(false);
    setSelectedCenter(null);
    onClearSearch?.();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Search className="w-4 h-4 text-white/40" />
        </div>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') handleClear();
          }}
          placeholder="Search cities, beacons..."
          className="pl-10 pr-24 bg-black/90 border-white/20 text-white placeholder:text-white/40 focus:border-[#E62020]/40"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRadiusMode(!radiusMode)}
            className={`h-7 w-7 ${radiusMode ? 'text-[#E62020] bg-[#E62020]/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Circle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Radius Mode Panel */}
      <AnimatePresence>
        {radiusMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-black/95 border border-white/10 backdrop-blur-xl rounded-xl p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/60 uppercase tracking-wider">Radius Search</span>
              <span className="text-sm text-white font-bold">{radiusKm} km</span>
            </div>
            <Slider
              value={[radiusKm]}
              onValueChange={(val) => setRadiusKm(val[0])}
              min={5}
              max={500}
              step={5}
              className="mb-4"
            />
            <div className="text-xs text-white/40 mb-3">
              Select a city or beacon to set the center point
            </div>
            {selectedCenter && (
              <div className="text-xs text-white/60 mb-3 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-[#E62020]" />
                Center: {selectedCenter.name}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {showResults && query && totalResults > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-black/95 border border-white/10 backdrop-blur-xl rounded-xl overflow-hidden z-50 max-h-96 overflow-y-auto"
          >
            {/* Cities */}
            {searchResults.cities.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-[9px] tracking-[0.3em] text-white/40 uppercase">
                  Cities ({searchResults.cities.length})
                </div>
                {searchResults.cities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      if (radiusMode) {
                        handleRadiusSearch(city);
                      } else {
                        onSearchResults?.({ cities: [city], beacons: [], query });
                        setShowResults(false);
                      }
                    }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 rounded-lg transition-colors text-left"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: city.active ? '#E6202020' : '#ffffff10',
                        border: city.active ? '1px solid #E6202040' : '1px solid #ffffff10'
                      }}
                    >
                      <MapPin 
                        className="w-4 h-4" 
                        style={{ color: city.active ? '#E62020' : '#ffffff60' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">
                        {city.name}
                      </div>
                      <div className="text-white/40 text-xs">
                        Tier {city.tier} • {city.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    {radiusMode && (
                      <Circle className="w-4 h-4 text-[#E62020]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Beacons */}
            {searchResults.beacons.length > 0 && (
              <div className="p-2 border-t border-white/10">
                <div className="px-3 py-2 text-[9px] tracking-[0.3em] text-white/40 uppercase">
                  Beacons ({searchResults.beacons.length})
                </div>
                {searchResults.beacons.map((beacon) => (
                  <button
                    key={beacon.id}
                    onClick={() => {
                      if (radiusMode) {
                        handleRadiusSearch(beacon);
                      } else {
                        onSearchResults?.({ beacons: [beacon], cities: [], query });
                        setShowResults(false);
                      }
                    }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 rounded-lg transition-colors text-left"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: '#E6202020',
                        border: '1px solid #E6202040'
                      }}
                    >
                      <MapPin className="w-4 h-4 text-[#E62020]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-semibold truncate">
                        {beacon.title || 'Beacon'}
                      </div>
                      <div className="text-white/40 text-xs">
                        {beacon.city} • {beacon.kind}
                      </div>
                    </div>
                    {radiusMode && (
                      <Circle className="w-4 h-4 text-[#E62020]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {showResults && query && totalResults === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-black/95 border border-white/10 backdrop-blur-xl rounded-xl p-6 z-50 text-center"
          >
            <Search className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No results found</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Haversine distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}