/**
 * USPSection - Unique Selling Points Display
 * 
 * Displays platform USPs in various formats for marketing sections.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, Brain, Zap, Shield, Sparkles, Crown,
  ShoppingBag, Users, Radio, Heart, MapPin, Lock
} from 'lucide-react';
import { USPS } from '@/lib/revenue';

// Icon mapping
const ICONS = {
  Globe, Brain, Zap, Shield, Sparkles, Crown,
  ShoppingBag, Users, Radio, Heart, MapPin, Lock,
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Main USP Grid
 */
export function USPGrid({ usps = USPS.platform, columns = 3, className = '' }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}
    >
      {usps.map((usp) => {
        const IconComponent = ICONS[usp.icon] || Sparkles;
        
        return (
          <motion.div
            key={usp.id}
            variants={itemVariants}
            className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${usp.color}20` }}
            >
              <IconComponent className="w-6 h-6" style={{ color: usp.color }} />
            </div>
            
            {/* Stat badge */}
            {usp.stat && (
              <div
                className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-black"
                style={{ backgroundColor: usp.color, color: '#000' }}
              >
                {usp.stat}
              </div>
            )}
            
            {/* Content */}
            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">
              {usp.headline}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              {usp.subline}
            </p>
            
            {/* Hover glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${usp.color}10 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * "What We Replace" Section
 */
export function ReplacementGrid({ className = '' }) {
  return (
    <div className={`${className}`}>
      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-8">
        <span className="text-white/40">No More</span>{' '}
        <span className="text-white">App Switching</span>
      </h2>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="space-y-3"
      >
        {USPS.replacements.map((item, idx) => (
          <motion.div
            key={item.app}
            variants={itemVariants}
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl"
          >
            <span className="text-white/40 line-through text-sm w-24 shrink-0">
              {item.app}
            </span>
            <span className="text-[#C8962C] text-xl">→</span>
            <span className="text-white font-bold text-sm flex-1">
              {item.replacement}
            </span>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Summary */}
      <div className="mt-8 p-6 bg-gradient-to-r from-[#C8962C]/20 to-[#B026FF]/20 border border-[#C8962C]/30 rounded-2xl text-center">
        <p className="text-xl md:text-2xl font-black uppercase">
          <span className="text-[#39FF14]">✓</span> ONE PLATFORM.{' '}
          <span className="text-[#C8962C]">EVERYTHING.</span>
        </p>
        <p className="text-white/60 mt-2">
          No clunky app switching. Ever.
        </p>
      </div>
    </div>
  );
}

/**
 * Membership USP Cards
 */
export function MembershipUSPs({ tier = 'plus', className = '' }) {
  const usps = USPS.membership[tier] || [];
  const color = tier === 'chrome' ? '#00D9FF' : '#C8962C';
  
  return (
    <div className={`space-y-3 ${className}`}>
      {usps.map((usp, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <svg className="w-4 h-4" style={{ color }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-white font-medium">{usp}</span>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Safety USP Section
 */
export function SafetyUSPs({ className = '' }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}
    >
      {USPS.safety.map((usp) => (
        <motion.div
          key={usp.id}
          variants={itemVariants}
          className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-xl"
        >
          <h4 className="font-black uppercase text-[#00D9FF] mb-1">
            {usp.headline}
          </h4>
          <p className="text-sm text-white/70">
            {usp.subline}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Single USP Badge (for inline use)
 */
export function USPBadge({ icon, text, color = '#C8962C' }) {
  const IconComponent = ICONS[icon] || Sparkles;
  
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <IconComponent className="w-3 h-3" />
      {text}
    </span>
  );
}

/**
 * Stats Row (for hero sections)
 */
export function StatsRow({ className = '' }) {
  const stats = [
    { value: '87%', label: 'Match Rate', color: '#39FF14' },
    { value: '24/7', label: 'Live Radio', color: '#C8962C' },
    { value: '0', label: 'Ghosting', color: '#00D9FF' },
  ];
  
  return (
    <div className={`flex items-center justify-center gap-8 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div
            className="text-3xl md:text-4xl font-black"
            style={{ color: stat.color }}
          >
            {stat.value}
          </div>
          <div className="text-xs uppercase tracking-wider text-white/60">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Feature Comparison Table
 */
export function FeatureComparison({ className = '' }) {
  const features = [
    { name: 'AI Matching', free: '60%', plus: '80%', chrome: '100%' },
    { name: 'Go Live', free: '1/day', plus: 'Unlimited', chrome: 'Unlimited' },
    { name: 'Profile Viewers', free: '❌', plus: 'Blurred', chrome: 'Full Access' },
    { name: 'Stealth Mode', free: '❌', plus: '✓', chrome: '✓' },
    { name: 'Night King', free: '❌', plus: '❌', chrome: '✓' },
    { name: 'Early Drops', free: '❌', plus: '❌', chrome: '24hr Head Start' },
    { name: 'Premium Content', free: 'Standard', plus: 'Standard', chrome: 'Free Access' },
    { name: 'Ads', free: 'Yes', plus: 'None', chrome: 'None' },
  ];
  
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-white/60 font-normal">Feature</th>
            <th className="text-center py-3 px-4">
              <span className="text-white font-black">FREE</span>
            </th>
            <th className="text-center py-3 px-4">
              <span className="text-[#C8962C] font-black">PLUS</span>
            </th>
            <th className="text-center py-3 px-4">
              <span className="text-[#00D9FF] font-black">CHROME</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => (
            <tr key={feature.name} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
              <td className="py-3 px-4 text-white">{feature.name}</td>
              <td className="py-3 px-4 text-center text-white/60">{feature.free}</td>
              <td className="py-3 px-4 text-center text-white">{feature.plus}</td>
              <td className="py-3 px-4 text-center text-[#00D9FF] font-bold">{feature.chrome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default {
  USPGrid,
  ReplacementGrid,
  MembershipUSPs,
  SafetyUSPs,
  USPBadge,
  StatsRow,
  FeatureComparison,
};
