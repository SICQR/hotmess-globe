import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Star, Zap, 
  Users, MapPin, Calendar, Music, ShoppingBag,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Vibe archetypes with their characteristics
const ARCHETYPES = {
  explorer: {
    name: 'Explorer',
    description: 'Always seeking new experiences',
    color: '#00D9FF',
    traits: ['adventurous', 'curious', 'spontaneous'],
  },
  socialite: {
    name: 'Socialite',
    description: 'Life of the party',
    color: '#FF1493',
    traits: ['outgoing', 'charismatic', 'connected'],
  },
  connoisseur: {
    name: 'Connoisseur',
    description: 'Refined taste in everything',
    color: '#B026FF',
    traits: ['discerning', 'cultured', 'sophisticated'],
  },
  creator: {
    name: 'Creator',
    description: 'Making waves in the scene',
    color: '#FFEB3B',
    traits: ['artistic', 'innovative', 'influential'],
  },
  loyalist: {
    name: 'Loyalist',
    description: 'Dedicated to favorites',
    color: '#39FF14',
    traits: ['reliable', 'consistent', 'supportive'],
  },
  nightowl: {
    name: 'Night Owl',
    description: 'Living for the after hours',
    color: '#FF6B35',
    traits: ['energetic', 'nocturnal', 'enduring'],
  },
};

// Activity types that influence vibe
const ACTIVITY_INFLUENCES = {
  check_ins: { icon: MapPin, label: 'Check-ins', color: '#00D9FF' },
  events: { icon: Calendar, label: 'Events', color: '#FF1493' },
  connections: { icon: Users, label: 'Connections', color: '#B026FF' },
  music: { icon: Music, label: 'Music', color: '#FFEB3B' },
  purchases: { icon: ShoppingBag, label: 'Purchases', color: '#39FF14' },
};

// Vibe score ring
function VibeRing({ score, color, size = 'md' }) {
  const sizes = {
    sm: { ring: 80, stroke: 6, text: 'text-2xl' },
    md: { ring: 120, stroke: 8, text: 'text-4xl' },
    lg: { ring: 160, stroke: 10, text: 'text-5xl' },
  };
  
  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: ring, height: ring }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-black", text)} style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// Trend indicator
function TrendIndicator({ trend, className }) {
  const Icon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const color = trend > 0 ? '#39FF14' : trend < 0 ? '#FF4444' : '#666';
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-xs font-bold" style={{ color }}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    </div>
  );
}

// Activity influence bar
function ActivityBar({ activity, value, maxValue = 100 }) {
  const config = ACTIVITY_INFLUENCES[activity];
  if (!config) return null;
  
  const Icon = config.icon;
  const percentage = (value / maxValue) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3" style={{ color: config.color }} />
          <span className="text-white/60">{config.label}</span>
        </div>
        <span className="font-bold" style={{ color: config.color }}>{value}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: config.color }}
        />
      </div>
    </div>
  );
}

// Archetype evolution timeline
function EvolutionTimeline({ history = [] }) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => {
        const archetype = ARCHETYPES[entry.archetype];
        const isLatest = idx === 0;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "flex items-center gap-3 p-3 border-l-2 transition-all",
              isLatest 
                ? "bg-white/10" 
                : "bg-transparent opacity-60"
            )}
            style={{ borderLeftColor: archetype?.color || '#666' }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${archetype?.color}20` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: archetype?.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: archetype?.color }}>
                  {archetype?.name || 'Unknown'}
                </span>
                {isLatest && (
                  <span className="px-2 py-0.5 bg-[#FF1493] text-black text-[10px] font-bold rounded uppercase">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40">
                {new Date(entry.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            {entry.reason && (
              <p className="text-xs text-white/40 max-w-[150px] truncate">
                {entry.reason}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Main vibe evolution component
export default function VibeEvolution({
  currentArchetype = 'explorer',
  vibeScore = 75,
  scoreTrend = 5,
  activityBreakdown = {},
  evolutionHistory = [],
  insights = [],
  className,
}) {
  const archetype = ARCHETYPES[currentArchetype] || ARCHETYPES.explorer;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main vibe display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white/10 to-transparent border-2 border-white/20 p-6"
      >
        <div className="flex items-center gap-6">
          {/* Vibe score ring */}
          <VibeRing score={vibeScore} color={archetype.color} />
          
          {/* Archetype info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 
                className="text-2xl font-black uppercase"
                style={{ color: archetype.color }}
              >
                {archetype.name}
              </h2>
              <TrendIndicator trend={scoreTrend} />
            </div>
            <p className="text-sm text-white/60 mb-3">{archetype.description}</p>
            
            {/* Traits */}
            <div className="flex flex-wrap gap-2">
              {archetype.traits.map((trait) => (
                <span 
                  key={trait}
                  className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded"
                  style={{ 
                    backgroundColor: `${archetype.color}20`,
                    color: archetype.color,
                  }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activity breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 border border-white/10 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#FFEB3B]" />
          <h3 className="font-bold text-sm uppercase">Activity Influence</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(activityBreakdown).map(([activity, value]) => (
            <ActivityBar key={activity} activity={activity} value={value} />
          ))}
        </div>
      </motion.div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#B026FF]" />
            <h3 className="font-bold text-sm uppercase">Vibe Insights</h3>
          </div>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-[#B026FF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#B026FF]">{idx + 1}</span>
                </div>
                <p className="text-white/70">{insight}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Evolution history */}
      {evolutionHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#00D9FF]" />
            <h3 className="font-bold text-sm uppercase">Vibe Evolution</h3>
          </div>
          <EvolutionTimeline history={evolutionHistory} />
        </motion.div>
      )}

      {/* All archetypes reference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-[#FFEB3B]" />
          <h3 className="font-bold text-sm uppercase">All Archetypes</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(ARCHETYPES).map(([key, arch]) => {
            const isCurrent = key === currentArchetype;
            return (
              <div
                key={key}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isCurrent 
                    ? "border-2 bg-white/10" 
                    : "border-white/10 opacity-60"
                )}
                style={{ borderColor: isCurrent ? arch.color : undefined }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: arch.color }}
                  />
                  <span 
                    className="font-bold text-xs"
                    style={{ color: isCurrent ? arch.color : 'white' }}
                  >
                    {arch.name}
                  </span>
                </div>
                <p className="text-[10px] text-white/40">{arch.description}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// Compact vibe badge for profiles
export function VibeBadge({ archetype, score, className }) {
  const arch = ARCHETYPES[archetype] || ARCHETYPES.explorer;
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
        className
      )}
      style={{ 
        backgroundColor: `${arch.color}20`,
        borderColor: `${arch.color}50`,
      }}
    >
      <span className="font-bold text-xs" style={{ color: arch.color }}>
        {arch.name}
      </span>
      <span className="text-xs text-white/60">{score}</span>
    </motion.div>
  );
}
