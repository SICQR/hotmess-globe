import React from 'react';
import { ChevronDown, Sparkles, MapPin, Clock, Calendar } from 'lucide-react';
import type { SortOption } from './types';
import { SORT_OPTIONS } from './types';

const SORT_ICONS: Record<SortOption, React.ComponentType<{ className?: string }>> = {
  match: Sparkles,
  distance: MapPin,
  lastActive: Clock,
  newest: Calendar,
};

export type SortSelectorProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
  disabled?: boolean;
  className?: string;
};

export function SortSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: SortSelectorProps) {
  const currentOption = SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0];
  const Icon = SORT_ICONS[value] || Sparkles;

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        disabled={disabled}
        className="
          appearance-none
          bg-black/40 
          border border-white/20 
          rounded-lg 
          pl-8 pr-8 py-2
          text-sm font-semibold text-white
          cursor-pointer
          hover:border-white/40
          focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
        "
        aria-label="Sort profiles by"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Left icon */}
      <Icon 
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF1493] pointer-events-none" 
      />
      
      {/* Right chevron */}
      <ChevronDown 
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" 
      />
    </div>
  );
}

/**
 * Compact pill-style sort selector for mobile
 */
export function SortPills({
  value,
  onChange,
  disabled = false,
  className = '',
}: SortSelectorProps) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {SORT_OPTIONS.map((option) => {
        const Icon = SORT_ICONS[option.value];
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
              transition-all
              ${isActive 
                ? 'bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Icon className="w-3 h-3" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SortSelector;
