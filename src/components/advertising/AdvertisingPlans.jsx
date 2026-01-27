import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Megaphone,
  Star,
  Zap,
  Check,
  Crown,
  MapPin,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Eye,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const ADVERTISING_PLANS = [
  {
    id: 'globe_basic',
    name: 'Globe Pin',
    description: 'Get your venue on the HotMess Globe map',
    icon: MapPin,
    color: '#E62020',
    price: 4999, // pence
    priceLabel: '£49.99',
    duration: '30 days',
    features: [
      'Custom pin on the Globe',
      'Venue name & description',
      'Link to your profile/website',
      'Basic analytics',
      'Up to 5,000 impressions/month'
    ],
    popular: false,
  },
  {
    id: 'globe_featured',
    name: 'Featured Venue',
    description: 'Premium placement with enhanced visibility',
    icon: Star,
    color: '#FFEB3B',
    price: 14999,
    priceLabel: '£149.99',
    duration: '30 days',
    features: [
      'Highlighted pin with glow effect',
      'Priority in search results',
      'Featured in "Tonight" section',
      'Full analytics dashboard',
      'Up to 25,000 impressions/month',
      'Event cross-promotion',
      'Badge on profile'
    ],
    popular: true,
  },
  {
    id: 'globe_premium',
    name: 'Globe Takeover',
    description: 'Maximum visibility for major launches',
    icon: Crown,
    color: '#B026FF',
    price: 49999,
    priceLabel: '£499.99',
    duration: '30 days',
    features: [
      'Animated premium pin',
      'Homepage hero feature',
      'Push notification to nearby users',
      'Unlimited impressions',
      'Priority support',
      'Custom campaign manager',
      'Exclusive event partnerships',
      'Social media amplification'
    ],
    popular: false,
  },
];

const BANNER_PLANS = [
  {
    id: 'banner_standard',
    name: 'Standard Banner',
    description: 'Display banner across app screens',
    icon: Megaphone,
    color: '#00D9FF',
    price: 7999,
    priceLabel: '£79.99',
    duration: '7 days',
    features: [
      '728x90 banner placement',
      'Appears on Events page',
      'Click tracking',
      'Up to 10,000 impressions'
    ],
    popular: false,
  },
  {
    id: 'banner_premium',
    name: 'Premium Banner',
    description: 'Full-width banners on high-traffic pages',
    icon: Zap,
    color: '#39FF14',
    price: 19999,
    priceLabel: '£199.99',
    duration: '7 days',
    features: [
      'Full-width responsive banner',
      'Homepage placement',
      'Events & Social pages',
      'Up to 50,000 impressions',
      'A/B testing support',
      'Detailed analytics'
    ],
    popular: true,
  },
];

const EVENT_SPONSORSHIP = [
  {
    id: 'event_sponsor',
    name: 'Event Sponsorship',
    description: 'Partner with event organizers',
    icon: Calendar,
    color: '#FF6B35',
    price: 29999,
    priceLabel: '£299.99',
    duration: 'Per event',
    features: [
      'Logo on event page',
      'Mentioned in event notifications',
      'VIP guest list access',
      'On-site branding opportunities',
      'Post-event analytics',
      'Direct messaging with organizer'
    ],
    popular: false,
  },
];

export default function AdvertisingPlans({ businessEmail, businessName, onPurchase }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('globe');

  const handlePurchase = async (plan) => {
    if (!businessEmail) {
      toast.error('Please sign in with a business account');
      return;
    }

    setLoading(true);
    setSelectedPlan(plan.id);

    try {
      const response = await fetch('/api/advertising/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          businessEmail,
          businessName,
          amount: plan.price,
          duration: plan.duration,
          planName: plan.name,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const renderPlanCard = (plan, index) => (
    <motion.div
      key={plan.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-[#E62020] text-black font-bold px-3">
            MOST POPULAR
          </Badge>
        </div>
      )}
      <Card className={`bg-white/5 border-2 h-full transition-all ${
        plan.popular 
          ? 'border-[#E62020] shadow-[0_0_20px_rgba(255,20,147,0.3)]' 
          : 'border-white/10 hover:border-white/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${plan.color}20` }}
            >
              <plan.icon className="w-6 h-6" style={{ color: plan.color }} />
            </div>
            <div>
              <h3 className="text-xl font-black">{plan.name}</h3>
              <p className="text-xs text-white/60">{plan.duration}</p>
            </div>
          </div>

          <p className="text-sm text-white/70 mb-4">{plan.description}</p>

          <div className="mb-6">
            <span className="text-4xl font-black">{plan.priceLabel}</span>
            <span className="text-white/40 text-sm ml-2">/{plan.duration}</span>
          </div>

          <ul className="space-y-3 mb-6">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-[#39FF14] mt-0.5 flex-shrink-0" />
                <span className="text-white/80">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => handlePurchase(plan)}
            disabled={loading && selectedPlan === plan.id}
            className={`w-full font-bold ${
              plan.popular
                ? 'bg-[#E62020] hover:bg-[#E62020]/90 text-black'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {loading && selectedPlan === plan.id ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('globe')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeCategory === 'globe'
              ? 'bg-[#E62020] text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-2" />
          Globe Placements
        </button>
        <button
          onClick={() => setActiveCategory('banners')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeCategory === 'banners'
              ? 'bg-[#00D9FF] text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Megaphone className="w-4 h-4 inline mr-2" />
          Banner Ads
        </button>
        <button
          onClick={() => setActiveCategory('events')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeCategory === 'events'
              ? 'bg-[#FF6B35] text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Event Sponsorship
        </button>
      </div>

      {/* Globe Plans */}
      {activeCategory === 'globe' && (
        <div className="grid md:grid-cols-3 gap-6">
          {ADVERTISING_PLANS.map((plan, idx) => renderPlanCard(plan, idx))}
        </div>
      )}

      {/* Banner Plans */}
      {activeCategory === 'banners' && (
        <div className="grid md:grid-cols-2 gap-6">
          {BANNER_PLANS.map((plan, idx) => renderPlanCard(plan, idx))}
        </div>
      )}

      {/* Event Sponsorship */}
      {activeCategory === 'events' && (
        <div className="max-w-md">
          {EVENT_SPONSORSHIP.map((plan, idx) => renderPlanCard(plan, idx))}
        </div>
      )}

      {/* Custom Plans CTA */}
      <Card className="bg-gradient-to-r from-white/5 to-white/10 border-white/20">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold mb-1">Need a Custom Plan?</h4>
            <p className="text-sm text-white/60">
              Contact us for enterprise pricing, multi-venue discounts, or custom campaigns.
            </p>
          </div>
          <Button variant="outline" className="border-white/20 text-white whitespace-nowrap">
            Contact Sales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
