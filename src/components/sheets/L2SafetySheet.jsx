/**
 * L2SafetySheet — Safety Center
 * Tips, reporting tools, emergency contacts.
 */

import { Shield, Phone, Flag, Lock, ChevronRight, ExternalLink } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const TIPS = [
  {
    icon: '📍',
    title: 'Meet in public first',
    body: 'Always choose a well-lit, public place for first meets.',
  },
  {
    icon: '💬',
    title: 'Tell a friend',
    body: 'Share your plans with someone you trust before meeting.',
  },
  {
    icon: '🔒',
    title: 'Keep personal info private',
    body: "Don't share your home address or full name until you're comfortable.",
  },
  {
    icon: '🚨',
    title: 'Trust your instincts',
    body: "If something feels off, leave. Your safety comes first.",
  },
];

export default function L2SafetySheet() {
  const { openSheet } = useSheet();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero */}
      <div className="px-4 pt-4 pb-6">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <p className="text-[#C8962C] font-black text-sm">Safety First</p>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
              Your safety is our priority. Read our tips and use our tools to stay safe.
            </p>
          </div>
        </div>
      </div>

      {/* Safety tips */}
      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Safety Tips</p>
        <div className="space-y-2">
          {TIPS.map(tip => (
            <div key={tip.title} className="bg-[#1C1C1E] rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
              <div>
                <p className="text-white font-bold text-sm">{tip.title}</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency */}
      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Emergency</p>
        <div className="space-y-2">
          <a
            href="tel:999"
            className="w-full bg-red-500/15 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 active:bg-red-500/20 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-red-400 font-black text-sm">Call 999</p>
              <p className="text-white/40 text-xs">Police, Fire, Ambulance (UK)</p>
            </div>
            <ExternalLink className="w-4 h-4 text-red-400/60" />
          </a>

          <button
            onClick={() => {/* TODO: open report flow */}}
            className="w-full bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-[#C8962C]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Report a User</p>
              <p className="text-white/40 text-xs">Flag inappropriate behaviour</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>

          <button
            onClick={() => openSheet('blocked')}
            className="w-full bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-bold text-sm">Blocked Users</p>
              <p className="text-white/40 text-xs">Manage your block list</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="px-4 pb-6">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Resources</p>
        <div className="space-y-2">
          {[
            { label: 'Community Guidelines', url: '/legal/community' },
            { label: 'Terms of Service', url: '/legal/terms' },
            { label: 'Privacy Policy', url: '/legal/privacy' },
            { label: 'Contact Support', url: '/help' },
          ].map(link => (
            <a
              key={link.label}
              href={link.url}
              className="flex items-center justify-between py-3 text-white/60 text-sm hover:text-white transition-colors"
            >
              {link.label}
              <ChevronRight className="w-4 h-4 text-white/20" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
