import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Crown, Swords, Zap, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
// createPageUrl no longer used after privacy URL refactor
import { getProfileUrl } from '@/lib/userPrivacy';
import { formatDistanceToNow } from 'date-fns';

export default function NightKingDisplay({ venueId }) {
  const { data: kingData } = useQuery({
    queryKey: ['venue-king', venueId],
    queryFn: async () => {
      const kings = await base44.entities.VenueKing.filter({ venue_id: venueId });
      const activeKing = kings.find(k => new Date(k.expires_at) > new Date());
      return activeKing || null;
    },
    enabled: !!venueId,
    refetchInterval: 30000,
  });

  if (!kingData) return null;

  const isWarActive = kingData.war_active && kingData.war_started_at && 
    (Date.now() - new Date(kingData.war_started_at).getTime() < 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border-2 p-6 ${
        isWarActive 
          ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
          : 'bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF6B35]/10 border-[#FFEB3B]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 flex items-center justify-center border-2 ${
            isWarActive ? 'bg-red-500 border-red-600' : 'bg-[#FFEB3B] border-[#FFEB3B]'
          }`}>
            {isWarActive ? (
              <Swords className="w-6 h-6 text-black" />
            ) : (
              <Crown className="w-6 h-6 text-black" />
            )}
          </div>
          <div>
            <h3 className="font-black uppercase text-lg">
              {isWarActive ? 'WAR MODE' : 'NIGHT KING'}
            </h3>
            <p className="text-xs text-white/60 uppercase">
              {kingData.venue_name}
            </p>
          </div>
        </div>
        {isWarActive && (
          <Badge className="bg-red-500 text-black border-red-600 font-black animate-pulse">
            <Zap className="w-3 h-3 mr-1" />
            2X XP
          </Badge>
        )}
      </div>

      <Link to={getProfileUrl(user)}>
        <div className="bg-black/40 border border-white/20 p-4 hover:border-white/40 transition-colors mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold uppercase text-sm mb-1">{kingData.king_name}</p>
              <p className="text-xs text-white/60">
                {kingData.scan_count} scans • 1 XP tax per scan
              </p>
            </div>
            <Crown className={`w-8 h-8 ${
              isWarActive ? 'text-red-500' : 'text-[#FFEB3B]'
            }`} />
          </div>
        </div>
      </Link>

      {isWarActive ? (
        <div className="bg-red-500/20 border border-red-500 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4 text-red-500" />
            <p className="text-xs font-black uppercase text-red-500">ACTIVE WAR</p>
          </div>
          <p className="text-xs text-white/80">
            2x XP for all scans at this venue. Started by {kingData.war_started_by}.
          </p>
          <p className="text-xs text-white/40 mt-2">
            <Clock className="w-3 h-3 inline mr-1" />
            {formatDistanceToNow(new Date(kingData.war_started_at), { addSuffix: true })}
          </p>
        </div>
      ) : (
        <div className="text-xs text-white/60">
          <p>Crown expires {formatDistanceToNow(new Date(kingData.expires_at), { addSuffix: true })}</p>
          <p className="mt-1">Tax collected: {kingData.total_tax_collected} XP</p>
        </div>
      )}
    </motion.div>
  );
}