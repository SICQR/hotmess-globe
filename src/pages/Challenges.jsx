import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Flame, Trophy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function Challenges() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const { data: todaysChallenges = [] } = useQuery({
    queryKey: ['daily-challenges', today],
    queryFn: () => base44.entities.DailyChallenge.filter({ challenge_date: today }),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['challenge-completions', currentUser?.email, today],
    queryFn: () => base44.entities.ChallengeCompletion.filter({ 
      user_email: currentUser.email,
      challenge_date: today
    }),
    enabled: !!currentUser,
  });

  const { data: streaks = [] } = useQuery({
    queryKey: ['streaks', currentUser?.email],
    queryFn: () => base44.entities.UserStreak.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const completionMutation = useMutation({
    mutationFn: async (challenge) => {
      await base44.entities.ChallengeCompletion.create({
        user_email: currentUser.email,
        challenge_id: challenge.id,
        challenge_date: today,
        completed_at: new Date().toISOString(),
        xp_earned: challenge.reward_xp,
      });

      // Update streak
      const streak = streaks.find(s => s.streak_type === 'challenge_completion');
      if (streak) {
        const lastDate = new Date(streak.last_activity_date);
        const today = new Date();
        const dayDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        const newStreak = dayDiff === 1 ? streak.current_streak + 1 : 1;
        await base44.entities.UserStreak.update(streak.id, {
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak),
          last_activity_date: today.toISOString().split('T')[0],
        });
      } else {
        await base44.entities.UserStreak.create({
          user_email: currentUser.email,
          streak_type: 'challenge_completion',
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        });
      }
    },
    onSuccess: (_, challenge) => {
      queryClient.invalidateQueries(['challenge-completions']);
      queryClient.invalidateQueries(['streaks']);
      toast.success('Challenge complete!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    },
  });

  const challengeStreak = streaks.find(s => s.streak_type === 'challenge_completion');
  const completedToday = completions.length;
  const totalToday = todaysChallenges.length;

  const DIFFICULTY_COLORS = {
    easy: '#39FF14',
    medium: '#FFEB3B',
    hard: '#C8962C',
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            DAILY <span className="text-[#C8962C]">CHALLENGES</span>
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Complete challenges. Build streaks.
          </p>
        </motion.div>

        {/* Streak Display */}
        {challengeStreak && challengeStreak.current_streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500 p-6 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-10 h-10 text-orange-500" />
                <div>
                  <h3 className="text-2xl font-black">{challengeStreak.current_streak} DAY STREAK</h3>
                  <p className="text-sm text-white/60">
                    Longest: {challengeStreak.longest_streak} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress */}
        <div className="bg-white/5 border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black uppercase">TODAY'S PROGRESS</h3>
            <span className="text-[#C8962C] font-black">{completedToday}/{totalToday}</span>
          </div>
          <Progress value={(completedToday / totalToday) * 100} className="h-3" />
        </div>

        {/* Challenges */}
        <div className="space-y-4">
          {todaysChallenges.map((challenge, idx) => {
            const isCompleted = completions.some(c => c.challenge_id === challenge.id);
            const difficultyColor = DIFFICULTY_COLORS[challenge.difficulty];

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`border-2 p-6 ${
                  isCompleted 
                    ? 'bg-green-500/20 border-green-500' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 flex items-center justify-center border-2"
                      style={{ 
                        backgroundColor: difficultyColor + '20',
                        borderColor: difficultyColor
                      }}
                    >
                      <Target className="w-6 h-6" style={{ color: difficultyColor }} />
                    </div>
                    <div>
                      <h4 className="font-black uppercase">{challenge.title}</h4>
                      <p className="text-sm text-white/60">{challenge.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span 
                          className="text-xs font-bold uppercase px-2 py-1"
                          style={{ 
                            backgroundColor: difficultyColor + '20',
                            color: difficultyColor
                          }}
                        >
                          {challenge.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {isCompleted ? (
                  <div className="bg-green-500/30 border border-green-500 p-3 flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <span className="font-black uppercase text-green-500">COMPLETED</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => completionMutation.mutate(challenge)}
                    disabled={completionMutation.isPending}
                    className="w-full bg-[#C8962C] hover:bg-white text-black font-black"
                  >
                    MARK AS COMPLETE
                  </Button>
                )}
              </motion.div>
            );
          })}

          {todaysChallenges.length === 0 && (
            <div className="text-center py-12 border-2 border-white/10">
              <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No challenges today. Check back tomorrow!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}