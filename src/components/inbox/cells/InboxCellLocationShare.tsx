/**
 * InboxCellLocationShare — D266 §1.5 cell template.
 *
 * Composition: live mini-map snippet · "Sharing for N more min" ·
 *              counterpart name · timestamp · remaining-time chip
 *
 * Defensive in 4.3: location-share rows are empty by design until the
 * recipient model lands in a later slice (the schema returns no rows for
 * this category in 4.x). When that lands, this cell is already shaped
 * for the data — only the empty-set query changes.
 */

import React from 'react';
import { MapPin, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CellProps } from './InboxCellShared';
import { counterpartName } from './InboxCellShared';

export default function InboxCellLocationShare({ item, counterparts }: CellProps) {
  const counterpart = item.counterpart_id ? counterparts.get(item.counterpart_id) : undefined;
  const name = counterpartName(counterpart);
  const payload = (item.payload || {}) as any;
  const endTime = payload.end_time as string | undefined;
  const remaining = endTime
    ? formatDistanceToNow(new Date(endTime), { addSuffix: false })
    : null;
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      {/* Mini-map placeholder — Slice 4.6 swaps to a real static map snippet */}
      <div
        className="mt-0.5 flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(57,255,20,0.12), rgba(0,194,224,0.12))',
          border: '1px solid rgba(57,255,20,0.25)',
        }}
      >
        <Radio className="w-5 h-5" style={{ color: '#39FF14' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm leading-tight truncate text-white font-semibold">
            {name}
          </p>
          <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/55">
          <MapPin className="w-3 h-3" style={{ color: '#39FF14' }} />
          <span>
            {remaining ? `Sharing for ${remaining} more` : 'Sharing location'}
          </span>
        </div>
      </div>
    </div>
  );
}
