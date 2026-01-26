import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function RelatedEvents({ currentEvent, userPreferences = [] }) {
  const { data: allEvents = [] } = useQuery({
    queryKey: ['related-events', currentEvent.id],
    queryFn: async () => {
      const events = await base44.entities.Beacon.filter({ 
        kind: 'event', 
        active: true 
      }, '-event_date', 50);
      return events.filter(e => e.id !== currentEvent.id);
    },
  });

  // Score events based on similarity
  const scoredEvents = allEvents.map(event => {
    let score = 0;
    
    // Same city = high relevance
    if (event.city === currentEvent.city) score += 10;
    
    // Same mode
    if (event.mode === currentEvent.mode) score += 5;
    
    // User preferences match
    if (userPreferences.length > 0) {
      const eventModeMatch = userPreferences.includes(event.mode);
      if (eventModeMatch) score += 3;
    }
    
    // Upcoming events are more relevant
    if (event.event_date) {
      const daysUntil = Math.floor((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 14) score += 5;
    }
    
    return { ...event, score };
  });

  const relatedEvents = scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (relatedEvents.length === 0) return null;

  return (
    <div className="bg-black border-2 border-white p-6">
      <h3 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-[#FF1493]" />
        RELATED EVENTS
      </h3>
      <div className="space-y-4">
        {relatedEvents.map((event, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link 
              to={`/events/${encodeURIComponent(event.id)}`}
              className="block group"
            >
              <div className="bg-black border-2 border-white/20 hover:border-[#FF1493] transition-all p-4">
                {event.image_url && (
                  <div className="h-32 mb-3 overflow-hidden border-2 border-white/10">
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  </div>
                )}
                <h4 className="font-black uppercase tracking-tight mb-2 group-hover:text-[#FF1493] transition-colors">
                  {event.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="uppercase font-mono">{event.city}</span>
                  </div>
                  {event.event_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="uppercase font-mono">
                        {format(new Date(event.event_date), 'MMM d')}
                      </span>
                    </div>
                  )}
                  {event.mode && (
                    <span className="px-2 py-0.5 bg-[#B026FF]/20 border border-[#B026FF] text-[#B026FF] uppercase text-[10px] font-black">
                      {event.mode}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}