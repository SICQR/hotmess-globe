import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Radio, 
  Music,
  Mic,
  Calendar,
  Users,
  Play,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const RADIO_FEATURES = [
  {
    id: 'live',
    icon: Radio,
    title: 'LIVE RADIO 24/7',
    tagline: 'Always playing, always fresh',
    color: '#FF6B35',
    description: 'Tune in anytime to hear the best curated music, live DJ sets, and community playlists. Our radio never stops and neither does the vibe.',
    benefits: [
      '24/7 live streaming',
      'Multiple genre channels',
      'Live DJ takeovers',
      'Song ID & save to playlist',
      'Background play support',
    ],
  },
  {
    id: 'shows',
    icon: Mic,
    title: 'ORIGINAL SHOWS',
    tagline: 'More than just music',
    color: '#B026FF',
    description: 'Exclusive shows from our resident DJs and hosts. From music discovery to community discussions, there\'s always something on.',
    benefits: [
      'Weekly scheduled shows',
      'Guest DJ appearances',
      'Community call-ins',
      'Show archives & replays',
      'Exclusive premieres',
    ],
    shows: [
      { name: 'Wake The Mess', time: 'Fridays 8PM', host: 'DJ HOTMESS' },
      { name: 'Dial A Daddy', time: 'Saturdays 10PM', host: 'Various' },
      { name: 'Hand N Hand', time: 'Sundays 6PM', host: 'Community' },
    ]
  },
  {
    id: 'releases',
    icon: Sparkles,
    title: 'EXCLUSIVE RELEASES',
    tagline: 'Hear it here first',
    color: '#C8962C',
    description: 'Get early access to new tracks, exclusive remixes, and limited releases from our label RAW CONVICT RECORDS and partner artists.',
    benefits: [
      'Early access to new music',
      'Exclusive remixes',
      'Limited edition tracks',
      'Artist collaborations',
      'Vinyl & merch drops',
    ],
  },
  {
    id: 'discovery',
    icon: Music,
    title: 'MUSIC DISCOVERY',
    tagline: 'Find your new favorite',
    color: '#00D9FF',
    description: 'Our AI learns what you love and surfaces new tracks you\'ll obsess over. Save tracks, build playlists, and share with friends.',
    benefits: [
      'Personalized recommendations',
      'Genre & mood filtering',
      'Save tracks to library',
      'Create & share playlists',
      'See what friends are playing',
    ],
  },
  {
    id: 'community',
    icon: Users,
    title: 'COMMUNITY PLAYLISTS',
    tagline: 'Music by the people',
    color: '#39FF14',
    description: 'Collaborative playlists curated by the community. Vote on tracks, submit your favorites, and discover what\'s trending.',
    benefits: [
      'Community-curated playlists',
      'Track voting system',
      'Submit your tracks',
      'Trending & hot charts',
      'Playlist follows',
    ],
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'PREMIUM AUDIO',
    tagline: 'For the audiophiles',
    color: '#FFEB3B',
    description: 'Premium members get high-quality audio streaming, ad-free listening, and exclusive access to premium-only content.',
    benefits: [
      'High-quality streaming',
      'Ad-free listening',
      'Offline downloads',
      'Premium-only shows',
      'Early event ticket access',
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

          {feature.shows && (
            <div className="mt-6 space-y-2">
              <h4 className="text-xs font-black uppercase text-white/40 mb-3">Featured Shows</h4>
              {feature.shows.map((show, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 p-3">
                  <div>
                    <span className="font-bold text-sm">{show.name}</span>
                    <span className="text-white/40 text-xs ml-2">{show.host}</span>
                  </div>
                  <span className="text-xs text-white/60">{show.time}</span>
                </div>
              ))}
            </div>
          )}
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

export default function RadioFeatures() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="MUSIC"
        title="HOTMESS Radio"
        subtitle="The soundtrack to your nights"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#FF6B35]/30 via-black to-[#B026FF]/20 border-2 border-[#FF6B35] p-8 md:p-12 mb-12"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-8 h-8 text-[#FF6B35]" />
                <span className="text-[#FF6B35] font-black uppercase tracking-wider">Now Playing</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase mb-2">
                Always on, always hot
              </h2>
              <p className="text-white/70">
                24/7 curated music, live DJ sets, and exclusive releases.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/music/live">
                <Button variant="hot" size="lg" className="font-black uppercase">
                  <Play className="w-4 h-4 mr-2" />
                  Listen Live
                </Button>
              </Link>
              <Link to="/music/shows">
                <Button variant="outline" size="lg" className="font-black uppercase border-white/20">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { value: '24/7', label: 'Live Radio' },
            { value: '10+', label: 'Weekly Shows' },
            { value: '500+', label: 'Tracks/Week' },
            { value: '50K+', label: 'Listeners' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <div className="text-2xl font-black text-[#FF6B35]">{stat.value}</div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        {RADIO_FEATURES.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <Radio className="w-16 h-16 text-[#FF6B35] mx-auto mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">Tune In Now</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Join thousands of listeners enjoying the hottest music 24/7.
          </p>
          <Link to="/music/live">
            <Button variant="hot" size="xl" className="font-black uppercase">
              Start Listening
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </PageShell>
    </div>
  );
}
