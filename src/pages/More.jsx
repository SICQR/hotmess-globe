import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  MapPin, TrendingUp, Target, Shield, Calendar, 
  Scan, Users, Trophy, Settings, FileText, HelpCircle 
} from 'lucide-react';

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

export default function More() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-5xl font-black uppercase mb-2">MORE</h1>
          <p className="text-white/60 uppercase tracking-wider text-sm">
            Tools • Settings • Legal
          </p>
        </div>

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
                  <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-[#FF1493] p-6 transition-all h-full">
                    <Icon className="w-8 h-8 mb-3 text-white/60 group-hover:text-[#FF1493] transition-colors" />
                    <h3 className="font-black uppercase text-sm mb-1">{tool.name}</h3>
                    <p className="text-xs text-white/50">{tool.desc}</p>
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
                  <div className="bg-white/5 hover:bg-white/10 border-l-4 border-[#FF1493] p-4 transition-all flex items-center gap-3">
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
      </div>
    </div>
  );
}