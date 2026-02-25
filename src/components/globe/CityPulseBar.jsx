import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Zap, Flame } from 'lucide-react';

const CITIES = [
  { id: 'london',       name: 'London',    heat: 92, radio: true,  events: 3 },
  { id: 'berlin',       name: 'Berlin',    heat: 87, radio: true,  events: 2 },
  { id: 'paris',        name: 'Paris',     heat: 71, radio: false, events: 1 },
  { id: 'tokyo',        name: 'Tokyo',     heat: 83, radio: true,  events: 2 },
  { id: 'new_york',     name: 'NYC',       heat: 75, radio: false, events: 2 },
  { id: 'los_angeles',  name: 'LA',        heat: 65, radio: false, events: 1 },
  { id: 'sydney',       name: 'Sydney',    heat: 60, radio: false, events: 1 },
  { id: 'sao_paulo',    name: 'Sao Paulo', heat: 70, radio: true,  events: 2 },
];

export default function CityPulseBar({ onCitySelect, selectedCityId }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (selectedCityId) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % CITIES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedCityId]);

  useEffect(() => {
    if (!selectedCityId) return;
    const idx = CITIES.findIndex(c => c.id === selectedCityId);
    if (idx >= 0) setActiveIdx(idx);
  }, [selectedCityId]);

  const city = CITIES[activeIdx];

  return (
    <div className="w-full bg-black/90 backdrop-blur-sm border-b border-[#C8962C]/20">
      <div className="px-4">
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{scrollbarWidth:'none'}}>
            {CITIES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => { setActiveIdx(i); onCitySelect?.(c); }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
                  i === activeIdx ? 'bg-[#C8962C] text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {c.name}
                {c.radio && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={city.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${city.heat > 80 ? 'text-[#C8962C]' : 'text-white/30'}`} />
                <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-[#C8962C]" animate={{width:`${city.heat}%`}} transition={{duration:0.5}} />
                </div>
              </div>
              {city.radio && <div className="flex items-center gap-1"><Radio className="w-3 h-3 text-green-400" /><span className="text-[10px] text-green-400 font-bold">Live</span></div>}
              <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#C8962C]" /><span className="text-[10px] text-white/50">{city.events}</span></div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
