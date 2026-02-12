/**
 * StatusSelector - Choose your presence status
 * 
 * Ghost = Invisible, browsing only
 * Out = At a venue, open to meeting
 * Home = Relaxed, down for chat
 * En Route = Heading somewhere
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ghost, 
  PartyPopper, 
  Home, 
  Navigation, 
  ChevronDown,
  MapPin,
  Clock,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type UserStatus = 'ghost' | 'out' | 'home' | 'enroute';

interface StatusOption {
  id: UserStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    id: 'ghost',
    label: 'Ghost',
    description: 'Invisible - browse without being seen',
    icon: Ghost,
    color: 'text-white/60',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/20'
  },
  {
    id: 'out',
    label: 'Out Now',
    description: 'Visible - open to meeting up',
    icon: PartyPopper,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50'
  },
  {
    id: 'home',
    label: 'Home',
    description: 'Chill mode - down for a chat',
    icon: Home,
    color: 'text-cyan',
    bgColor: 'bg-cyan/10',
    borderColor: 'border-cyan/50'
  },
  {
    id: 'enroute',
    label: 'En Route',
    description: 'Heading somewhere - coordinate meetups',
    icon: Navigation,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/50'
  }
];

interface StatusSelectorProps {
  value: UserStatus;
  onChange: (status: UserStatus) => void;
  destination?: string;
  onDestinationChange?: (destination: string) => void;
  eta?: number;
  className?: string;
  compact?: boolean;
}

export default function StatusSelector({
  value,
  onChange,
  destination,
  onDestinationChange,
  eta,
  className,
  compact = false
}: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDestinationInput, setShowDestinationInput] = useState(false);

  const currentStatus = STATUS_OPTIONS.find((s) => s.id === value) || STATUS_OPTIONS[0];
  const Icon = currentStatus.icon;

  const handleStatusChange = (status: UserStatus) => {
    onChange(status);
    setIsOpen(false);
    
    if (status === 'enroute') {
      setShowDestinationInput(true);
    } else {
      setShowDestinationInput(false);
    }
  };

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-full border transition-all',
            currentStatus.bgColor,
            currentStatus.borderColor
          )}
        >
          <Icon className={cn('w-4 h-4', currentStatus.color)} />
          <span className={cn('text-sm font-bold', currentStatus.color)}>
            {currentStatus.label}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 transition-transform',
            currentStatus.color,
            isOpen && 'rotate-180'
          )} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-64 bg-black/95 backdrop-blur-lg border border-white/20 rounded-xl overflow-hidden z-50 shadow-xl"
            >
              {STATUS_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = option.id === value;
                
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleStatusChange(option.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                      isSelected ? option.bgColor : 'hover:bg-white/5'
                    )}
                  >
                    <OptionIcon className={cn('w-5 h-5', option.color)} />
                    <div className="flex-1 text-left">
                      <div className={cn('text-sm font-bold', option.color)}>
                        {option.label}
                      </div>
                      <div className="text-xs text-white/50">{option.description}</div>
                    </div>
                    {isSelected && (
                      <Check className={cn('w-4 h-4', option.color)} />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status grid */}
      <div className="grid grid-cols-2 gap-3">
        {STATUS_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          const isSelected = option.id === value;
          
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => handleStatusChange(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-left',
                isSelected 
                  ? cn(option.bgColor, option.borderColor) 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <OptionIcon className={cn(
                  'w-6 h-6',
                  isSelected ? option.color : 'text-white/60'
                )} />
                <span className={cn(
                  'font-black uppercase text-sm',
                  isSelected ? option.color : 'text-white/80'
                )}>
                  {option.label}
                </span>
              </div>
              <p className="text-xs text-white/50">{option.description}</p>
              
              {isSelected && (
                <motion.div
                  layoutId="status-indicator"
                  className={cn(
                    'absolute top-2 right-2 w-3 h-3 rounded-full',
                    option.id === 'ghost' ? 'bg-white/60' : 'bg-green-500'
                  )}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* En Route destination input */}
      <AnimatePresence>
        {(value === 'enroute' || showDestinationInput) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-pink-500">
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-bold uppercase">Where are you heading?</span>
              </div>
              
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={destination || ''}
                  onChange={(e) => onDestinationChange?.(e.target.value)}
                  placeholder="Enter venue or location..."
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500"
                />
              </div>

              {eta && (
                <div className="flex items-center gap-2 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">ETA: ~{eta} min</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/30 bg-transparent checked:bg-pink-500 checked:border-pink-500"
                    defaultChecked
                  />
                  <span className="text-sm text-white/70">
                    Show others I'm heading there
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/30 bg-transparent checked:bg-pink-500 checked:border-pink-500"
                  />
                  <span className="text-sm text-white/70">
                    Let friends see my live location
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * StatusBadge - Small badge showing current status
 */
interface StatusBadgeProps {
  status: UserStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = STATUS_OPTIONS.find((s) => s.id === status) || STATUS_OPTIONS[0];
  const Icon = statusConfig.icon;

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold',
        statusConfig.bgColor,
        statusConfig.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{statusConfig.label}</span>
    </div>
  );
}
