import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Event Insights - Shows why an event was recommended
 */
export default function EventInsights({ event, scoreBreakdown }) {
  if (!scoreBreakdown) return null;

  const { total, breakdown } = scoreBreakdown;
  const reasons = [];

  if (breakdown.location > 15) {
    reasons.push({ icon: '📍', text: 'In your area', score: breakdown.location });
  }
  if (breakdown.mode > 15) {
    reasons.push({ icon: '🎯', text: 'Matches your vibe', score: breakdown.mode });
  }
  if (breakdown.interests > 10) {
    reasons.push({ icon: '❤️', text: 'Aligns with your interests', score: breakdown.interests });
  }
  if (breakdown.collaborative > 10) {
    reasons.push({ icon: '👥', text: 'People like you are going', score: breakdown.collaborative });
  }
  if (breakdown.timing > 7) {
    reasons.push({ icon: '⏰', text: 'Happening soon', score: breakdown.timing });
  }
  if (breakdown.popularity > 5) {
    reasons.push({ icon: '🔥', text: 'Trending', score: breakdown.popularity });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          <Info className="w-3 h-3 mr-1" />
          Why recommended
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-black border border-white/20 text-white">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-white/60">Match Score</span>
              <span className="text-2xl font-black text-[#FF1493]">{total}/100</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FF1493] to-[#B026FF]"
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">Top Reasons</p>
            <div className="space-y-2">
              {reasons.slice(0, 4).map((reason, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{reason.icon}</span>
                    <span>{reason.text}</span>
                  </div>
                  <span className="text-xs text-white/40">+{Math.round(reason.score)}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Based on your RSVPs, check-ins, and browsing history
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}