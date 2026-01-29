/**
 * Real Talk Hero Section
 * 
 * Celebrates honest profile tags like cali sober, chem-free, etc.
 * Shows users can be upfront about who they are.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Shield, 
  Eye,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Honest tags to showcase
const HONEST_TAGS = [
  { label: 'Cali Sober', category: 'lifestyle', description: 'Cannabis only' },
  { label: 'Sober', category: 'lifestyle', description: 'No substances' },
  { label: 'Chem-free', category: 'lifestyle', description: 'No party drugs' },
  { label: '420 Friendly', category: 'lifestyle', description: 'Cannabis welcome' },
  { label: 'Party Friendly', category: 'lifestyle', description: 'Open to it' },
  { label: 'PrEP', category: 'health', description: 'On prevention' },
  { label: 'U=U', category: 'health', description: 'Undetectable' },
  { label: 'Aftercare', category: 'values', description: 'Post-play care matters' },
  { label: 'Consent-first', category: 'values', description: 'Ask first, always' },
  { label: 'Dom', category: 'dynamic', description: 'Dominant' },
  { label: 'Sub', category: 'dynamic', description: 'Submissive' },
  { label: 'Switch', category: 'dynamic', description: 'Flexible' },
  { label: 'Monogamous', category: 'relationship', description: 'One partner' },
  { label: 'Open', category: 'relationship', description: 'Open relationship' },
  { label: 'Poly', category: 'relationship', description: 'Multiple partners' }
];

// Category colors
const CATEGORY_COLORS = {
  lifestyle: '#00D9FF',
  health: '#39FF14',
  values: '#FF1493',
  dynamic: '#B026FF',
  relationship: '#FFEB3B'
};

export default function RealTalkHero({ className = '' }) {
  const navigate = useNavigate();

  return (
    <section className={`bg-black py-16 md:py-24 relative overflow-hidden ${className}`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 relative">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF1493]/20 border border-[#FF1493] mb-6">
            <Eye className="w-4 h-4 text-[#FF1493]" />
            <span className="text-sm font-bold text-[#FF1493] uppercase">No judgment zone</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black uppercase text-white mb-4 leading-tight">
            Real Talk
          </h2>
          
          <p className="text-xl md:text-2xl text-white/80 mb-2">
            We're not being shy. We're being <span className="text-[#FF1493]">real</span>.
          </p>
        </motion.div>

        {/* Tag showcase */}
        <motion.div 
          className="flex flex-wrap justify-center gap-3 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {HONEST_TAGS.map((tag, index) => (
            <motion.span
              key={tag.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.02 }}
              className="px-4 py-2 bg-white/5 border border-white/20 text-sm text-white/80 
                         hover:border-white/40 hover:bg-white/10 transition-all cursor-default"
              style={{
                borderColor: `${CATEGORY_COLORS[tag.category]}40`,
              }}
            >
              {tag.label}
            </motion.span>
          ))}
        </motion.div>

        {/* Description */}
        <motion.p 
          className="text-center text-white/60 max-w-2xl mx-auto mb-8 text-lg leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          HOTMESS lets you be upfront about who you are and what you're looking for. 
          No judgment. Just honesty. These tags help you find people on the same page.
        </motion.p>

        {/* Values grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="p-6 border border-white/10 bg-white/5 text-center">
            <Shield className="w-8 h-8 mx-auto mb-3 text-[#39FF14]" />
            <h4 className="font-bold text-white mb-2">No Stigma</h4>
            <p className="text-sm text-white/60">
              HIV status, sobriety, kinks - all welcome, all respected
            </p>
          </div>
          
          <div className="p-6 border border-white/10 bg-white/5 text-center">
            <Heart className="w-8 h-8 mx-auto mb-3 text-[#FF1493]" />
            <h4 className="font-bold text-white mb-2">Your Terms</h4>
            <p className="text-sm text-white/60">
              Define your boundaries. We'll help you find people who respect them
            </p>
          </div>
          
          <div className="p-6 border border-white/10 bg-white/5 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#00D9FF]" />
            <h4 className="font-bold text-white mb-2">Better Matches</h4>
            <p className="text-sm text-white/60">
              Honest tags = fewer awkward conversations, more real connections
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => navigate('/profile/edit#tags')}
            className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black text-lg px-8 border-2 border-white"
          >
            Set Your Tags
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <p className="mt-4 text-xs text-white/40">
            You can change these anytime. Visibility settings let you control who sees what.
          </p>
        </motion.div>
      </div>

      {/* Brand footer */}
      <div className="mt-16 text-center">
        <p className="text-xs text-white/30 uppercase tracking-widest">
          18+ • Consent-first • Care always
        </p>
      </div>
    </section>
  );
}
