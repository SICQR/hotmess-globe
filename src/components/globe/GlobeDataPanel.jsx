import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Zap, Users, ExternalLink, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const BEACON_KIND_CONFIG = {
  event: { label: 'EVENT', color: '#FF1493', icon: Zap },
  venue: { label: 'VENUE', color: '#FF1493', icon: MapPin },
  hookup: { label: 'HOOKUP', color: '#FF073A', icon: Users },
  drop: { label: 'DROP', color: '#FF6B35', icon: TrendingUp },
  popup: { label: 'POPUP', color: '#B026FF', icon: MapPin },
  private: { label: 'PRIVATE', color: '#00D9FF', icon: Users },
  ticket: { label: 'TICKET', color: '#FFEB3B', icon: MapPin },
  care: { label: 'CARE', color: '#39FF14', icon: MapPin },
};

function BeaconDetail({ beacon, onClose }) {
  const config = BEACON_KIND_CONFIG[beacon.kind || 'event'];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-2xl bg-black/95 border border-white/10 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                backgroundColor: `${config.color}20`,
                boxShadow: `0 0 20px ${config.color}30`
              }}
            >
              <Icon className="w-5 h-5" style={{ color: config.color }} />
            </div>
            <div>
              <span 
                className="px-2 py-1 rounded text-[9px] tracking-[0.2em] font-bold uppercase"
                style={{ 
                  backgroundColor: config.color,
                  color: beacon.kind === 'ticket' ? '#000' : '#fff'
                }}
              >
                {config.label}
              </span>
              {beacon.sponsored && (
                <span className="ml-2 px-2 py-1 rounded bg-white text-black text-[9px] tracking-[0.2em] font-bold uppercase">
                  SPONSORED
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <h3 className="text-white text-xl font-bold tracking-wide">
          {beacon.title || 'BEACON'}
        </h3>
        {beacon.description && (
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            {beacon.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="p-5 space-y-4">
        {beacon.venue_name && (
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-4 h-4 text-[#FF1493]" />
            <span className="text-white text-sm font-bold">
              {beacon.venue_name}
            </span>
          </div>
        )}
        
        {beacon.city && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-white/40" />
            <span className="text-white/80 text-sm font-medium">
              {beacon.city}
            </span>
          </div>
        )}

        {beacon.event_date && (
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-white/80 text-sm">
              {format(new Date(beacon.event_date), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>
        )}

        {beacon.capacity && (
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-white/40" />
            <span className="text-white/80 text-sm">
              Capacity: {beacon.capacity}
            </span>
          </div>
        )}

        {beacon.intensity !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] tracking-[0.3em] text-white/40 uppercase font-medium">
                INTENSITY
              </span>
              <span className="text-sm text-white font-bold">
                {Math.round(beacon.intensity * 100)}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${beacon.intensity * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: config.color,
                  boxShadow: `0 0 10px ${config.color}`
                }}
              />
            </div>
          </div>
        )}

        {beacon.xp_scan && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FF1493]/10 border border-[#FF1493]/20">
            <span className="text-[10px] tracking-[0.25em] text-white/60 uppercase font-medium">
              SCAN XP
            </span>
            <span className="text-lg text-[#FF1493] font-bold">
              +{beacon.xp_scan} XP
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActivityFeed({ activities, onBeaconSelect }) {
  return (
    <div className="rounded-2xl bg-black/90 border border-white/10 backdrop-blur-xl overflow-hidden flex flex-col max-h-96">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] tracking-[0.4em] text-white/60 font-medium uppercase">
            LIVE FEED
          </h4>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-[#FF1493]"
            style={{ boxShadow: '0 0 8px #FF1493' }}
          />
        </div>
      </div>

      {/* Feed */}
      <div className="overflow-y-auto max-h-80">
        <AnimatePresence>
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/30 text-sm">No activity yet</p>
            </div>
          ) : (
            activities.map((activity, idx) => {
              const config = BEACON_KIND_CONFIG[activity.kind || 'event'];
              const Icon = config.icon;

              return (
                <motion.button
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onBeaconSelect?.(activity)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left group"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: `${config.color}20`,
                      boxShadow: `0 0 15px ${config.color}20`
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-semibold truncate">
                        {activity.title || 'Beacon'}
                      </span>
                      {activity.sponsored && (
                        <span className="px-1.5 py-0.5 rounded bg-white/20 text-[8px] tracking-wider text-white/80 uppercase font-bold">
                          AD
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{activity.city || 'Unknown'}</span>
                      <span>•</span>
                      <span>
                        {activity.ts 
                          ? format(new Date(activity.ts), 'h:mm a')
                          : 'Just now'
                        }
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 mt-1 transition-colors" />
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function GlobeDataPanel({
  selectedBeacon,
  recentActivity = [],
  onClose,
  onBeaconSelect
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-3 max-h-[calc(100vh-100px)] overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {selectedBeacon && (
          <BeaconDetail 
            key={selectedBeacon.id}
            beacon={selectedBeacon} 
            onClose={onClose} 
          />
        )}
      </AnimatePresence>

      <ActivityFeed 
        activities={recentActivity}
        onBeaconSelect={onBeaconSelect}
      />
    </motion.div>
  );
}