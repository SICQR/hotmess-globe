/**
 * MatchBreakdownCard - Mobile-friendly compatibility breakdown display
 * 
 * Shows detailed match scoring breakdown with visual progress bars.
 * Designed for both inline and modal display.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Navigation, 
  Heart, 
  Sparkles, 
  Target, 
  Brain, 
  Activity, 
  Clock, 
  CheckCircle2,
  Flame
} from 'lucide-react';

/**
 * Get color based on score percentage
 */
const getScoreColor = (score, max) => {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' };
  if (percentage >= 60) return { bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' };
  if (percentage >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' };
  return { bg: 'bg-white/30', text: 'text-white/60', glow: '' };
};

/**
 * Get overall match quality label
 */
const getMatchLabel = (probability) => {
  if (probability >= 90) return { label: 'Excellent Match', emoji: '🔥' };
  if (probability >= 75) return { label: 'Great Match', emoji: '✨' };
  if (probability >= 60) return { label: 'Good Match', emoji: '👍' };
  if (probability >= 40) return { label: 'Potential', emoji: '🤔' };
  return { label: 'Low Match', emoji: '📊' };
};

/**
 * Individual score bar component
 */
function ScoreBar({ label, icon: Icon, score, maxScore, description }) {
  const percentage = Math.round((score / maxScore) * 100);
  const colors = getScoreColor(score, maxScore);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors.text}`} />
          <span className="text-white/90 font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono font-bold ${colors.text}`}>{score}</span>
          <span className="text-white/40 text-xs">/{maxScore}</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${colors.bg}`}
        />
      </div>
      
      {description && (
        <p className="text-[10px] text-white/40 leading-tight">{description}</p>
      )}
    </div>
  );
}

/**
 * Compact match badge for cards
 */
export function MatchBadge({ 
  probability, 
  size = 'md',
  showLabel = false,
  className = '' 
}) {
  if (typeof probability !== 'number' || !Number.isFinite(probability)) {
    return null;
  }

  const colors = getScoreColor(probability, 100);
  const { label, emoji } = getMatchLabel(probability);
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div 
      className={`
        inline-flex items-center gap-1 rounded-full font-bold
        ${colors.bg} text-black shadow-lg ${colors.glow}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`${Math.round(probability)}% compatibility - ${label}`}
    >
      <span>{Math.round(probability)}%</span>
      {showLabel && <span className="opacity-80">{label}</span>}
    </div>
  );
}

/**
 * Full breakdown card component
 */
export function MatchBreakdownCard({ 
  matchProbability, 
  matchBreakdown,
  travelTimeMinutes,
  distanceKm,
  compact = false,
  className = ''
}) {
  if (!matchBreakdown && typeof matchProbability !== 'number') {
    return null;
  }

  const probability = matchProbability ?? 0;
  const { label: matchLabel, emoji } = getMatchLabel(probability);
  const overallColors = getScoreColor(probability, 100);

  // Score dimensions with their max values
  const dimensions = [
    { 
      key: 'travelTime', 
      label: 'Travel Time', 
      icon: Navigation, 
      max: 20,
      description: travelTimeMinutes ? `${travelTimeMinutes} min away` : 'Based on distance'
    },
    { 
      key: 'roleCompat', 
      label: 'Role Fit', 
      icon: Target, 
      max: 15,
      description: 'Position compatibility'
    },
    { 
      key: 'kinkOverlap', 
      label: 'Interests', 
      icon: Heart, 
      max: 15,
      description: 'Shared interests & preferences'
    },
    { 
      key: 'intent', 
      label: 'Intent', 
      icon: Sparkles, 
      max: 12,
      description: 'What you\'re both looking for'
    },
    { 
      key: 'semantic', 
      label: 'Bio Match', 
      icon: Brain, 
      max: 12,
      description: 'Profile text similarity'
    },
    { 
      key: 'lifestyle', 
      label: 'Lifestyle', 
      icon: Activity, 
      max: 10,
      description: 'Habits & preferences'
    },
    { 
      key: 'activity', 
      label: 'Activity', 
      icon: Clock, 
      max: 8,
      description: 'Recent engagement'
    },
    { 
      key: 'completeness', 
      label: 'Profile', 
      icon: CheckCircle2, 
      max: 8,
      description: 'Profile completeness'
    },
  ];

  // Optional chem score
  if (matchBreakdown?.chem !== undefined) {
    dimensions.push({
      key: 'chem',
      label: 'Chem',
      icon: Flame,
      max: 3,
      description: 'Party compatibility'
    });
  }

  // Filter to only show dimensions with data
  const activeDimensions = dimensions.filter(d => 
    matchBreakdown?.[d.key] !== undefined
  );

  // Compact view - just top scores
  if (compact) {
    const topDimensions = activeDimensions
      .map(d => ({ ...d, score: matchBreakdown?.[d.key] ?? 0, percentage: ((matchBreakdown?.[d.key] ?? 0) / d.max) * 100 }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    return (
      <div className={`space-y-2 ${className}`}>
        {/* Overall score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="text-sm font-bold text-white">{matchLabel}</span>
          </div>
          <MatchBadge probability={probability} size="md" />
        </div>

        {/* Top 3 scores */}
        <div className="flex gap-3">
          {topDimensions.map(dim => {
            const colors = getScoreColor(dim.score, dim.max);
            return (
              <div key={dim.key} className="flex items-center gap-1.5 text-xs">
                <dim.icon className={`w-3 h-3 ${colors.text}`} />
                <span className="text-white/70">{dim.label}</span>
                <span className={`font-mono font-bold ${colors.text}`}>{dim.score}/{dim.max}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with overall score */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{emoji}</span>
            <span className="text-lg font-black text-white">{matchLabel}</span>
          </div>
          <p className="text-xs text-white/50">Based on {activeDimensions.length} compatibility factors</p>
        </div>
        
        {/* Large score display */}
        <div className={`text-center px-4 py-2 rounded-xl ${overallColors.bg} ${overallColors.glow} shadow-lg`}>
          <div className="text-2xl font-black text-black">{Math.round(probability)}%</div>
          <div className="text-[10px] font-bold text-black/60 uppercase">Match</div>
        </div>
      </div>

      {/* Distance info */}
      {(travelTimeMinutes || distanceKm) && (
        <div className="flex items-center gap-4 text-sm text-white/60 pb-2 border-b border-white/10">
          {travelTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{travelTimeMinutes} min away</span>
            </div>
          )}
          {distanceKm && (
            <div className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4" />
              <span>{distanceKm.toFixed(1)} km</span>
            </div>
          )}
        </div>
      )}

      {/* Score breakdown */}
      <div className="space-y-3">
        {activeDimensions.map(dim => (
          <ScoreBar
            key={dim.key}
            label={dim.label}
            icon={dim.icon}
            score={matchBreakdown?.[dim.key] ?? 0}
            maxScore={dim.max}
            description={dim.description}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-white/30 text-center pt-2 border-t border-white/10">
        Scores based on your preferences and their profile
      </p>
    </div>
  );
}

/**
 * Mini breakdown for tooltips/popovers
 */
export function MatchBreakdownMini({ matchProbability, matchBreakdown }) {
  if (!matchBreakdown) return null;

  const topScores = [
    { key: 'travelTime', label: 'Travel', max: 20 },
    { key: 'roleCompat', label: 'Role', max: 15 },
    { key: 'kinkOverlap', label: 'Interests', max: 15 },
    { key: 'intent', label: 'Intent', max: 12 },
  ].filter(d => matchBreakdown[d.key] !== undefined);

  return (
    <div className="min-w-[180px] p-3 space-y-2">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-xs text-white/60">Compatibility</span>
        <MatchBadge probability={matchProbability} size="sm" />
      </div>
      
      {topScores.map(dim => {
        const score = matchBreakdown[dim.key];
        const colors = getScoreColor(score, dim.max);
        return (
          <div key={dim.key} className="flex items-center justify-between text-xs">
            <span className="text-white/70">{dim.label}</span>
            <span className={`font-mono ${colors.text}`}>{score}/{dim.max}</span>
          </div>
        );
      })}
    </div>
  );
}

export default MatchBreakdownCard;
