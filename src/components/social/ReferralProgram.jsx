import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Gift, 
  Users, 
  Copy, 
  Check, 
  Share2,
  Trophy,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Referral Program Component
 * Full interface for managing referrals
 */
export default function ReferralProgram() {
  const [user, setUser] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({ total: 0, successful: 0, pending: 0 });
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Generate or get referral code
        const code = currentUser.referral_code || generateReferralCode(currentUser.email);
        setReferralCode(code);
        
        // Fetch referral stats
        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_email', currentUser.email);
        
        if (referralData) {
          setReferrals(referralData);
          setStats({
            total: referralData.length,
            successful: referralData.filter(r => r.status === 'completed').length,
            pending: referralData.filter(r => r.status === 'pending').length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch referral data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const generateReferralCode = (email) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${base.slice(0, 6)}${random}`;
  };

  const referralUrl = `${window.location.origin}/auth/sign-up?ref=${referralCode}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join HOTMESS',
          text: 'Join me on HOTMESS and discover amazing events!',
          url: referralUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border-2 border-[#FF1493] rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#FF1493] rounded-xl flex items-center justify-center flex-shrink-0">
            <Gift className="w-8 h-8 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase mb-2">Invite Friends</h2>
            <p className="text-white/80 mb-4">
              Earn rewards when your friends join HOTMESS. Get exclusive perks for each successful referral!
            </p>
            
            {/* Rewards Info */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-black/30 px-4 py-2 rounded-lg">
                <div className="text-xs text-white/60">You get</div>
                <div className="font-bold text-[#39FF14]">500 XP</div>
              </div>
              <div className="bg-black/30 px-4 py-2 rounded-lg">
                <div className="text-xs text-white/60">They get</div>
                <div className="font-bold text-[#00D9FF]">250 XP</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <h3 className="font-bold uppercase tracking-wider mb-4">Your Referral Link</h3>
        
        <div className="flex gap-2 mb-4">
          <Input
            value={referralUrl}
            readOnly
            className="bg-black border-white/20 font-mono text-sm"
          />
          <Button
            onClick={copyReferralLink}
            variant="outline"
            className="border-white/20 px-4"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={shareReferral}
            className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-white/60 mb-1">Your referral code</div>
          <div className="font-mono font-bold text-lg">{referralCode}</div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{stats.total}</div>
          <div className="text-xs text-white/60">Total Invited</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Check className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{stats.successful}</div>
          <div className="text-xs text-white/60">Joined</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-[#FF1493]" />
          <div className="text-2xl font-black">{stats.successful * 500}</div>
          <div className="text-xs text-white/60">XP Earned</div>
        </div>
      </motion.div>

      {/* Recent Referrals */}
      {referrals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <h3 className="font-bold uppercase tracking-wider mb-4">Recent Referrals</h3>
          
          <div className="space-y-3">
            {referrals.slice(0, 5).map((referral, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-black/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-sm font-bold">
                    {(referral.referred_name || referral.referred_username || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{referral.referred_name || referral.referred_username || 'Invited User'}</div>
                    <div className="text-xs text-white/60">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  referral.status === 'completed' 
                    ? 'bg-[#39FF14]/20 text-[#39FF14]' 
                    : 'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {referral.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <h3 className="font-bold uppercase tracking-wider mb-4">Milestones</h3>
        
        <div className="space-y-3">
          {[
            { count: 5, reward: 'Bronze Badge', xp: 1000 },
            { count: 10, reward: 'Silver Badge', xp: 2500 },
            { count: 25, reward: 'Gold Badge', xp: 5000 },
            { count: 50, reward: 'Platinum Badge', xp: 10000 },
          ].map((milestone, idx) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg ${
                stats.successful >= milestone.count 
                  ? 'bg-[#39FF14]/10 border border-[#39FF14]/40' 
                  : 'bg-black/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  stats.successful >= milestone.count ? 'bg-[#39FF14]' : 'bg-white/10'
                }`}>
                  {stats.successful >= milestone.count ? (
                    <Check className="w-4 h-4 text-black" />
                  ) : (
                    <Star className={`w-4 h-4 ${stats.successful >= milestone.count ? 'text-black' : 'text-white/40'}`} />
                  )}
                </div>
                <div>
                  <div className="font-semibold">{milestone.count} Referrals</div>
                  <div className="text-xs text-white/60">{milestone.reward}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#FF1493]">+{milestone.xp} XP</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
