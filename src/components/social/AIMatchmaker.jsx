import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, MapPin, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function AIMatchmaker({ currentUser }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: userIntents = [] } = useQuery({
    queryKey: ['user-intents'],
    queryFn: () => base44.entities.UserIntent.filter({ visible: true }, '-created_date', 50)
  });

  const { data: userInteractions = [] } = useQuery({
    queryKey: ['user-interactions', currentUser?.email],
    queryFn: () => currentUser 
      ? base44.entities.UserInteraction.filter({ user_email: currentUser.email }, '-created_date', 100)
      : [],
    enabled: !!currentUser
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ['all-interactions'],
    queryFn: () => base44.entities.UserInteraction.list('-created_date', 500)
  });

  useEffect(() => {
    if (!currentUser || !allUsers.length) return;
    generateMatches();
  }, [currentUser, allUsers, userIntents, userInteractions, allInteractions]);

  const generateMatches = async () => {
    setLoading(true);
    try {
      // Get current user's intent
      const myIntent = userIntents.find(i => i.user_email === currentUser.email);
      
      // Get current user's interaction history
      const myBeacons = userInteractions
        .filter(i => i.interaction_type === 'scan')
        .map(i => i.beacon_id);

      // Build match candidates based on shared intents and beacon history
      const candidates = allUsers
        .filter(u => u.email !== currentUser.email)
        .map(user => {
          const theirIntent = userIntents.find(i => i.user_email === user.email);
          const theirInteractions = allInteractions.filter(i => i.user_email === user.email);
          const theirBeacons = theirInteractions
            .filter(i => i.interaction_type === 'scan')
            .map(i => i.beacon_id);

          // Calculate match score
          let score = 0;
          let reasons = [];

          // Same intent bonus
          if (myIntent && theirIntent && myIntent.intent === theirIntent.intent) {
            score += 50;
            reasons.push(`Both ${myIntent.intent} right now`);
          }

          // Shared beacon history
          const sharedBeacons = myBeacons.filter(b => theirBeacons.includes(b));
          if (sharedBeacons.length > 0) {
            score += sharedBeacons.length * 20;
            reasons.push(`Scanned ${sharedBeacons.length} same spots`);
          }

          // Proximity bonus (if both have intents with locations)
          if (myIntent?.lat && theirIntent?.lat) {
            const distance = calculateDistance(
              myIntent.lat, myIntent.lng,
              theirIntent.lat, theirIntent.lng
            );
            if (distance < 5) {
              score += 30;
              reasons.push(`Within ${distance.toFixed(1)}km`);
            }
          }

          // Similar XP level
          const myLevel = Math.floor((currentUser.xp || 0) / 1000) + 1;
          const theirLevel = Math.floor((user.xp || 0) / 1000) + 1;
          if (Math.abs(myLevel - theirLevel) <= 1) {
            score += 10;
            reasons.push(`Similar level`);
          }

          return {
            user,
            score,
            reasons,
            intent: theirIntent
          };
        })
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      setMatches(candidates);
    } catch (error) {
      console.error('Failed to generate matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#FF1493]" />
        <h3 className="text-lg font-black uppercase tracking-tight">AI Matches</h3>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-[#FF1493] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="text-center py-8 text-white/40">
          <p>No matches yet. Keep exploring!</p>
        </div>
      )}

      <div className="space-y-3">
        {matches.map((match, idx) => (
          <motion.div
            key={match.user.email}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-[#FF1493]/30 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-xl font-black rounded-full">
                  {match.user.full_name?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="font-bold">{match.user.full_name}</h4>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Zap className="w-3 h-3" />
                    <span>LVL {Math.floor((match.user.xp || 0) / 1000) + 1}</span>
                  </div>
                </div>
              </div>
              <div className="px-2 py-1 bg-[#FF1493]/20 border border-[#FF1493] rounded text-xs font-bold">
                {match.score}%
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {match.reasons.map((reason, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#FF1493]">
                  <Heart className="w-3 h-3" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            {match.intent && (
              <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                <MapPin className="w-3 h-3" />
                <span className="uppercase">{match.intent.intent}</span>
              </div>
            )}

            <Link to={createPageUrl(`Profile?email=${match.user.email}`)}>
              <Button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black rounded-lg">
                CONNECT
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}