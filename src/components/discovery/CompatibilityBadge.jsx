import React from 'react';
import { CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Calculate compatibility between two users based on their essentials/dealbreakers
 */
export function calculateCompatibility(currentUserTags = [], otherUserTags = []) {
  const currentEssentials = currentUserTags.filter(t => t.is_essential);
  const currentDealbreakers = currentUserTags.filter(t => t.is_dealbreaker);
  const otherEssentials = otherUserTags.filter(t => t.is_essential);
  const otherDealbreakers = otherUserTags.filter(t => t.is_dealbreaker);

  // Muted if either has no essentials set
  if (currentEssentials.length === 0 || otherEssentials.length === 0) {
    return 'muted';
  }

  // Check for dealbreaker conflicts
  const hasDealb reakerConflict = 
    currentDealbreakers.some(db => !otherEssentials.find(e => e.tag_id === db.tag_id)) ||
    otherDealbreakers.some(db => !currentEssentials.find(e => e.tag_id === db.tag_id));

  // Count shared essentials
  const sharedEssentials = currentEssentials.filter(ce => 
    otherEssentials.find(oe => oe.tag_id === ce.tag_id)
  ).length;

  // Green: no dealbreaker conflict + 2+ shared essentials
  if (!hasDealb reakerConflict && sharedEssentials >= 2) {
    return 'green';
  }

  // Amber: everything else (conflict or low alignment)
  return 'amber';
}

export default function CompatibilityBadge({ badge, size = 'default' }) {
  const BADGE_CONFIG = {
    green: {
      icon: CheckCircle,
      color: 'text-[#39FF14]',
      bg: 'bg-[#39FF14]/20',
      border: 'border-[#39FF14]',
      label: 'Compatible'
    },
    amber: {
      icon: AlertCircle,
      color: 'text-[#FFEB3B]',
      bg: 'bg-[#FFEB3B]/20',
      border: 'border-[#FFEB3B]',
      label: 'Check details'
    },
    muted: {
      icon: HelpCircle,
      color: 'text-white/40',
      bg: 'bg-white/5',
      border: 'border-white/20',
      label: 'Not set'
    }
  };

  const config = BADGE_CONFIG[badge] || BADGE_CONFIG.muted;
  const Icon = config.icon;

  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${config.bg} border ${config.border}`}>
            <Icon className={`${sizeClasses[size]} ${config.color}`} />
            <span className={`text-xs font-bold uppercase ${config.color}`}>
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {badge === 'green' && 'Your essentials align.'}
            {badge === 'amber' && 'Preferences might differ—read first.'}
            {badge === 'muted' && 'Not enough info to confirm.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}