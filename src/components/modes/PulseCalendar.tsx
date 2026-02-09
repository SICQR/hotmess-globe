import React from 'react';

interface PulseCalendarProps {
  selectedDate?: string;
  dates?: Array<{ date: string; hasEvents: boolean; isToday: boolean }>;
  onDateSelect?: (date: string) => void;
}

/**
 * Pulse Calendar - horizontal date picker for Events mode
 * Floats above Globe, below Top HUD
 */
export function PulseCalendar({ selectedDate, dates = [], onDateSelect }: PulseCalendarProps) {
  return (
    <div className="fixed top-11 left-0 right-0 z-15 h-12 flex items-center gap-2 px-4 bg-[rgba(15,15,18,0.85)] backdrop-blur border-b border-[rgba(255,255,255,0.08)] overflow-x-auto">
      {dates.map(({ date, hasEvents, isToday }) => {
        const isSelected = date === selectedDate;
        const dayNum = new Date(date).getDate();
        const dayName = new Date(date).toLocaleDateString('en', { weekday: 'short' });
        
        return (
          <button
            key={date}
            onClick={() => onDateSelect?.(date)}
            className={`
              flex flex-col items-center justify-center min-w-10 h-10 rounded-lg
              ${isSelected ? 'bg-[#00D9FF] text-black' : 'text-white'}
              ${isToday && !isSelected ? 'border border-[#00D9FF]' : ''}
            `}
          >
            <span className="text-[10px] uppercase">{dayName}</span>
            <span className="text-sm font-medium">{dayNum}</span>
            {hasEvents && !isSelected && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00D9FF]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PulseCalendar;
