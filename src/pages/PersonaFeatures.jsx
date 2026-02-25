import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  User, 
  Crown,
  ShoppingBag,
  Music,
  Calendar,
  Sparkles,
  Palette,
  Layers,
  Eye,
  Shield,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shell/PageShell';

const PERSONA_TYPES = [
  {
    id: 'standard',
    icon: User,
    title: 'STANDARD',
    tagline: 'Your core identity',
    color: '#FFFFFF',
    description: 'Your base profile that showcases who you are. Photos, bio, interests, and vibe preferences. The foundation of your HOTMESS identity.',
    features: [
      'Profile photos & gallery',
      'Bio & about me',
      'Interest tags & vibes',
      'Location & travel times',
      'Online status & "Right Now"',
    ],
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'PREMIUM',
    tagline: 'Stand out from the crowd',
    color: '#FFD700',
    description: 'Unlock premium profile features that make you more visible and give you advanced tools for connecting with others.',
    features: [
      'Verified badge',
      'Priority in discovery',
      'See who viewed you',
      'Advanced filters',
      'Unlimited messages',
    ],
  },
  {
    id: 'seller',
    icon: ShoppingBag,
    title: 'SELLER',
    tagline: 'Turn your passion into profit',
    color: '#C8962C',
    description: 'Transform your profile into a storefront. List products, track sales, and build your brand within the HOTMESS community.',
    features: [
      'Product listings',
      'Storefront profile section',
      'Sales analytics',
      'Customer reviews',
      'Payout management',
    ],
  },
  {
    id: 'creator',
    icon: Music,
    title: 'CREATOR',
    tagline: 'Share your art',
    color: '#B026FF',
    description: 'For DJs, artists, and content creators. Showcase your work, share exclusive content, and connect with fans.',
    features: [
      'Music/content showcase',
      'SoundCloud integration',
      'Exclusive releases',
      'Fan engagement tools',
      'Creator analytics',
    ],
  },
  {
    id: 'organizer',
    icon: Calendar,
    title: 'ORGANIZER',
    tagline: 'Build your events empire',
    color: '#00D9FF',
    description: 'Event organizers get powerful tools to create, promote, and manage events. Sell tickets, track attendance, and grow your following.',
    features: [
      'Event creation tools',
      'Ticketing & payments',
      'Attendee management',
      'Promo code support',
      'Event analytics',
    ],
  },
];

const SKIN_FEATURES = [
  {
    icon: Layers,
    title: 'Context-Aware Display',
    description: 'Your profile automatically adapts based on where it\'s viewed - social discovery, marketplace, or events.',
  },
  {
    icon: Palette,
    title: 'Custom Themes',
    description: 'Premium members can customize their profile colors, backgrounds, and visual style.',
  },
  {
    icon: Eye,
    title: 'Privacy Controls',
    description: 'Control what each persona shows. Hide seller info from social, or show only events to certain viewers.',
  },
  {
    icon: Shield,
    title: 'Verified Identity',
    description: 'Face verification and social login options to prove you\'re real and build trust.',
  },
];

const PersonaCard = ({ persona, index }) => {
  const Icon = persona.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
        style={{ backgroundColor: `${persona.color}20` }}
      />
      <div 
        className="relative bg-black border-2 p-6 h-full transition-all group-hover:translate-y-[-4px]"
        style={{ borderColor: `${persona.color}40` }}
      >
        <div 
          className="w-14 h-14 flex items-center justify-center border-2 mb-4"
          style={{ borderColor: persona.color, backgroundColor: `${persona.color}15` }}
        >
          <Icon className="w-7 h-7" style={{ color: persona.color }} />
        </div>
        
        <h3 className="text-xl font-black uppercase mb-1">{persona.title}</h3>
        <p className="text-sm mb-4" style={{ color: persona.color }}>{persona.tagline}</p>
        
        <p className="text-white/70 text-sm mb-4 leading-relaxed">
          {persona.description}
        </p>
        
        <div className="space-y-2">
          {persona.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: persona.color }} />
              <span className="text-white/60 text-xs">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default function PersonaFeatures() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="PERSONAS"
        title="Multi-Layered Profiles"
        subtitle="One identity, many faces - adapt to every context"
        maxWidth="6xl"
        kinetic={true}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#C8962C]/20 via-black to-[#B026FF]/20 border-2 border-[#C8962C] p-8 md:p-12 mb-12"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#C8962C]/10 to-[#B026FF]/10 blur-3xl rounded-full" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-8 h-8 text-[#C8962C]" />
              <span className="text-[#C8962C] font-black uppercase tracking-wider">Persona System</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-black uppercase mb-4">
              Be whoever you need to be
            </h2>
            <p className="text-white/70 text-lg mb-6">
              Your HOTMESS profile adapts to context. Social discovery shows your vibe. 
              The marketplace shows your products. Events show your parties. 
              One account, infinite possibilities.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/EditProfile">
                <Button variant="hot" size="lg" className="font-black uppercase">
                  <User className="w-4 h-4 mr-2" />
                  Customize Your Persona
                </Button>
              </Link>
              <Link to="/MembershipUpgrade">
                <Button variant="outline" size="lg" className="font-black uppercase border-white/20">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-black uppercase text-center mb-8">How Personas Work</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                step: '01', 
                title: 'One Profile', 
                desc: 'Create your core identity with photos, bio, and interests. This is the foundation all personas build from.',
                color: '#C8962C'
              },
              { 
                step: '02', 
                title: 'Add Layers', 
                desc: 'Unlock seller, creator, or organizer features. Each adds new sections and capabilities to your profile.',
                color: '#B026FF'
              },
              { 
                step: '03', 
                title: 'Context Adapts', 
                desc: 'Your profile automatically shows relevant info based on where someone finds you - social, market, or events.',
                color: '#00D9FF'
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <div 
                  className="text-5xl font-black mb-4 opacity-20"
                  style={{ color: item.color }}
                >
                  {item.step}
                </div>
                <h3 className="font-black uppercase mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Persona Types */}
        <section className="mb-16">
          <h2 className="text-2xl font-black uppercase text-center mb-2">Persona Types</h2>
          <p className="text-white/60 text-center mb-8 max-w-xl mx-auto">
            Start with Standard, then unlock additional personas as you grow within the community.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERSONA_TYPES.map((persona, index) => (
              <PersonaCard key={persona.id} persona={persona} index={index} />
            ))}
          </div>
        </section>

        {/* Profile Skins */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-gradient-to-r from-[#B026FF]/20 to-[#00D9FF]/20 border-2 border-[#B026FF] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-[#B026FF]" />
              <h2 className="text-xl font-black uppercase">Profile Skin Features</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {SKIN_FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-[#B026FF]/20 border border-[#B026FF]/40 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#B026FF]" />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">{feature.title}</h4>
                      <p className="text-white/60 text-sm">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Comparison */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-black uppercase text-center mb-8">Free vs Premium</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-white/60" />
                <h3 className="font-black uppercase">Free</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Standard profile with photos & bio',
                  'Basic discovery features',
                  'Limited daily messages',
                  'Community access',
                  'Event browsing',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle className="w-4 h-4 text-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#C8962C]/10 border-2 border-[#FFD700] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-[#FFD700]" />
                <h3 className="font-black uppercase">Premium</h3>
                <span className="ml-auto text-xs bg-[#FFD700] text-black px-2 py-1 font-bold">RECOMMENDED</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Everything in Free',
                  'Verified badge & priority listing',
                  'See who viewed your profile',
                  'Unlimited messages',
                  'Custom profile themes',
                  'Advanced discovery filters',
                  'Seller & Creator tools',
                  'Early access to features',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle className="w-4 h-4 text-[#FFD700]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/MembershipUpgrade" className="block mt-6">
                <Button variant="hot" className="w-full font-black uppercase">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16 pt-16 border-t border-white/10"
        >
          <Layers className="w-16 h-16 text-[#C8962C] mx-auto mb-6" />
          <h2 className="text-3xl font-black uppercase mb-4">Build Your Persona</h2>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Start with the basics and grow into whatever you want to be.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/EditProfile">
              <Button variant="hot" size="xl" className="font-black uppercase">
                Edit Profile
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="xl" className="font-black uppercase border-white/20">
                View All Features
              </Button>
            </Link>
          </div>
        </motion.div>
      </PageShell>
    </div>
  );
}
