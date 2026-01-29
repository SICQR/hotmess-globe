import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Users, Calendar, Radio, Ticket, Sparkles, Shield,
  Navigation, BarChart3, ShoppingBag, Settings, FileText, HelpCircle,
  Megaphone, Camera, Store
} from 'lucide-react';
import PageShell from '@/components/shell/PageShell';

const APPS = [
  { name: 'SOCIAL', icon: Users, path: 'Social', desc: 'Find people nearby', color: '#FF1493' },
  { name: 'EVENTS', icon: Calendar, path: 'Events', desc: "What's on tonight", color: '#00D9FF' },
  { name: 'RADIO', icon: Radio, path: 'Music', desc: 'Live shows & music', color: '#B026FF' },
  { name: 'TICKETS', icon: Ticket, path: 'TicketMarketplace', desc: 'Buy & sell tickets', color: '#FF6B35' },
  { name: 'COMMUNITY', icon: Sparkles, path: 'Community', desc: 'Posts & discussions', color: '#FFEB3B' },
  { name: 'SAFETY', icon: Shield, path: 'Care', desc: 'You good? Get help', color: '#FF0000' },
  { name: 'PULSE', icon: Navigation, path: 'Pulse', desc: 'Live map & beacons', color: '#39FF14' },
  { name: 'DIRECTIONS', icon: Navigation, path: 'Directions', desc: 'Get there fast', color: '#00D9FF' },
  { name: 'STATS', icon: BarChart3, path: 'Stats', desc: 'Your XP & activity', color: '#FFEB3B' },
  { name: 'SHOP', icon: ShoppingBag, path: 'Marketplace', desc: 'Shop the drop', color: '#B026FF' },
  { name: 'SETTINGS', icon: Settings, path: 'Settings', desc: 'Preferences', color: '#FFFFFF' },
];

const BIZ_APPS = [
  { name: 'PROMOTER', icon: Megaphone, path: 'PromoterDashboard', desc: 'Event beacons & promos', color: '#FF6B35' },
  { name: 'CREATOR', icon: Camera, path: 'CreatorDashboard', desc: 'Content & subscriptions', color: '#FF1493' },
  { name: 'SELLER', icon: Store, path: 'SellerDashboard', desc: 'Your shop & sales', color: '#00D9FF' },
];

const ACCOUNT = [
  { name: 'Settings', icon: Settings, path: 'Settings' },
  { name: 'Membership', icon: FileText, path: 'MembershipUpgrade' },
  { name: 'Help & Support', icon: HelpCircle, path: 'Care' },
];

export default function More() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="ALL APPS"
        title="All Apps"
        subtitle="HOTMESS LONDON OS"
        maxWidth="7xl"
      >
        {/* Hero Banner */}
        <div className="mb-10 relative overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF1493]/20 via-[#B026FF]/20 to-[#00D9FF]/20 border-2 border-white/20 p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,20,147,0.1),transparent_70%)]" />
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight relative z-10">
              <span className="text-[#FF1493]">11</span> apps. 
              <span className="text-[#00D9FF]"> One</span> place. 
              <span className="text-[#B026FF]"> London OS.</span>
            </h1>
            <p className="text-white/60 mt-3 text-sm uppercase tracking-widest relative z-10">
              Everything you need for a night out
            </p>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-6 text-white/60">11 APPS IN ONE</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <Link 
                  key={app.path + app.name}
                  to={createPageUrl(app.path)}
                  className="group"
                >
                  <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-current p-5 transition-all h-full flex flex-col items-center text-center"
                    style={{ '--hover-color': app.color }}
                  >
                    {/* Icon Box */}
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ 
                        backgroundColor: `${app.color}20`,
                        border: `2px solid ${app.color}40`
                      }}
                    >
                      <Icon 
                        className="w-8 h-8 transition-colors" 
                        style={{ color: app.color }}
                      />
                    </div>
                    
                    {/* App Name */}
                    <h3 
                      className="font-black uppercase text-sm mb-1 transition-colors group-hover:text-current"
                      style={{ '--tw-text-opacity': 1 }}
                    >
                      <span className="group-hover:hidden">{app.name}</span>
                      <span className="hidden group-hover:inline" style={{ color: app.color }}>{app.name}</span>
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                      {app.desc}
                    </p>
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
