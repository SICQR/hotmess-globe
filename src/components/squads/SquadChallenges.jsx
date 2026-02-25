import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Users, MapPin, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function SquadChallenges({ squadId, currentUser }) {
  const queryClient = useQueryClient();

  const { data: challenges = [] } = useQuery({
    queryKey: ['squad-challenges', squadId],
    queryFn: () => base44.entities.SquadChallenge.filter({ squad_id: squadId, status: 'active' }),
    enabled: !!squadId,
  });

  const claimMutation = useMutation({
    mutationFn: async (challenge) => {
      await base44.entities.SquadChallenge.update(challenge.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['squad-challenges']);
      toast.success('Challenge complete!');
    },
  });

  const CHALLENGE_ICONS = {
    xp_race: Trophy,
    venue_conquest: MapPin,
    scan_marathon: Target,
    recruitment: Users,
  };

  const CHALLENGE_LABELS = {
    xp_race: 'Race',
    venue_conquest: 'Venue Conquest',
    scan_marathon: 'Scan Marathon',
    recruitment: 'Recruitment Drive',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-black uppercase flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[#C8962C]" />
        Squad Challenges ({challenges.length})
      </h3>

      {challenges.length === 0 ? (
        <div className="text-center py-8 border-2 border-white/10">
          <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No active challenges</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const Icon = CHALLENGE_ICONS[challenge.challenge_type];
            const progress = (challenge.current_value / challenge.target_value) * 100;
            const isExpired = new Date(challenge.expires_at) < new Date();
            const isComplete = challenge.current_value >= challenge.target_value;

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 p-4 ${
                  isComplete 
                    ? 'bg-green-500/20 border-green-500' 
                    : isExpired 
                    ? 'bg-red-500/20 border-red-500' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center border-2 ${
                      isComplete ? 'bg-green-500 border-green-600' : 'bg-[#C8962C] border-[#C8962C]'
                    }`}>
                      <Icon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm">
                        {CHALLENGE_LABELS[challenge.challenge_type]}
                      </h4>
                      <p className="text-xs text-white/60">
                        {challenge.current_value} / {challenge.target_value}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {!isExpired && (
                      <div className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(challenge.expires_at))}
                      </div>
                    )}
                  </div>
                </div>

                <Progress value={progress} className="mb-3 h-2" />

                {isComplete && challenge.status === 'active' && (
                  <Button
                    onClick={() => claimMutation.mutate(challenge)}
                    disabled={claimMutation.isPending}
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-black"
                  >
                    CLAIM REWARD
                  </Button>
                )}

                {isExpired && !isComplete && (
                  <div className="text-center text-xs text-red-400 font-bold uppercase">
                    Challenge Failed
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}