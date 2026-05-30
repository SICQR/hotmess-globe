/**
 * InboxFilterChips — D266 §inbox-surface filter chip row.
 *
 * 7 chips: All · Chat · Requests · Signals · Notifications · Location · Account
 * Q15 lock: filter state never persists across opens — every fresh open
 * starts at All. Q19 lock: Account explicitly opts the user into seeing
 * system_event rows (off by default in the All view).
 *
 * The chip a user taps a second time clears the filter back to All.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { InboxCategory } from '@/hooks/useInbox';

export type InboxFilterValue = 'all' | InboxCategory;

interface ChipDef {
  value: InboxFilterValue;
  label: string;
  count?: number;
}

interface Props {
  active: InboxFilterValue;
  counts: Record<InboxCategory, number>;
  onChange: (next: InboxFilterValue) => void;
}

export default function InboxFilterChips({ active, counts, onChange }: Props) {
  const chips: ChipDef[] = [
    { value: 'all',            label: 'All' },
    { value: 'conversation',   label: 'Chat',          count: counts.conversation },
    { value: 'request',        label: 'Requests',      count: counts.request },
    { value: 'signal',         label: 'Signals',       count: counts.signal },
    { value: 'notification',   label: 'Notifications', count: counts.notification },
    { value: 'location-share', label: 'Location',      count: counts['location-share'] },
    { value: 'system_event',   label: 'Account',       count: counts.system_event },
  ];

  return (
    <div
      className="flex gap-1.5 px-3 py-2 overflow-x-auto"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {chips.map(chip => {
        const isActive = active === chip.value;
        // Hide chip if zero rows — except All, which is always present.
        // Account stays visible at 0 too so the user can opt in even
        // without rows to view yet.
        if (chip.value !== 'all' && chip.value !== 'system_event' && !chip.count) return null;
        return (
          <button
            key={chip.value}
            onClick={() => onChange(isActive ? 'all' : chip.value)}
            className={cn(
              'flex-shrink-0 px-3 h-7 rounded-full text-[10px] font-black uppercase tracking-widest',
              'transition-colors'
            )}
            style={isActive
              ? { background: '#C8962C', color: '#000', border: 'none' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            <span>{chip.label}</span>
            {chip.count != null && chip.count > 0 && !isActive && (
              <span className="ml-1.5 opacity-70">{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
