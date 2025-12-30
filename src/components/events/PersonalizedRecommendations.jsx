import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';
import EventCard from './EventCard';

export default function PersonalizedRecommendations({ currentUser, allEvents, allRsvps }) {
  const { data: userCheckIns = [] } = useQuery({
    queryKey: ['user-checkins', currentUser?.email],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  if (!currentUser || allEvents.length === 0) return null;

  // Score events based on user preferences
  const scoredEvents = allEvents.map(event => {
    let score = 0;

    // 1. Location match (30 points)
    if (event.city === currentUser.city) {
      score += 30;
    }

    // 2. Mode/Type match based on past check-ins (25 points)
    const userModes = new Set(userCheckIns.map(ci => ci.beacon_mode).filter(Boolean));
    if (event.mode && userModes.has(event.mode)) {
      score += 25;
    }

    // 3. Event preferences match (20 points)
    const eventDesc = `${event.title} ${event.description || ''} ${event.mode || ''}`.toLowerCase();
    const userPrefs = currentUser.event_preferences || [];
    const matchingPrefs = userPrefs.filter(pref => eventDesc.includes(pref.toLowerCase()));
    score += matchingPrefs.length * 10;

    // 4. Music taste match (15 points)
    const userMusicTaste = currentUser.music_taste || [];
    const matchingMusic = userMusicTaste.filter(genre => eventDesc.includes(genre.toLowerCase()));
    score += matchingMusic.length * 5;

    // 5. Proximity to past venues (10 points)
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const nearbyCheckIns = userCheckIns.filter(ci => {
      if (!ci.lat || !ci.lng || !event.lat || !event.lng) return false;
      const distance = haversineDistance(ci.lat, ci.lng, event.lat, event.lng);
      return distance < 2; // Within 2km
    });
    if (nearbyCheckIns.length > 0) {
      score += 10;
    }

    // 6. Popularity bonus (5 points max)
    const attendeeCount = allRsvps.filter(r => r.event_id === event.id).length;
    score += Math.min(5, attendeeCount / 10);

    return { ...event, recommendationScore: Math.round(score) };
  });

  // Get top recommendations (score > 15)
  const recommendations = scoredEvents
    .filter(e => e.recommendationScore > 15)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 6);

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
          <Sparkles className="w-5 h-5 text-[#FF1493]" />
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
          />
        ))}
      </div>
    </div>
  );
}