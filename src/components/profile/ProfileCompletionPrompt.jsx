/**
 * Profile Completion Prompt Component
 * 
 * Shows contextual prompts to encourage users to complete their profile,
 * improving match quality for themselves and others.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { 
  Camera, 
  FileText, 
  MapPin, 
  Heart, 
  Shield, 
  Zap, 
  ArrowRight,
  TrendingUp,
  X,
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Field definitions with importance for matching
const PROFILE_FIELDS = [
  {
    id: 'photos',
    label: 'Add photos',
    description: 'Profiles with 3+ photos get 5x more matches',
    icon: Camera,
    weight: 25,
    check: (user) => (user.photos?.length || 0) >= 3,
    color: '#E62020',
  },
  {
    id: 'bio',
    label: 'Write a bio',
    description: 'Tell others what makes you unique',
    icon: FileText,
    weight: 20,
    check: (user) => user.bio && user.bio.length >= 50,
    color: '#00D9FF',
  },
  {
    id: 'location',
    label: 'Enable location',
    description: 'Find people near you for better matches',
    icon: MapPin,
    weight: 20,
    check: (user) => user.last_lat && user.last_lng,
    color: '#39FF14',
  },
  {
    id: 'looking_for',
    label: 'What you\'re looking for',
    description: 'Match with people who want the same things',
    icon: Heart,
    weight: 15,
    check: (user) => user.looking_for?.length > 0,
    color: '#B026FF',
  },
  {
    id: 'position',
    label: 'Add your position',
    description: 'Role compatibility is a key match factor',
    icon: Zap,
    weight: 15,
    check: (user, privateProfile) => privateProfile?.position,
    color: '#FF6B35',
  },
  {
    id: 'verification',
    label: 'Verify your profile',
    description: 'Verified profiles get 2x more trust',
    icon: Shield,
    weight: 5,
    check: (user) => user.verified,
    color: '#FFEB3B',
  },
];

/**
 * Calculate profile completion percentage and missing fields
 */
export function useProfileCompletion(user, privateProfile = null) {
  return useMemo(() => {
    if (!user) return { percentage: 0, missingFields: PROFILE_FIELDS, completedFields: [], nextPriority: PROFILE_FIELDS[0] };

    const completedFields = [];
    const missingFields = [];
    let totalWeight = 0;
    let completedWeight = 0;

    for (const field of PROFILE_FIELDS) {
      totalWeight += field.weight;
      if (field.check(user, privateProfile)) {
        completedFields.push(field);
        completedWeight += field.weight;
      } else {
        missingFields.push(field);
      }
    }

    const percentage = Math.round((completedWeight / totalWeight) * 100);

    // Sort missing by weight (highest priority first)
    missingFields.sort((a, b) => b.weight - a.weight);

    return {
      percentage,
      missingFields,
      completedFields,
      nextPriority: missingFields[0] || null,
    };
  }, [user, privateProfile]);
}

/**
 * Compact inline prompt for grid/card views
 */
export function ProfileCompletionBadge({ user, privateProfile, className = '' }) {
  const { percentage, nextPriority } = useProfileCompletion(user, privateProfile);

  if (percentage >= 100 || !nextPriority) return null;

  return (
    <Link to={createPageUrl('EditProfile')}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs transition-colors cursor-pointer ${className}`}
      >
        <div className="relative">
          <svg className="w-4 h-4" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={nextPriority?.color || '#E62020'}
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-white/80">{percentage}%</span>
        <span className="text-white/50">|</span>
        <span className="text-white/60 truncate max-w-[100px]">{nextPriority.label}</span>
      </motion.div>
    </Link>
  );
}

/**
 * Dismissible banner prompt for top of pages
 */
export function ProfileCompletionBanner({ user, privateProfile, onDismiss }) {
  const { percentage, nextPriority, missingFields } = useProfileCompletion(user, privateProfile);

  if (percentage >= 100 || !nextPriority) return null;

  const NextIcon = nextPriority.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gradient-to-r from-[#E62020]/20 to-[#00D9FF]/20 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 flex items-center justify-center"
              style={{ backgroundColor: `${nextPriority.color}20` }}
            >
              <NextIcon className="w-5 h-5" style={{ color: nextPriority.color }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Complete your profile to get better matches
              </p>
              <p className="text-xs text-white/60">
                <span className="font-bold" style={{ color: nextPriority.color }}>{percentage}% complete</span>
                {' · '}
                Next: {nextPriority.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('EditProfile')}>
              <Button 
                size="sm" 
                className="font-bold"
                style={{ backgroundColor: nextPriority.color, color: '#000' }}
              >
                {nextPriority.label}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Full card prompt with all missing fields
 */
export function ProfileCompletionCard({ user, privateProfile, className = '' }) {
  const { percentage, missingFields, completedFields } = useProfileCompletion(user, privateProfile);

  if (percentage >= 100) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-[#39FF14]/10 border border-[#39FF14]/30 p-6 text-center ${className}`}
      >
        <Sparkles className="w-10 h-10 mx-auto mb-3 text-[#39FF14]" />
        <h3 className="text-lg font-bold text-[#39FF14] mb-1">Profile Complete!</h3>
        <p className="text-sm text-white/60">
          You're getting the best possible matches.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border border-white/10 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00D9FF]" />
            Boost Your Matches
          </h3>
          <p className="text-sm text-white/60">
            Complete profiles get up to 10x more views
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black" style={{ 
            color: percentage < 50 ? '#E62020' : percentage < 80 ? '#FFEB3B' : '#39FF14' 
          }}>
            {percentage}%
          </div>
          <div className="text-[10px] uppercase text-white/40">complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ 
            background: percentage < 50 
              ? 'linear-gradient(90deg, #E62020, #FF6B35)' 
              : percentage < 80 
                ? 'linear-gradient(90deg, #FF6B35, #FFEB3B)' 
                : 'linear-gradient(90deg, #FFEB3B, #39FF14)'
          }}
        />
      </div>

      {/* Missing fields */}
      <div className="space-y-3">
        {missingFields.slice(0, 3).map((field) => {
          const Icon = field.icon;
          return (
            <Link 
              key={field.id} 
              to={createPageUrl('EditProfile')}
              className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
            >
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{ backgroundColor: `${field.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: field.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{field.label}</p>
                <p className="text-xs text-white/50 truncate">{field.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </Link>
          );
        })}
      </div>

      {missingFields.length > 3 && (
        <Link to={createPageUrl('EditProfile')}>
          <Button variant="outline" className="w-full mt-4 border-white/20 text-white/60">
            View all ({missingFields.length - 3} more)
          </Button>
        </Link>
      )}
    </motion.div>
  );
}

/**
 * Inline nudge for specific contexts
 */
export function ProfileCompletionNudge({ user, privateProfile, field, variant = 'inline' }) {
  const fieldDef = PROFILE_FIELDS.find(f => f.id === field);
  
  if (!fieldDef || fieldDef.check(user, privateProfile)) return null;

  const Icon = fieldDef.icon;

  if (variant === 'inline') {
    return (
      <Link to={createPageUrl('EditProfile')} className="group">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <Icon className="w-3 h-3" style={{ color: fieldDef.color }} />
          <span>{fieldDef.label} to improve matches</span>
          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl('EditProfile')}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border border-dashed border-white/20 hover:border-white/40 transition-colors"
        style={{ borderColor: `${fieldDef.color}40` }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 flex items-center justify-center"
            style={{ backgroundColor: `${fieldDef.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: fieldDef.color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{fieldDef.label}</p>
            <p className="text-xs text-white/50">{fieldDef.description}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/30" />
        </div>
      </motion.div>
    </Link>
  );
}

export default ProfileCompletionCard;
