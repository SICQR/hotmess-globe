import React from 'react';
import { Crown, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TIER_CONFIG = {
  free: {
    name: 'BASIC',
    icon: Star,
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20',
  },
  basic: {
    name: 'BASIC',
    icon: Star,
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20',
  },
  plus: {
    name: 'PLUS',
    icon: Zap,
    color: 'text-[#FF1493]',
    bgColor: 'bg-[#FF1493]/20',
    borderColor: 'border-[#FF1493]',
  },
  pro: {
    name: 'CHROME',
    icon: Crown,
    color: 'text-[#00D9FF]',
    bgColor: 'bg-[#00D9FF]/20',
    borderColor: 'border-[#00D9FF]',
  },
  chrome: {
    name: 'CHROME',
    icon: Crown,
    color: 'text-[#00D9FF]',
    bgColor: 'bg-[#00D9FF]/20',
    borderColor: 'border-[#00D9FF]',
  },
};

export default function MembershipBadge({ tier = 'basic', showIcon = true, className = '' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const Icon = config.icon;

  return (
    <Badge 
      className={`${config.bgColor} ${config.borderColor} ${config.color} border-2 font-black uppercase tracking-wider text-[10px] ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.name}
    </Badge>
  );
}