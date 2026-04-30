import React from 'react';
import { RadioMode } from '@/modes/RadioMode';
import { useSheet } from '@/contexts/SheetContext';

export default function L2RadioPlayerSheet() {
  return (
    <div className="h-full w-full bg-black">
      <RadioMode className="!fixed !relative !inset-0" />
    </div>
  );
}
