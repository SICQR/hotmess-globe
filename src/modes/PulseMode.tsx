/**
 * PulseMode - Immersive Globe + Events + Safety
 * 
 * Full immersive globe.
 * No stacked dashboard blocks under globe.
 * Globe persists and does not unmount on tab switch.
 * Data from Supabase domain layer.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';
import { getBeacons, getUpcomingEvents, getSafetyAlerts, subscribeToBeacons, type Beacon, type Event } from '@/lib/data';

// The globe is rendered in App.jsx (OSArchitecture) and persists
// This mode controls the HUD overlay and beacon interactions

interface PulseModeProps {
  className?: string;
}

export function PulseMode({ className = '' }: PulseModeProps) {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<Beacon[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'events' | 'safety' | 'hotspots'>('all');
  const { openSheet } = useSheet();

  // Load data from domain layer
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadData = async () => {
      const [beaconsData, eventsData, alertsData] = await Promise.all([
        getBeacons({ limit: 100 }),
        getUpcomingEvents(20),
        getSafetyAlerts(),
      ]);
      
      setBeacons(beaconsData);
      setEvents(eventsData);
      setSafetyAlerts(alertsData);

      // Subscribe to realtime updates
      unsubscribe = subscribeToBeacons((updated) => {
        setBeacons(updated);
      });
    };

    loadData();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleBeaconTap = (beacon: Beacon) => {
    if (beacon.type === 'event') {
      openSheet('EventSheet', { eventId: beacon.id });
    } else if (beacon.type === 'safety') {
      openSheet('SafetySheet', { alertId: beacon.id });
    } else {
      openSheet('BeaconSheet', { beaconId: beacon.id });
    }
  };

  const filteredBeacons = beacons.filter(b => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'events') return b.type === 'event';
    if (activeFilter === 'safety') return b.type === 'safety';
    if (activeFilter === 'hotspots') return b.type === 'hotspot' || b.type === 'presence';
    return true;
  });

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Filter bar - floating over globe */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'events', 'safety', 'hotspots'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === filter
                ? 'bg-white text-black'
                : 'bg-black/50 text-white/70 backdrop-blur-sm border border-white/10'
            }`}
          >
            {filter === 'all' && 'All'}
            {filter === 'events' && `Events (${events.length})`}
            {filter === 'safety' && `Safety (${safetyAlerts.length})`}
            {filter === 'hotspots' && 'Hotspots'}
          </button>
        ))}
      </div>

      {/* Event carousel at bottom */}
      {events.length > 0 && activeFilter !== 'safety' && (
        <div className="fixed bottom-24 left-0 right-0 z-30 px-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {events.slice(0, 5).map((event) => (
              <motion.button
                key={event.id}
                onClick={() => handleBeaconTap(event)}
                className="flex-shrink-0 w-64 p-3 bg-black/70 backdrop-blur-xl rounded-xl border border-white/10 text-left"
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-xs text-[#FF1493] font-medium mb-1">
                  {event.startTime ? new Date(event.startTime).toLocaleDateString() : 'Upcoming'}
                </div>
                <div className="text-white font-medium truncate">{event.title}</div>
                <div className="text-white/50 text-sm truncate">{event.address || 'Location TBA'}</div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Safety alerts banner */}
      <AnimatePresence>
        {safetyAlerts.length > 0 && activeFilter !== 'events' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 z-40"
          >
            <button
              onClick={() => openSheet('SafetySheet', {})}
              className="w-full p-3 bg-red-500/20 backdrop-blur-xl rounded-xl border border-red-500/30 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">
                  {safetyAlerts.length} active safety alert{safetyAlerts.length > 1 ? 's' : ''} nearby
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay */}
      <div className="fixed bottom-24 right-4 z-30 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="text-xs text-white/50">Active Beacons</div>
        <div className="text-xl font-bold text-white">{filteredBeacons.length}</div>
      </div>
    </div>
  );
}

export default PulseMode;
