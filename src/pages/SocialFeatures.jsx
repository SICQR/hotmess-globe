import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageCircle, 
  Heart,
  Globe,
  Camera,
  Shield,
  CheckCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const SOCIAL_FEATURES = [
  {
    id: 'discover',
    icon: Globe,
    title: 'GLOBAL DISCOVERY',
    tagline: 'Find your people anywhere',
    color: '#00D9FF',
    description: 'Browse profiles from around the world or filter by distance. Our smart matching shows you compatible people based on interests, vibe, and location.',
    benefits: [
      'Distance-based filtering',
      'Interest matching',
      'Vibe compatibility scores',
      'See who\'s online now',
      'Travel time estimates',
    ],
  },
  {
    id: 'messaging',
    icon: MessageCircle,
    title: 'REAL-TIME MESSAGING',
    tagline: 'More than just text',
    color: '#C8962C',
    description: 'Rich messaging with voice notes, photos, videos, and real-time typing indicators. Know when your message is read and when someone\'s responding.',
    benefits: [
      'Voice notes',
      'Photo & video sharing',
      'Typing indicators',
      'Read receipts',
      'Message reactions',
    ],
  },
  {
    id: 'stories',
    icon: Camera,
    title: '24-HOUR STORIES',
    tagline: 'Share your moments',
    color: '#B026FF',
    description: 'Share photos and videos that disappear after 24 hours. See who\'s out, what they\'re doing, and join the conversation.',
    benefits: [
      'Photo & video stories',
      '24-hour auto-expire',
      'View counts & viewers list',
      'Story reactions',
      'Direct replies',
    ],
  },
  {
    id: 'presence',
    icon: Zap,
    title: 'REAL-TIME PRESENCE',
    tagline: 'Know who\'s active',
    color: '#39FF14',
    description: 'See who\'s online, who\'s been active recently, and get notified when someone you\'re interested in comes online.',
    benefits: [
      'Online/offline status',
      'Last active timestamps',
      'Activity notifications',
      '"Right now" status updates',
      'Location sharing (opt-in)',
    ],
  },
  {
    id: 'compatibility',
    icon: Heart,
    title: 'VIBE MATCHING',
    tagline: 'Find compatible people',
    color: '#FF6B35',
    description: 'Our AI analyzes profiles, interests, and behavior to show you people you\'ll actually click with. The more you use the app, the better it gets.',
    benefits: [
      'AI-powered matching',
      'Compatibility percentages',
      'Mutual interest highlighting',
      'Conversation starters',
      'Common connections shown',
    ],
  },
  {
    id: 'privacy',
    icon: Shield,
    title: 'PRIVACY CONTROLS',
    tagline: 'You\'re in control',
    color: '#FFEB3B',
    description: 'Control who sees you, who can message you, and what information is visible. Block and report with confidence.',
    benefits: [
      'Incognito browsing mode',
      'Message filters',
      'Block & report tools',
      'Profile visibility controls',
      'Read receipt toggle',
    ],
  },
];

const FeatureSection = ({ feature, index }) => {
  const Icon = feature.icon;
  const isEven = index % 2 === 0;
  
  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className="py-12 border-b border-white/10 last:border-b-0"
    >
      <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}>
        <div className="lg:w-1/2">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 flex items-center justify-center border-2"
              style={{ borderColor: feature.color, backgroundColor: `${feature.color}20` }}
            >
              <Icon className="w-6 h-6" style={{ color: feature.color }} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase">{feature.title}</h2>
              <p className="text-white/60 text-sm">{feature.tagline}</p>
            </div>
          </div>
          
          <p className="text-white/80 leading-relaxed mb-6">
            {feature.description}
          </p>
          
          <div className="space-y-2">
            {feature.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: feature.color }} />
                <span className="text-white/70 text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:w-1/2">
          <div 
            className="aspect-video bg-gradient-to-br from-white/5 to-white/10 border-2 flex items-center justify-center"
            style={{ borderColor: `${feature.color}40` }}
          >
            <Icon className="w-24 h-24 opacity-20" style={{ color: feature.color }} />
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default function SocialFeatures() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="SOCIAL"
        title="Connect Your Way"
        subtitle="Discover, message, and build real connections"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#00D9FF]/30 via-black to-[#C8962C]/20 border-2 border-[#00D9FF] p-8 md:p-12 mb-12"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-[#00D9FF]" />
                <span className="text-[#00D9FF] font-black uppercase tracking-wider">Social</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">
                Find your tribe
              </h2>
              <p className="text-white/70">
                Real connections with real people. No bots, no fakes, just community.
              </p>
            </div>
            <Link to="/social">
              <Button variant="cyan" size="lg" className="font-black uppercase">
                <Users className="w-4 h-4 mr-2" />
                Start Discovering
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: '50K+', label: 'Active Users' },
            { value: '1M+', label: 'Messages/Day' },
            { value: '10K+', label: 'Stories/Day' },
            { value: '89%', label: 'Response Rate' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <div className="text-2xl font-black text-[#00D9FF]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        {SOCIAL_FEATURES.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <Users className="w-16 h-16 text-[#00D9FF] mx-auto mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">Start Connecting</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Join thousands of people making real connections every day.
          </p>
          <Link to="/social">
            <Button variant="cyan" size="xl" className="font-black uppercase">
              Go to Social
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </PageShell>
    </div>
  );
}
