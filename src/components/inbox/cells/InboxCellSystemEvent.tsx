/**
 * InboxCellSystemEvent — D266 §1.6 cell template.
 *
 * Composition: HOTMESS H glyph (gold, restrained) · event title ·
 *              one-line context · timestamp · status pip
 *
 * Q19 lock: this category is OFF BY DEFAULT in v1 — the All filter
 * excludes it. The Account filter chip explicitly opts in. The cell
 * itself stays minimal because the scope guard means most rows here are
 * receipts and confirmations, not engagement bait.
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { CellProps } from './InboxCellShared';

export default function InboxCellSystemEvent({ item }: CellProps) {
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      {/* HOTMESS H glyph — restrained gold, dignity floor */}
      <div
        className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(200,150,44,0.10)' }}
      >
        <span className="text-[15px] font-black tracking-tighter" style={{ color: '#C8962C' }}>H</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm leading-tight truncate text-white/85 font-semibold">
            {item.title || 'Account update'}
          </p>
          <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo}</span>
        </div>
        {item.sub_line && (
          <p className="text-xs text-white/45 mt-0.5 leading-snug line-clamp-2">
            {item.sub_line}
          </p>
        )}
      </div>
    </div>
  );
}
