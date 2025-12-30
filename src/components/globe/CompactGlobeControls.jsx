import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Flame, Activity, Building2, Clock, Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const LAYER_OPTIONS = [
  { id: 'pins', label: 'Beacons', icon: MapPin },
  { id: 'heat', label: 'Heat', icon: Flame },
  { id: 'activity', label: 'Streams', icon: Activity },
  { id: 'cities', label: 'Cities', icon: Building2 },
  { id: 'intents', label: 'Moods', icon: Zap },
];

const MODE_OPTIONS = [
  { id: 'hookup', label: 'Hookup', color: '#FF073A' },
  { id: 'crowd', label: 'Crowd', color: '#B026FF' },
  { id: 'drop', label: 'Drop', color: '#FF6B35' },
  { id: 'ticket', label: 'Ticket', color: '#FFEB3B' },
  { id: 'radio', label: 'Radio', color: '#00D9FF' },
  { id: 'care', label: 'Care', color: '#39FF14' },
];

export default function CompactGlobeControls({
  activeLayers = [],
  onLayersChange,
  activeMode,
  onModeChange,
  minIntensity = 0,
  onMinIntensityChange,
  activityVisibility = true,
  onActivityVisibilityToggle
}) {
  const toggleLayer = (layerId) => {
    const newLayers = activeLayers.includes(layerId)
      ? activeLayers.filter(l => l !== layerId)
      : [...activeLayers, layerId];
    onLayersChange?.(newLayers);
  };

  return (
    <div className="space-y-3">
      {/* Layers */}
      <div>
        <div className="text-[8px] tracking-wider text-white/40 uppercase mb-2">Layers</div>
        <div className="flex flex-wrap gap-1">
          {LAYER_OPTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeLayers.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleLayer(id)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                  isActive ? 'bg-[#FF1493] text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modes */}
      <div>
        <div className="text-[8px] tracking-wider text-white/40 uppercase mb-2">Modes</div>
        <div className="flex flex-wrap gap-1">
          {MODE_OPTIONS.map(({ id, label, color }) => {
            const isActive = activeMode === id;
            return (
              <button
                key={id}
                onClick={() => onModeChange?.(isActive ? null : id)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isActive ? 'text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                style={{ backgroundColor: isActive ? color : undefined }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[8px] tracking-wider text-white/40 uppercase">Intensity</div>
          <span className="text-xs font-bold">{Math.round(minIntensity * 100)}%+</span>
        </div>
        <Slider
          value={[minIntensity * 100]}
          onValueChange={(val) => onMinIntensityChange?.(val[0] / 100)}
          max={100}
          step={5}
        />
      </div>

      {/* Activity Visibility */}
      <Button
        onClick={onActivityVisibilityToggle}
        variant="ghost"
        size="sm"
        className={`w-full justify-between ${
          activityVisibility ? 'text-[#00D9FF]' : 'text-white/40'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider">My Activity</span>
        {activityVisibility ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </Button>
    </div>
  );
}