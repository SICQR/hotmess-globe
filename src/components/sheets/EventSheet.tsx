import React from 'react';
import { BaseSheet } from './BaseSheet';

interface EventSheetProps {
  title: string;
  venue: string;
  date: string;
  time: string;
  rsvpCount?: number;
  isLive?: boolean;
  hasRsvp?: boolean;
  onRsvp?: () => void;
  onCheckIn?: () => void;
  onDirections?: () => void;
  onClose?: () => void;
}

/**
 * Event Sheet - shown when tapping an event beacon
 * Check-in only appears when event is live
 */
export function EventSheet({
  title,
  venue,
  date,
  time,
  rsvpCount = 0,
  isLive = false,
  hasRsvp = false,
  onRsvp,
  onCheckIn,
  onDirections,
  onClose
}: EventSheetProps) {
  return (
    <BaseSheet onClose={onClose}>
      {/* Event header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {isLive && (
            <span className="px-2 py-0.5 rounded-full bg-[#00D9FF] text-black text-xs font-medium">
              LIVE NOW
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="text-sm text-[#A1A1AA] mt-1">{venue}</div>
        <div className="text-sm text-[#A1A1AA]">{date} • {time}</div>
      </div>
      
      {/* RSVP count */}
      {rsvpCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
          <span className="h-2 w-2 rounded-full bg-[#00D9FF]" />
          {rsvpCount} going
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-col gap-3 mt-4">
        {isLive ? (
          <button 
            onClick={onCheckIn}
            className="w-full h-11 rounded-xl bg-[#00D9FF] text-black font-medium"
          >
            Check In
          </button>
        ) : (
          <button 
            onClick={onRsvp}
            className={`w-full h-11 rounded-xl font-medium ${
              hasRsvp 
                ? 'border border-[#00D9FF] text-[#00D9FF]' 
                : 'bg-[#00D9FF] text-black'
            }`}
          >
            {hasRsvp ? "You're Going ✓" : 'RSVP'}
          </button>
        )}
        
        <button 
          onClick={onDirections}
          className="w-full h-11 rounded-xl border border-[rgba(255,255,255,0.16)] text-white font-medium"
        >
          Get Directions
        </button>
      </div>
    </BaseSheet>
  );
}

export default EventSheet;
