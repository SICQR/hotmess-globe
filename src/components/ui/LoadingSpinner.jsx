import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoadingSpinner({ label = 'Loading', className }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 text-white/70', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-[#00D9FF]" />
      <span className="text-xs font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}
