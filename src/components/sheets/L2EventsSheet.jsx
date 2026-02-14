/**
 * L2EventsSheet — Sheet wrapper for Events page
 * 
 * Wraps the Events page in a sheet format with slide-up animation.
 * Shows event listings, calendar, and event discovery.
 */

import React from 'react';
import Events from '@/pages/Events';

export default function L2EventsSheet(props) {
  return (
    <div className="h-full overflow-y-auto">
      <Events {...props} />
    </div>
  );
}
