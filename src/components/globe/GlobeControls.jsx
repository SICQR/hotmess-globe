import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Flame, Route, Building2, Zap } from 'lucide-react';

const LAYER_CONFIG = [
  { key: 'pins', label: 'BEACONS', icon: MapPin, color: '#ff1744' },
  { key: 'heat', label: 'HEAT', icon: Flame, color: '#ff6b35' },
  { key: 'trails', label: 'TRAILS', icon: Route, color: '#9c27b0' },
  { key: 'cities', label: 'CITIES', icon: Building2, color: '#00bcd4' },
];

const MODE_CONFIG = [
  { key: 'hookup', label: 'HOOKUP', color: '#ff1744' },
  { key: 'crowd', label: 'CROWD', color: '#9c27b0' },
  { key: 'drop', label: 'DROP', color: '#ff6b35' },
  { key: 'ticket', label: 'TICKET', color: '#ffeb3b' },
  { key: 'radio', label: 'RADIO', color: '#4caf50' },
  { key: 'care', label: 'CARE', color: '#00bcd4' },
];

export default function GlobeControls({
  layers,
  onLayerToggle,
  activeMode,
  onModeChange,
  liveCount = 0,
}) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl"
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-[#ff1744]"
        />
        <span className="text-[10px] tracking-[0.3em] text-white/90 font-medium">
          LIVE
        </span>
        <span className="text-[10px] tracking-wider text-white/60">
          {liveCount} ACTIVE
        </span>
      </motion.div>

      {/* Layer toggles */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-1 p-2 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl"
      >
        <span className="text-[8px] tracking-[0.4em] text-white/40 px-2 pb-1">
          LAYERS
        </span>
        {LAYER_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const isActive = layers?.[key] ?? false;
          return (
            <motion.button
              key={key}
              onClick={() => onLayerToggle?.(key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                ${isActive 
                  ? 'bg-white/10 border border-white/20' 
                  : 'bg-transparent border border-transparent hover:bg-white/5'
                }
              `}
            >
              <Icon 
                className="w-3.5 h-3.5" 
                style={{ color: isActive ? color : 'rgba(255,255,255,0.4)' }}
              />
              <span 
                className="text-[9px] tracking-[0.25em] font-medium"
                style={{ color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId={`layer-dot-${key}`}
                  className="w-1.5 h-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: color }}
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Mode filters */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-1 p-2 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl"
      >
        <span className="text-[8px] tracking-[0.4em] text-white/40 px-2 pb-1">
          MODES
        </span>
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {MODE_CONFIG.map(({ key, label, color }) => {
            const isActive = activeMode === key;
            return (
              <motion.button
                key={key}
                onClick={() => onModeChange?.(isActive ? null : key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  px-2.5 py-1.5 rounded-lg text-[8px] tracking-[0.2em] font-medium transition-all
                  ${isActive 
                    ? 'text-black' 
                    : 'text-white/50 hover:text-white/80 bg-white/5'
                  }
                `}
                style={{
                  backgroundColor: isActive ? color : undefined,
                  borderColor: isActive ? color : 'transparent',
                  border: '1px solid',
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