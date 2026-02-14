import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';
import { Sparkles, MapPin, Loader2 } from 'lucide-react';
import logger from '@/utils/logger';

export default function AIRecommendations({ user, beacons, limit = 3 }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: interactions = [] } = useQuery({
    queryKey: ['user-interactions', user?.email],
    queryFn: () => base44.entities.UserInteraction.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user
  });

  useEffect(() => {
    const generateRecommendations = async () => {
      if (!user || !beacons.length || isLoading) return;

      setIsLoading(true);

      try {
        // Build user profile summary
        const interactionSummary = interactions.reduce((acc, int) => {
          acc[int.beacon_kind] = (acc[int.beacon_kind] || 0) + 1;
          return acc;
        }, {});

        const topInteractions = Object.entries(interactionSummary)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([kind]) => kind);

        // Get visited beacon IDs to exclude
        const visitedIds = interactions.map(i => i.beacon_id);

        // Filter available beacons
        const availableBeacons = beacons.filter(b => !visitedIds.includes(b.id));

        if (availableBeacons.length === 0) {
          setRecommendations([]);
          setIsLoading(false);
          return;
        }

        // Use AI to recommend beacons
        const prompt = `You are a nightlife recommendation engine for HOTMESS, a queer nightlife app.

User Profile:
- Level: ${Math.floor((user.xp || 0) / 1000) + 1}
- XP: ${user.xp || 0}
- Top interests (based on past interactions): ${topInteractions.join(', ') || 'none yet'}
- Total interactions: ${interactions.length}

Available Events/Beacons:
${availableBeacons.slice(0, 20).map(b => `- ID: ${b.id}, Title: ${b.title}, Type: ${b.kind}, City: ${b.city}, Mode: ${b.mode}, Intensity: ${b.intensity || 0.5}`).join('\n')}

Based on the user's profile and past behavior, recommend the top ${limit} beacons that would best match their interests. Consider:
1. Their preferred event types (${topInteractions.join(', ')})
2. Their engagement level (XP and level)
3. Event intensity and variety

Return ONLY an array of beacon IDs in order of recommendation strength.`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        });

        const recommendedIds = response.recommendations?.slice(0, limit) || [];
        const recommendedBeacons = recommendedIds
          .map(id => availableBeacons.find(b => b.id === id))
          .filter(Boolean);

        setRecommendations(recommendedBeacons);
      } catch (error) {
        logger.error('Failed to generate recommendations:', error);
        // Fallback to simple recommendation
        const fallback = beacons
          .filter(b => !interactions.some(i => i.beacon_id === b.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, limit);
        setRecommendations(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    generateRecommendations();
  }, [user, beacons, interactions, limit]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-[#B026FF]/10 to-[#FF1493]/10 border border-[#B026FF]/30 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#B026FF] animate-spin mr-2" />
        <span className="text-white/60">Generating personalized recommendations...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const BEACON_COLORS = {
    event: '#FF1493',
    venue: '#FF1493',
    hookup: '#FF073A',
    drop: '#FF6B35',
    popup: '#B026FF',
    private: '#00D9FF',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#B026FF]" />
        <h2 className="text-xl font-black uppercase tracking-tight">AI Picks For You</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((beacon, idx) => (
          <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-[#B026FF]/10 to-[#FF1493]/10 border border-[#B026FF]/30 rounded-xl p-5 hover:border-[#B026FF]/50 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <Sparkles className="w-4 h-4 text-[#B026FF]" />
              </div>
              <div className="flex items-start justify-between mb-3">
                <span
                  className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: BEACON_COLORS[beacon.kind] || '#FF1493',
                    color: '#000'
                  }}
                >
                  {beacon.kind}
                </span>
                {beacon.xp_scan && (
                  <span className="text-xs text-[#FFEB3B] font-bold">+{beacon.xp_scan} XP</span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-2">{beacon.title}</h3>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <MapPin className="w-4 h-4" />
                <span>{beacon.city}</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}