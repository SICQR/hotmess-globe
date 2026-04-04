/**
 * London OS L2 sheet wrapper — scanner-style border, consistent padding.
 * Use for Vault, event detail, and other L2-style surfaces.
 * @see docs/SYSTEM-MANUAL.md, docs/BRAND-STYLE-GUIDE.md
 */

import React from 'react';
import { cn } from '@/lib/utils';

export function SheetL2({ children, className, ...props }) {
  return (
    <div className={cn('sheet-l2', className)} {...props}>
      {children}
    </div>
  );
}
