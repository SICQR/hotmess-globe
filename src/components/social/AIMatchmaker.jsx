import { supabase } from '@/components/utils/supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, MapPin, Heart, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function AIMatchmaker({ currentUser }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.from('profiles').select('*')
  });

  const { data: userIntents = [] } = useQuery({
    queryKey: ['user-intents'],
    queryFn: () => supabase
      .from('user_intents')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(50)
  });

  const { data: userInteractions = [] } = useQuery({
    queryKey: ['user-interactions', currentUser?.email],
    queryFn: () => currentUser
      ? supabase
          .from('user_interactions')
          .select('*')
          .order('created_date', { ascending: false })
          .limit(100)
      : [],
    enabled: !!currentUser
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ['all-interactions'],
    queryFn: () => supabase
      .from('user_interactions')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(500)
  });

  const { data: allVibes = [] } = useQuery({
    queryKey: ['all-vibes'],
    queryFn: () => supabase.from('user_vibes').select('*')
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
        .filter(m => m.score > 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setMatches(candidates);
    } catch (error) {
      console.error('Failed to generate matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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
        <Sparkles className="w-5 h-5 text-[#C8962C]" />
        <h3 className="text-lg font-black uppercase tracking-tight">AI Matches</h3>
      </div>
    </div>
  );
}
