import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Zap, Flame, Loader2 } from 'lucide-react';
import { loadCityPack, isInPeakWindow } from '@/lib/globe/cityLoader';
import { isDisabled } from '@/lib/safety/killSwitch';

const CITIES = [
  { id: 'london', name: 'London', heat: 92, radio: true, events: 3 },
  { id: 'berlin', name: 'Berlin', heat: 87, radio: true, events: 2 },
  { id: 'paris', name: 'Paris', heat: 71, radio: false, events: 1 },
  { id: 'tokyo', name: 'Tokyo', heat: 83, radio: true, events: 2 },
  { id: 'san_francisco', name: 'SF', heat: 72, radio: false, events: 2 },
  { id: 'los_angeles', name: 'LA', heat: 65, radio: false, events: 1 },
  { id: 'sydney', name: 'Sydney', heat: 60, radio: false, events: 1 },
  { id: 'sao_paulo', name: 'São Paulo', heat: 70, radio: true, events: 2 },
];

export default function CityPulseBar({ onCitySelect, currentZoom = 5 }) {
  const [activeCity, setActiveCity] = useState(0);
  const [cityPack, setCityPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [peakZones, setPeakZones] = useState([]);

  // Filter out disabled cities - memoize to prevent infinite re-renders
  const availableCities = useMemo(() => 
    CITIES.filter(c => !isDisabled(c.id)),
    [] // CITIES is static, isDisabled is stable
  );

  // Auto-rotate through cities
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCity((prev) => (prev + 1) % availableCities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [availableCities.length]);

  // Load city pack when city changes (respects zoom >= 3 rule)
  useEffect(() => {
    const city = availableCities[activeCity];
    if (!city) return;

    const loadPack = async () => {
      setLoading(true);
      const pack = await loadCityPack(city.id, currentZoom);
      setCityPack(pack);
      
      // Check peak windows for zones
      if (pack?.zones) {
        const peaks = pack.zones
          .filter(zone => isInPeakWindow(pack, zone.id))
          .map(z => z.id);
        setPeakZones(peaks);
      } else {
        setPeakZones([]);
      }
      setLoading(false);
    };

    loadPack();
  }, [activeCity, currentZoom, availableCities]);

  const handleCityClick = useCallback((index) => {
    setActiveCity(index);
    const city = availableCities[index];
    if (onCitySelect) {
      onCitySelect(city);
    }
  }, [availableCities, onCitySelect]);

  const city = availableCities[activeCity];
  if (!city) return null;

  return (
    <div className="w-full bg-black/90 backdrop-blur-sm border-y border-pink-500/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* City selector */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {availableCities.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleCityClick(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap ${
                  i === activeCity 
                    ? 'bg-pink-500 text-black' 
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {c.name}
                {c.radio && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />}
              </button>
            ))}
          </div>

          {/* Live stats */}
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-4"
              >
                {/* Loading indicator */}
                {loading && (
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                )}

                {/* Heat */}
                <div className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 ${city.heat > 80 ? 'text-pink-500' : 'text-white/50'}`} />
                  <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-pink-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${city.heat}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-white/60">{city.heat}%</span>
                </div>

                {/* Radio live */}
                {city.radio && (
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500 uppercase">Live</span>
                  </div>
                )}

                {/* Events */}
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-white/60">{city.events} tonight</span>
                </div>

                {/* Peak zones indicator */}
                {peakZones.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-pink-400 uppercase">
                      {peakZones.length} zone{peakZones.length > 1 ? 's' : ''} peak
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* City pack zones (when loaded) */}
        {cityPack?.zones && currentZoom >= 5 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="pb-3 overflow-x-auto hide-scrollbar"
          >
            <div className="flex gap-2">
              {cityPack.zones.map(zone => (
                <div 
                  key={zone.id}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider whitespace-nowrap border ${
                    peakZones.includes(zone.id)
                      ? 'border-pink-500/50 bg-pink-500/20 text-pink-400'
                      : 'border-white/10 bg-white/5 text-white/40'
                  }`}
                >
                  {zone.id.replace(/_/g, ' ')}
                  <span className="ml-1 text-white/30">• {zone.energy}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
