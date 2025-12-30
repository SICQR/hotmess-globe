import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Flame, Activity, Building2 } from 'lucide-react';

const LAYER_OPTIONS = [
  { id: 'pins', label: 'BEACONS', icon: MapPin },
  { id: 'heat', label: 'HEAT', icon: Flame },
  { id: 'activity', label: 'ACTIVITY', icon: Activity },
  { id: 'cities', label: 'CITIES', icon: Building2 },
];

const MODE_OPTIONS = [
  { id: 'hookup', label: 'HOOKUP', color: '#FF073A' },
  { id: 'crowd', label: 'CROWD', color: '#B026FF' },
  { id: 'drop', label: 'DROP', color: '#FF6B35' },
  { id: 'ticket', label: 'TICKET', color: '#FFEB3B' },
  { id: 'radio', label: 'RADIO', color: '#00D9FF' },
  { id: 'care', label: 'CARE', color: '#39FF14' },
];

export default function GlobeControls({
  activeLayer,
  onLayerChange,
  activeMode,
  onModeChange,
  liveCount = 0
}) {
  return (
    <div className="absolute top-6 left-6 z-20 flex flex-col gap-4">
      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [1, 0.6, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-2.5 h-2.5 rounded-full bg-[#FF1493]"
          style={{ boxShadow: '0 0 10px #FF1493' }}
        />
        <div className="flex flex-col">
          <span className="text-[9px] tracking-[0.3em] text-white/50 font-medium uppercase">
            LIVE
          </span>
          <span className="text-xs tracking-wider text-white font-semibold">
            {liveCount} ACTIVE
          </span>
        </div>
      </motion.div>

      {/* Layer controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase px-2 mb-2">
          LAYERS
        </div>
        <div className="flex flex-col gap-1">
          {LAYER_OPTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeLayer === id;
            return (
              <motion.button
                key={id}
                onClick={() => onLayerChange?.(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-[#FF1493]/20 border border-[#FF1493]/40' 
                    : 'hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon 
                  className="w-4 h-4" 
                  style={{ 
                    color: isActive ? '#FF1493' : 'rgba(255, 255, 255, 0.5)' 
                  }}
                />
                <span 
                  className="text-[10px] tracking-[0.25em] font-semibold uppercase"
                  style={{ 
                    color: isActive ? '#FF1493' : 'rgba(255, 255, 255, 0.5)' 
                  }}
                >
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="layer-indicator"
                    className="w-1.5 h-1.5 rounded-full bg-[#FF1493] ml-auto"
                    style={{ boxShadow: '0 0 8px #FF1493' }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Mode filters */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase px-2 mb-2">
          MODES
        </div>
        <div className="flex flex-wrap gap-2 max-w-[200px]">
          {MODE_OPTIONS.map(({ id, label, color }) => {
            const isActive = activeMode === id;
            return (
              <motion.button
                key={id}
                onClick={() => onModeChange?.(isActive ? null : id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  px-3 py-1.5 rounded-lg text-[9px] tracking-[0.2em] font-bold uppercase
                  transition-all
                  ${isActive 
                    ? 'text-black' 
                    : 'text-white/50 hover:text-white/80 bg-white/5 border border-white/10'
                  }
                `}
                style={{
                  backgroundColor: isActive ? color : undefined,
                  borderColor: isActive ? color : undefined,
                  boxShadow: isActive ? `0 0 20px ${color}40` : undefined
                }}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}