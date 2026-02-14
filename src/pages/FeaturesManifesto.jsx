import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Calendar,
  Users,
  Radio,
  Layers,
  Sparkles,
  ChevronRight,
  FileText,
  CheckCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const FEATURE_PAGES = [
  {
    id: 'overview',
    title: 'FEATURES OVERVIEW',
    route: '/features',
    icon: Sparkles,
    color: '#FF1493',
    description: 'Comprehensive overview of all HOTMESS platform features, showcasing our unique value proposition across safety, social, events, marketplace, and music.',
    highlights: [
      '50K+ active users',
      '24/7 safety support',
      '100+ events weekly',
      '4.9★ app rating',
    ],
    ctas: [
      { text: 'View Overview', to: '/features' },
    ],
  },
  {
    id: 'safety',
    title: 'SAFETY FEATURES',
    route: '/features/safety',
    icon: Shield,
    color: '#FF0000',
    description: 'Industry-leading safety toolkit designed by and for our community. Includes panic button, fake call generator, live location sharing, aftercare nudge, trusted contacts, and safety check-in timer.',
    highlights: [
      'Instant SOS alerts',
      'Fake call generator',
      'Live location sharing',
      'Aftercare wellness checks',
      'Trusted contacts network',
      'Safety check-in timer',
    ],
    ctas: [
      { text: 'Safety Features', to: '/features/safety' },
      { text: 'Safety Hub', to: '/safety' },
    ],
  },
  {
    id: 'events',
    title: 'EVENTS FEATURES',
    route: '/features/events',
    icon: Calendar,
    color: '#B026FF',
    description: 'Never miss a moment with our comprehensive events platform. Features include global event map, Right Now live activity feed, ticket marketplace, smart RSVP, AI recommendations, and organizer tools.',
    highlights: [
      'Interactive 3D globe',
      'Right Now live feed',
      'Secure ticket marketplace',
      'One-tap RSVP with calendar sync',
      'AI-powered recommendations',
      'Organizer dashboard & analytics',
    ],
    ctas: [
      { text: 'Events Features', to: '/features/events' },
      { text: 'Browse Events', to: '/events' },
    ],
  },
  {
    id: 'social',
    title: 'SOCIAL FEATURES',
    route: '/features/social',
    icon: Users,
    color: '#00D9FF',
    description: 'Connect with your community through global discovery, real-time messaging, 24-hour stories, presence indicators, vibe matching, and comprehensive privacy controls.',
    highlights: [
      'Distance-based discovery',
      'Voice notes & rich messaging',
      '24-hour disappearing stories',
      'Online/offline presence',
      'AI-powered vibe matching',
      'Advanced privacy controls',
    ],
    ctas: [
      { text: 'Social Features', to: '/features/social' },
      { text: 'Start Discovering', to: '/social' },
    ],
  },
  {
    id: 'radio',
    title: 'MUSIC & RADIO FEATURES',
    route: '/features/radio',
    icon: Radio,
    color: '#FF6B35',
    description: 'The soundtrack to your nights with 24/7 live radio, original shows, exclusive releases, music discovery, community playlists, and premium audio.',
    highlights: [
      '24/7 live streaming',
      'Weekly scheduled shows',
      'Exclusive track releases',
      'AI music discovery',
      'Community-curated playlists',
      'High-quality premium audio',
    ],
    ctas: [
      { text: 'Music Features', to: '/features/radio' },
      { text: 'Listen Live', to: '/music' },
    ],
  },
  {
    id: 'personas',
    title: 'PERSONA FEATURES',
    route: '/features/personas',
    icon: Layers,
    color: '#FFD700',
    description: 'Multi-layered profiles that adapt to context. One identity with multiple personas: Standard, Premium, Seller, Creator, and Organizer, each with unique capabilities.',
    highlights: [
      'Context-aware profiles',
      'Premium verified badges',
      'Seller storefronts',
      'Creator showcase',
      'Event organizer tools',
      'Custom profile themes',
    ],
    ctas: [
      { text: 'Persona Features', to: '/features/personas' },
      { text: 'Customize Profile', to: '/EditProfile' },
    ],
  },
];

const MANIFESTO_SECTIONS = [
  {
    title: 'Our Philosophy',
    content: [
      'Safety is not an afterthought—it\'s the foundation of everything we build.',
      'Real connections matter more than follower counts.',
      'Community-driven features beat algorithm-driven feeds.',
      'Consent and care are non-negotiable values.',
      'Local culture deserves global reach.',
    ],
  },
  {
    title: 'Design Principles',
    content: [
      'Mobile-first: Optimized for on-the-go usage',
      'Performance: < 200KB bundles, 60fps animations',
      'Accessibility: WCAG compliant, inclusive by design',
      'Privacy: You control your data and visibility',
      'Progressive: Works offline, installs as PWA',
    ],
  },
  {
    title: 'Feature Development',
    content: [
      'Every feature must pass the safety audit',
      'User feedback drives our roadmap',
      'Beta testing with real community members',
      'Iterative improvements over perfect launches',
      'Documentation and onboarding are part of the feature',
    ],
  },
];

const FeatureCard = ({ feature, index }) => {
  const Icon = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
    >
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
        style={{ backgroundColor: `${feature.color}20` }}
      />
      
      {/* Card content */}
      <div 
        className="relative bg-black border-2 p-6 h-full transition-all duration-300 group-hover:translate-y-[-4px]"
        style={{ borderColor: `${feature.color}40` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 flex items-center justify-center border-2 flex-shrink-0"
            style={{ borderColor: feature.color, backgroundColor: `${feature.color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color: feature.color }} />
          </div>
          <Link to={feature.route}>
            <Button 
              variant="ghost" 
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        {/* Title & Route */}
        <h3 className="text-xl font-black uppercase tracking-tight mb-1">
          {feature.title}
        </h3>
        <code className="text-xs text-white/40 font-mono mb-3 block">
          {feature.route}
        </code>
        
        {/* Description */}
        <p className="text-white/70 text-sm leading-relaxed mb-4">
          {feature.description}
        </p>
        
        {/* Highlights */}
        <div className="space-y-2 mb-4">
          {feature.highlights.map((highlight, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle 
                className="w-3 h-3 mt-0.5 flex-shrink-0" 
                style={{ color: feature.color }} 
              />
              <span className="text-xs text-white/60">{highlight}</span>
            </div>
          ))}
        </div>
        
        {/* CTAs */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
          {feature.ctas.map((cta, i) => (
            <Link key={i} to={cta.to}>
              <Button
                variant={i === 0 ? 'outline' : 'ghost'}
                size="sm"
                className="text-xs font-bold uppercase"
                style={{ 
                  borderColor: i === 0 ? feature.color : 'transparent',
                  color: feature.color 
                }}
              >
                {cta.text}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ManifestoSection = ({ section, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="bg-white/5 border border-white/10 p-6"
  >
    <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
      <Zap className="w-5 h-5 text-[#FF1493]" />
      {section.title}
    </h3>
    <ul className="space-y-3">
      {section.content.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
          <span className="text-white/70 text-sm">{item}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

export default function FeaturesManifesto() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="DOCUMENTATION"
        title="Features Manifesto"
        subtitle="Complete guide to all HOTMESS platform features"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#FF1493]/20 via-black to-[#B026FF]/20 border-2 border-[#FF1493] p-8 md:p-12 mb-12"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF1493]/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#B026FF]/10 blur-3xl rounded-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 text-[#FF1493]" />
              <span className="text-[#FF1493] font-black uppercase tracking-wider">
                Features Documentation
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
              Built Different. Built for You.
            </h2>
            <p className="text-white/70 text-lg max-w-2xl mb-6">
              This manifesto documents all feature pages in the HOTMESS platform. 
              Each page showcases a category of features designed to make your nights 
              out safer, more connected, and more memorable.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/features">
                <Button variant="hot" size="lg" className="font-black uppercase">
                  <Sparkles className="w-4 h-4 mr-2" />
                  View All Features
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="font-black uppercase border-white/20">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: '6', label: 'Feature Pages' },
            { value: '35+', label: 'Unique Features' },
            { value: '100%', label: 'Mobile Optimized' },
            { value: '24/7', label: 'Safety Support' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-6 text-center"
            >
              <div className="text-3xl font-black text-[#FF1493]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Pages Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase mb-2 text-center">
            Feature Pages Index
          </h2>
          <p className="text-white/60 text-center mb-8 max-w-2xl mx-auto">
            Navigate to any feature page to learn more about specific capabilities. 
            Each page includes detailed descriptions, benefits, and implementation notes.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURE_PAGES.map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>
        </section>

        {/* Manifesto Sections */}
        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase mb-8 text-center">
            The HOTMESS Way
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {MANIFESTO_SECTIONS.map((section, index) => (
              <ManifestoSection key={index} section={section} index={index} />
            ))}
          </div>
        </section>

        {/* Technical Details */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-[#00D9FF]/10 to-[#B026FF]/10 border border-white/10 p-8 mb-16"
        >
          <h2 className="text-xl font-black uppercase mb-6">
            Technical Implementation
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-black uppercase text-white/60 mb-3">
                Frontend Stack
              </h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• React 18 with hooks & suspense</li>
                <li>• React Router for navigation</li>
                <li>• Framer Motion for animations</li>
                <li>• Tailwind CSS + shadcn/ui components</li>
                <li>• Vite for build optimization</li>
                <li>• Vitest for testing</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white/60 mb-3">
                Performance Metrics
              </h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• First Contentful Paint {'<'} 1.8s</li>
                <li>• Time to Interactive {'<'} 3.9s</li>
                <li>• Bundle size {'<'} 200KB gzipped</li>
                <li>• 60fps animations</li>
                <li>• Lighthouse score {'>'} 90</li>
                <li>• WCAG 2.1 AA compliant</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Navigation Guide */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border-t border-white/10 pt-12"
        >
          <h2 className="text-2xl font-black uppercase mb-6 text-center">
            Route Structure
          </h2>
          <div className="bg-black/50 border border-white/10 p-6 font-mono text-xs">
            <div className="space-y-1 text-white/60">
              <div><span className="text-[#FF1493]">/features</span> — Overview of all features</div>
              <div><span className="text-[#FF0000]">/features/safety</span> — Safety features detail</div>
              <div><span className="text-[#B026FF]">/features/events</span> — Events features detail</div>
              <div><span className="text-[#00D9FF]">/features/social</span> — Social features detail</div>
              <div><span className="text-[#FF6B35]">/features/radio</span> — Music & Radio features detail</div>
              <div><span className="text-[#FFD700]">/features/personas</span> — Persona features detail</div>
              <div className="pt-4 border-t border-white/10 mt-4">
                <span className="text-white/40">// All pages registered in src/pages.config.js</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <FileText className="w-16 h-16 text-[#FF1493] mx-auto mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">
            Start Exploring
          </h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Ready to dive deeper? Check out the feature overview or jump straight 
            to your area of interest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/features">
              <Button variant="hot" size="xl" className="font-black uppercase">
                View Features Overview
                <ChevronRight className="w-5 h-5 ml-2" />
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
