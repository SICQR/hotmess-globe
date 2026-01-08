import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Cloud, CloudRain, Sun, Wind, Zap, Bus, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock real-time data generator (replace with actual APIs in production)
const generateCityData = (city, beacons, checkIns) => {
  const cityBeacons = beacons.filter(b => b.city === city.name && b.active);
  const recentCheckIns = checkIns.filter(
    c => new Date(c.created_date) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
  );
  
  const cityCheckIns = recentCheckIns.filter(c => {
    const beacon = beacons.find(b => b.id === c.beacon_id);
    return beacon && beacon.city === city.name;
  });

  // Weather simulation (replace with actual weather API)
  const weatherTypes = ['sunny', 'cloudy', 'rainy', 'windy'];
  const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  const temp = Math.floor(Math.random() * 20) + 10; // 10-30°C

  // Transit simulation (replace with actual transit API)
  const transitStatus = Math.random() > 0.3 ? 'normal' : 'delayed';

  // Heat calculation based on check-ins and weather
  const baseHeat = cityCheckIns.length / 10;
  const weatherMultiplier = weather === 'rainy' ? 0.7 : weather === 'sunny' ? 1.3 : 1.0;
  const heat = Math.min(baseHeat * weatherMultiplier, 10);

  return {
    name: city.name,
    weather,
    temp,
    transitStatus,
    heat,
    activeVenues: cityBeacons.length,
    recentCheckIns: cityCheckIns.length,
    trending: cityCheckIns.length > 5
  };
};

const WeatherIcon = ({ type }) => {
  switch (type) {
    case 'sunny': return <Sun className="w-4 h-4 text-[#FFEB3B]" />;
    case 'rainy': return <CloudRain className="w-4 h-4 text-[#00D9FF]" />;
    case 'windy': return <Wind className="w-4 h-4 text-white/60" />;
    default: return <Cloud className="w-4 h-4 text-white/40" />;
  }
};

export default function CityDataOverlay({ selectedCity, onCitySelect }) {
  const [cityData, setCityData] = useState([]);

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => base44.entities.City.list(),
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list(),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['beacon-checkins'],
    queryFn: () => base44.entities.BeaconCheckIn.list(),
  });

  useEffect(() => {
    if (cities.length > 0 && beacons.length > 0) {
      const data = cities.map(city => generateCityData(city, beacons, checkIns));
      setCityData(data);

      // Refresh data every 30 seconds
      const interval = setInterval(() => {
        const newData = cities.map(city => generateCityData(city, beacons, checkIns));
        setCityData(newData);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [cities, beacons, checkIns]);

  if (cityData.length === 0) return null;

  return (
    <div className="absolute top-20 left-4 z-20 space-y-2 max-w-xs">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-lg p-3 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-4 h-4 text-[#FF1493]" />
          </motion.div>
          <h3 className="text-xs font-black uppercase tracking-wider">LIVE CITY DATA</h3>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="ml-auto w-2 h-2 bg-red-500 rounded-full"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {cityData
            .sort((a, b) => b.heat - a.heat)
            .slice(0, 5)
            .map((city, idx) => (
              <motion.button
                key={city.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onCitySelect(city.name)}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer
                  ${selectedCity === city.name
                    ? 'bg-[#FF1493]/20 border-[#FF1493] shadow-lg shadow-[#FF1493]/20'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm">{city.name}</h4>
                    {city.trending && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-[#FF1493]"
                      >
                        <Flame className="w-3 h-3" />
                      </motion.div>
                    )}
                  </div>
                  <WeatherIcon type={city.weather} />
                </div>

                <div className="flex items-center gap-4 text-[10px] text-white/60">
                  <div className="flex items-center gap-1">
                    <Bus className="w-3 h-3" />
                    <span className={city.transitStatus === 'delayed' ? 'text-red-400' : ''}>
                      {city.transitStatus === 'delayed' ? 'DELAYS' : 'ON TIME'}
                    </span>
                  </div>
                  <div>{city.temp}°C</div>
                  <div>{city.recentCheckIns} check-ins</div>
                </div>

                {/* Heat Bar */}
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#FF1493] via-[#FF6B35] to-[#FFEB3B]"
                    initial={{ width: 0 }}
                    animate={{ width: `${city.heat * 10}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-white/30"
                    animate={{ 
                      x: ['-100%', '200%'],
                      opacity: [0, 0.5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                      delay: idx * 0.1
                    }}
                    style={{ width: '50%' }}
                  />
                </div>
              </motion.button>
            ))}
        </div>
      </motion.div>

      {selectedCity && (
        <AnimatePresence>
          {(() => {
            const selected = cityData.find(c => c.name === selectedCity);
            if (!selected) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-black/90 backdrop-blur-xl border-2 border-[#FF1493] rounded-lg p-4"
              >
                <h3 className="font-black uppercase mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF1493]" />
                  {selected.name} • LIVE
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Weather</span>
                    <div className="flex items-center gap-2">
                      <WeatherIcon type={selected.weather} />
                      <span className="font-bold">{selected.temp}°C</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Public Transit</span>
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4" />
                      <span className={`font-bold uppercase text-xs ${
                        selected.transitStatus === 'delayed' ? 'text-red-400' : 'text-[#39FF14]'
                      }`}>
                        {selected.transitStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Active Venues</span>
                    <span className="font-black text-[#FF1493]">{selected.activeVenues}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Check-ins (1h)</span>
                    <span className="font-black text-[#00D9FF]">{selected.recentCheckIns}</span>
                  </div>

                  <div>
                    <span className="text-white/60 block mb-2">Nightlife Heat</span>
                    <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[#FF1493] via-[#FF6B35] to-[#FFEB3B]"
                        initial={{ width: 0 }}
                        animate={{ width: `${selected.heat * 10}%` }}
                        transition={{ duration: 0.8 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-black text-xs text-white mix-blend-difference">
                          {(selected.heat * 10).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 20, 147, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 20, 147, 0.8);
        }
      `}</style>
    </div>
  );
}