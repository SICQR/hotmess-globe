import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, Flame, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { format } from 'date-fns';
import { fromUTC } from '../utils/dateUtils';

export default function AIEventRecommendations({ currentUser }) {
  const [loading, setLoading] = useState(false);

  const { data: recommendations, refetch } = useQuery({
    queryKey: ['ai-event-recommendations', currentUser?.email],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getAIEventRecommendations', {});
      return data;
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const handleRefresh = async () => {
    setLoading(true);
    await refetch();
    setLoading(false);
  };

  if (!recommendations?.recommendations?.length) return null;

  const topRecs = recommendations.recommendations.slice(0, 4);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#B026FF]" />
          <h2 className="text-2xl font-black uppercase">
            AI PICKS FOR YOU
          </h2>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-[#B026FF] text-[#B026FF] hover:bg-[#B026FF]/10"
        >
          <Sparkles className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {recommendations.user_profile && (
        <div className="mb-4 text-xs text-white/60 uppercase">
          Based on: {recommendations.user_profile.archetype} • {recommendations.user_profile.interests.join(', ')}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topRecs.map((rec, idx) => {
          const event = rec.event;
          const isHighMatch = rec.score >= 80;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-gradient-to-br ${
                isHighMatch 
                  ? 'from-[#B026FF]/20 to-[#FF1493]/20 border-2 border-[#B026FF]' 
                  : 'from-white/5 to-white/5 border border-white/10'
              } rounded-xl p-4 relative overflow-hidden`}
            >
              {isHighMatch && (
                <motion.div
                  className="absolute top-2 right-2 bg-gradient-to-r from-[#FF1493] to-[#B026FF] px-3 py-1 rounded-full text-xs font-black flex items-center gap-1"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className="w-3 h-3" />
                  HOT MATCH
                </motion.div>
              )}

              {event.image_url && (
                <img 
                  src={event.image_url} 
                  alt={event.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}

              <div className="mb-3">
                <h3 className="text-lg font-bold mb-1">{event.title}</h3>
                {event.venue_name && (
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                    <MapPin className="w-3 h-3" />
                    {event.venue_name}
                  </div>
                )}
                {event.event_date && (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Calendar className="w-3 h-3" />
                    {format(fromUTC(event.event_date), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 uppercase">Match Score</span>
                  <span 
                    className="text-sm font-black"
                    style={{ 
                      color: rec.score >= 80 ? '#B026FF' : rec.score >= 60 ? '#FF1493' : '#00D9FF' 
                    }}
                  >
                    {rec.score}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#B026FF] to-[#FF1493]"
                    initial={{ width: 0 }}
                    animate={{ width: `${rec.score}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 }}
                  />
                </div>
              </div>

              {rec.ai_explanation && (
                <div className="bg-[#B026FF]/10 border border-[#B026FF]/30 p-3 rounded-lg mb-3">
                  <p className="text-xs text-[#B026FF] font-bold">
                    {rec.ai_explanation}
                  </p>
                </div>
              )}

              {rec.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {rec.reasons.slice(0, 3).map((reason, i) => (
                    <span 
                      key={i}
                      className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}

              <Link to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                <Button 
                  className={`w-full ${
                    isHighMatch 
                      ? 'bg-gradient-to-r from-[#B026FF] to-[#FF1493] hover:opacity-90' 
                      : 'bg-white/10 hover:bg-white/20'
                  } text-white font-black`}
                >
                  VIEW EVENT
                </Button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}