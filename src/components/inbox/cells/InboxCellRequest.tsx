/**
 * InboxCellRequest — D266 §1.4 cell template.
 *
 * Composition: pulsing gold-bordered sender avatar · "<name> wants <X>" ·
 *              what's being asked · status pip · timestamp
 *
 * Requests are the only category that survives mere observation. The
 * gold border + sticking-to-top behaviour is the I-1 consequential
 * gravity made visible. Tap-to-respond opens L2RequestSheet (lands in
 * Slice 4.4). For 4.3 the cell is visual + intent-clear but not yet
 * tap-actionable — no half-built path per LOCKS.md.
 */

import React from 'react';
import { Ghost, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CellProps } from './InboxCellShared';
import { counterpartName } from './InboxCellShared';

function requestVerb(requestType: string): string {
  switch (requestType) {
    case 'album_access':   return 'wants access to your album';
    case 'video_call':     return 'wants to video call you';
    case 'location_share': return 'asked you to share your location';
    case 'vault_access':   return 'wants access to your vault';
    case 'sos':            return 'needs help — SOS';
    default:               return 'sent you a request';
  }
}

export default function InboxCellRequest({ item, counterparts }: CellProps) {
  const counterpart = item.counterpart_id ? counterparts.get(item.counterpart_id) : undefined;
  const name = counterpartName(counterpart);
  const avatar = counterpart?.avatar_url;
  const payload = (item.payload || {}) as any;
  const requestType = payload.request_type || 'unknown';
  const status = payload.status || 'pending';
  const isPending = status === 'pending';
  const isSos = requestType === 'sos';
  const verb = requestVerb(requestType);
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  // Pending requests get the gold pulsing border + sticky styling.
  // SOS escalates to red.
  const borderColor = isSos ? '#FF3B30' : isPending ? '#C8962C' : 'rgba(255,255,255,0.08)';
  const accentColor = isSos ? '#FF3B30' : '#C8962C';

  return (
    <div
      className={cn(
        'mx-3 my-2 p-3 rounded-2xl flex items-start gap-3',
        isPending && 'animate-pulse-slow'
      )}
      style={{
        background: 'rgba(200,150,44,0.04)',
        border: `1px solid ${borderColor}`,
        boxShadow: isPending ? `0 0 12px ${borderColor}33` : undefined,
      }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#1c1c1e]"
        style={{ outline: `1.5px solid ${accentColor}`, outlineOffset: 1 }}
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Ghost className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.25)' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm leading-tight text-white font-bold">
            <span>{name}</span>
            <span className="text-white/70 font-normal"> {verb}</span>
          </p>
          <span className="text-[10px] text-white/30 flex-shrink-0">{timeAgo}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Bell className="w-3 h-3" style={{ color: accentColor }} />
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {isPending ? 'Awaiting your decision' : status}
          </span>
        </div>
      </div>
    </div>
  );
}
