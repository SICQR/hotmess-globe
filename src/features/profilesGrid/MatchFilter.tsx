import React, { useState } from 'react';
import { Filter, X, Sliders } from 'lucide-react';
import { getMatchTier } from './matchInsights';

export type MatchFilterValue = {
  minMatch: number;
};

type MatchFilterProps = {
  value: MatchFilterValue;
  onChange: (value: MatchFilterValue) => void;
  disabled?: boolean;
  className?: string;
};

const PRESET_FILTERS = [
  { label: 'All', value: 0, description: 'Show everyone' },
  { label: '40%+', value: 40, description: 'Some potential' },
  { label: '55%+', value: 55, description: 'Good matches' },
  { label: '70%+', value: 70, description: 'Great matches' },
  { label: '85%+', value: 85, description: 'Excellent only' },
];

/**
 * Compact filter button with dropdown
 */
export function MatchFilterDropdown({
  value,
  onChange,
  disabled = false,
  className = '',
}: MatchFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tier = value.minMatch > 0 ? getMatchTier(value.minMatch) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold
          transition-all
          ${value.minMatch > 0 
            ? 'border-[#C8962C]/50 bg-[#C8962C]/10 text-white' 
            : 'border-white/20 bg-black/40 text-white/80 hover:border-white/40'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <Filter className="w-4 h-4" />
        {value.minMatch > 0 ? (
          <span style={{ color: tier?.color }}>{value.minMatch}%+ Match</span>
        ) : (
          <span>Filter</span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-black/95 border border-white/20 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Min Match
                </span>
                {value.minMatch > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ minMatch: 0 });
                      setIsOpen(false);
                    }}
                    className="text-[10px] text-[#C8962C] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-2">
              {PRESET_FILTERS.map((preset) => {
                const isActive = value.minMatch === preset.value;
                const presetTier = preset.value > 0 ? getMatchTier(preset.value) : null;
                
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onChange({ minMatch: preset.value });
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-left
                      transition-all
                      ${isActive 
                        ? 'bg-white/10' 
                        : 'hover:bg-white/5'
                      }
                    `}
                  >
                    <div>
                      <div 
                        className="text-sm font-bold"
                        style={{ color: isActive ? presetTier?.color || '#fff' : '#fff' }}
                      >
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-white/50">
                        {preset.description}
                      </div>
                    </div>
                    {isActive && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: presetTier?.color || '#C8962C' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Horizontal pill-style filter selector
 */
export function MatchFilterPills({
  value,
  onChange,
  disabled = false,
  className = '',
}: MatchFilterProps) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
        Min:
      </span>
      {PRESET_FILTERS.map((preset) => {
        const isActive = value.minMatch === preset.value;
        const presetTier = preset.value > 0 ? getMatchTier(preset.value) : null;
        
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange({ minMatch: preset.value })}
            disabled={disabled}
            className={`
              px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
              transition-all
              ${isActive 
                ? 'text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            style={isActive ? {
              backgroundColor: presetTier?.bgColor || 'rgba(255,255,255,0.1)',
              color: presetTier?.color || '#fff',
              border: `1px solid ${presetTier?.color || '#fff'}40`,
            } : undefined}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Slider-based filter for fine control
 */
export function MatchFilterSlider({
  value,
  onChange,
  disabled = false,
  className = '',
}: MatchFilterProps) {
  const tier = getMatchTier(value.minMatch || 50);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          Minimum Match
        </span>
        <span 
          className="text-sm font-black"
          style={{ color: value.minMatch > 0 ? tier.color : '#fff' }}
        >
          {value.minMatch > 0 ? `${value.minMatch}%+` : 'Any'}
        </span>
      </div>
      
      <input
        type="range"
        min={0}
        max={90}
        step={5}
        value={value.minMatch}
        onChange={(e) => onChange({ minMatch: Number(e.target.value) })}
        disabled={disabled}
        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#C8962C]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        style={{
          background: `linear-gradient(to right, ${tier.color} 0%, ${tier.color} ${value.minMatch}%, rgba(255,255,255,0.1) ${value.minMatch}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />

      {value.minMatch > 0 && (
        <div className="text-[10px] text-white/50">
          Only showing {tier.label.toLowerCase()} and above
        </div>
      )}
    </div>
  );
}

export default MatchFilterDropdown;
