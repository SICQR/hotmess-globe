/**
 * PromotionalCTAs - Reusable promotional call-to-action components
 * For business advertising, ticket verification, and feature promotion
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Globe,
  Megaphone,
  Ticket,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles,
  Crown,
  TrendingUp,
  Building2,
  Users,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * BusinessAdvertisingCTA - Promote globe advertising to venue owners
 */
export function BusinessAdvertisingCTA({ variant = 'default', className = '' }) {
  const variants = {
    default: {
      bg: 'bg-gradient-to-br from-[#E62020]/20 to-[#B026FF]/20 border border-[#E62020]/30',
      accent: '#E62020'
    },
    compact: {
      bg: 'bg-black/50 border border-white/10',
      accent: '#E62020'
    },
    featured: {
      bg: 'bg-gradient-to-r from-[#E62020] to-[#B026FF]',
      accent: '#000'
    }
  };

  const style = variants[variant] || variants.default;

  if (variant === 'compact') {
    return (
      <Link to="/biz/advertising" className={className}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`${style.bg} rounded-xl p-4 flex items-center justify-between hover:border-[#E62020]/50 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E62020]/20 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-[#E62020]" />
            </div>
            <div>
              <p className="font-bold text-sm">Get Featured on the Globe</p>
              <p className="text-xs text-white/60">From £49.99/month</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#E62020]" />
        </motion.div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link to="/biz/advertising" className={className}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`${style.bg} rounded-2xl p-6 text-black`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5" />
                <span className="font-black uppercase text-sm">For Venues</span>
              </div>
              <h3 className="text-2xl font-black uppercase mb-2">
                Get Featured on HotMess Globe
              </h3>
              <p className="text-black/70 mb-4">
                Reach thousands of nightlife enthusiasts. Appear on the map, get push notifications, drive traffic.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-black/20 rounded text-xs font-bold">
                  Map Pin
                </span>
                <span className="px-2 py-1 bg-black/20 rounded text-xs font-bold">
                  Banner Ads
                </span>
                <span className="px-2 py-1 bg-black/20 rounded text-xs font-bold">
                  Push Alerts
                </span>
              </div>
              <Button className="bg-black text-white hover:bg-black/80">
                Start Advertising
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <Globe className="w-20 h-20 opacity-30" />
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to="/biz/advertising" className={className}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`${style.bg} rounded-xl p-6`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#E62020]/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#E62020]" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Own a Venue or Club?</h4>
            <p className="text-sm text-white/60">Get featured on the HotMess Globe</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-black/30 rounded-lg">
            <Globe className="w-5 h-5 mx-auto mb-1 text-[#E62020]" />
            <p className="text-xs font-bold">Map Pin</p>
          </div>
          <div className="text-center p-3 bg-black/30 rounded-lg">
            <Megaphone className="w-5 h-5 mx-auto mb-1 text-[#00D9FF]" />
            <p className="text-xs font-bold">Banners</p>
          </div>
          <div className="text-center p-3 bg-black/30 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[#39FF14]" />
            <p className="text-xs font-bold">Analytics</p>
          </div>
        </div>
        <Button className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold">
          Advertise Now
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </Link>
  );
}

/**
 * TicketVerificationCTA - Promote verified ticket sales
 */
export function TicketVerificationCTA({ variant = 'default', className = '' }) {
  if (variant === 'compact') {
    return (
      <Link to="/ticket-reseller" className={className}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/50 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-[#39FF14]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#39FF14]/20 rounded-lg flex items-center justify-center">
              <Ticket className="w-5 h-5 text-[#39FF14]" />
            </div>
            <div>
              <p className="font-bold text-sm">Safe Ticket Resale</p>
              <p className="text-xs text-white/60">Verified tickets, protected purchases</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#39FF14]" />
        </motion.div>
      </Link>
    );
  }

  if (variant === 'seller') {
    return (
      <Link to="/ticket-reseller" className={className}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-[#39FF14]/10 to-[#00D9FF]/10 border border-[#39FF14]/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#39FF14]/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#39FF14]" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Sell Tickets Safely</h4>
              <p className="text-sm text-white/60">Get verified, build trust, sell faster</p>
            </div>
          </div>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-[#39FF14]" />
              <span>Verified badge = 3x more sales</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-[#39FF14]" />
              <span>Escrow protection for both parties</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-[#39FF14]" />
              <span>Instant payouts after confirmation</span>
            </li>
          </ul>
          <Button className="w-full bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-bold">
            Sell Your Tickets
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to="/ticket-reseller" className={className}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-r from-cyan-500/10 to-green-500/10 border border-cyan-500/30 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          <h4 className="font-bold text-lg">Verified Ticket Marketplace</h4>
        </div>
        <p className="text-sm text-white/70 mb-4">
          Buy and sell tickets safely with our verification system. Every ticket is checked, every purchase protected.
        </p>
        <div className="flex items-center gap-3 text-xs text-white/60 mb-4">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            Verified
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            Escrow
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4 text-cyan-400" />
            Trusted Sellers
          </span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black">
            Buy Tickets
          </Button>
          <Button variant="outline" className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20">
            Sell Tickets
          </Button>
        </div>
      </motion.div>
    </Link>
  );
}

/**
 * FeatureUSPBanner - Generic USP banner for features
 */
export function FeatureUSPBanner({ 
  title, 
  subtitle, 
  features = [], 
  ctaText = 'Learn More', 
  ctaLink = '/',
  color = '#E62020',
  icon: Icon = Star,
  className = ''
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-6 ${className}`}
      style={{ 
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        borderColor: `${color}30`,
        borderWidth: 1,
        borderStyle: 'solid'
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <h4 className="font-bold text-lg">{title}</h4>
          {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
        </div>
      </div>
      
      {features.length > 0 && (
        <ul className="space-y-2 mb-4">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-white/80">
              <CheckCircle className="w-4 h-4" style={{ color }} />
              {feature}
            </li>
          ))}
        </ul>
      )}
      
      <Link to={ctaLink}>
        <Button 
          className="w-full font-bold"
          style={{ backgroundColor: color, color: '#000' }}
        >
          {ctaText}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </motion.div>
  );
}

/**
 * FloatingPromoBanner - Floating promo that appears at bottom of screen
 */
export function FloatingPromoBanner({ 
  title, 
  subtitle, 
  ctaText, 
  ctaLink, 
  onDismiss,
  color = '#E62020',
  icon: Icon = Sparkles
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-96"
    >
      <div 
        className="bg-black/95 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl"
        style={{ borderColor: `${color}50` }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-white/40 hover:text-white text-xl"
        >
          ×
        </button>
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{title}</p>
            <p className="text-xs text-white/60 truncate">{subtitle}</p>
          </div>
          <Link to={ctaLink}>
            <Button 
              size="sm"
              className="font-bold"
              style={{ backgroundColor: color, color: '#000' }}
            >
              {ctaText}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * InlineCTA - Small inline CTA for use in lists/grids
 */
export function InlineCTA({ 
  label, 
  link, 
  icon: Icon = ArrowRight, 
  color = '#E62020' 
}) {
  return (
    <Link to={link}>
      <motion.div
        whileHover={{ x: 4 }}
        className="flex items-center gap-2 text-sm font-medium cursor-pointer"
        style={{ color }}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        <ArrowRight className="w-3 h-3" />
      </motion.div>
    </Link>
  );
}

export default {
  BusinessAdvertisingCTA,
  TicketVerificationCTA,
  FeatureUSPBanner,
  FloatingPromoBanner,
  InlineCTA
};
