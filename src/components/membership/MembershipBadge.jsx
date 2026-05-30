import React from 'react';
import { Crown, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TIER_CONFIG = {
  mess: {
    name: 'MESS',
    icon: Star,
    color: 'text-white/60',
    bgColor: 'bg-white/10',
    borderColor: 'border-white/20',
  },
  hotmess: {
    name: 'HOTMESS',
    icon: Zap,
    color: 'text-[#C8962C]',
    bgColor: 'bg-[#C8962C]/20',
    borderColor: 'border-[#C8962C]',
  },
  connected: {
    name: 'CONNECTED',
    icon: Crown,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/20',
    borderColor: 'border-cyan-400',
  },
  promoter: {
    name: 'PROMOTER',
    icon: Crown,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/20',
    borderColor: 'border-purple-400',
  },
  venue: {
    name: 'VENUE',
    icon: Crown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
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