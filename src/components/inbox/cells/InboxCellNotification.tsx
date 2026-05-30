/**
 * InboxCellNotification — D266 §1.3 cell template.
 *
 * Composition: category glyph (Bell tinted gold) · event title · one-line
 *              context · clock + timestamp
 *
 * Ambient layer. No avatar — these are system-generated, not from a
 * specific person. Tap routes contextually based on metadata.
 */

import React from 'react';
import { Bell, Calendar, MapPin, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import type { CellProps } from './InboxCellShared';

function notificationGlyph(payload: any): { Icon: React.ElementType; color: string; bg: string } {
  const innerType = (payload?.notification_type || payload?.type) as string | undefined;
  switch (innerType) {
    case 'event':
    case 'event_reminder':
      return { Icon: Calendar, color: '#C8962C', bg: 'rgba(200,150,44,0.12)' };
    case 'location_share_started':
      return { Icon: Radio,    color: '#39FF14', bg: 'rgba(57,255,20,0.10)' };
    case 'location_share_ended':
      return { Icon: MapPin,   color: '#8E8E93', bg: 'rgba(142,142,147,0.10)' };
    default:
      return { Icon: Bell,     color: '#C8962C', bg: 'rgba(200,150,44,0.12)' };
  }
}

export default function InboxCellNotification({ item }: CellProps) {
  const { openSheet } = useSheet();
  const payload = (item.payload || {}) as any;
  const { Icon, color, bg } = notificationGlyph(payload);
  const timeAgo = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  const innerType = payload?.notification_type || payload?.type;
  const tappable = ['event', 'event_reminder'].includes(innerType);

  const handleTap = () => {
    if (innerType === 'event' || innerType === 'event_reminder') {
      const eventId = payload.event_id;
      if (eventId) openSheet('event', { id: eventId });
    }
  };

  return (
    <div
      onClick={tappable ? handleTap : undefined}
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 transition-colors',
        tappable && 'active:bg-white/[0.04] cursor-pointer'
      )}
    >
      <div
        className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: bg }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight truncate',
            item.is_unread ? 'text-white font-semibold' : 'text-white/70'
          )}>
            {item.title || 'Update'}
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
