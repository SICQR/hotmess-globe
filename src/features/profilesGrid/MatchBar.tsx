import React from 'react';
import type { MatchBreakdown } from './types';
import { getMatchTier, getBreakdownPercentages, generateMatchInsights } from './matchInsights';

type MatchBarProps = {
  matchProbability: number;
  breakdown?: MatchBreakdown;
  travelTimeMinutes?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showInsights?: boolean;
  className?: string;
};

/**
 * Visual match percentage bar with gradient fill
 */
export function MatchBar({
  matchProbability,
  breakdown,
  travelTimeMinutes,
  size = 'md',
  showLabel = true,
  showInsights = false,
  className = '',
}: MatchBarProps) {
  const tier = getMatchTier(matchProbability);
  const percentage = Math.min(100, Math.max(0, matchProbability));
  
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const insights = breakdown && showInsights 
    ? generateMatchInsights(breakdown, travelTimeMinutes).slice(0, 2) 
    : [];

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span 
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tier.color }}
          >
            {tier.label}
          </span>
          <span className="text-[11px] font-black text-white">
            {Math.round(matchProbability)}%
          </span>
        </div>
      )}
      
      <div className={`w-full ${heights[size]} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${tier.color} 0%, ${tier.color}cc 100%)`,
          }}
        />
      </div>

      {showInsights && insights.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {insights.map((insight, i) => (
            <span
              key={i}
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold
                ${insight.score === 'great' ? 'bg-green-500/20 text-green-300' : ''}
                ${insight.score === 'good' ? 'bg-blue-500/20 text-blue-300' : ''}
                ${insight.score === 'neutral' ? 'bg-white/10 text-white/70' : ''}
                ${insight.score === 'low' ? 'bg-orange-500/20 text-orange-300' : ''}
              `}
            >
              <span>{insight.icon}</span>
              <span>{insight.text}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Detailed breakdown bars for expanded view
 */
export function MatchBreakdownBars({
  breakdown,
  className = '',
}: {
  breakdown: MatchBreakdown;
  className?: string;
}) {
  const categories = getBreakdownPercentages(breakdown);

  return (
    <div className={`space-y-2 ${className}`}>
      {categories.map((cat) => (
        <div key={cat.category} className="flex items-center gap-2">
          <span className="w-16 text-[9px] font-semibold text-white/60 truncate">
            {cat.label}
          </span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
          <span className="w-8 text-[9px] font-mono text-white/50 text-right">
            {Math.round(cat.percentage)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact match badge for card overlay
 */
export function MatchBadge({
  matchProbability,
  size = 'md',
  className = '',
}: {
  matchProbability: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tier = getMatchTier(matchProbability);
  
  const sizes = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-1 text-[10px]',
    lg: 'px-2.5 py-1.5 text-xs',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full font-black uppercase tracking-wider
        ${sizes[size]}
        ${className}
      `}
      style={{
        backgroundColor: tier.bgColor,
        color: tier.color,
        border: `1px solid ${tier.color}40`,
      }}
    >
      <span>{Math.round(matchProbability)}%</span>
      {size !== 'sm' && <span className="opacity-75">match</span>}
    </div>
  );
}

/**
 * Circular match score indicator
 */
export function MatchCircle({
  matchProbability,
  size = 48,
  strokeWidth = 3,
  className = '',
}: {
  matchProbability: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const tier = getMatchTier(matchProbability);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (matchProbability / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="text-sm font-black"
          style={{ color: tier.color }}
        >
          {Math.round(matchProbability)}
        </span>
      </div>
    </div>
  );
}

export default MatchBar;
