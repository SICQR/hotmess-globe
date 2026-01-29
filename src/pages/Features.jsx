import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  Phone, 
  AlertTriangle, 
  Users, 
  Heart,
  Globe,
  Radio,
  ShoppingBag,
  Zap,
  Lock,
  Eye,
  MessageCircle,
  Calendar,
  Crown,
  Sparkles,
  ChevronRight,
  Layers,
  Palette,
  UserCheck,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const FEATURE_CATEGORIES = [
  {
    id: 'safety',
    title: 'SAFETY FIRST',
    subtitle: 'Your wellbeing is our priority',
    color: '#FF1493',
    icon: Shield,
    href: '/features/safety',
    features: [
      { icon: AlertTriangle, title: 'Panic Button', desc: 'Instant SOS to trusted contacts with location sharing' },
      { icon: Phone, title: 'Fake Call Generator', desc: 'Escape awkward situations with realistic incoming calls' },
      { icon: MapPin, title: 'Live Location Sharing', desc: 'Share your real-time location with trusted contacts' },
      { icon: Heart, title: 'Aftercare Nudge', desc: 'Post-meetup wellness check-ins' },
    ]
  },
  {
    id: 'social',
    title: 'CONNECT',
    subtitle: 'Find your people',
    color: '#00D9FF',
    icon: Users,
    href: '/social',
    features: [
      { icon: Globe, title: 'Global Discovery', desc: 'Find people nearby or anywhere in the world' },
      { icon: MessageCircle, title: 'Real-time Messaging', desc: 'Voice notes, typing indicators, read receipts' },
      { icon: Sparkles, title: '24hr Stories', desc: 'Share ephemeral content with your network' },
      { icon: Eye, title: 'Travel Time ETAs', desc: 'See how far people are from you' },
    ]
  },
  {
    id: 'events',
    title: 'EVENTS',
    subtitle: 'Never miss a moment',
    color: '#B026FF',
    icon: Calendar,
    href: '/events',
    features: [
      { icon: MapPin, title: 'Event Map', desc: 'See all events near you on an interactive globe' },
      { icon: Zap, title: 'Right Now', desc: 'See who\'s out and what\'s happening live' },
      { icon: Users, title: 'Squad Up', desc: 'Coordinate with friends before heading out' },
      { icon: Crown, title: 'VIP Access', desc: 'Exclusive events for premium members' },
    ]
  },
  {
    id: 'market',
    title: 'MESSMARKET',
    subtitle: 'Shop the community',
    color: '#39FF14',
    icon: ShoppingBag,
    href: '/market',
    features: [
      { icon: ShoppingBag, title: 'Creator Products', desc: 'Buy directly from community creators' },
      { icon: Lock, title: 'Secure Checkout', desc: 'Powered by Stripe for safe transactions' },
      { icon: Zap, title: 'XP Rewards', desc: 'Earn XP with every purchase' },
      { icon: Crown, title: 'Exclusive Drops', desc: 'Limited edition products for members' },
    ]
  },
  {
    id: 'radio',
    title: 'HOTMESS RADIO',
    subtitle: 'The soundtrack to your nights',
    color: '#FF6B35',
    icon: Radio,
    href: '/music',
    features: [
      { icon: Radio, title: 'Live Shows', desc: '24/7 curated music and DJ sets' },
      { icon: Sparkles, title: 'Exclusive Releases', desc: 'First access to new tracks' },
      { icon: Users, title: 'Community Playlists', desc: 'Discover what others are listening to' },
      { icon: Calendar, title: 'Show Schedule', desc: 'Never miss your favorite shows' },
    ]
  },
  {
    id: 'personas',
    title: 'PERSONAS',
    subtitle: 'Multi-layered profiles',
    color: '#FFD700',
    icon: Layers,
    href: '/features/personas',
    features: [
      { icon: Layers, title: 'Context-Aware', desc: 'Your profile adapts to social, market, or events' },
      { icon: ShoppingBag, title: 'Seller Mode', desc: 'Transform into a storefront when selling' },
      { icon: Music, title: 'Creator Mode', desc: 'Showcase your music and exclusive content' },
      { icon: Palette, title: 'Custom Themes', desc: 'Personalize your profile look and feel' },
    ]
  },
];

const FeatureCard = ({ feature, color }) => (
  <div className="bg-white/5 border border-white/10 p-4 hover:border-white/30 transition-all group">
    <feature.icon className="w-6 h-6 mb-3" style={{ color }} />
    <h4 className="font-black text-sm uppercase tracking-wider mb-1">{feature.title}</h4>
    <p className="text-white/60 text-xs">{feature.desc}</p>
  </div>
);

const CategorySection = ({ category, index }) => {
  const Icon = category.icon;
  const isEven = index % 2 === 0;
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="mb-16"
    >
      <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-start`}>
        {/* Header */}
        <div className="md:w-1/3 md:sticky md:top-24">
          <div 
            className="w-16 h-16 flex items-center justify-center border-2 mb-4"
            style={{ borderColor: category.color, backgroundColor: `${category.color}20` }}
          >
            <Icon className="w-8 h-8" style={{ color: category.color }} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">{category.title}</h2>
          <p className="text-white/60 mb-4">{category.subtitle}</p>
          <Link to={category.href}>
            <Button 
              variant="outline" 
              className="border-white/20 hover:border-white/40 group"
            >
              Explore {category.title}
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        
        {/* Features Grid */}
        <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {category.features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} color={category.color} />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default function Features() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="FEATURES"
        title="Built Different"
        subtitle="Everything you need for safer, better nights out"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { value: '50K+', label: 'Active Users' },
            { value: '24/7', label: 'Safety Support' },
            { value: '100+', label: 'Events Weekly' },
            { value: '4.9★', label: 'App Rating' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-6 text-center"
            >
              <div className="text-3xl font-black text-[#FF1493]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Safety CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border-2 border-[#FF1493] p-6 md:p-8 mb-16"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#FF1493] flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase">Safety is Our #1 Priority</h3>
                <p className="text-white/70 text-sm mt-1">
                  Industry-leading safety features designed by and for our community.
                </p>
              </div>
            </div>
            <Link to="/features/safety">
              <Button variant="hot" size="lg" className="font-black uppercase whitespace-nowrap">
                Learn More
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Categories */}
        {FEATURE_CATEGORIES.map((category, index) => (
          <CategorySection key={category.id} category={category} index={index} />
        ))}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <h2 className="text-4xl font-black uppercase mb-4">Ready to Join?</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Join thousands of users who trust HOTMESS for safer, better nights out.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button variant="hot" size="xl" className="font-black uppercase">
                Get Started Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="xl" className="font-black uppercase border-white/20">
                View Pricing
              </Button>
            </Link>
          </div>
        </motion.div>
      </PageShell>
    </div>
  );
}
