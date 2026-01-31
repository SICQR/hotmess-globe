import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Gift, Copy, Share2, Users, Zap, Trophy, Check, Star } from 'lucide-react';
import { toast } from 'sonner';

const REWARD_TIERS = [
  { referrals: 3, reward: '500 XP', icon: Zap, color: '#FFD700', unlocked: false },
  { referrals: 5, reward: 'FREE PLUS Month', icon: Star, color: '#FF1493', unlocked: false },
  { referrals: 10, reward: '2,000 XP + Badge', icon: Trophy, color: '#B026FF', unlocked: false },
  { referrals: 25, reward: 'Lifetime VIP Status', icon: Gift, color: '#00D9FF', unlocked: false },
];

export default function ReferralProgram() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: referrals = [] } = useQuery({
    queryKey: ['my-referrals', currentUser?.email],
    queryFn: async () => {
      // In production, fetch from referrals table
      return [];
    },
    enabled: !!currentUser,
  });

  const referralCode = currentUser?.referral_code || currentUser?.id?.slice(0, 8).toUpperCase() || 'HOTMESS';
  const referralLink = `https://hotmess.london/join?ref=${referralCode}`;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join HOTMESS',
        text: 'Join me on HOTMESS - the ultimate gay nightlife and social app!',
        url: referralLink,
      });
    } else {
      copyLink();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-black uppercase mb-2">
            Referral <span className="text-[#FF1493]">Program</span>
          </h1>
          <p className="text-white/60">Invite friends, earn rewards</p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/30 rounded-xl p-6 mb-8"
        >
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-black text-[#FF1493]">{completedReferrals}</div>
              <div className="text-xs text-white/60 uppercase">Referrals</div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#FFD700]">{completedReferrals * 100}</div>
              <div className="text-xs text-white/60 uppercase">XP Earned</div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#00D9FF]">{Math.floor(completedReferrals / 3)}</div>
              <div className="text-xs text-white/60 uppercase">Rewards</div>
            </div>
          </div>
        </motion.div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#00D9FF]" /> Your Referral Link
          </h2>
          
          <div className="flex gap-3 mb-4">
            <Input
              value={referralLink}
              readOnly
              className="bg-black border-white/20 font-mono text-sm"
            />
            <Button
              onClick={copyLink}
              className={`${copied ? 'bg-[#39FF14]' : 'bg-white'} text-black font-bold`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button onClick={shareLink} className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold">
              <Share2 className="w-4 h-4 mr-2" /> Share Link
            </Button>
            <Button variant="outline" className="flex-1 border-white/20">
              <Gift className="w-4 h-4 mr-2" /> Send Invite
            </Button>
          </div>

          <div className="mt-4 p-3 bg-black/40 rounded-lg text-center">
            <span className="text-white/60 text-sm">Your code: </span>
            <span className="font-mono font-bold text-[#FFD700]">{referralCode}</span>
          </div>
        </motion.div>

        {/* Reward Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFD700]" /> Reward Tiers
          </h2>

          <div className="space-y-3">
            {REWARD_TIERS.map((tier, idx) => {
              const unlocked = completedReferrals >= tier.referrals;
              const progress = Math.min((completedReferrals / tier.referrals) * 100, 100);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    unlocked 
                      ? 'border-[#39FF14] bg-[#39FF14]/10' 
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${tier.color}20` }}
                      >
                        <tier.icon className="w-5 h-5" style={{ color: tier.color }} />
                      </div>
                      <div>
                        <div className="font-bold">{tier.reward}</div>
                        <div className="text-xs text-white/60">{tier.referrals} referrals</div>
                      </div>
                    </div>
                    {unlocked ? (
                      <div className="px-3 py-1 bg-[#39FF14] text-black text-xs font-bold rounded-full">
                        UNLOCKED
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm">{completedReferrals}/{tier.referrals}</span>
                    )}
                  </div>
                  {!unlocked && (
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: tier.color }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B026FF]" /> Your Referrals
          </h2>

          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">No referrals yet</p>
              <p className="text-white/40 text-sm">Share your link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF]" />
                    <div>
                      <div className="font-bold text-sm">{ref.name || 'Anonymous'}</div>
                      <div className="text-xs text-white/40">{new Date(ref.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 text-xs font-bold rounded ${
                    ref.status === 'completed' ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'bg-white/10 text-white/60'
                  }`}>
                    {ref.status === 'completed' ? '+100 XP' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
