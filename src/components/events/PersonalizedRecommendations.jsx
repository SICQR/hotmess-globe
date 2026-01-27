import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';
import EventCard from './EventCard';
import { EventRecommendationEngine } from './RecommendationEngine';

export default function PersonalizedRecommendations({ currentUser, allEvents, allRsvps }) {
  const { data: userCheckIns = [] } = useQuery({
    queryKey: ['user-checkins', currentUser?.email],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: eventViews = [] } = useQuery({
    queryKey: ['event-views', currentUser?.email],
    queryFn: () => base44.entities.EventView.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  if (!currentUser || allEvents.length === 0) return null;

  // Use advanced recommendation engine
  const engine = new EventRecommendationEngine(
    currentUser,
    allEvents,
    allRsvps,
    userCheckIns,
    eventViews
  );

  const recommendations = engine.getRecommendations(6, 15);

  if (recommendations.length === 0) return null;

  const myRsvpIds = new Set(allRsvps.filter(r => r.user_email === currentUser.email).map(r => r.event_id));

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#E62020]" />
          <h2 className="text-2xl font-black uppercase">Recommended For You</h2>
        </div>
        <p className="text-xs text-white/40 uppercase tracking-wider">
          Based on your vibes, past check-ins, and location
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((event, idx) => (
          <EventCard
            key={event.id}
            event={event}
            isRsvpd={myRsvpIds.has(event.id)}
            attendeeCount={allRsvps.filter(r => r.event_id === event.id).length}
            delay={idx * 0.05}
            recommendationScore={event.recommendationScore}
            scoreBreakdown={engine.explainScore(event)}
          />
        ))}
      </div>
    </div>
  );
}