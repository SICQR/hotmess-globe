import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, Star, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const TIERS = [
  {
    id: 'basic',
    name: 'BASIC',
    price: 'FREE',
    icon: Star,
    color: '#FFFFFF',
    features: [
      'Standard access to all features',
      'Level 1-4 progression',
      'Basic XP earning rate',
      'Public profile visibility',
      'Standard beacon scanning',
    ],
  },
  {
    id: 'plus',
    name: 'PLUS',
    price: '£9.99/mo',
    icon: Zap,
    color: '#FF1493',
    features: [
      'Everything in BASIC',
      '2x XP Multiplier on all actions',
      'Stealth Mode (browse anonymously)',
      'Blurred profile viewers',
      'Priority in Right Now feed',
      'Exclusive PLUS badge',
    ],
  },
  {
    id: 'pro',
    name: 'CHROME',
    price: '£19.99/mo',
    icon: Crown,
    color: '#00D9FF',
    features: [
      'Everything in PLUS',
      'Unmasked viewer list (see who viewed you)',
      'Early access to limited drops',
      'Night King Challenge eligibility',
      'Custom profile gradient',
      'Premium support',
      'Legendary CHROME badge',
    ],
  },
];

export default function MembershipUpgrade() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleUpgrade = async (tierId) => {
    if (tierId === 'basic') {
      toast.info('You are already on the BASIC tier');
      return;
    }

    setLoading(true);
    try {
      // In production, this would integrate with Stripe
      // For now, just update the tier
      await base44.auth.updateMe({
        membership_tier: tierId,
      });

      toast.success(`Upgraded to ${tierId.toUpperCase()}!`);
      navigate(createPageUrl('Profile'));
    } catch (error) {
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentTierRaw = currentUser?.membership_tier;
  const currentTier = currentTierRaw === 'free' ? 'basic' : currentTierRaw || 'basic';

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
            UPGRADE YOUR <span className="text-[#FF1493]">NIGHT</span>
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Choose your tier. Level up your experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.id;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-black border-2 p-6 md:p-8 h-full flex flex-col"
                style={
                  isCurrentTier
                    ? {
                        borderColor: tier.color,
                        boxShadow: `0 0 20px ${tier.color}`,
                      }
                    : { borderColor: 'rgba(255,255,255,0.2)' }
                }
              >
                <div className="text-center mb-6">
                  <div
                    className="w-16 h-16 mx-auto mb-4 border-2 flex items-center justify-center"
                    style={{ borderColor: tier.color }}
                  >
                    <Icon className="w-8 h-8" style={{ color: tier.color }} />
                  </div>
                  <h2
                    className="text-2xl font-black uppercase mb-2 break-words leading-none"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </h2>
                  <p className="text-3xl font-black break-words leading-none">{tier.price}</p>
                </div>

                <ul className="space-y-3 mb-8 min-w-0">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm min-w-0">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tier.color }} />
                      <span className="text-white/80 min-w-0 break-words">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isCurrentTier || loading}
                  size="xl"
                  className={`w-full mt-auto font-black uppercase tracking-wide border-2 ${
                    isCurrentTier
                      ? 'bg-white/10 text-white/40 border-white/20 cursor-not-allowed'
                      : 'text-black border-white hover:bg-white/90'
                  }`}
                  style={!isCurrentTier ? { backgroundColor: tier.color } : {}}
                >
                  {isCurrentTier ? 'CURRENT TIER' : loading ? 'PROCESSING...' : 'UPGRADE NOW'}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 bg-white/5 border-2 border-white/10 p-6 text-center">
          <p className="text-white/60 text-sm uppercase tracking-wider">
            Subscriptions are monthly and can be cancelled anytime.
          </p>
        </div>
      </div>
    </div>
  );
}