import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Zap,
  Globe,
  Ticket,
  Bell,
  Star,
  Crown,
  Clock,
  Filter,
  Heart,
  Share2,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const EVENT_FEATURES = [
  {
    id: 'discover',
    icon: Globe,
    title: 'GLOBAL EVENT MAP',
    tagline: 'See what\'s happening everywhere',
    color: '#B026FF',
    description: 'Our interactive 3D globe shows you events happening around the world. Zoom in on any city to discover local nightlife, parties, and community gatherings.',
    benefits: [
      'Interactive 3D globe visualization',
      'Filter by event type, date, and distance',
      'See real-time attendance counts',
      'Discover hidden gems in any city',
      'Plan trips around events',
    ],
  },
  {
    id: 'rightnow',
    icon: Zap,
    title: 'RIGHT NOW',
    tagline: 'Live activity feed',
    color: '#FF1493',
    description: 'See who\'s out right now and what\'s happening live. Real-time updates show you the hottest spots and who\'s heading where.',
    benefits: [
      'Live activity feed',
      'See who\'s at which venue',
      'Real-time crowd sizes',
      'Instant event updates',
      'Hot spot notifications',
    ],
  },
  {
    id: 'tickets',
    icon: Ticket,
    title: 'TICKET MARKETPLACE',
    tagline: 'Buy, sell, transfer',
    color: '#00D9FF',
    description: 'Secure ticket marketplace with verified sellers and buyer protection. Transfer tickets to friends or resell safely within the community.',
    benefits: [
      'Verified ticket authenticity',
      'Secure payment processing',
      'Easy ticket transfers',
      'Fair resale pricing',
      'QR code entry',
    ],
  },
  {
    id: 'rsvp',
    icon: CheckCircle,
    title: 'SMART RSVP',
    tagline: 'Never miss out',
    color: '#39FF14',
    description: 'One-tap RSVP with automatic calendar sync. Get reminders, see who else is going, and coordinate with friends.',
    benefits: [
      'One-tap RSVP',
      'Calendar sync (Google, Apple)',
      'See mutual connections attending',
      'Group coordination tools',
      'Smart reminders',
    ],
  },
  {
    id: 'recommendations',
    icon: Sparkles,
    title: 'AI RECOMMENDATIONS',
    tagline: 'Events picked for you',
    color: '#FFEB3B',
    description: 'Our AI learns your preferences and recommends events you\'ll love. The more you engage, the better the recommendations get.',
    benefits: [
      'Personalized event suggestions',
      'Based on your music taste',
      'Considers your social circle',
      'Learns from your attendance',
      'Weekly digest emails',
    ],
  },
  {
    id: 'organizer',
    icon: Crown,
    title: 'ORGANIZER TOOLS',
    tagline: 'Create and manage events',
    color: '#FF6B35',
    description: 'Powerful tools for event organizers. Create events, sell tickets, track attendance, and build your following.',
    benefits: [
      'Easy event creation',
      'Ticketing and payments',
      'Attendance tracking',
      'Promo code support',
      'Analytics dashboard',
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

export default function EventsFeatures() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="EVENTS"
        title="Never Miss A Moment"
        subtitle="Discover, RSVP, and experience the best events"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#B026FF]/30 via-black to-[#FF1493]/20 border-2 border-[#B026FF] p-8 md:p-12 mb-12"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-8 h-8 text-[#B026FF]" />
                <span className="text-[#B026FF] font-black uppercase tracking-wider">Events</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">
                Your nightlife, organized
              </h2>
              <p className="text-white/70">
                From local bar nights to international festivals - find it all here.
              </p>
            </div>
            <Link to="/events">
              <Button variant="outline" size="lg" className="font-black uppercase border-[#B026FF] text-[#B026FF] hover:bg-[#B026FF] hover:text-black">
                <Calendar className="w-4 h-4 mr-2" />
                Browse Events
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: '500+', label: 'Events Weekly' },
            { value: '50+', label: 'Cities' },
            { value: '100K+', label: 'Tickets Sold' },
            { value: '4.8★', label: 'Organizer Rating' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <div className="text-2xl font-black text-[#B026FF]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        {EVENT_FEATURES.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <Calendar className="w-16 h-16 text-[#B026FF] mx-auto mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">Find Your Next Event</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Thousands of events happening every week. What are you waiting for?
          </p>
          <Link to="/events">
            <Button variant="hot" size="xl" className="font-black uppercase">
              Explore Events
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </PageShell>
    </div>
  );
}
