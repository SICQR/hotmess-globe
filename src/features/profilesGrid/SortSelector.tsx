import React from 'react';
import { SORT_OPTIONS, type SortOption } from './types';

type Props = {
  value: SortOption;
  onChange: (value: SortOption) => void;
  disabled?: boolean;
  className?: string;
};

export function SortSelector({ value, onChange, disabled = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="sort-select" className="text-xs text-white/60 font-medium">
        Sort:
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        disabled={disabled}
        className="
          rounded-md border border-white/15 bg-black/40 backdrop-blur-sm
          px-2 py-1 text-xs font-semibold text-white/90
          focus:outline-none focus:ring-1 focus:ring-[#00D9FF]
          disabled:opacity-50 disabled:cursor-not-allowed
          appearance-none cursor-pointer
          pr-6 bg-no-repeat bg-right
        "
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundPosition: 'right 6px center',
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SortSelector;
