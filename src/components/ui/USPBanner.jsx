/**
 * USPBanner - Highlight unique selling points across the app
 * 
 * Use on key pages to reinforce platform values and differentiators.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, MapPin, Heart, Zap, Lock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

const USP_CONFIGS = {
  'care-first': {
    icon: Heart,
    color: '#FF1493',
    bgGradient: 'from-[#FF1493]/20 to-[#B026FF]/20',
    borderColor: '#FF1493',
    title: 'CARE-FIRST PLATFORM',
    description: 'Consent is non-negotiable. Safety tools, panic buttons, and check-ins are built into every feature.',
    cta: { label: 'View Safety Tools', path: 'Safety' },
  },
  'privacy-grid': {
    icon: Lock,
    color: '#00D9FF',
    bgGradient: 'from-[#00D9FF]/20 to-[#39FF14]/20',
    borderColor: '#00D9FF',
    title: '500M PRIVACY GRID',
    description: 'Your exact location is never shared. We use a fuzzy grid so you\'re discoverable without being trackable.',
    cta: { label: 'Privacy Settings', path: 'Settings' },
  },
  'right-now': {
    icon: Zap,
    color: '#E62020',
    bgGradient: 'from-[#E62020]/20 to-[#FF6B35]/20',
    borderColor: '#E62020',
    title: 'NO GHOST STATUS',
    description: 'Right Now auto-expires. No stale profiles. When you\'re live, you\'re live. When you\'re not, you\'re not.',
    cta: { label: 'Go Live', path: 'RightNowDashboard' },
  },
  'community': {
    icon: Users,
    color: '#B026FF',
    bgGradient: 'from-[#B026FF]/20 to-[#00D9FF]/20',
    borderColor: '#B026FF',
    title: 'QUEER-FIRST DESIGN',
    description: 'Built for queer nightlife. Inclusive identities, flexible personas, and community-driven moderation.',
    cta: { label: 'Community Guidelines', path: 'CommunityGuidelines' },
  },
  'escrow': {
    icon: Shield,
    color: '#39FF14',
    bgGradient: 'from-[#39FF14]/20 to-[#00D9FF]/20',
    borderColor: '#39FF14',
    title: 'PROTECTED COMMERCE',
    description: 'P2P marketplace with escrow protection. Sellers get paid when buyers confirm delivery.',
    cta: { label: 'Learn More', path: 'Marketplace' },
  },
};

const LS_DISMISSED_KEY = 'hm_usp_dismissed';

export default function USPBanner({ 
  type = 'care-first', 
  dismissable = true,
  compact = false,
  className = ''
}) {
  const [dismissed, setDismissed] = useState(false);
  const config = USP_CONFIGS[type];

  useEffect(() => {
    if (!dismissable) return;
    try {
      const dismissedList = JSON.parse(localStorage.getItem(LS_DISMISSED_KEY) || '[]');
      if (dismissedList.includes(type)) {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, [type, dismissable]);

  const handleDismiss = () => {
    setDismissed(true);
    if (!dismissable) return;
    try {
      const dismissedList = JSON.parse(localStorage.getItem(LS_DISMISSED_KEY) || '[]');
      if (!dismissedList.includes(type)) {
        dismissedList.push(type);
        localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify(dismissedList));
      }
    } catch {
      // ignore
    }
  };

  if (!config) return null;
  if (dismissed) return null;

  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-3 p-3 bg-gradient-to-r ${config.bgGradient} border-l-4 ${className}`}
        style={{ borderLeftColor: config.borderColor }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider">{config.title}</p>
          <p className="text-[10px] text-white/60 truncate">{config.description}</p>
        </div>
        {dismissable && (
          <button onClick={handleDismiss} className="p-1 text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative bg-gradient-to-r ${config.bgGradient} border-2 p-4 ${className}`}
        style={{ borderColor: config.borderColor }}
      >
        {dismissable && (
          <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-white/40 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 flex items-center justify-center border-2 flex-shrink-0"
            style={{ borderColor: config.borderColor, backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: config.color }} />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: config.color }}>
              {config.title}
            </h3>
            <p className="text-sm text-white/70 mb-3">
              {config.description}
            </p>
            {config.cta && (
              <Link 
                to={createPageUrl(config.cta.path)}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                style={{ color: config.color }}
              >
                {config.cta.label}
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export a rotating banner that cycles through USPs
export function RotatingUSPBanner({ types = ['care-first', 'privacy-grid', 'right-now'], interval = 10000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % types.length);
    }, interval);
    return () => clearInterval(timer);
  }, [types.length, interval]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={types[currentIndex]}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <USPBanner type={types[currentIndex]} dismissable={false} compact />
      </motion.div>
    </AnimatePresence>
  );
}
