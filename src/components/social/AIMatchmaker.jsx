import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, MapPin, Zap, Heart, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import logger from '@/utils/logger';

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

  const { data: allVibes = [] } = useQuery({
    queryKey: ['all-vibes'],
    queryFn: () => base44.entities.UserVibe.list()
  });

  useEffect(() => {
    if (!currentUser || !allUsers.length) return;
    generateMatches();
  }, [currentUser, allUsers, userIntents, userInteractions, allInteractions, allVibes]);

  const generateMatches = async () => {
    setLoading(true);
    try {
      // Get current user's data
      const myIntent = userIntents.find(i => i.user_email === currentUser.email);
      const myVibe = allVibes.find(v => v.user_email === currentUser.email);
      const myBeacons = userInteractions
        .filter(i => i.interaction_type === 'scan')
        .map(i => i.beacon_id);

      // Calculate vibe compatibility for each user
      const matchPromises = allUsers
        .filter(u => u.email !== currentUser.email)
        .filter(u => {
          // Filter by user preferences
          if (currentUser.match_preferences?.min_vibe_score) {
            return (u.vibe_score || 0) >= currentUser.match_preferences.min_vibe_score;
          }
          return true;
        })
        .map(async (user) => {
          const theirIntent = userIntents.find(i => i.user_email === user.email);
          const theirVibe = allVibes.find(v => v.user_email === user.email);
          const theirInteractions = allInteractions.filter(i => i.user_email === user.email);
          const theirBeacons = theirInteractions
            .filter(i => i.interaction_type === 'scan')
            .map(i => i.beacon_id);

          let score = 0;
          let reasons = [];

          // 1. Vibe Score Compatibility (30 points)
          if (myVibe && theirVibe) {
            const archetypeCompatibility = {
              'architect': ['explorer', 'alchemist', 'guardian'],
              'hunter': ['collector', 'merchant', 'socialite'],
              'collector': ['hunter', 'merchant', 'architect'],
              'explorer': ['architect', 'socialite', 'hunter'],
              'socialite': ['hunter', 'explorer', 'merchant'],
              'merchant': ['collector', 'hunter', 'socialite'],
              'guardian': ['architect', 'alchemist', 'explorer'],
              'alchemist': ['architect', 'guardian', 'explorer']
            };

            const compatible = archetypeCompatibility[myVibe.archetype] || [];
            if (compatible.includes(theirVibe.archetype)) {
              score += 30;
              reasons.push(`${myVibe.archetype} × ${theirVibe.archetype} synergy`);
            }

            // Shared traits
            const sharedTraits = (myVibe.traits || []).filter(t => 
              (theirVibe.traits || []).includes(t)
            );
            if (sharedTraits.length > 0) {
              score += sharedTraits.length * 5;
              reasons.push(`${sharedTraits.length} shared traits`);
            }
          }

          // 2. Personality Trait Match (20 points)
          if (currentUser.personality_traits && user.personality_traits) {
            const traits = ['openness', 'energy', 'social', 'adventure', 'intensity'];
            let traitScore = 0;
            
            traits.forEach(trait => {
              const myVal = currentUser.personality_traits[trait] || 50;
              const theirVal = user.personality_traits[trait] || 50;
              const similarity = 100 - Math.abs(myVal - theirVal);
              traitScore += similarity / traits.length;
            });

            const traitPoints = (traitScore / 100) * 20;
            score += traitPoints;
            if (traitPoints > 10) {
              reasons.push(`${Math.round(traitScore)}% personality match`);
            }
          }

          // 3. Same intent bonus (20 points)
          if (myIntent && theirIntent && myIntent.intent === theirIntent.intent) {
            score += 20;
            reasons.push(`Both ${myIntent.intent} right now`);
          }

          // 4. Shared beacon history (15 points)
          const sharedBeacons = myBeacons.filter(b => theirBeacons.includes(b));
          if (sharedBeacons.length > 0) {
            const beaconScore = Math.min(15, sharedBeacons.length * 3);
            score += beaconScore;
            reasons.push(`${sharedBeacons.length} shared venues`);
          }

          // 5. Interest overlap (10 points)
          const myInterests = new Set(currentUser.interests || []);
          const theirInterests = new Set(user.interests || []);
          const sharedInterests = [...myInterests].filter(i => theirInterests.has(i));
          if (sharedInterests.length > 0) {
            score += Math.min(10, sharedInterests.length * 2);
            reasons.push(`${sharedInterests.length} shared interests`);
          }

          // 6. Proximity bonus (5 points)
          if (myIntent?.lat && theirIntent?.lat) {
            const distance = calculateDistance(
              myIntent.lat, myIntent.lng,
              theirIntent.lat, theirIntent.lng
            );
            if (distance < 5) {
              score += 5;
              reasons.push(`${distance.toFixed(1)}km away`);
            }
          }

          return {
            user,
            score: Math.round(score),
            reasons,
            intent: theirIntent,
            vibe: theirVibe
          };
        });

      const candidates = (await Promise.all(matchPromises))
        .filter(m => m.score > 40) // Only show 40%+ matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setMatches(candidates);
    } catch (error) {
      logger.error('Failed to generate matches:', error);
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
                <div 
                  className="w-12 h-12 flex items-center justify-center text-xl font-black rounded-full border-2"
                  style={{
                    background: match.vibe?.vibe_color 
                      ? `linear-gradient(135deg, ${match.vibe.vibe_color}, #000)`
                      : 'linear-gradient(135deg, #FF1493, #B026FF)',
                    borderColor: match.vibe?.vibe_color || '#FF1493'
                  }}
                >
                  {match.user.full_name?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="font-bold">{match.user.full_name}</h4>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    {match.vibe ? (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span className="uppercase">{match.vibe.archetype}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>LVL {Math.floor((match.user.xp || 0) / 1000) + 1}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div 
                className="px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1"
                style={{
                  background: match.score >= 80 
                    ? 'linear-gradient(135deg, #FF1493, #B026FF)'
                    : match.score >= 60
                    ? 'rgba(255, 20, 147, 0.3)'
                    : 'rgba(255, 20, 147, 0.2)',
                  border: `2px solid ${match.score >= 80 ? '#FF1493' : 'rgba(255, 20, 147, 0.3)'}`
                }}
              >
                {match.score >= 80 && <Flame className="w-3 h-3" />}
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

            <div className="flex gap-2">
              <Link to={createPageUrl(`Profile?email=${match.user.email}`)} className="flex-1">
                <Button variant="outline" className="w-full border-[#FF1493] text-[#FF1493] hover:bg-[#FF1493]/10 font-black rounded-lg">
                  PROFILE
                </Button>
              </Link>
              <Link to={`/social/inbox?to=${encodeURIComponent(String(match?.user?.email || ''))}`} className="flex-1">
                <Button className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black rounded-lg">
                  MESSAGE
                </Button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}