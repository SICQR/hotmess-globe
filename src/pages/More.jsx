import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  MapPin, TrendingUp, Target, Shield, Calendar, 
  Scan, Users, Trophy, Settings, HelpCircle,
  Crown, Heart, ArrowRight, ChevronRight
} from 'lucide-react';

const TOOLS = [
  { name: 'Beacons', icon: MapPin, path: 'Beacons', desc: 'Create location drops', color: '#00D9FF' },
  { name: 'Stats', icon: TrendingUp, path: 'Stats', desc: 'Your activity dashboard', color: '#39FF14' },
  { name: 'Challenges', icon: Target, path: 'Challenges', desc: 'Daily and weekly goals', color: '#FF6B35' },
  { name: 'Safety', icon: Shield, path: 'Care', desc: 'Reports, blocks, resources', color: '#FF0000' },
  { name: 'Calendar', icon: Calendar, path: 'Calendar', desc: 'Events and subscriptions', color: '#B026FF' },
  { name: 'Scan', icon: Scan, path: 'Scan', desc: 'QR check-in and redeem', color: '#FFEB3B' },
  { name: 'Community', icon: Users, path: 'Community', desc: 'Posts and discussions', color: '#FF1493' },
  { name: 'Leaderboard', icon: Trophy, path: 'Leaderboard', desc: 'Top users and scores', color: '#FFD700' },
];

const ACCOUNT = [
  { name: 'Settings', icon: Settings, path: 'Settings', desc: 'Preferences & privacy' },
  { name: 'Membership', icon: Crown, path: 'MembershipUpgrade', desc: 'Upgrade to PLUS or CHROME' },
  { name: 'Help & Support', icon: HelpCircle, path: 'HelpCenter', desc: 'FAQs and contact' },
];

export default function More() {
  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-black to-cyan-950/40" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-7xl mx-auto"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-white/40 mb-4">TOOLS & SETTINGS</p>
          <h1 className="text-5xl md:text-7xl font-black italic mb-4">
            MORE<span className="text-pink-500">.</span>
          </h1>
          <p className="text-xl text-white/60 max-w-xl">
            Everything else you need. Tools, settings, and legal stuff.
          </p>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        
        {/* 2. QUICK ACTIONS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/care">
              <div className="group p-6 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-4">
                <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-7 h-7 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg">YOU GOOD?</h3>
                  <p className="text-sm text-white/60">Care & safety resources</p>
                </div>
                <ArrowRight className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            <Link to={createPageUrl('MembershipUpgrade')}>
              <div className="group p-6 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 hover:border-pink-500 transition-all flex items-center gap-4">
                <div className="w-14 h-14 bg-pink-500/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-7 h-7 text-pink-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg">UPGRADE</h3>
                  <p className="text-sm text-white/60">PLUS / CHROME membership</p>
                </div>
                <ArrowRight className="w-5 h-5 text-pink-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </motion.section>

        {/* 3. TOOLS GRID */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-black uppercase mb-6 text-white/60">TOOLS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TOOLS.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.path}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link to={createPageUrl(tool.path)} className="group block">
                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl p-6 transition-all h-full">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${tool.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: tool.color }} />
                      </div>
                      <h3 className="font-black uppercase text-sm mb-1 group-hover:text-white transition-colors">{tool.name}</h3>
                      <p className="text-xs text-white/50">{tool.desc}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* 4. ACCOUNT */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-black uppercase mb-6 text-white/60">ACCOUNT</h2>
          <div className="space-y-3">
            {ACCOUNT.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link to={createPageUrl(item.path)} className="group block">
                    <div className="bg-white/5 hover:bg-white/10 border-l-4 border-pink-500 rounded-r-xl p-5 transition-all flex items-center gap-4">
                      <Icon className="w-6 h-6 text-pink-500" />
                      <div className="flex-1">
                        <span className="font-black uppercase">{item.name}</span>
                        <p className="text-sm text-white/50">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* 5. LEGAL */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="border-t border-white/10 pt-12">
            <div className="text-center">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-6">
                18+ • Men-only • Consent-first • Care always
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60 mb-8">
                <Link to={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link to={createPageUrl('CommunityGuidelines')} className="hover:text-white transition-colors">
                  Community Guidelines
                </Link>
                <Link to={createPageUrl('Contact')} className="hover:text-white transition-colors">
                  Contact
                </Link>
              </div>
              <p className="text-sm text-white/30">
                © 2026 HOTMESS LONDON OS
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
