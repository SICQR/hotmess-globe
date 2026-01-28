import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import { 
  MapPin, TrendingUp, Target, Shield, Calendar, 
  Scan, Users, Trophy, Settings, FileText, HelpCircle, UserCircle2, 
  Building2, Ticket, Store, Globe, ShieldCheck, ArrowRight, Crown
} from 'lucide-react';
import PageShell from '@/components/shell/PageShell';
import { isPersonasEnabled } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';

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

const BUSINESS_TOOLS = [
  { name: 'Ticket Resale', icon: Ticket, href: '/ticket-reseller', desc: 'Verified tickets only', highlight: true, color: '#39FF14' },
  { name: 'Sell Products', icon: Store, path: 'SellerDashboard', desc: 'List items for sale' },
  { name: 'Business Hub', icon: Building2, href: '/biz', desc: 'Venues & organizers' },
  { name: 'Advertise', icon: Globe, href: '/biz/advertising', desc: 'Get featured on Globe', highlight: true, color: '#E62020' },
];

const getAccountItems = () => {
  const items = [
    { name: 'Settings', icon: Settings, path: 'Settings' },
  ];
  
  // Add Personas if enabled
  if (isPersonasEnabled()) {
    items.push({ name: 'Personas', icon: UserCircle2, path: 'PersonaManagement' });
  }
  
  items.push(
    { name: 'Membership', icon: FileText, path: 'MembershipUpgrade' },
    { name: 'Help & Support', icon: HelpCircle, path: 'Care' },
  );
  
  return items;
};

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

        {/* Featured Business CTA */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#E62020] to-[#B026FF] rounded-2xl p-6 text-black"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-black/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black">OWN A VENUE?</h3>
                  <p className="text-black/70 text-sm">Get featured on the HotMess Globe. From £49.99/mo</p>
                </div>
              </div>
              <Link to="/biz/advertising">
                <Button className="bg-black text-white hover:bg-black/80 font-bold w-full md:w-auto">
                  Advertise Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Business & Commerce */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-white/60">BUSINESS & COMMERCE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BUSINESS_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link 
                  key={tool.name}
                  to={tool.href || createPageUrl(tool.path)}
                  className="group"
                >
                  <div 
                    className={`p-6 transition-all h-full border-2 ${
                      tool.highlight 
                        ? `bg-gradient-to-br from-[${tool.color}]/20 to-transparent border-[${tool.color}]/40 hover:border-[${tool.color}]/70`
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/30'
                    }`}
                    style={tool.highlight ? { 
                      background: `linear-gradient(135deg, ${tool.color}20, transparent)`,
                      borderColor: `${tool.color}40`
                    } : {}}
                  >
                    <Icon 
                      className="w-8 h-8 mb-3 transition-colors" 
                      style={{ color: tool.highlight ? tool.color : 'rgba(255,255,255,0.6)' }}
                    />
                    <h3 className="font-black uppercase text-sm mb-1">{tool.name}</h3>
                    <p className="text-xs text-white/50">{tool.desc}</p>
                    {tool.highlight && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: tool.color }}>
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Ticket Safety USP */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#39FF14]/10 to-[#00D9FF]/5 border border-[#39FF14]/30 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-8 h-8 text-[#39FF14]" />
              <div>
                <h3 className="font-black text-lg">VERIFIED TICKET MARKETPLACE</h3>
                <p className="text-xs text-white/60">Safe resale with fraud protection</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-black/30 rounded-lg">
                <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-[#39FF14]" />
                <p className="text-[10px] font-bold uppercase">Verified Sellers</p>
              </div>
              <div className="text-center p-3 bg-black/30 rounded-lg">
                <Shield className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                <p className="text-[10px] font-bold uppercase">Escrow Protection</p>
              </div>
              <div className="text-center p-3 bg-black/30 rounded-lg">
                <Target className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <p className="text-[10px] font-bold uppercase">Fraud Prevention</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/ticket-reseller" className="flex-1">
                <Button className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold">
                  Browse Tickets
                </Button>
              </Link>
              <Link to="/ticket-reseller?sell=true" className="flex-1">
                <Button variant="outline" className="w-full border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14]/20">
                  Sell Tickets
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Account */}
        <div className="mb-12">
          <h2 className="text-xl font-black uppercase mb-4 text-white/60">ACCOUNT</h2>
          <div className="space-y-3">
            {getAccountItems().map((item) => {
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
              <Link to="/legal/terms" className="hover:text-white">Terms of Service</Link>
              <Link to="/legal/privacy" className="hover:text-white">Privacy Policy</Link>
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