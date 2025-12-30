import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Flame, Activity, Building2, Zap, Clock, Eye, EyeOff } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const LAYER_OPTIONS = [
  { id: 'pins', label: 'BEACONS', icon: MapPin, description: 'Show beacon markers' },
  { id: 'heat', label: 'HEATMAP', icon: Flame, description: 'Beacon density visualization' },
  { id: 'activity', label: 'STREAMS', icon: Activity, description: 'Live activity trails' },
  { id: 'cities', label: 'CITIES', icon: Building2, description: 'City tier overlays' },
];

const MODE_OPTIONS = [
  { id: 'hookup', label: 'HOOKUP', color: '#FF073A' },
  { id: 'crowd', label: 'CROWD', color: '#B026FF' },
  { id: 'drop', label: 'DROP', color: '#FF6B35' },
  { id: 'ticket', label: 'TICKET', color: '#FFEB3B' },
  { id: 'radio', label: 'RADIO', color: '#00D9FF' },
  { id: 'care', label: 'CARE', color: '#39FF14' },
];

const BEACON_TYPE_OPTIONS = [
  { id: 'event', label: 'EVENT', color: '#FF1493' },
  { id: 'venue', label: 'VENUE', color: '#FF1493' },
  { id: 'hookup', label: 'HOOKUP', color: '#FF073A' },
  { id: 'drop', label: 'DROP', color: '#FF6B35' },
  { id: 'popup', label: 'POPUP', color: '#B026FF' },
  { id: 'private', label: 'PRIVATE', color: '#00D9FF' },
];

const RECENCY_OPTIONS = [
  { id: 'all', label: 'ALL TIME' },
  { id: '5m', label: '5 MIN', minutes: 5 },
  { id: '15m', label: '15 MIN', minutes: 15 },
  { id: '30m', label: '30 MIN', minutes: 30 },
  { id: '1h', label: '1 HOUR', minutes: 60 },
];

export default function GlobeControls({
  activeLayer,
  onLayerChange,
  activeLayers = [],
  onLayersChange,
  activeMode,
  onModeChange,
  liveCount = 0,
  beaconType,
  onBeaconTypeChange,
  minIntensity = 0,
  onMinIntensityChange,
  recencyFilter = 'all',
  onRecencyFilterChange,
  activityVisibility = true,
  onActivityVisibilityToggle
}) {
  const handleLayerToggle = (layerId) => {
    const newLayers = activeLayers.includes(layerId)
      ? activeLayers.filter(l => l !== layerId)
      : [...activeLayers, layerId];
    onLayersChange?.(newLayers);
  };
  return (
    <div className="md:absolute md:top-6 md:left-6 md:z-20 flex flex-col gap-4 p-4 md:p-0">
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
          {LAYER_OPTIONS.map(({ id, label, icon: Icon, description }) => {
            const isActive = activeLayers.includes(id);
            return (
              <motion.button
                key={id}
                onClick={() => handleLayerToggle(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-[#FF1493]/20 border border-[#FF1493]/40' 
                    : 'hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isActive ? 'bg-[#FF1493]' : 'bg-white/10'}
                `}>
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-black" />
                  ) : (
                    <Icon className="w-3 h-3 text-white/40" />
                  )}
                </div>
                <div className="flex-1">
                  <div 
                    className="text-[10px] tracking-[0.25em] font-semibold uppercase"
                    style={{ 
                      color: isActive ? '#FF1493' : 'rgba(255, 255, 255, 0.5)' 
                    }}
                  >
                    {label}
                  </div>
                  <div className="text-[8px] text-white/30 mt-0.5">
                    {description}
                  </div>
                </div>
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

      {/* Beacon type filter */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase px-2 mb-2">
          TYPE
        </div>
        <div className="flex flex-wrap gap-2 max-w-[200px]">
          {BEACON_TYPE_OPTIONS.map(({ id, label, color }) => {
            const isActive = beaconType === id;
            return (
              <motion.button
                key={id}
                onClick={() => onBeaconTypeChange?.(isActive ? null : id)}
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

      {/* Intensity filter */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-white/40" />
            <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase">
              INTENSITY
            </div>
          </div>
          <span className="text-xs text-white font-bold">
            {Math.round(minIntensity * 100)}%+
          </span>
        </div>
        <div className="px-2">
          <Slider
            value={[minIntensity * 100]}
            onValueChange={(val) => onMinIntensityChange?.(val[0] / 100)}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      </motion.div>

      {/* Recency filter */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="flex items-center gap-2 px-2 mb-2">
          <Clock className="w-3 h-3 text-white/40" />
          <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase">
            RECENCY
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {RECENCY_OPTIONS.map(({ id, label }) => {
            const isActive = recencyFilter === id;
            return (
              <motion.button
                key={id}
                onClick={() => onRecencyFilterChange?.(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  px-3 py-2 rounded-lg text-[9px] tracking-[0.2em] font-bold uppercase
                  transition-all text-left
                  ${isActive 
                    ? 'bg-[#FF1493]/20 border border-[#FF1493]/40 text-[#FF1493]' 
                    : 'text-white/50 hover:text-white/80 bg-white/5 border border-transparent'
                  }
                `}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Activity Visibility Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl p-3"
      >
        <div className="text-[8px] tracking-[0.4em] text-white/40 font-medium uppercase px-2 mb-2">
          My Activity
        </div>
        <Button
          onClick={onActivityVisibilityToggle}
          variant="ghost"
          className={`
            w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
            ${activityVisibility 
              ? 'bg-[#00D9FF]/20 border border-[#00D9FF]/40 text-[#00D9FF]' 
              : 'bg-white/5 border border-white/10 text-white/50'
            }
          `}
        >
          <span className="text-[10px] tracking-[0.25em] font-semibold uppercase">
            {activityVisibility ? 'Visible' : 'Hidden'}
          </span>
          {activityVisibility ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>
        <div className="text-[8px] text-white/30 mt-2 px-2">
          {activityVisibility 
            ? 'Others can see your activity' 
            : 'Your activity is private'
          }
        </div>
      </motion.div>
    </div>
  );
}