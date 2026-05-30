/**
 * InboxCellSignal — D266 §1.2 cell template.
 *
 * Composition: counterpart avatar · "<name> BOO'd you" · count if collapsed
 *              (Q17 "3 times") · tap_type glyph · timestamp · unread pip
 *
 * Tap routes to /ghosted (Phil #263 — boos resolve at the field surface,
 * not via a separate sheet). Signals auto-read on first render per D266
 * §unread — no mark-as-read affordance needed.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, Heart, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import type { CellProps } from './InboxCellShared';
import { counterpartName } from './InboxCellShared';

function tapTypeGlyph(tapType: string): { Icon: React.ElementType; verb: string } {
  switch (tapType) {
    case 'boo':  return { Icon: Ghost, verb: "BOO'd you" };
    case 'save': return { Icon: Heart, verb: 'saved your profile' };
    case 'view': return { Icon: Eye,   verb: 'viewed your profile' };
    default:     return { Icon: Ghost, verb: 'reached out' };
  }
}

export default function InboxCellSignal({ item, counterparts }: CellProps) {
  const navigate = useNavigate();
  const { closeSheet } = useSheet();
  const counterpart = item.counterpart_id ? counterparts.get(item.counterpart_id) : undefined;
  const name = counterpartName(counterpart);
  const avatar = counterpart?.avatar_url;
  const payload = (item.payload || {}) as { tap_type?: string; count?: number };
  const tapType = payload.tap_type || 'boo';
  const count = payload.count || 1;
  const { Icon, verb } = tapTypeGlyph(tapType);
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  const handleTap = () => {
    closeSheet();
    navigate('/ghosted');
  };

  return (
    <button
      onClick={handleTap}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
        'active:bg-white/[0.04]'
      )}
    >
      {/* Avatar — counterpart photo or silhouette */}
      <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#1c1c1e]">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Ghost className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.25)' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm leading-tight truncate text-white font-semibold">
            <span>{name}</span>
            <span className="text-white/55 font-normal"> {verb}</span>
            {count > 1 && (
              <span className="ml-1 text-[10px] font-mono uppercase tracking-widest" style={{ color: '#C8962C' }}>
                · {count} times
              </span>
            )}
          </p>
          <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: '#C8962C99' }}>
          Open Ghosted →
        </p>
      </div>

      {/* Gold tap_type glyph trailing */}
      <div className="mt-1 flex-shrink-0">
        <Icon className="w-4 h-4" style={{ color: '#C8962C' }} />
      </div>
    </button>
  );
}
