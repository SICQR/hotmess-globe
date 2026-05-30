/**
 * InboxCellConversation — D266 §1.1 cell template.
 *
 * Composition: counterpart avatar · counterpart name · last message preview · timestamp · unread dot
 *
 * Slice 4.3 fix: title is now the counterpart name (resolved from
 * profiles), and the last_message goes in the sub-line where it belongs.
 * Pre-4.3 the title slot held "Message" and the sub-line was the message
 * body — semantically wrong because the title told you nothing.
 */

import React from 'react';
import { Ghost } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import type { CellProps } from './InboxCellShared';
import { counterpartName } from './InboxCellShared';

export default function InboxCellConversation({ item, counterparts }: CellProps) {
  const { openSheet } = useSheet();
  const counterpart = item.counterpart_id ? counterparts.get(item.counterpart_id) : undefined;
  const name = counterpartName(counterpart);
  const avatar = counterpart?.avatar_url;
  const lastMessage = (item.sub_line || '').trim();
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  const handleTap = () => {
    const threadId = (item.payload as any)?.thread_id;
    if (threadId) openSheet('chat', { threadId });
  };

  return (
    <button
      onClick={handleTap}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
        'active:bg-white/[0.04]',
        item.is_unread && 'bg-white/[0.025]'
      )}
    >
      {/* Avatar — counterpart photo or silhouette + Ghost glyph */}
      <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#1c1c1e]">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Ghost className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.25)' }} />
        )}
      </div>

      {/* Title (name) + preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight truncate',
            item.is_unread ? 'text-white font-semibold' : 'text-white/85 font-normal'
          )}>
            {name}
          </p>
          <span className="text-[10px] text-white/25 flex-shrink-0">{timeAgo}</span>
        </div>
        {lastMessage && (
          <p className={cn(
            'text-xs mt-0.5 leading-snug line-clamp-1',
            item.is_unread ? 'text-white/70' : 'text-white/45'
          )}>
            {lastMessage}
          </p>
        )}
      </div>

      {/* Unread dot */}
      {item.is_unread && (
        <div className="mt-3 flex-shrink-0 w-2 h-2 rounded-full bg-[#C8962C]" aria-label="Unread" />
      )}
    </button>
  );
}
