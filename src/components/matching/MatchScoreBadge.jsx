/**
 * Match Score Badge
 * 
 * Shows compatibility percentage with AI-powered explanation.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronDown,
  Heart,
  Music,
  Users,
  Target,
  MapPin,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/utils/AuthProvider';

// Score level colors
const LEVEL_COLORS = {
  exceptional: '#39FF14',
  great: '#00D9FF',
  good: '#FFB800',
  moderate: '#FF1493',
  low: '#FFFFFF'
};

// Breakdown icons
const BREAKDOWN_ICONS = {
  music: Music,
  tribes: Users,
  interests: Heart,
  lookingFor: Target,
  position: Target,
  distance: MapPin
};

export default function MatchScoreBadge({ 
  targetUserId, 
  compact = false,
  showBreakdown = false,
  className = '' 
}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Fetch match score
  useEffect(() => {
    async function fetchScore() {
      if (!user?.id || !targetUserId) return;

      setLoading(true);
      try {
        const response = await fetch('/api/match-probability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            targetUserId
          })
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Match score error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [user?.id, targetUserId]);

  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin text-white/40" />
      </div>
    );
  }

  if (!data) return null;

  const { score, matchLevel, reasons, aiExplanation, breakdown, distance } = data;
  const color = LEVEL_COLORS[matchLevel] || LEVEL_COLORS.moderate;

  // Compact badge
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 ${className}`}
        style={{ backgroundColor: `${color}20` }}
      >
        <Sparkles className="w-3 h-3" style={{ color }} />
        <span className="text-xs font-bold" style={{ color }}>{score}%</span>
      </div>
    );
  }

  // Full badge with optional breakdown
  return (
    <div className={`${className}`}>
      <button
        onClick={() => showBreakdown && setExpanded(!expanded)}
        className={`
          flex items-center gap-3 p-3 w-full text-left transition-colors
          ${showBreakdown ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}
        `}
        style={{ backgroundColor: `${color}10` }}
      >
        {/* Score circle */}
        <div 
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center border-2"
          style={{ borderColor: color }}
        >
          <span className="text-lg font-black" style={{ color }}>{score}</span>
          <span className="text-[8px] text-white/50">match</span>
        </div>

        {/* Info */}
        <div className="flex-1">
          {aiExplanation ? (
            <p className="text-sm text-white/90 italic">"{aiExplanation}"</p>
          ) : reasons?.length > 0 ? (
            <p className="text-sm text-white/90">{reasons[0]}</p>
          ) : (
            <p className="text-sm text-white/60">
              {matchLevel === 'exceptional' && 'Exceptional match!'}
              {matchLevel === 'great' && 'Great compatibility'}
              {matchLevel === 'good' && 'Good potential'}
              {matchLevel === 'moderate' && 'Worth exploring'}
              {matchLevel === 'low' && 'Different vibes'}
            </p>
          )}
          
          {distance && (
            <p className="text-xs text-white/50 mt-1">
              <MapPin className="w-3 h-3 inline mr-1" />
              {distance} away
            </p>
          )}
        </div>

        {showBreakdown && (
          <ChevronDown 
            className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Breakdown panel */}
      <AnimatePresence>
        {expanded && breakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="p-3 space-y-2">
              {Object.entries(breakdown).map(([key, value]) => {
                const Icon = BREAKDOWN_ICONS[key] || Sparkles;
                const maxValue = {
                  music: 15, tribes: 15, interests: 15,
                  lookingFor: 20, position: 10, age: 10,
                  distance: 10, activity: 5
                }[key] || 10;
                const percentage = Math.round((value / maxValue) * 100);

                return (
                  <div key={key} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-white/40" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-white/80">{value}/{maxValue}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: percentage > 70 ? '#39FF14' : percentage > 40 ? '#FFB800' : '#FF1493'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Reasons */}
              {reasons?.length > 1 && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <p className="text-[10px] uppercase text-white/40 mb-2">Why you match</p>
                  <div className="flex flex-wrap gap-1">
                    {reasons.map((reason, i) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-white/5 text-[10px] text-white/70"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
