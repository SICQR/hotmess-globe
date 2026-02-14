import React from 'react';
import { TopHUD } from './TopHUD';
import { RadioBar } from './RadioBar';
import { BottomDock } from './BottomDock';

interface OSShellProps {
  children: React.ReactNode;
  globe?: React.ReactNode;
}

/**
 * OS Shell - mounts ONCE after boot guard passes
 * Globe is absolute z-0, everything else z-10+
 */
export function OSShell({ children, globe }: OSShellProps) {
  return (
    <div className="relative h-dvh w-full bg-[#050507] overflow-hidden">
      <TopHUD />
      
      {/* Globe layer - absolute, behind everything */}
      <div className="absolute inset-0 z-0">
        {globe}
      </div>
      
      {/* Content layer - sheets, modes, overlays */}
      <div className="relative z-10 flex flex-col h-full pt-11 pb-[120px]">
        {children}
      </div>
      
      <RadioBar />
      <BottomDock />
    </div>
  );
}

export default OSShell;
