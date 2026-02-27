/**
 * ConsentForm — Membership consent (privacy, safety, GDPR)
 *
 * Noir-gold design. Clean accordion-style sections.
 * No pink, no cyan, no purple — gold only.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Users, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const CONSENT_VERSION = 'v1.0.0-2025';
const GOLD = '#C8962C';

const SECTIONS = [
  {
    icon: Users,
    title: 'Private Membership',
    body: 'HOTMESS LONDON operates as a private members association under UK law (Equality Act 2010, §193). This is a men-focused platform for adult nightlife, culture, and community.',
  },
  {
    icon: Lock,
    title: 'Privacy & Location',
    body: 'Your location is grid-snapped to a 500m radius. Presence pulses auto-expire after 6 hours. DMs use E2E encryption. You control your privacy mode at all times.',
  },
  {
    icon: Shield,
    title: 'Safety & Responsibility',
    body: 'Use Care Beacons for health resources. Report inappropriate behaviour immediately. Respect all members\' boundaries. Comply with local laws.',
  },
];

function AccordionSection({ icon: Icon, title, body, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#0D0D0D] border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
        <span className="flex-1 text-sm font-bold text-white/80">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-[#C8962C]/50" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <p className="text-xs text-white/40 leading-relaxed">{body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      toast.success('Welcome to HOTMESS');
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
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(200,150,44,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Wordmark */}
        <div className="text-center mb-6">
          <p className="text-3xl font-black italic tracking-tight text-white leading-none">
            HOT<span className="text-[#C8962C]">MESS</span>
          </p>
          <p className="text-[10px] tracking-[0.3em] text-white/20 uppercase font-black mt-2">
            Private Members Club
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1C1C1E] border border-white/8 rounded-3xl p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5" style={{ color: GOLD }} />
            <h1 className="text-xl font-black text-white">Privacy & Membership</h1>
          </div>

          <p className="text-sm text-white/40 mb-5">
            Review our agreements to continue.
          </p>

          {/* Accordion sections */}
          <div className="space-y-2 mb-5">
            {SECTIONS.map(({ icon, title, body }, i) => (
              <AccordionSection
                key={title}
                icon={icon}
                title={title}
                body={body}
                defaultOpen={i === 0}
              />
            ))}
          </div>

          {/* GDPR notice — warm amber, not red */}
          <div className="bg-[#C8962C]/8 border border-[#C8962C]/15 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-[#C8962C]/60 mt-0.5 shrink-0" />
              <p className="text-xs text-white/50 leading-relaxed">
                This platform contains adult content (18+). Sexual orientation data is treated as
                Special Category data under GDPR Article 9 with enhanced protection.
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-4 bg-[#0D0D0D] border border-white/8 rounded-xl hover:border-white/15 transition-all mb-5 select-none group">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5 w-5 h-5 border-2 border-white/20 shrink-0 data-[state=checked]:bg-[#C8962C] data-[state=checked]:border-[#C8962C]"
            />
            <span className="text-xs text-white/50 leading-relaxed">
              I confirm I am 18+, have read the above, and agree to join HOTMESS as a private
              member — including consent to processing of Special Category data under GDPR
              Article 9.
            </span>
          </label>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wide text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: accepted ? GOLD : 'rgba(200,150,44,0.15)',
              boxShadow: accepted ? '0 0 30px rgba(200,150,44,0.25)' : 'none',
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
            ) : (
              'I Accept & Continue'
            )}
          </motion.button>
        </div>

        <p className="text-center text-[10px] text-white/10 mt-4 font-medium uppercase tracking-[0.2em]">
          {CONSENT_VERSION}
        </p>
      </motion.div>
    </div>
  );
}
