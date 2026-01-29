import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  MapPin, TrendingUp, Target, Shield, Calendar, 
  Scan, Users, Trophy, Settings, FileText, HelpCircle,
  Sparkles, Radio
} from 'lucide-react';
import PageShell from '@/components/shell/PageShell';

const TOOLS = [
  { name: 'Beacons', icon: MapPin, path: 'Beacons', desc: 'Create location drops' },
  { name: 'Stats', icon: TrendingUp, path: 'Stats', desc: 'Your activity dashboard' },
  { name: 'Challenges', icon: Target, path: 'Challenges', desc: 'Daily and weekly goals' },
  { name: 'Safety', icon: Shield, path: 'Safety', desc: 'Reports, blocks, resources' },
  { name: 'Calendar', icon: Calendar, path: 'Calendar', desc: 'Events and subscriptions' },
  { name: 'Scan', icon: Scan, path: 'Scan', desc: 'QR check-in and redeem' },
  { name: 'Community', icon: Users, path: 'Community', desc: 'Posts and discussions' },
  { name: 'Leaderboard', icon: Trophy, path: 'Leaderboard', desc: 'Top users and scores' },
];

const ACCOUNT = [
  { name: 'Settings', icon: Settings, path: 'Settings' },
  { name: 'Membership', icon: FileText, path: 'MembershipUpgrade' },
  { name: 'Help & Support', icon: HelpCircle, path: 'Care' },
];

const FEATURES = [
  { name: 'All Features', icon: Sparkles, href: '/features', desc: 'Explore everything HOTMESS offers', color: '#FF1493' },
  { name: 'Safety Features', icon: Shield, href: '/features/safety', desc: 'Panic button, fake calls, location sharing', color: '#FF0000' },
  { name: 'Social Features', icon: Users, href: '/features/social', desc: 'Connect, message, discover', color: '#00D9FF' },
  { name: 'Events Features', icon: Calendar, href: '/features/events', desc: 'Find what\'s happening near you', color: '#B026FF' },
  { name: 'Radio & Music', icon: Radio, href: '/features/music', desc: '24/7 radio, shows, exclusive releases', color: '#FF6B35' },
];

export default function More() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="MORE"
        title="More"
        subtitle="Tools • Settings • Legal"
        maxWidth="7xl"
      >

        {/* Tools Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-white/60">TOOLS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link 
                  key={tool.path}
                  to={createPageUrl(tool.path)}
                  className="group"
                >
                  <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-[#00D9FF] p-6 transition-all h-full">
                    <Icon className="w-8 h-8 mb-3 text-white/60 group-hover:text-[#00D9FF] transition-colors" />
                    <h3 className="font-black uppercase text-sm mb-1">{tool.name}</h3>
                    <p className="text-xs text-white/50">{tool.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Discover Features */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-white/60">DISCOVER</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link 
                  key={feature.href}
                  to={feature.href}
                  className="group"
                >
                  <div 
                    className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-current p-5 transition-all h-full flex items-start gap-4"
                    style={{ '--tw-border-opacity': 1, borderColor: `${feature.color}40` }}
                  >
                    <div 
                      className="w-12 h-12 flex items-center justify-center flex-shrink-0 border-2"
                      style={{ borderColor: feature.color, backgroundColor: `${feature.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: feature.color }} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm mb-1">{feature.name}</h3>
                      <p className="text-xs text-white/50">{feature.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-white/60">ACCOUNT</h2>
          <div className="space-y-3">
            {ACCOUNT.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className="block"
                >
                  <div className="bg-white/5 hover:bg-white/10 border-l-4 border-[#00D9FF] p-4 transition-all flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-black uppercase text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Legal */}
        <div className="border-t-2 border-white/10 pt-8">
          <div className="text-center space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-widest">
              18+ • Consent-first • Care always
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-white/60">
              <Link to={createPageUrl('TermsOfService')} className="hover:text-white">Terms of Service</Link>
              <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white">Privacy Policy</Link>
              <Link to={createPageUrl('CommunityGuidelines')} className="hover:text-white">Community Guidelines</Link>
              <Link to={createPageUrl('Contact')} className="hover:text-white">Contact</Link>
            </div>
            <p className="text-xs text-white/40">
              © 2026 HOTMESS LONDON OS
            </p>
          </div>
        </div>
      </PageShell>
    </div>
  );
}