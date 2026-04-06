/**
 * CardMoreButton -- 3-dot "more" button for cards
 *
 * Opens the L2CardActionsSheet with the given item context.
 * Place as a positioned child inside any card component.
 */

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

export function CardMoreButton({ itemType, itemId, profileId, title, className = '' }) {
  const { openSheet } = useSheet();

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    openSheet('card-actions', { itemType, itemId, profileId, title });
  };

  return (
    <button
      onClick={handleClick}
      className={`w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform ${className}`}
      aria-label="More actions"
    >
      <MoreHorizontal className="w-4 h-4 text-white/80" />
    </button>
  );
}

export default CardMoreButton;
