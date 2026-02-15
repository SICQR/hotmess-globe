/**
 * L2SocialSheet — Sheet wrapper for Social/Connect page
 * 
 * Wraps the Social page in a sheet format with slide-up animation.
 * Shows user profiles, connections, and social discovery.
 */

import React from 'react';
import Social from '@/pages/Social';

export default function L2SocialSheet(props) {
  return (
    <div className="h-full overflow-y-auto">
      <Social {...props} />
    </div>
  );
}
