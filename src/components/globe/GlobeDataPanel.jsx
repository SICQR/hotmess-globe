import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Users, Zap, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const KIND_CONFIG = {
  event: { label: 'EVENT', color: '#ff1744', icon: Zap },
  drop: { label: 'DROP', color: '#ff6b35', icon: MapPin },
  sponsor: { label: 'SPONSOR', color: '#ffffff', icon: Users },
  checkin: { label: 'CHECK-IN', color: '#9c27b0', icon: MapPin },
  product: { label: 'PRODUCT', color: '#ffeb3b', icon: MapPin },
  other: { label: 'BEACON', color: '#00bcd4', icon: MapPin },
};

export default function GlobeDataPanel({
  selectedBeacon,
  selectedCity,
  recentActivity = [],
  onClose,
  onBeaconSelect,
}) {
  const hasSelection = selectedBeacon || selectedCity;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-4 right-4 bottom-4 w-80 z-20 flex flex-col gap-3"
    >
      {/* Selection detail */}
      <AnimatePresence mode="wait">
        {hasSelection && (
          <motion.div
            key={selectedBeacon?.id || selectedCity?.name}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  {selectedBeacon && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="px-2 py-0.5 rounded text-[8px] tracking-[0.2em] font-bold"
                          style={{ 
                            backgroundColor: KIND_CONFIG[selectedBeacon.kind || 'other'].color,
                            color: selectedBeacon.kind === 'sponsor' ? '#000' : '#fff'
                          }}
                        >
                          {KIND_CONFIG[selectedBeacon.kind || 'other'].label}
                        </span>
                        {selectedBeacon.sponsored && (
                          <span className="px-2 py-0.5 rounded bg-white text-black text-[8px] tracking-[0.2em] font-bold">
                            SPONSORED
                          </span>
                        )}
                      </div>
                      <h3 className="text-white text-lg font-bold tracking-wide">
                        {selectedBeacon.title || 'BEACON'}
                      </h3>
                      <p className="text-white/50 text-sm mt-1">
                        {selectedBeacon.city || 'Unknown Location'}
                      </p>
                    </>
                  )}
                  {selectedCity && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedCity.active && (
                          <span className="px-2 py-0.5 rounded bg-[#ff1744] text-white text-[8px] tracking-[0.2em] font-bold">
                            ACTIVE
                          </span>
                        )}
                        {selectedCity.sponsored && (
                          <span className="px-2 py-0.5 rounded bg-white text-black text-[8px] tracking-[0.2em] font-bold">
                            SPONSORED
                          </span>
                        )}
                      </div>
                      <h3 className="text-white text-lg font-bold tracking-wide">
                        {selectedCity.name}
                      </h3>
                      <p className="text-white/50 text-sm mt-1">
                        Tier {selectedCity.tier} City
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {selectedBeacon && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedBeacon.ts 
                      ? format(new Date(selectedBeacon.ts), 'MMM d, h:mm a')
                      : 'Just now'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedBeacon.lat?.toFixed(4)}, {selectedBeacon.lng?.toFixed(4)}
                  </span>
                </div>
                {selectedBeacon.intensity && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] tracking-[0.2em] text-white/40">INTENSITY</span>
                      <span className="text-sm text-white font-medium">
                        {Math.round(selectedBeacon.intensity * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedBeacon.intensity * 100}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#ff1744' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity feed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex-1 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-xl overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] tracking-[0.4em] text-white/60 font-medium">
              ACTIVITY FEED
            </h4>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[#ff1744]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-white/30 text-sm">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((item, idx) => {
                const config = KIND_CONFIG[item.kind || 'other'];
                const Icon = config.icon;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onBeaconSelect?.(item)}
                    className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {item.title || 'Beacon'}
                        </span>
                        {item.sponsored && (
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-[7px] tracking-wider text-white/80">
                            AD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/40 text-xs">
                          {item.city || 'Unknown'}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-white/40 text-xs">
                          {item.ts 
                            ? format(new Date(item.ts), 'h:mm a')
                            : 'Just now'
                          }
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-1" />
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}