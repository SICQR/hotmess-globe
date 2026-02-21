import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Users, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import BrandBackground from '@/components/ui/BrandBackground';

const CONSENT_VERSION = 'v1.0.0-2025';

const SECTIONS = [
  {
    icon: Users,
    color: '#FF1493',
    title: 'Private Membership',
    body: 'HOTMESS LONDON operates as a private members association under UK law (Equality Act 2010, §193). This is a men-focused platform for adult nightlife, culture, and community.',
  },
  {
    icon: Lock,
    color: '#00D9FF',
    title: 'Privacy & Location',
    body: 'Your location is grid-snapped to a 500m radius. Presence pulses auto-expire after 6 hours. DMs use Telegram E2E encryption. You control your privacy mode at all times.',
  },
  {
    icon: Shield,
    color: '#B026FF',
    title: 'Safety & Responsibility',
    body: 'Use Care Beacons for health resources. Report inappropriate behaviour immediately. Respect all members\' boundaries. Comply with local laws.',
  },
];

export default function ConsentForm({ user, onAccepted }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      toast.error('Please read and accept the terms');
      return;
    }
    setLoading(true);
    try {
      await base44.auth.updateMe({
        consent_accepted: true,
        consent_version: CONSENT_VERSION,
        consent_timestamp: new Date().toISOString(),
        is_18_plus: true,
      });
      toast.success('Welcome to HOTMESS LONDON');
      onAccepted();
    } catch (error) {
      console.error('Failed to accept consent:', error);
      toast.error('Failed to save consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black p-4 overflow-hidden">
      <BrandBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight text-white leading-none">
            HOT<span className="text-[#FF1493]" style={{ textShadow: '0 0 24px rgba(255,20,147,0.6)' }}>MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono mt-2">LONDON</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <p className="text-[10px] uppercase tracking-[0.35em] font-mono text-white/30 mb-1">
            SYSTEM INITIALIZATION
          </p>
          <h1 className="text-2xl font-black text-white uppercase mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#FF1493]" />
            Membership Consent
          </h1>

          {/* Scrollable sections */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-6">
            {SECTIONS.map(({ icon: Icon, color, title, body }) => (
              <div
                key={title}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3"
              >
                <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color }} />
                <div>
                  <p className="text-sm font-black text-white mb-1">{title}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}

            {/* GDPR notice */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">
                This platform contains adult content (18+ only). Sexual orientation data is treated as Special Category data under GDPR Article 9 with enhanced protection.
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors mb-5 select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-[#FF1493] shrink-0"
            />
            <span className="text-xs text-white/70 leading-relaxed">
              I confirm I am 18+, have read the above, and agree to join HOTMESS LONDON as a private member — including consent to processing of Special Category data under GDPR Article 9.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full h-14 rounded-xl font-black text-lg uppercase tracking-widest text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: accepted ? '#FF1493' : 'rgba(255,20,147,0.3)',
              boxShadow: accepted ? '0 0 28px rgba(255,20,147,0.45)' : 'none',
            }}
          >
            {loading ? 'SAVING…' : 'ENTER HOTMESS'}
          </button>
        </div>

        <p className="text-center text-xs text-white/20 mt-5 font-mono uppercase">
          {CONSENT_VERSION} · GDPR Compliant
        </p>
      </motion.div>
    </div>
  );
}

